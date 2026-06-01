/**
 * Philippine Senior Citizen / PWD prorated discount (12% VAT-inclusive, 20% on VAT-exclusive share).
 */

export type PhScPwdBreakdown = {
	seniorShare: number;
	vatableShare: number;
	vatExempt: number;
	scDiscount: number;
	totalDiscount: number;
	totalDeduction: number;
};

export type PhScPwdOriginalTotals = {
	net_total: number;
	total: number;
	grand_total: number;
	total_taxes_and_charges: number;
};

export type InvoiceLine = {
	amount?: number;
	qty?: number;
	rate?: number;
};

const VAT_RATE = 0.12;

export const round2 = (value: unknown): number => {
	const n = Number(value);
	if (!Number.isFinite(n)) return 0;
	return Math.round((n + Number.EPSILON) * 100) / 100;
};

export function hasScPwdDiscountApplied(doc: Record<string, unknown> | null | undefined): boolean {
	if (!doc) return false;
	return (
		round2(doc.custom_sc_discount_amount) > 0 ||
		(Boolean(doc.custom_special_discount_type) && round2(doc.discount_amount) > 0)
	);
}

/** Total Pax on payment: default from POS customer count unless already discounted or manually overridden. */
export function resolveTotalPaxFromDoc(
	doc: Record<string, unknown> | null | undefined,
	options: { userAdjusted?: boolean } = {},
): number {
	if (!doc) return 1;

	const customerCount = Math.max(1, Math.floor(Number(doc.custom_customer_count ?? 1)));

	if (!options.userAdjusted && !hasScPwdDiscountApplied(doc)) {
		return customerCount;
	}

	const saved = Math.floor(Number(doc.custom_total_pax ?? 0));
	return saved > 0 ? Math.max(1, saved) : customerCount;
}

const lineGross = (item: InvoiceLine): number => {
	const amount = Number(item?.amount);
	if (Number.isFinite(amount) && amount !== 0) {
		return amount;
	}
	return Number(item?.qty || 0) * Number(item?.rate || 0);
};

export function computePhScPwdBreakdownFromItems(
	items: InvoiceLine[],
	totalPax: number,
	scPax: number,
): PhScPwdBreakdown {
	const total = Math.max(1, Math.floor(Number(totalPax) || 1));
	const sc = Math.max(0, Math.min(total, Math.floor(Number(scPax) || 0)));

	if (sc < 1) {
		return emptyBreakdown();
	}

	const ratio = sc / total;
	let vatExemptTotal = 0;
	let scDiscountTotal = 0;
	let seniorShareTotal = 0;

	for (const item of items || []) {
		const grossAmount = lineGross(item);
		if (!grossAmount) continue;

		const seniorShare = grossAmount * ratio;
		const vatableShare = seniorShare / (1 + VAT_RATE);
		const vatExempt = seniorShare - vatableShare;
		const scDiscount = vatableShare * 0.2;

		seniorShareTotal += seniorShare;
		vatExemptTotal += vatExempt;
		scDiscountTotal += scDiscount;
	}

	return finalizeBreakdown(seniorShareTotal, vatExemptTotal, scDiscountTotal);
}

/** Fallback when line items are unavailable — uses invoice grand total. */
export function computePhScPwdBreakdownFromGrandTotal(
	grandTotal: number,
	totalPax: number,
	scPax: number,
): PhScPwdBreakdown {
	const total = Math.max(1, Math.floor(Number(totalPax) || 1));
	const sc = Math.max(0, Math.min(total, Math.floor(Number(scPax) || 0)));

	if (sc < 1 || !Number.isFinite(Number(grandTotal)) || Number(grandTotal) <= 0) {
		return emptyBreakdown();
	}

	const seniorShare = (Number(grandTotal) / total) * sc;
	const vatableShare = seniorShare / (1 + VAT_RATE);
	const vatExempt = seniorShare - vatableShare;
	const scDiscount = vatableShare * 0.2;

	return finalizeBreakdown(seniorShare, vatExempt, scDiscount);
}

