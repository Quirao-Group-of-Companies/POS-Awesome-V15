"""Restaurant table status derived from POS / Sales Invoice records."""

import frappe
from frappe.utils import flt


def _resolve_invoice_doctype(pos_profile=None):
    if pos_profile and frappe.db.get_value(
        "POS Profile",
        pos_profile,
        "create_pos_invoice_instead_of_sales_invoice",
    ):
        return "POS Invoice"
    return "Sales Invoice"


def _table_status_from_invoice(docstatus, outstanding_amount):
    if docstatus == 0:
        return "Occupied"
    if docstatus == 1:
        if flt(outstanding_amount) > 0:
            return "Bill-Cut"
        return "Vacant"
    return "Vacant"


def _status_priority(status):
    return {"Occupied": 2, "Bill-Cut": 1, "Vacant": 0}.get(status, 0)


@frappe.whitelist()
def get_restaurant_table_status(company=None, pos_profile=None, floor=None):
    """Return live table occupancy from open restaurant invoices.

    - Draft invoice (docstatus 0) with ``restaurant_table`` → Occupied
    - Submitted, unpaid (outstanding > 0) → Bill-Cut
    - Submitted, paid (outstanding <= 0) or cancelled/deleted → Vacant
    """
    doctype = _resolve_invoice_doctype(pos_profile)
    if not frappe.db.has_column(doctype, "restaurant_table"):
        return {"tables": {}}

    filters = {
        "docstatus": ["!=", 2],
        "restaurant_table": ["is", "set"],
    }
    if company:
        filters["company"] = company
    if pos_profile:
        filters["pos_profile"] = pos_profile

    fields = [
        "name",
        "restaurant_table",
        "restaurant_table_label",
        "restaurant_floor",
        "creation",
        "docstatus",
        "modified",
        "grand_total",
        "outstanding_amount",
    ]

    rows = frappe.get_all(
        doctype,
        filters=filters,
        fields=fields,
        order_by="modified desc",
        limit_page_length=500,
    )

    floor_filter = (floor or "").strip()
    tables = {}

    for row in rows:
        table_key = (row.get("restaurant_table") or "").strip()
        if not table_key:
            continue

        row_floor = (row.get("restaurant_floor") or "").strip()
        if floor_filter and row_floor and row_floor != floor_filter:
            continue

        status = _table_status_from_invoice(
            row.get("docstatus"),
            row.get("outstanding_amount"),
        )
        if status == "Vacant":
            continue

        label = (row.get("restaurant_table_label") or table_key).strip()
        entry = {
            "status": status,
            "invoice_name": row.get("name"),
            "restaurant_table": table_key,
            "restaurant_table_label": label,
            "restaurant_floor": row_floor,
            "creation": row.get("creation"),
            "docstatus": row.get("docstatus"),
            "modified": row.get("modified"),
            "grand_total": flt(row.get("grand_total")),
        }

        for lookup_key in {table_key, label}:
            existing = tables.get(lookup_key)
            if not existing or _status_priority(status) > _status_priority(
                existing.get("status")
            ):
                tables[lookup_key] = entry

    return {"tables": tables}
