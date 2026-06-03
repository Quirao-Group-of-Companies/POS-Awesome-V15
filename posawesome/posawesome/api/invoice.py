# Copyright (c) 2021, Youssef Restom and contributors
# For license information, please see license.txt


import frappe
from frappe import _
from frappe.model.mapper import get_mapped_doc
from frappe.utils import add_days, flt

from posawesome.posawesome.api.utilities import get_company_domain  # Updated import
from posawesome.posawesome.api.payments import get_posawesome_credit_redeem_remark
from posawesome.posawesome.doctype.delivery_charges.delivery_charges import (
    get_applicable_delivery_charges,
)
from posawesome.posawesome.doctype.pos_coupon.pos_coupon import update_coupon_code_count

SUBMISSION_LEDGER_DOCTYPE = "POS Invoice Submission Ledger"
SERVICE_CHARGE_TAX_DESCRIPTION = "Service Charge"


def validate(doc, method):
    validate_shift(doc)
    set_patient(doc)
    auto_set_delivery_charges(doc)
    calc_delivery_charges(doc)
    calc_service_charge(doc)
    apply_tax_inclusive(doc)


def before_submit(doc, method):
    add_loyalty_point(doc)
    create_sales_order(doc)
    update_coupon(doc, "used")


def before_cancel(doc, method):
    update_coupon(doc, "cancelled")


def on_cancel(doc, method):
    cancel_posawesome_credit_journal_entries(doc)
    restore_posawesome_gift_card_redemptions(doc)
    delete_invoice_submission_ledger_entries(doc)


def delete_invoice_submission_ledger_entries(doc):
    delete_invoice_submission_ledger_entries_for_invoice(
        getattr(doc, "doctype", None),
        getattr(doc, "name", None),
    )


def delete_invoice_submission_ledger_entries_for_invoice(doctype, invoice_name):
    if not doctype or not invoice_name:
        return

    ledger_names = frappe.get_all(
        SUBMISSION_LEDGER_DOCTYPE,
        filters={
            "document_type": doctype,
            "invoice_name": invoice_name,
        },
        pluck="name",
    )

    for ledger_name in ledger_names:
        frappe.delete_doc(
            SUBMISSION_LEDGER_DOCTYPE,
            ledger_name,
            force=True,
            ignore_permissions=True,
        )


def cancel_posawesome_credit_journal_entries(doc):
    remark = get_posawesome_credit_redeem_remark(doc.name)
    linked_journal_entries = frappe.get_all(
        "Journal Entry",
        filters={"docstatus": 1, "user_remark": remark},
        pluck="name",
    )

    for journal_entry in linked_journal_entries:
        je_doc = frappe.get_doc("Journal Entry", journal_entry)

        if je_doc.docstatus != 1:
            continue

        has_reference = any(
            d.reference_type == doc.doctype and d.reference_name == doc.name for d in je_doc.accounts
        )

        if not has_reference:
            continue

        try:
            je_doc.cancel()
        except Exception:
            frappe.log_error(
                frappe.get_traceback(),
                "POSAwesome Credit Journal Cancellation Error",
            )
            frappe.throw(
                _(
                    "Unable to cancel Journal Entry {0} linked to this invoice. Please cancel it manually and try again."
                ).format(journal_entry)
            )


def restore_posawesome_gift_card_redemptions(doc):
    try:
        from posawesome.posawesome.api.gift_cards import restore_invoice_gift_card_redemptions

        restore_invoice_gift_card_redemptions(doc)
    except Exception:
        frappe.log_error(
            frappe.get_traceback(),
            "POSAwesome Gift Card Restoration Error",
        )
        frappe.throw(
            _(
                "Unable to restore gift card balances linked to this invoice. Please review the applied gift cards and try again."
            )
        )


def add_loyalty_point(invoice_doc):
    for offer in getattr(invoice_doc, "posa_offers", []):
        if offer.offer == "Loyalty Point":
            original_offer = frappe.get_doc("POS Offer", offer.offer_name)
            if original_offer.loyalty_points > 0:
                loyalty_program = frappe.get_value("Customer", invoice_doc.customer, "loyalty_program")
                if not loyalty_program:
                    loyalty_program = original_offer.loyalty_program
                doc = frappe.get_doc(
                    {
                        "doctype": "Loyalty Point Entry",
                        "loyalty_program": loyalty_program,
                        "loyalty_program_tier": original_offer.name,
                        "customer": invoice_doc.customer,
                        "invoice_type": "Sales Invoice",
                        "invoice": invoice_doc.name,
                        "loyalty_points": original_offer.loyalty_points,
                        "expiry_date": add_days(invoice_doc.posting_date, 10000),
                        "posting_date": invoice_doc.posting_date,
                        "company": invoice_doc.company,
                    }
                )
                doc.insert(ignore_permissions=True)


