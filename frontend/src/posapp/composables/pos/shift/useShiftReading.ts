import { ref } from "vue";

declare const frappe: any;

export type ShiftReadingReport = {
	reading_type: "x" | "z";
	title: string;
	generated_display: string;
	blocked?: boolean;
	block_reason?: string;
	pos_opening_shift?: string;
	pos_profile?: string;
	company?: string;
	cashier_name?: string;
	period_start?: string;
	invoice_range?: { display?: string; first_invoice?: string; last_invoice?: string } | null;
	opening_balances?: Array<{ mode_of_payment?: string; opening_amount?: number }>;
	summary?: {
		total_sales?: number;
		total_transactions?: number;
		sale_invoices_count?: number;
		gross_sales?: number;
		average_transaction?: number;
		returns_total?: number;
		returns_count?: number;
		payments?: Record<string, number>;
		cash_expected?: { company_currency_total?: number; mode_of_payment?: string };
	};
	overview?: Record<string, unknown>;
};

function escapeHtml(value: unknown): string {
	return String(value ?? "")
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

function formatMoney(value: unknown, currency = ""): string {
	const n = Number(value);
	const formatted = Number.isFinite(n)
		? n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })
		: "0.00";
	return currency ? `${currency} ${formatted}` : formatted;
}

export function buildShiftReadingPrintHtml(
	report: ShiftReadingReport,
	currency: string,
	translate: (text: string) => string,
): string {
	const summary = report.summary || {};
	const payments = summary.payments || {};
	const paymentRows = Object.entries(payments)
		.map(
			([mode, amount]) =>
				`<tr><td>${escapeHtml(mode)}</td><td class="num">${escapeHtml(formatMoney(amount, currency))}</td></tr>`,
		)
		.join("");

	const openingRows = (report.opening_balances || [])
		.map(
			(row) =>
				`<tr><td>${escapeHtml(row.mode_of_payment)}</td><td class="num">${escapeHtml(formatMoney(row.opening_amount, currency))}</td></tr>`,
		)
		.join("");

	const invoiceRange =
		report.reading_type === "z" && report.invoice_range?.display
			? `<p><strong>${escapeHtml(translate("Invoice range"))}:</strong> ${escapeHtml(report.invoice_range.display)}</p>`
			: "";

	const gridRow = (label: string, value: string) =>
		`<div><div class="label">${escapeHtml(label)}</div><div class="value">${value}</div></div>`;

	return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<title>${escapeHtml(report.title)}</title>
<style>
body { font-family: Arial, sans-serif; font-size: 12px; margin: 16px; color: #111; }
h1 { font-size: 18px; margin: 0 0 4px; text-align: center; }
.meta { text-align: center; margin-bottom: 16px; color: #444; }
.section { margin-top: 14px; }
table { width: 100%; border-collapse: collapse; margin-top: 6px; }
th, td { border: 1px solid #ccc; padding: 6px 8px; }
th { background: #f2f2f2; text-align: left; }
.num { text-align: right; }
.grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; }
.label { color: #555; font-size: 11px; text-transform: uppercase; }
.value { font-weight: 700; font-size: 14px; }
</style>
</head>
<body>
<h1>${escapeHtml(report.title)}</h1>
<div class="meta">
<p>${escapeHtml(translate("Generated"))}: ${escapeHtml(report.generated_display || "")}</p>
<p>${escapeHtml(translate("POS Profile"))}: ${escapeHtml(report.pos_profile || "")} · ${escapeHtml(translate("Shift"))}: ${escapeHtml(report.pos_opening_shift || "")}</p>
<p>${escapeHtml(translate("Cashier"))}: ${escapeHtml(report.cashier_name || "")}</p>
</div>
${invoiceRange}
<div class="section grid">
${gridRow(translate("Gross sales"), escapeHtml(formatMoney(summary.gross_sales, currency)))}
${gridRow(translate("Net shift total"), escapeHtml(formatMoney(summary.total_sales, currency)))}
${gridRow(translate("Transactions"), escapeHtml(summary.total_transactions))}
${gridRow(translate("Average sale"), escapeHtml(formatMoney(summary.average_transaction, currency)))}
${gridRow(translate("Returns"), `${escapeHtml(formatMoney(summary.returns_total, currency))} (${escapeHtml(summary.returns_count)})`)}
${gridRow(translate("Cash expected"), escapeHtml(formatMoney(summary.cash_expected?.company_currency_total, currency)))}
</div>
${openingRows ? `<div class="section"><strong>${escapeHtml(translate("Opening balances"))}</strong><table><thead><tr><th>${escapeHtml(translate("Mode"))}</th><th>${escapeHtml(translate("Amount"))}</th></tr></thead><tbody>${openingRows}</tbody></table></div>` : ""}
${paymentRows ? `<div class="section"><strong>${escapeHtml(translate("Payments by mode"))}</strong><table><thead><tr><th>${escapeHtml(translate("Mode"))}</th><th>${escapeHtml(translate("Amount"))}</th></tr></thead><tbody>${paymentRows}</tbody></table></div>` : ""}
<script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export function useShiftReading() {
	const dialogOpen = ref(false);
	const loading = ref(false);
	const report = ref<ShiftReadingReport | null>(null);
	const errorMessage = ref("");

	const translate = (text: string) =>
		typeof window !== "undefined" && window.__ ? window.__(text) : text;

	async function fetchReading(readingType: "x" | "z", posOpeningShift?: string) {
		loading.value = true;
		errorMessage.value = "";
		report.value = null;

		const method =
			readingType === "z"
				? "posawesome.posawesome.api.shift_readings.get_z_reading"
				: "posawesome.posawesome.api.shift_readings.get_x_reading";

		try {
			const res = await frappe.call({
				method,
				args: { pos_opening_shift: posOpeningShift || undefined },
			});
			report.value = res.message as ShiftReadingReport;
			dialogOpen.value = true;
		} catch (err: any) {
			errorMessage.value =
				err?.message || err?.exc || translate("Unable to load shift reading.");
			frappe?.msgprint?.({
				title: translate("Shift reading"),
				message: errorMessage.value,
				indicator: "red",
			});
		} finally {
			loading.value = false;
		}
	}

	function openXReading(posOpeningShift?: string) {
		return fetchReading("x", posOpeningShift);
	}

	function openZReading(posOpeningShift?: string) {
		return fetchReading("z", posOpeningShift);
	}

	function closeDialog() {
		dialogOpen.value = false;
	}

	function printReport(currency: string) {
		if (!report.value || report.value.blocked) {
			return;
		}
		const html = buildShiftReadingPrintHtml(report.value, currency, translate);
		const win = window.open("", "_blank");
		if (!win) {
			frappe?.msgprint?.(translate("Allow pop-ups to print the reading."));
			return;
		}
		win.document.write(html);
		win.document.close();
		win.focus();
	}

	return {
		dialogOpen,
		loading,
		report,
		errorMessage,
		openXReading,
		openZReading,
		closeDialog,
		printReport,
	};
}
