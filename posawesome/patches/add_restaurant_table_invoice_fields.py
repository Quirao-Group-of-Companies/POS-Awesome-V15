import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

FIELDS_BY_DOCTYPE = [
    (
        "POS Invoice",
        [
            {
                "fieldname": "restaurant_table",
                "label": "Restaurant Table",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "custom_table_number",
            },
            {
                "fieldname": "restaurant_table_label",
                "label": "Restaurant Table Label",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "restaurant_table",
            },
            {
                "fieldname": "restaurant_floor",
                "label": "Restaurant Floor",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "restaurant_table_label",
            },
        ],
    ),
    (
        "Sales Invoice",
        [
            {
                "fieldname": "restaurant_table",
                "label": "Restaurant Table",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "posa_pos_opening_shift",
            },
            {
                "fieldname": "restaurant_table_label",
                "label": "Restaurant Table Label",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "restaurant_table",
            },
            {
                "fieldname": "restaurant_floor",
                "label": "Restaurant Floor",
                "fieldtype": "Data",
                "read_only": 1,
                "insert_after": "restaurant_table_label",
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
                frappe.db.set_value(
                    "Custom Field",
                    custom_field_name,
                    {
                        "label": field["label"],
                        "fieldtype": field["fieldtype"],
                        "insert_after": field["insert_after"],
                        "read_only": field.get("read_only"),
                    },
                    update_modified=False,
                )
        frappe.clear_cache(doctype=doctype)
