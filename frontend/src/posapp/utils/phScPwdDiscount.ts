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
	originalGrandTotal: number,
	totalPax: number,
	scPax: number,
): number {
	const total = Math.max(1, Math.floor(Number(totalPax) || 1));
	const senior = Math.max(0, Math.min(total, Math.floor(Number(scPax) || 0)));
	const regular = Math.max(0, total - senior);

	const sharedPerPerson = (Number(originalGrandTotal) || 0) / total;

	const regularBase = sharedPerPerson * regular;
	const regularSC = regularBase * 0.05;

	const seniorGrossShare = sharedPerPerson * senior;
	const seniorVatExemptBase = seniorGrossShare / 1.12;
	const seniorSC = seniorVatExemptBase * 0.05;

	return round2(regularSC + seniorSC);
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
		discount_amount: totalDeduction,
		apply_discount_on: "Grand Total",
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