def create_sales_order(doc):
    if (
        getattr(doc, "posa_pos_opening_shift", None)
        and doc.pos_profile
        and doc.is_pos
        and getattr(doc, "posa_delivery_date", None)
        and not doc.update_stock
        and frappe.get_value("POS Profile", doc.pos_profile, "posa_allow_sales_order")
    ):
        sales_order_doc = make_sales_order(doc.name)
        if sales_order_doc:
            sales_order_doc.posa_notes = getattr(doc, "posa_notes", None)
            sales_order_doc.flags.ignore_permissions = True
            sales_order_doc.flags.ignore_account_permission = True
            sales_order_doc.save()
            sales_order_doc.submit()
            url = frappe.utils.get_url_to_form(sales_order_doc.doctype, sales_order_doc.name)
            msgprint = f"Sales Order Created at <a href='{url}'>{sales_order_doc.name}</a>"
            frappe.msgprint(_(msgprint), title="Sales Order Created", indicator="green", alert=True)
            i = 0
            for item in sales_order_doc.items:
                doc.items[i].sales_order = sales_order_doc.name
                doc.items[i].so_detail = item.name
                i += 1


def make_sales_order(source_name, target_doc=None, ignore_permissions=True):
    def set_missing_values(source, target):
        target.ignore_pricing_rule = 1
        target.flags.ignore_permissions = ignore_permissions
        target.run_method("set_missing_values")
        target.run_method("calculate_taxes_and_totals")

    def update_item(obj, target, source_parent):
        target.stock_qty = flt(obj.qty) * flt(obj.conversion_factor)
        target.delivery_date = getattr(obj, "posa_delivery_date", None) or getattr(
            source_parent, "posa_delivery_date", None
        )

    doclist = get_mapped_doc(
        "Sales Invoice",
        source_name,
        {
            "Sales Invoice": {
                "doctype": "Sales Order",
            },
            "Sales Invoice Item": {
                "doctype": "Sales Order Item",
                "field_map": {
                    "cost_center": "cost_center",
                    "Warehouse": "warehouse",
                    "delivery_date": "posa_delivery_date",
                    "posa_notes": "posa_notes",
                },
                "postprocess": update_item,
            },
            "Sales Taxes and Charges": {
                "doctype": "Sales Taxes and Charges",
                "add_if_empty": True,
            },
            "Sales Team": {"doctype": "Sales Team", "add_if_empty": True},
            "Payment Schedule": {"doctype": "Payment Schedule", "add_if_empty": True},
        },
        target_doc,
        set_missing_values,
        ignore_permissions=ignore_permissions,
    )

    return doclist


def update_coupon(doc, transaction_type):
    for coupon in getattr(doc, "posa_coupons", []):
        if not coupon.applied:
            continue
        update_coupon_code_count(coupon.coupon, transaction_type)


def set_patient(doc):
    domain = get_company_domain(doc.company)
    if domain != "Healthcare":
        return
    patient_list = frappe.get_all("Patient", filters={"customer": doc.customer}, page_length=1)
    if len(patient_list) > 0:
        doc.patient = patient_list[0].name


def auto_set_delivery_charges(doc):
    if not doc.pos_profile:
        return
    if not frappe.get_cached_value("POS Profile", doc.pos_profile, "posa_auto_set_delivery_charges"):
        return

    delivery_charges = get_applicable_delivery_charges(
        doc.company,
        doc.pos_profile,
        doc.customer,
        doc.shipping_address_name,
        doc.posa_delivery_charges,
        restrict=True,
    )

    if doc.posa_delivery_charges:
        if doc.posa_delivery_charges_rate:
            return
        else:
            if len(delivery_charges) > 0:
                doc.posa_delivery_charges_rate = delivery_charges[0].rate
    else:
        if len(delivery_charges) > 0:
            doc.posa_delivery_charges = delivery_charges[0].name
            doc.posa_delivery_charges_rate = delivery_charges[0].rate
        else:
            doc.posa_delivery_charges = None
            doc.posa_delivery_charges_rate = None