function emptyBreakdown(): PhScPwdBreakdown {
	return {
		seniorShare: 0,
		vatableShare: 0,
		vatExempt: 0,
		scDiscount: 0,
		totalDiscount: 0,
		totalDeduction: 0,
	};
}

function finalizeBreakdown(
	seniorShare: number,
	vatExempt: number,
	scDiscount: number,
): PhScPwdBreakdown {
	const vat = round2(vatExempt);
	const sc = round2(scDiscount);
	return {
		seniorShare: round2(seniorShare),
		vatableShare: round2(seniorShare / (1 + VAT_RATE)),
		vatExempt: vat,
		scDiscount: sc,
		totalDiscount: sc,
		totalDeduction: round2(vat + sc),
	};
}

/** 5% service charge: regular pax on VAT-inclusive share; SC/PWD pax on VAT-exclusive share. */
export function computePhServiceCharge(
	baseAmount: number,
	totalPax: number,
	scPax: number,
): number {
	const total = Math.max(1, Math.floor(Number(totalPax) || 1));
	const senior = Math.max(0, Math.min(total, Math.floor(Number(scPax) || 0)));
	const regular = Math.max(0, total - senior);

	const sharedPerPerson = (Number(baseAmount) || 0) / total;

	const regularBase = sharedPerPerson * regular;
	const regularSC = regularBase * 0.05;

	const seniorGrossShare = sharedPerPerson * senior;
	const seniorVatExemptBase = seniorGrossShare / 1.12;
	const seniorSC = seniorVatExemptBase * 0.05;

	return round2(regularSC + seniorSC);
}

export type DiscountSplit = {
	seniorAmount: number;
	pwdAmount: number;
};

/** Split total discount proportionally by patron type (Senior Citizen vs PWD) with safe rounding. */
export function splitDiscountByPatronType(
	totalDiscount: number,
	patrons: Array<{ type?: string }>,
): DiscountSplit {
	const absDiscount = Math.abs(Number(totalDiscount) || 0);
	if (absDiscount <= 0) {
		return { seniorAmount: 0, pwdAmount: 0 };
	}

	const patronsArr = Array.isArray(patrons) ? patrons : [];
	const seniorCount = patronsArr.filter(
		(p) => String(p?.type || "").trim() === "Senior Citizen",
	).length;
	const pwdCount = patronsArr.filter(
		(p) => String(p?.type || "").trim() === "PWD",
	).length;

	if (seniorCount === 0 && pwdCount === 0) {
		return { seniorAmount: round2(absDiscount), pwdAmount: 0 };
	}
	if (seniorCount === 0) {
		return { seniorAmount: 0, pwdAmount: round2(absDiscount) };
	}
	if (pwdCount === 0) {
		return { seniorAmount: round2(absDiscount), pwdAmount: 0 };
	}

	const totalPax = seniorCount + pwdCount;
	const perPax = absDiscount / totalPax;

	let pwdAmount = round2(perPax * pwdCount);
	let seniorAmount = round2(absDiscount - pwdAmount);

	const sum = round2(pwdAmount + seniorAmount);
	if (Math.abs(sum - round2(absDiscount)) > 0.01) {
		if (pwdAmount >= seniorAmount) {
			pwdAmount = round2(pwdAmount + round2(absDiscount) - sum);
		} else {
			seniorAmount = round2(seniorAmount + round2(absDiscount) - sum);
		}
	}

	return { seniorAmount, pwdAmount };
}

