import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

FIELDS_BY_DOCTYPE = {
    "POS Invoice": {
        "fieldname": "restaurant_order_saved",
        "label": "Restaurant Order Saved",
        "fieldtype": "Check",
        "default": "0",
        "read_only": 1,
        "insert_after": "restaurant_table_label",
    },
    "Sales Invoice": {
        "fieldname": "restaurant_order_saved",
        "label": "Restaurant Order Saved",
        "fieldtype": "Check",
        "default": "0",
        "read_only": 1,
        "insert_after": "restaurant_table_label",
    },
}


def execute():
    for doctype, field in FIELDS_BY_DOCTYPE.items():
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
                    "default": field.get("default"),
                    "insert_after": field["insert_after"],
                    "read_only": field.get("read_only"),
                },
                update_modified=False,
            )
        frappe.clear_cache(doctype=doctype)
