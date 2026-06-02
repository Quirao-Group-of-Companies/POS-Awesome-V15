"""Restaurant table status derived from POS / Sales Invoice records.

A table is considered occupied ONLY when:
- There is an active (Open, submitted, not closed/cancelled) POS Opening Shift
- There is an active (draft or unpaid submitted) POS/Sales Invoice linked to that
  table that belongs to the current active opening shift.

Closed or cancelled shifts free all tables.
"""

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


def _resolve_active_opening_shift(pos_profile=None, company=None):
    """Return the name of the single active (Open) POS Opening Shift, or None."""
    filters = {
        "docstatus": 1,
        "status": "Open",
        "pos_closing_shift": ["is", "not set"],
    }
    if pos_profile:
        filters["pos_profile"] = pos_profile
    if company:
        filters["company"] = company

    shifts = frappe.get_all(
        "POS Opening Shift",
        filters=filters,
        fields=["name"],
        order_by="period_start_date desc",
        limit=1,
    )
    return shifts[0]["name"] if shifts else None


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

    A table is "Occupied" only when:
    - An active POS Opening Shift exists (docstatus=1, status=Open, not closed)
    - An active (draft or unpaid submitted) invoice exists for that table
    - The invoice belongs to the current active opening shift

    When the shift is closed or cancelled, all tables become "Available".
    """
    doctype = _resolve_invoice_doctype(pos_profile)

    # Guard: the required fields must exist on the doctype
    if not frappe.db.has_column(doctype, "restaurant_table"):
        return {"tables": {}}
    if not frappe.db.has_column(doctype, "posa_pos_opening_shift"):
        return {"tables": {}}

    # Only invoices under the currently active opening shift count
    active_shift = _resolve_active_opening_shift(pos_profile, company)
    if not active_shift:
        return {"tables": {}}

    filters = {
        "docstatus": ["!=", 2],
        "restaurant_table": ["is", "set"],
        "posa_pos_opening_shift": active_shift,
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