export function captureOriginalTotals(doc: Record<string, unknown> | null | undefined): PhScPwdOriginalTotals {
	if (!doc) {
		return { net_total: 0, total: 0, grand_total: 0, total_taxes_and_charges: 0 };
	}

	const hasStoredOriginal =
		doc.custom_original_grand_total != null && doc.custom_original_grand_total !== "";

	return {
		net_total: round2(
			hasStoredOriginal ? doc.custom_original_net_total : doc.net_total,
		),
		total: round2(hasStoredOriginal ? doc.custom_original_total : doc.total),
		grand_total: round2(
			hasStoredOriginal ? doc.custom_original_grand_total : doc.grand_total,
		),
		total_taxes_and_charges: round2(
			hasStoredOriginal
				? doc.custom_original_total_taxes_and_charges
				: doc.total_taxes_and_charges,
		),
	};
}

export function applyPhScPwdDiscountToDoc(
	doc: Record<string, any>,
	original: PhScPwdOriginalTotals,
	breakdown: PhScPwdBreakdown,
	meta: {
		discountType: string;
		totalPax: number;
		scPax: number;
		serviceCharge?: number;
	},
): Record<string, any> {
	const { scDiscount, vatExempt, totalDeduction } = breakdown;
	const serviceCharge = round2(meta.serviceCharge || 0);

	return {
		...doc,
		custom_original_net_total: original.net_total,
		custom_original_total: original.total,
		custom_original_grand_total: original.grand_total,
		custom_original_total_taxes_and_charges: original.total_taxes_and_charges,
		custom_special_discount_type: meta.discountType,
		custom_special_discount_amount: scDiscount,
		custom_total_pax: meta.totalPax,
		custom_sc_pwd_pax: meta.scPax,
		custom_sc_discount_amount: scDiscount,
		custom_vat_exempt_amount: vatExempt,
		custom_service_charge_amount: serviceCharge,
		posa_service_charge: serviceCharge,
		net_total: round2(original.net_total - scDiscount),
		total_taxes_and_charges: round2(
			original.total_taxes_and_charges - vatExempt + serviceCharge,
		),
		total: round2(original.total - totalDeduction + serviceCharge),
		grand_total: round2(original.grand_total - totalDeduction + serviceCharge),
	};
}

export function clearPhScPwdDiscountFromDoc(
	doc: Record<string, any>,
	original: PhScPwdOriginalTotals,
): Record<string, any> {
	return {
		...doc,
		custom_special_discount_type: "",
		custom_special_discount_amount: 0,
		custom_sc_discount_amount: 0,
		custom_vat_exempt_amount: 0,
		custom_sc_pwd_pax: 0,
		custom_service_charge_amount: 0,
		posa_service_charge: 0,
		net_total: original.net_total,
		total: original.total,
		total_taxes_and_charges: original.total_taxes_and_charges,
		grand_total: original.grand_total,
		discount_amount: 0,
		apply_discount_on: "Grand Total",
		custom_original_net_total: null,
		custom_original_total: null,
		custom_original_grand_total: null,
		custom_original_total_taxes_and_charges: null,
	};
}

// ---------------------------------------------------------------------------
// Single source of truth – POS breakdown display
// ---------------------------------------------------------------------------

export type PosBreakdown = {
	subtotal: number;
	vatableSales: number;
	vatExemptSales: number;
	vatAmount: number;
	serviceCharge: number;
	seniorDiscount: number;
	pwdDiscount: number;
	totalDiscount: number;
	vatExemptionAdjustment: number;
	totalDeduction: number;
	grandTotal: number;
};

/**
 * Single source of truth for POS UI breakdown.
 *
 * Given an invoice doc and its pax metadata, returns the full set of
 * computed values that exactly match the final posted POS Invoice.
 *
 * Call this function EVERYWHERE that displays totals:
 *   - POS screen (InvoiceTotals / payment screen)
 *   - Receipt / offline print template
 *   - Before-submit preview
 *   - After-submit invoice view
 */
