import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field

FIELDS = [
    {
        "fieldname": "posa_skip_posawesome_business_checks",
        "label": "Skip POS Awesome business checks",
        "fieldtype": "Check",
        "default": "0",
        "description": (
            "Relaxes POS Awesome-only rules: return line matching, return validity window, "
            "stock shortage blocks on submit, cart stock blocking, and write-off over-limit guard. "
            "Does not disable ERPNext Sales Invoice / POS Invoice validation or GL/stock impact."
        ),
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
