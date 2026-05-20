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
	insert_after = FIELDS[0]["insert_after"]
	if not frappe.db.exists("Custom Field", f"POS Profile-{insert_after}"):
		meta = frappe.get_meta("POS Profile", cached=False)
		for candidate in (
			"posa_paluto_mode",
			"posa_gift_card_liability_account",
			"create_pos_invoice_instead_of_sales_invoice",
		):
			if meta.has_field(candidate):
				insert_after = candidate
				break
		else:
			insert_after = "company"

	for field in FIELDS:
		field = {**field, "insert_after": insert_after}
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
