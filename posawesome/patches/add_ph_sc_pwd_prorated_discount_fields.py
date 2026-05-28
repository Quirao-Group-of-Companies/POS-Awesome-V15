import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


FIELDS_BY_DOCTYPE = [
    (
        "POS Invoice",
        [
            {
                "fieldname": "custom_total_pax",
                "label": "Total Pax",
                "fieldtype": "Int",
                "default": 1,
                "insert_after": "customer",
            },
            {
                "fieldname": "custom_sc_pwd_pax",
                "label": "SC / PWD Pax",
                "fieldtype": "Int",
                "default": 0,
                "insert_after": "custom_total_pax",
            },
            {
                "fieldname": "custom_sc_id_number",
                "label": "SC / PWD ID Number",
                "fieldtype": "Data",
                "insert_after": "custom_sc_pwd_pax",
            },
            {
                "fieldname": "custom_sc_name",
                "label": "SC / PWD Name",
                "fieldtype": "Data",
                "insert_after": "custom_sc_id_number",
            },
            {
                "fieldname": "custom_vat_exempt_amount",
                "label": "VAT Exempt Amount",
                "fieldtype": "Currency",
                "read_only": 1,
                "insert_after": "custom_sc_name",
            },
            {
                "fieldname": "custom_sc_discount_amount",
                "label": "SC Discount Amount",
                "fieldtype": "Currency",
                "read_only": 1,
                "insert_after": "custom_vat_exempt_amount",
            },
        ],
    ),
    (
        "Sales Invoice",
        [
            {
                "fieldname": "custom_total_pax",
                "label": "Total Pax",
                "fieldtype": "Int",
                "default": 1,
                "insert_after": "customer",
            },
            {
                "fieldname": "custom_sc_pwd_pax",
                "label": "SC / PWD Pax",
                "fieldtype": "Int",
                "default": 0,
                "insert_after": "custom_total_pax",
            },
            {
                "fieldname": "custom_sc_id_number",
                "label": "SC / PWD ID Number",
                "fieldtype": "Data",
                "insert_after": "custom_sc_pwd_pax",
            },
            {
                "fieldname": "custom_sc_name",
                "label": "SC / PWD Name",
                "fieldtype": "Data",
                "insert_after": "custom_sc_id_number",
            },
            {
                "fieldname": "custom_vat_exempt_amount",
                "label": "VAT Exempt Amount",
                "fieldtype": "Currency",
                "read_only": 1,
                "insert_after": "custom_sc_name",
            },
            {
                "fieldname": "custom_sc_discount_amount",
                "label": "SC Discount Amount",
                "fieldtype": "Currency",
                "read_only": 1,
                "insert_after": "custom_vat_exempt_amount",
            },
        ],
    ),
]


def execute():
    for doctype, fields in FIELDS_BY_DOCTYPE:
        for field in fields:
            custom_field_name = f"{doctype}-{field['fieldname']}"
            if not frappe.db.exists("Custom Field", custom_field_name):
                create_custom_field(doctype, field)
            else:
                # Ensure the definition stays up-to-date across installs.
                updates = {
                    "label": field.get("label"),
                    "fieldtype": field.get("fieldtype"),
                    "insert_after": field.get("insert_after"),
                    "read_only": field.get("read_only"),
                    "default": field.get("default"),
                    "options": field.get("options"),
                }
                frappe.db.set_value(
                    "Custom Field",
                    custom_field_name,
                    updates,
                    update_modified=False,
                )
        frappe.clear_cache(doctype=doctype)

