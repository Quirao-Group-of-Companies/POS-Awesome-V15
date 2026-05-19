"""X / Z shift readings for POS terminals (Paluto-style interim and end-of-shift reports)."""

from __future__ import annotations

import frappe
from frappe import _
from frappe.utils import flt, get_datetime, now_datetime

from posawesome.posawesome.doctype.pos_closing_shift.closing_processing.overview import (
	get_closing_shift_overview,
)


def _resolve_opening_shift(pos_opening_shift=None):
	if pos_opening_shift:
		name = pos_opening_shift
		if isinstance(name, dict):
			name = name.get("name")
		if not frappe.db.exists("POS Opening Shift", name):
			frappe.throw(_("POS Opening Shift {0} does not exist.").format(name))
		return frappe.get_doc("POS Opening Shift", name)

	open_vouchers = frappe.get_all(
		"POS Opening Shift",
		filters={
			"user": frappe.session.user,
			"pos_closing_shift": ["is", "not set"],
			"docstatus": 1,
			"status": "Open",
		},
		fields=["name"],
		order_by="period_start_date desc",
		limit=1,
	)
	if not open_vouchers:
		frappe.throw(_("No open POS shift found for the current user."))
	return frappe.get_doc("POS Opening Shift", open_vouchers[0].name)


def _opening_balances(opening_shift):
	rows = []
	for row in opening_shift.get("balance_details") or []:
		rows.append(
			{
				"mode_of_payment": row.get("mode_of_payment"),
				"opening_amount": flt(row.get("opening_amount")),
			}
		)
	return rows


def _invoice_range_for_shift(opening_shift_name, pos_profile):
	use_pos_invoice = frappe.db.get_value(
		"POS Profile",
		pos_profile,
		"create_pos_invoice_instead_of_sales_invoice",
	)
	doctype = "POS Invoice" if use_pos_invoice else "Sales Invoice"
	cond = " and ifnull(consolidated_invoice,'') = ''" if doctype == "POS Invoice" else ""

	first_row = frappe.db.sql(
		f"""
		select name
		from `tab{doctype}`
		where docstatus = 1
			and posa_pos_opening_shift = %s{cond}
		order by creation asc
		limit 1
		""",
		(opening_shift_name,),
		as_dict=True,
	)
	last_row = frappe.db.sql(
		f"""
		select name
		from `tab{doctype}`
		where docstatus = 1
			and posa_pos_opening_shift = %s{cond}
		order by creation desc
		limit 1
		""",
		(opening_shift_name,),
		as_dict=True,
	)

	first_invoice = first_row[0].name if first_row else None
	last_invoice = last_row[0].name if last_row else None
	display = None
	if first_invoice and last_invoice:
		display = first_invoice if first_invoice == last_invoice else f"{first_invoice} — {last_invoice}"

	return {
		"first_invoice": first_invoice,
		"last_invoice": last_invoice,
		"display": display or _("N/A"),
	}


def _other_open_shifts_on_profile(opening_shift):
	return frappe.get_all(
		"POS Opening Shift",
		filters={
			"pos_profile": opening_shift.pos_profile,
			"status": "Open",
			"docstatus": 1,
			"pos_closing_shift": ["is", "not set"],
			"name": ["!=", opening_shift.name],
		},
		fields=["name", "user"],
		order_by="period_start_date asc",
	)


def _build_shift_reading(reading_type: str, pos_opening_shift=None):
	reading_type = (reading_type or "x").strip().lower()
	if reading_type not in {"x", "z"}:
		frappe.throw(_("Reading type must be X or Z."))

	opening_shift = _resolve_opening_shift(pos_opening_shift)
	opening_shift.check_permission("read")

	blocked = False
	block_reason = None
	active_shifts = []

	if reading_type == "z":
		active_shifts = _other_open_shifts_on_profile(opening_shift)
		if active_shifts:
			blocked = True
			labels = [
				f"{row.user} ({row.name})"
				for row in active_shifts
			]
			block_reason = _(
				"Z Reading is blocked while other cashiers have an open shift on this POS Profile: {0}"
			).format(", ".join(labels))

	overview = get_closing_shift_overview(opening_shift.name)
	invoice_range = _invoice_range_for_shift(opening_shift.name, opening_shift.pos_profile)

	sales = overview.get("sales_summary") or {}
	returns = overview.get("returns") or {}
	payments_by_mode = overview.get("payments_by_mode") or []

	payment_totals = {}
	for row in payments_by_mode:
		mode = (row.get("mode_of_payment") or _("Other")).upper()
		payment_totals[mode] = payment_totals.get(mode, 0) + flt(row.get("company_currency_total"))

	generated_at = get_datetime(now_datetime())
	title = _("X Reading") if reading_type == "x" else _("Z Reading")

	return {
		"reading_type": reading_type,
		"title": title,
		"generated_at": str(generated_at),
		"generated_display": generated_at.strftime("%Y-%m-%d %I:%M %p"),
		"blocked": blocked,
		"block_reason": block_reason,
		"active_shifts": active_shifts,
		"pos_opening_shift": opening_shift.name,
		"shift_status": opening_shift.status,
		"period_start": str(opening_shift.period_start_date or ""),
		"posting_date": str(opening_shift.posting_date or ""),
		"pos_profile": opening_shift.pos_profile,
		"company": opening_shift.company,
		"cashier": opening_shift.user,
		"cashier_name": frappe.db.get_value("User", opening_shift.user, "full_name")
		or opening_shift.user,
		"opening_balances": _opening_balances(opening_shift),
		"overview": overview,
		"invoice_range": invoice_range if reading_type == "z" else None,
		"summary": {
			"total_sales": flt(overview.get("company_currency_total")),
			"total_transactions": overview.get("total_invoices") or 0,
			"sale_invoices_count": sales.get("sale_invoices_count") or 0,
			"gross_sales": flt(sales.get("gross_company_currency_total")),
			"average_transaction": flt(sales.get("average_invoice_value")),
			"returns_total": flt(returns.get("company_currency_total")),
			"returns_count": returns.get("count") or 0,
			"payments": payment_totals,
			"cash_expected": overview.get("cash_expected") or {},
		},
	}


@frappe.whitelist()
def get_x_reading(pos_opening_shift=None):
	"""Interim shift report for the current open POS Opening Shift (does not close the shift)."""
	return _build_shift_reading("x", pos_opening_shift)


@frappe.whitelist()
def get_z_reading(pos_opening_shift=None):
	"""End-of-shift style report; blocked if other open shifts exist on the same POS Profile."""
	return _build_shift_reading("z", pos_opening_shift)