def calc_delivery_charges(doc):
    if not doc.pos_profile:
        return

    old_doc = None
    calculate_taxes_and_totals = False
    if not doc.is_new():
        old_doc = doc.get_doc_before_save()
        if not doc.posa_delivery_charges and not old_doc.posa_delivery_charges:
            return
    else:
        if not doc.posa_delivery_charges:
            return
    if not doc.posa_delivery_charges:
        doc.posa_delivery_charges_rate = 0

    charges_doc = None
    if doc.posa_delivery_charges:
        charges_doc = frappe.get_cached_doc("Delivery Charges", doc.posa_delivery_charges)
        doc.posa_delivery_charges_rate = charges_doc.default_rate
        charges_profile = next((i for i in charges_doc.profiles if i.pos_profile == doc.pos_profile), None)
        if charges_profile:
            doc.posa_delivery_charges_rate = charges_profile.rate
        conversion_rate = doc.conversion_rate or 1
        doc.posa_delivery_charges_rate = flt(
            doc.posa_delivery_charges_rate / conversion_rate,
            doc.precision("posa_delivery_charges_rate"),
        )

    if old_doc and old_doc.posa_delivery_charges:
        old_charges = next(
            (
                i
                for i in doc.taxes
                if i.charge_type == "Actual" and i.description == old_doc.posa_delivery_charges
            ),
            None,
        )
        if old_charges:
            doc.taxes.remove(old_charges)
            calculate_taxes_and_totals = True

    if doc.posa_delivery_charges:
        doc.append(
            "taxes",
            {
                "charge_type": "Actual",
                "description": doc.posa_delivery_charges,
                "tax_amount": doc.posa_delivery_charges_rate,
                "cost_center": charges_doc.cost_center,
                "account_head": charges_doc.shipping_account,
            },
        )
        calculate_taxes_and_totals = True

    if calculate_taxes_and_totals:
        doc.calculate_taxes_and_totals()


def calc_service_charge(doc):
    """Add Service Charge as an Actual tax row so ERPNext includes it in grand_total computation.
    
    ONLY manages tax rows for POS Invoice doctype — does NOT touch taxes during
    Sales Invoice merge (POS Closing Shift), where tax rows are already correctly
    summed by merge_pos_invoice_into()."""
    if not doc.company or doc.doctype != "POS Invoice":
        return

    service_charge = flt(doc.get("posa_service_charge"))
    calculate_taxes_and_totals = False

    existing_row = next(
        (
            row
            for row in doc.get("taxes", [])
            if row.charge_type == "Actual"
            and row.description == SERVICE_CHARGE_TAX_DESCRIPTION
        ),
        None,
    )
    if existing_row:
        doc.taxes.remove(existing_row)
        calculate_taxes_and_totals = True

    if not service_charge:
        if doc.meta.get_field("posa_service_charge"):
            doc.posa_service_charge = 0
        if calculate_taxes_and_totals:
            doc.calculate_taxes_and_totals()
        return

    if doc.is_return and service_charge > 0:
        service_charge = -abs(service_charge)

    if doc.meta.get_field("posa_service_charge"):
        doc.posa_service_charge = service_charge

    account_head = frappe.get_cached_value(
        "Company", doc.company, "default_service_charge_account"
    )
    if not account_head:
        frappe.throw(
            _("Please set Default Service Charge Account in Company {0}").format(doc.company)
        )

    cost_center = frappe.get_cached_value("Company", doc.company, "cost_center")
    tax_row = {
        "charge_type": "Actual",
        "description": SERVICE_CHARGE_TAX_DESCRIPTION,
        "tax_amount": service_charge,
        "account_head": account_head,
    }
    if cost_center:
        tax_row["cost_center"] = cost_center

    doc.append("taxes", tax_row)
    doc.calculate_taxes_and_totals()


def apply_tax_inclusive(doc):
    """Mark taxes as inclusive based on POS Profile setting."""
    if not doc.pos_profile:
        return
    try:
        tax_inclusive = frappe.get_cached_value("POS Profile", doc.pos_profile, "posa_tax_inclusive")
    except Exception:
        tax_inclusive = 0

    has_changes = False
    for tax in doc.get("taxes", []):
        if tax.charge_type == "Actual":
            if tax.included_in_print_rate:
                tax.included_in_print_rate = 0
                has_changes = True
        continue
        if tax_inclusive and not tax.included_in_print_rate:
            tax.included_in_print_rate = 1
            has_changes = True
        elif not tax_inclusive and tax.included_in_print_rate:
            tax.included_in_print_rate = 0
            has_changes = True
    if has_changes:
        doc.calculate_taxes_and_totals()


def validate_shift(doc):
    if doc.posa_pos_opening_shift and doc.pos_profile and doc.is_pos:
        # check if shift is open
        shift = frappe.get_cached_doc("POS Opening Shift", doc.posa_pos_opening_shift)
        if shift.status != "Open":
            frappe.throw(_("POS Shift {0} is not open").format(shift.name))
        # check if shift is for the same profile
        if shift.pos_profile != doc.pos_profile:
            frappe.throw(_("POS Opening Shift {0} is not for the same POS Profile").format(shift.name))
        # check if shift is for the same company
        if shift.company != doc.company:
            frappe.throw(_("POS Opening Shift {0} is not for the same company").format(shift.name))
