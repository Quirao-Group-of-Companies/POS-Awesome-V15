import frappe


def execute():
	"""Remove POS/SI Link field when Restaurant Kitchen Approval DocType is missing."""
	if frappe.db.exists("DocType", "Restaurant Kitchen Approval"):
		return

	for doctype in ("POS Invoice", "Sales Invoice"):
		fieldname = "restaurant_kitchen_approval"
		custom_field_name = f"{doctype}-{fieldname}"
		if frappe.db.exists("Custom Field", custom_field_name):
			frappe.delete_doc("Custom Field", custom_field_name, force=1)
			continue

		if frappe.db.has_column(doctype, fieldname):
			frappe.db.sql_ddl(f"ALTER TABLE `tab{doctype}` DROP COLUMN `{fieldname}`")

	frappe.clear_cache(doctype="POS Invoice")
	frappe.clear_cache(doctype="Sales Invoice")