export function calculatePosBreakdown(
	items: InvoiceLine[],
	totalPax: number,
	scPax: number,
	pwdPax: number = 0,
	serviceChargeAmount?: number,
): PosBreakdown | null {
	const effectiveTotal = Math.max(1, Math.floor(Number(totalPax) || 1));
	const senior = Math.max(0, Math.min(effectiveTotal, Math.floor(Number(scPax) || 0)));
	const pwd = Math.max(0, Math.min(effectiveTotal - senior, Math.floor(Number(pwdPax) || 0)));
	const regular = Math.max(0, effectiveTotal - senior - pwd);

	if (!Array.isArray(items) || items.length === 0) {
		return null;
	}

	let subtotal = 0;
	let seniorShareTotal = 0;
	let pwdShareTotal = 0;
	let regularShareTotal = 0;

	for (const item of items) {
		const gross = lineGross(item);
		if (!gross) continue;
		subtotal += gross;
		const perPax = gross / effectiveTotal;
		seniorShareTotal += perPax * senior;
		pwdShareTotal += perPax * pwd;
		regularShareTotal += perPax * regular;
	}

	const seniorVatExclusive = seniorShareTotal / (1 + VAT_RATE);
	const pwdVatExclusive = pwdShareTotal / (1 + VAT_RATE);
	const regularVatExclusive = regularShareTotal / (1 + VAT_RATE);

	const vatableSales = regularVatExclusive;
	const vatExemptSales = seniorVatExclusive + pwdVatExclusive;
	const vatAmount = vatableSales * VAT_RATE;

	const seniorDiscount = seniorVatExclusive * 0.2;
	const pwdDiscount = pwdVatExclusive * 0.2;

	const vatExemptionAdjustment =
		(seniorShareTotal + pwdShareTotal) - vatExemptSales;

	const sc = serviceChargeAmount != null
		? serviceChargeAmount
		: computePhServiceCharge(subtotal, effectiveTotal, senior);

	const grandTotal = round2(
		subtotal + sc - seniorDiscount - pwdDiscount - vatExemptionAdjustment,
	);

	return {
		subtotal: round2(subtotal),
		vatableSales: round2(vatableSales),
		vatExemptSales: round2(vatExemptSales),
		vatAmount: round2(vatAmount),
		serviceCharge: round2(sc),
		seniorDiscount: round2(seniorDiscount),
		pwdDiscount: round2(pwdDiscount),
		totalDiscount: round2(seniorDiscount + pwdDiscount),
		vatExemptionAdjustment: round2(vatExemptionAdjustment),
		totalDeduction: round2(seniorDiscount + pwdDiscount + vatExemptionAdjustment),
		grandTotal,
	};
}

/**
 * Convenience wrapper for `calculatePosBreakdown` that reads directly from an
 * invoice doc (store / backend response) so any component can call it with
 * `invoice` and get the breakdown without manually wiring pax values.
 */
export function calculatePosBreakdownFromDoc(
	invoice: Record<string, any> | null | undefined,
	serviceChargeAmount?: number,
): PosBreakdown | null {
	if (!invoice) return null;

	const items = Array.isArray(invoice.items)
		? invoice.items
		: invoice.item_list
			? invoice.item_list
			: [];
	if (items.length === 0) return null;

	const totalPax = Math.floor(Number(invoice.custom_total_pax ?? invoice.custom_customer_count ?? 1)) || 1;
	const scPax = Math.floor(Number(invoice.custom_sc_pwd_pax ?? 0)) || 0;

	let seniorCount = scPax;
	let pwdCount = 0;

	const details = Array.isArray(invoice.custom_special_discount_details)
		? invoice.custom_special_discount_details
		: [];
	if (details.length > 0) {
		seniorCount = details.filter(
			(r: any) => String(r.discount_type || "").trim() === "Senior Citizen",
		).length;
		pwdCount = details.filter(
			(r: any) => String(r.discount_type || "").trim() === "PWD",
		).length;
	}

	return calculatePosBreakdown(
		items,
		totalPax,
		seniorCount,
		pwdCount,
		serviceChargeAmount ?? invoice.posa_service_charge ?? invoice.custom_service_charge_amount,
	);
}
