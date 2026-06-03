import {
	getPrintTemplate,
	getTermsAndConditions,
	memoryInitPromise,
} from "./offline/index";
import nunjucks from "nunjucks";
import { calculatePosBreakdownFromDoc } from "./posapp/utils/phScPwdDiscount";

declare const frappe: any;

function normaliseTemplate(template: string) {
	if (!template) return template;
	return template.replace(/"""([\s\S]*?)"""/g, (_, str) => {
		const escaped = str
			.replace(/\\/g, "\\\\")
			.replace(/"/g, '\\"')
			.replace(/\r?\n/g, "\\n");
		return `"${escaped}"`;
	});
}

function attachFormatter(obj: any) {
	if (!obj || typeof obj !== "object" || obj.get_formatted) return;
	obj.get_formatted = function (field: string) {
		return this?.[field];
	};
}

function computePaidAmount(doc: any) {
	if (!doc) return 0;

	const paymentsTotal = (doc.payments || []).reduce(
		(sum: number, p: any) => sum + Math.abs(parseFloat(p.amount) || 0),
		0,
	);

	const creditSale =
		doc.is_credit_sale === true ||
		doc.is_credit_sale === 1 ||
		doc.is_credit_sale === "1" ||
		String(doc.is_credit_sale).toLowerCase() === "yes";

	if (creditSale || paymentsTotal === 0) {
		return 0;
	}

	const base = doc.paid_amount ?? doc.grand_total ?? 0;
	return paymentsTotal || base;
}

function defaultOfflineHTML(invoice: any, terms = "") {
	if (!invoice) return "";

	const itemsRows = (invoice.items || [])
		.map((it: any) => {
			const sn = it.serial_no
				? `<div class="serial">SR.No: ${it.serial_no.replace(/\n/g, ", ")}</div>`
				: "";
			const marker =
				invoice.posa_show_custom_name_marker_on_print &&
				it.name_overridden
					? " (custom)"
					: "";
			return `<tr>
                <td>${it.item_code}${
					it.item_name && it.item_name !== it.item_code
						? `<div class="item-name">${it.item_name}${marker}</div>`
						: ""
				}${sn}</td>
                <td class="qty">${it.qty} ${it.uom || ""}</td>
                <td class="rate">${it.rate}</td>
                <td class="amount">${it.amount}</td>
            </tr>`;
		})
		.join("");

	const breakdown =
		invoice.custom_sc_pwd_pax > 0 || invoice.custom_sc_discount_amount > 0
			? (() => {
					const bd = calculatePosBreakdownFromDoc(invoice);
					if (!bd) return "";
					return `<table class="breakdown">
                <tbody>
                    <tr><td class="bd-label">Subtotal</td><td class="bd-value">${bd.subtotal}</td></tr>
                    <tr><td class="bd-label bd-indent">VATable Sales (excl. VAT)</td><td class="bd-value">${bd.vatableSales}</td></tr>
                    <tr><td class="bd-label bd-indent">VAT Exempt Sales</td><td class="bd-value">${bd.vatExemptSales}</td></tr>
                    <tr><td class="bd-label">VAT (12%)</td><td class="bd-value">${bd.vatAmount}</td></tr>
                    ${bd.serviceCharge > 0 ? `<tr><td class="bd-label">Service Charge (5%)</td><td class="bd-value">${bd.serviceCharge}</td></tr>` : ""}
                    <tr><td colspan="2" class="bd-divider"></td></tr>
                    ${bd.totalDiscount > 0 ? `<tr><td class="bd-label bd-deduct">LESS: Senior/PWD Discount</td><td class="bd-value bd-deduct">${bd.totalDiscount}</td></tr>` : ""}
                    ${bd.vatExemptionAdjustment > 0 ? `<tr><td class="bd-label bd-deduct">LESS: VAT Exempt Adjustment</td><td class="bd-value bd-deduct">${bd.vatExemptionAdjustment}</td></tr>` : ""}
                    <tr><td colspan="2" class="bd-divider bd-divider-thick"></td></tr>
                    <tr><td class="bd-label bd-total">Total Amount Due</td><td class="bd-value bd-total">${bd.grandTotal}</td></tr>
                </tbody>
            </table>`;
				})()
			: "";

	const taxesRows = (invoice.taxes || [])
		.map(
			(row: any) => `<tr>
                <td style="width:60%">${row.description}@${row.rate}%</td>
                <td style="width:40%; text-align:right;">${row.tax_amount}</td>
            </tr>`,
		)
		.join("");

	const discountRow = invoice.discount_amount
		? `<tr>
                <td style="width:60%">Discount</td>
                <td style="width:40%; text-align:right;">${invoice.discount_amount}</td>
            </tr>`
		: "";

	const changeRow = invoice.change_amount
		? `<tr>
                <td style="width:60%">Change Amount</td>
                <td style="width:40%; text-align:right;">${invoice.change_amount}</td>
            </tr>`
		: "";

	const termsSection = terms
		? `<div class="terms"><strong>Terms & Conditions</strong><div>${terms}</div></div>`
		: "";

	const paidAmount = computePaidAmount(invoice);

	return `<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Invoice ${invoice.name || ""}</title>
    <style>
        body { font-family: Arial, sans-serif; width: 80mm; margin: 0 auto; padding: 5mm; }
        .header { text-align: center; }
        .header h2 { margin: 0; }
        .info { margin-bottom: 4px; }
        .info div { font-size: 12px; line-height: 1.2; }
        table { width: 100%; border-collapse: collapse; }
        th, td { font-size: 12px; padding: 4px 0; border-bottom: 1px dashed #ccc; }
        th { text-align: left; }
        td.qty, td.rate, td.amount { text-align: right; }
        table.totals td { border-bottom: none; }
        .bd-label { text-align: left; }
        .bd-value { text-align: right; }
        .bd-indent { padding-left: 1rem; font-size: 11px; }
        .bd-deduct { color: #c00; }
        .bd-total { font-weight: bold; font-size: 13px; }
        .bd-divider { border-bottom: 1px dashed #aaa; padding: 0; }
        .bd-divider-thick { border-bottom: 2px solid #333; }
        table.breakdown { width: 100%; margin-top: 6px; }
        table.breakdown td { font-size: 12px; padding: 2px 0; border: none; }
        .terms { margin-top: 8px; font-size: 10px; }
        .footer { text-align: center; margin-top: 8px; font-size: 11px; }
    </style>
</head>
<body>
    <div class="header">
        <h2>${invoice.company || "Invoice"}</h2>
        <p><strong>${invoice.is_duplicate ? "Duplicate" : "Original"}</strong></p>
    </div>
    <div class="info">
        <div><strong>Invoice:</strong> ${invoice.name || ""}</div>
        <div><strong>Date:</strong> ${invoice.posting_date || ""} ${invoice.posting_time || ""}</div>
        <div><strong>Customer:</strong> ${invoice.customer_name || invoice.customer || ""}</div>
        <div><strong>Mobile:</strong> ${invoice.contact_mobile || ""}</div>
        <div><strong>Additional Note:</strong> ${invoice.posa_notes || ""}</div>
        ${invoice.posa_authorization_code ? `<div><strong>Authorization Code:</strong> ${invoice.posa_authorization_code}</div>` : ""}
    </div>
    <table class="items">
        <thead>
            <tr>
                <th style="width:40%">Item</th>
                <th style="width:20%; text-align:right;">Qty</th>
                <th style="width:20%; text-align:right;">Rate</th>
                <th style="width:20%; text-align:right;">Amt</th>
            </tr>
        </thead>
        <tbody>${itemsRows}</tbody>
    </table>
    ${breakdown}
    <table class="totals">
        <tbody>
            ${taxesRows}
            ${discountRow}
            <tr>
                <td style="width:60%"><strong>Total</strong></td>
                <td style="width:40%; text-align:right;">${invoice.grand_total}</td>
            </tr>
            <tr>
                <td style="width:60%">Paid</td>
                <td style="width:40%; text-align:right;">${paidAmount}</td>
            </tr>
            ${changeRow}
        </tbody>
    </table>
    ${termsSection}
    <div class="footer">Thank you, please visit again.</div>
</body>
</html>`;
}

export default async function renderOfflineInvoiceHTML(invoice: any) {
	if (!invoice) return "";

	await memoryInitPromise;

	const template = normaliseTemplate(getPrintTemplate());
	const terms = getTermsAndConditions();
	const doc = {
		...invoice,
		terms: invoice.terms || terms,
		terms_and_conditions: invoice.terms_and_conditions || terms,
	};

	doc.paid_amount = computePaidAmount(doc);
	attachFormatter(doc);
	(doc.items || []).forEach(attachFormatter);
	(doc.taxes || []).forEach(attachFormatter);

	if (!template) {
		console.warn(
			"No offline print template cached; using fallback template",
		);
		return defaultOfflineHTML(doc, doc.terms_and_conditions);
	}

	try {
		const env = nunjucks.configure({ autoescape: false });
		env.addFilter("format_currency", (value: unknown, currency: string) => {
			const number =
				typeof value === "number" ? value : parseFloat(String(value));
			if (Number.isNaN(number)) return value;
			try {
				return new Intl.NumberFormat(undefined, {
					style: currency ? "currency" : "decimal",
					currency: currency || undefined,
				}).format(number);
			} catch {
				return currency ? `${currency} ${number}` : String(number);
			}
		});
		env.addFilter("currency", (value: unknown, currency: string) =>
			(env as any).filters.format_currency(value, currency),
		);
		(env as any).getFilter = function (name: string) {
			return (this as any).filters[name] || ((v: unknown) => v);
		};

		const context = {
			doc,
			terms: doc.terms,
			terms_and_conditions: doc.terms_and_conditions,
			_: frappe?._ ? frappe._ : (t: string) => t,
			frappe: {
				db: { get_value: () => "", sql: () => [] },
				get_list: () => [],
			},
		};
		return env.renderString(template, context);
	} catch (e) {
		console.error("Failed to render offline invoice", e);
		return defaultOfflineHTML(doc, doc.terms_and_conditions);
	}
}
