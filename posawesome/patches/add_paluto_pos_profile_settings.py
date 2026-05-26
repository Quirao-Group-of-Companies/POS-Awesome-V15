import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

FIELDS = [
    {
        "fieldname": "posa_paluto_mode",
        "label": "Paluto-style restaurant mode",
        "fieldtype": "Check",
        "default": "0",
        "description": "When enabled, table dashboard uses Paluto-style slot counts and receptionist role rules.",
        "insert_after": "posa_gift_card_liability_account",
    },
    {
        "fieldname": "posa_paluto_receptionist_table_count",
        "label": "Paluto receptionist table count",
        "fieldtype": "Int",
        "default": "70",
        "depends_on": "eval:doc.posa_paluto_mode==1",
        "insert_after": "posa_paluto_mode",
    },
    {
        "fieldname": "posa_paluto_default_table_count",
        "label": "Paluto default table count",
        "fieldtype": "Int",
        "default": "150",
        "depends_on": "eval:doc.posa_paluto_mode==1",
        "insert_after": "posa_paluto_receptionist_table_count",
    },
    {
        "fieldname": "posa_paluto_receptionist_roles",
        "label": "Paluto receptionist roles",
        "fieldtype": "Small Text",
        "default": "receptionist",
        "description": "Comma-separated Frappe Role names. Users with any of these roles use the receptionist table count.",
        "depends_on": "eval:doc.posa_paluto_mode==1",
        "insert_after": "posa_paluto_default_table_count",
    },
    {
        "fieldname": "posa_enable_xz_readings",
        "label": "Enable X / Z shift readings",
        "fieldtype": "Check",
        "default": "1",
        "description": "Show X Reading (interim) and Z Reading (end-of-shift) in the POS menu.",
        "depends_on": "eval:doc.posa_paluto_mode==1",
        "insert_after": "posa_paluto_receptionist_roles",
    },
]


def execute():
    for field in FIELDS:
        cf_name = f"POS Profile-{field['fieldname']}"
        if not frappe.db.exists("Custom Field", cf_name):
            create_custom_field("POS Profile", field)
        else:
            frappe.db.set_value(
                "Custom Field",
                cf_name,
                {
                    "label": field["label"],
                    "fieldtype": field["fieldtype"],
                    "default": field.get("default"),
                    "depends_on": field.get("depends_on"),
                    "options": field.get("options"),
                    "description": field.get("description"),
                    "insert_after": field["insert_after"],
                },
                update_modified=False,
            )
    frappe.clear_cache(doctype="POS Profile")
