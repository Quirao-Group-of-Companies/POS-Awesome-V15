"""Kitchen Display System (KDS) APIs for open POS invoices."""

import frappe
from frappe import _
from frappe.utils import cint, flt


def _invoice_doctype():
	if frappe.db.exists("DocType", "POS Invoice"):
		return "POS Invoice"
	return "Sales Invoice"


def _table_label(row):
	for key in ("restaurant_table_label", "restaurant_table", "custom_table_number"):
		value = (row.get(key) or "").strip()
		if value:
			return value
	return ""


@frappe.whitelist()
def get_kitchen_orders(company=None):
	"""Return draft invoices with line items for the kitchen display."""
	company = (company or "").strip() or frappe.defaults.get_user_default("Company")
	if not company:
		frappe.throw(_("Company is required"))

	doctype = _invoice_doctype()
	item_doctype = f"{doctype} Item"

	invoice_fields = [
		"name",
		"customer",
		"customer_name",
		"company",
		"creation",
		"modified",
		"posting_time",
	]
	for fieldname in ("restaurant_table", "restaurant_table_label", "custom_table_number"):
		if frappe.db.has_column(doctype, fieldname):
			invoice_fields.append(fieldname)

	invoices = frappe.get_all(
		doctype,
		filters={"docstatus": 0, "company": company},
		fields=invoice_fields,
		order_by="modified asc",
		limit_page_length=200,
	)

	if not invoices:
		return {
			"orders": [],
			"company": company,
			"doctype": doctype,
			"item_doctype": item_doctype,
			"kitchen_served_enabled": frappe.db.has_column(
				item_doctype, "custom_kitchen_served"
			),
		}

	parent_names = [row.name for row in invoices]
	item_fields = ["name", "parent", "item_code", "item_name", "qty", "idx"]
	has_item_group_column = frappe.db.has_column(item_doctype, "item_group")
	if has_item_group_column:
		item_fields.append("item_group")
	if frappe.db.has_column(item_doctype, "custom_kitchen_served"):
		item_fields.append("custom_kitchen_served")

	items = frappe.get_all(
		item_doctype,
		filters={"parent": ["in", parent_names], "parenttype": doctype},
		fields=item_fields,
		order_by="parent asc, idx asc",
		limit_page_length=2000,
	)

	item_group_by_code = {}
	if not has_item_group_column:
		item_codes = list({row.get("item_code") for row in items if row.get("item_code")})
		if item_codes:
			for row in frappe.get_all(
				"Item",
				filters={"item_code": ["in", item_codes]},
				fields=["item_code", "item_group"],
			):
				item_group_by_code[row.item_code] = row.get("item_group") or ""

	items_by_parent = {}
	for item in items:
		if flt(item.get("qty")) <= 0:
			continue
		item_group = (item.get("item_group") or "").strip()
		if not item_group:
			item_group = (item_group_by_code.get(item.get("item_code")) or "").strip()
		items_by_parent.setdefault(item.parent, []).append(
			{
				"name": item.name,
				"item_code": item.get("item_code"),
				"item_name": item.get("item_name") or item.get("item_code"),
				"item_group": item_group,
				"qty": flt(item.get("qty")),
				"custom_kitchen_served": 1
				if cint(item.get("custom_kitchen_served"))
				else 0,
			}
		)

	orders = []
	for invoice in invoices:
		lines = items_by_parent.get(invoice.name) or []
		if not lines:
			continue

		orders.append(
			{
				"name": invoice.name,
				"customer": invoice.get("customer"),
				"customer_name": invoice.get("customer_name") or invoice.get("customer"),
				"table": _table_label(invoice),
				"creation": invoice.get("creation"),
				"modified": invoice.get("modified"),
				"posting_time": invoice.get("posting_time"),
				"items": lines,
			}
		)

	return {
		"orders": orders,
		"company": company,
		"doctype": doctype,
		"item_doctype": item_doctype,
		"kitchen_served_enabled": frappe.db.has_column(
			item_doctype, "custom_kitchen_served"
		),
	}
