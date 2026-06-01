import frappe
from frappe.custom.doctype.custom_field.custom_field import create_custom_field


def execute():
	field = {
		"fieldname": "custom_kitchen_served",
		"label": "Kitchen Served",
		"fieldtype": "Check",
		"default": "0",
		"insert_after": "item_name",
		"in_list_view": 1,
	}

	custom_field_name = "POS Invoice Item-custom_kitchen_served"
	if not frappe.db.exists("Custom Field", custom_field_name):
		create_custom_field("POS Invoice Item", field)
	else:
		frappe.db.set_value(
			"Custom Field",
			custom_field_name,
			{
				"label": field["label"],
				"fieldtype": field["fieldtype"],
				"insert_after": field["insert_after"],
				"in_list_view": field.get("in_list_view"),
			},
			update_modified=False,
		)

	frappe.clear_cache(doctype="POS Invoice Item")
