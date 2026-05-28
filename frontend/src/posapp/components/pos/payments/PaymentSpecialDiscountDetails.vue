<template>
	<div v-if="invoiceDoc">
		<div class="payment-section__subsection">
			<h3 class="payment-section__title payment-section__title--subsection mb-2">
				{{ __("Special Discount Details") }}
			</h3>
		</div>
		<v-row class="pa-1 ma-0" dense>
			<v-col cols="12" class="pt-0">
				<v-select
					v-model="selectedDiscountType"
					variant="outlined"
					density="compact"
					hide-details
					:items="discountTypes"
					:label="__('Discount Type')"
					clearable
				/>
			</v-col>
			<v-col cols="12" sm="6" class="pb-0">
				<v-text-field
					v-model.number="localTotalPax"
					type="number"
					min="1"
					step="1"
					class="pa-0 sleek-field"
					variant="solo"
					density="compact"
					color="primary"
					:label="__('Total Pax')"
					:hint="totalPaxHint"
					persistent-hint
					hide-details
					@update:model-value="onTotalPaxChange"
				/>
			</v-col>
			<v-col
				v-if="isScPwdType"
				cols="12"
				sm="6"
				class="pb-0"
			>
				<v-text-field
					v-model.number="localScPax"
					type="number"
					min="1"
					:max="normalizedTotalPax"
					step="1"
					class="pa-0 sleek-field"
					variant="solo"
					density="compact"
					color="primary"
					:label="__('SC/PWD Pax')"
					hide-details
					:hint="__('Must be at least 1 for discount to apply')"
					persistent-hint
				/>
			</v-col>
			<v-col v-if="isScPwdType" cols="12" class="pb-0">
				<div class="patrons">
					<div
						v-for="(patron, index) in discountPatrons"
						:key="index"
						class="patron-card"
						:class="{ 'patron-card--stacked': effectiveScPax > 1 }"
					>
						<div class="patron-card__header text-caption">
							<strong>{{ __('Patron') }} {{ index + 1 }}</strong>
						</div>
						<v-row dense class="ma-0">
							<v-col cols="12" sm="4" class="pt-1 pb-0">
								<v-select
									v-model="patron.type"
									:items="discountTypes"
									variant="outlined"
									density="compact"
									hide-details
									:label="__('Type')"
									@update:model-value="syncMetaToStore"
								/>
							</v-col>
							<v-col cols="12" sm="4" class="pt-1 pb-0">
								<v-text-field
									v-model="patron.name"
									variant="solo"
									density="compact"
									hide-details
									class="pa-0 sleek-field"
									color="primary"
									:label="__('Name')"
									@update:model-value="syncMetaToStore"
								/>
							</v-col>
							<v-col cols="12" sm="4" class="pt-1 pb-0">
								<v-text-field
									v-model="patron.id"
									variant="solo"
									density="compact"
									hide-details
									class="pa-0 sleek-field"
									color="primary"
									:label="__('ID Number')"
									@update:model-value="syncMetaToStore"
								/>
							</v-col>
						</v-row>
					</div>
				</div>
			</v-col>

			<v-col
				v-if="isDiscountEligible && isScPwdType && scPwdBreakdown.totalDiscount > 0"
				cols="12"
				class="pt-0"
			>
				<div class="discount-preview text-caption">
					<div class="discount-preview__row">
						<span>{{ __("VAT Exemption") }}</span>
						<strong>{{ formatMoney(scPwdBreakdown.vatExempt) }}</strong>
					</div>
					<div class="discount-preview__row">
						<span>{{ __("20% SC/PWD Discount") }}</span>
						<strong>{{ formatMoney(scPwdBreakdown.scDiscount) }}</strong>
					</div>
					<div class="discount-preview__row discount-preview__row--total">
						<span>{{ __("Total deduction") }}</span>
						<strong>{{ formatMoney(scPwdBreakdown.totalDeduction) }}</strong>
					</div>
				</div>
			</v-col>

			<v-col v-if="isDiscountEligible" cols="12" class="pt-1 d-flex gap-2">
				<v-btn
					color="primary"
					variant="tonal"
					density="compact"
					size="small"
					:loading="saving"
					@click="handleSave"
				>
					{{ __("Apply Discount") }}
				</v-btn>
				<v-btn
					color="error"
					variant="tonal"
					density="compact"
					size="small"
					@click="handleClear"
				>
					{{ __("Clear") }}
				</v-btn>
			</v-col>

			<v-col v-if="isApplied" cols="12" class="pt-1">
				<div class="discount-summary text-caption text-success">
					<div class="discount-summary__title">
						✓ {{ __("Discount applied") }}: {{ selectedDiscountType }}
					</div>
					<div class="discount-preview__row">
						<span>{{ __("SC/PWD Discount") }}</span>
						<strong>{{ formatMoney(appliedScDiscount) }}</strong>
					</div>
					<div v-if="appliedVatExempt > 0" class="discount-preview__row">
						<span>{{ __("VAT Exempt") }}</span>
						<strong>{{ formatMoney(appliedVatExempt) }}</strong>
					</div>
				</div>
			</v-col>
		</v-row>
	</div>
</template>

<script setup>
import { ref, computed, watch, getCurrentInstance, onMounted, onBeforeUnmount } from "vue";
import { useInvoiceStore } from "../../../stores/invoiceStore.js";
import { useFormat } from "../../../format.ts";
import { capitalize } from "lodash";
import {
	applyPhScPwdDiscountToDoc,
	captureOriginalTotals,
	clearPhScPwdDiscountFromDoc,
	computePhScPwdBreakdownFromGrandTotal,
	computePhScPwdBreakdownFromItems,
	resolveTotalPaxFromDoc,
	round2,
} from "../../../utils/phScPwdDiscount.ts";

const props = defineProps({
	invoiceDoc: { type: Object, required: true },
});

const invoiceStore = useInvoiceStore();
const { formatCurrency, currencySymbol } = useFormat();
const instance = getCurrentInstance();
const eventBus = instance?.proxy?.eventBus;
const __ = window.__ || ((text) => text);
const frappe = window.frappe;

const discountTypes = ["Senior Citizen", "PWD"];
const selectedDiscountType = ref("");
const saving = ref(false);
const isApplied = ref(false);
const appliedScDiscount = ref(0);
const appliedVatExempt = ref(0);
const originalValues = ref(captureOriginalTotals(null));

const localTotalPax = ref(1);
const localScPax = ref(1);
const userAdjustedTotalPax = ref(false);

const discountPatrons = ref([]);

const normalizeDiscountType = (value) => {
	const type = String(value || "").trim();
	return type === "PWD" || type === "Senior Citizen" ? type : "Senior Citizen";
};

const childTableData = computed(() =>
	(discountPatrons.value || []).map((patron) => ({
		discount_type: normalizeDiscountType(patron?.type || selectedDiscountType.value),
		patron_name: String(patron?.name || "").trim(),
		id_number: String(patron?.id || "").trim(),
	})),
);

const ensurePatronCount = (desiredCount) => {
	const nextCount = Math.max(0, Math.floor(Number(desiredCount) || 0));
	const current = Array.isArray(discountPatrons.value) ? discountPatrons.value : [];
	if (current.length === nextCount) return;

	const defaultType = normalizeDiscountType(selectedDiscountType.value);
	const next = current.slice(0, nextCount);
	while (next.length < nextCount) {
		next.push({ type: defaultType, name: "", id: "" });
	}
	discountPatrons.value = next;
};

const parseExistingPatrons = (doc) => {
	const rows = Array.isArray(doc?.custom_special_discount_details)
		? doc.custom_special_discount_details
		: [];
	if (!rows.length) return null;

	return rows.map((row) => ({
		type: normalizeDiscountType(row?.discount_type || selectedDiscountType.value),
		name: String(row?.patron_name || "").trim(),
		id: String(row?.id_number || "").trim(),
	}));
};

const totalPaxHint = computed(() => {
	const count = Math.max(1, Math.floor(Number(props.invoiceDoc?.custom_customer_count ?? 1)));
	if (userAdjustedTotalPax.value) {
		return __("Adjusted from customer count ({0})", [count]);
	}
	return __("From customer count ({0}) — adjust if needed", [count]);
});

const normalizedTotalPax = computed(() =>
	Math.max(1, Math.floor(Number(localTotalPax.value) || 1)),
);

const effectiveScPax = computed(() => {
	if (!isScPwdType.value) return 0;
	const total = normalizedTotalPax.value;
	const raw = Math.floor(Number(localScPax.value) || 0);
	return Math.max(1, Math.min(total, raw));
});

const isScPwdType = computed(
	() =>
		selectedDiscountType.value === "Senior Citizen" ||
		selectedDiscountType.value === "PWD",
);

watch(
	() => [localScPax.value, normalizedTotalPax.value, isScPwdType.value],
	() => {
		if (!isScPwdType.value) {
			discountPatrons.value = [];
			return;
		}

		const total = normalizedTotalPax.value;
		let next = Math.floor(Number(localScPax.value) || 0);
		if (next < 1) next = 1;
		if (next > total) next = total;
		if (next !== localScPax.value) {
			localScPax.value = next;
			return;
		}

		ensurePatronCount(next);
		syncMetaToStore();
	},
	{ immediate: true },
);

const scPwdBreakdown = computed(() => {
	if (!isScPwdType.value) {
		return computePhScPwdBreakdownFromGrandTotal(0, 1, 0);
	}

	const storeItems = invoiceStore.items || [];
	const docItems = Array.isArray(props.invoiceDoc?.items) ? props.invoiceDoc.items : [];
	const items = storeItems.length ? storeItems : docItems;

	if (items.length) {
		return computePhScPwdBreakdownFromItems(
			items,
			normalizedTotalPax.value,
			effectiveScPax.value,
		);
	}

	const baseGrand = captureOriginalTotals(props.invoiceDoc).grand_total;
	return computePhScPwdBreakdownFromGrandTotal(
		baseGrand,
		normalizedTotalPax.value,
		effectiveScPax.value,
	);
});

const isDiscountEligible = computed(
	() =>
		Boolean(selectedDiscountType.value?.trim()) &&
		(!isScPwdType.value || effectiveScPax.value >= 1) &&
		(discountPatrons.value || []).length === effectiveScPax.value &&
		(discountPatrons.value || []).every(
			(p) => String(p?.name || "").trim() && String(p?.id || "").trim(),
		),
);

const formatMoney = (value) => {
	const currency = props.invoiceDoc?.currency || "";
	const symbol = currencySymbol(currency);
	return `${symbol} ${formatCurrency(round2(value))}`;
};

const syncPaymentsToGrandTotal = (doc, grandTotal) => {
	const payments = Array.isArray(doc?.payments) ? doc.payments.map((p) => ({ ...p })) : [];
	const defaultPayment = payments.find((p) => p.default === 1) || payments[0];
	if (!defaultPayment) return payments;

	const otherPaymentsTotal = payments
		.filter((p) => p !== defaultPayment)
		.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

	defaultPayment.amount = round2(Math.max(grandTotal - otherPaymentsTotal, 0));
	return payments;
};

const loadPaxFromDoc = (doc) => {
	if (!doc) return;
	localTotalPax.value = resolveTotalPaxFromDoc(doc, {
		userAdjusted: userAdjustedTotalPax.value,
	});
	const scFromDoc = Math.floor(Number(doc.custom_sc_pwd_pax ?? 0));
	localScPax.value = scFromDoc > 0 ? scFromDoc : isScPwdType.value ? 1 : 0;
};

const syncTotalPaxFromCustomerCount = (doc = props.invoiceDoc, { force = false } = {}) => {
	if (!doc) return;
	if (!force && (userAdjustedTotalPax.value || isApplied.value)) return;

	const next = resolveTotalPaxFromDoc(doc, { userAdjusted: false });
	if (localTotalPax.value !== next) {
		localTotalPax.value = next;
		syncMetaToStore();
	}
};

const onTotalPaxChange = (value) => {
	userAdjustedTotalPax.value = true;
	const next = Math.max(1, Math.floor(Number(value) || 1));
	localTotalPax.value = next;
	syncMetaToStore();
};

const onPaymentOpen = () => {
	userAdjustedTotalPax.value = false;
	const doc = invoiceStore.invoiceDoc || props.invoiceDoc;
	syncTotalPaxFromCustomerCount(doc, { force: true });
	loadPaxFromDoc(doc);
};

onMounted(() => {
	eventBus?.on?.("send_invoice_doc_payment", onPaymentOpen);
});

onBeforeUnmount(() => {
	eventBus?.off?.("send_invoice_doc_payment", onPaymentOpen);
});

const refreshFromDoc = (doc) => {
	if (!doc) return;
	originalValues.value = captureOriginalTotals(doc);
	loadPaxFromDoc(doc);
	const applied = round2(doc.custom_sc_discount_amount) > 0 || round2(doc.discount_amount) > 0;
	isApplied.value = applied;
	appliedScDiscount.value = round2(doc.custom_sc_discount_amount);
	appliedVatExempt.value = round2(doc.custom_vat_exempt_amount);
};

watch(
	() => props.invoiceDoc?.name,
	() => refreshFromDoc(props.invoiceDoc),
	{ immediate: true },
);

watch(
	() => props.invoiceDoc?.custom_customer_count,
	() => syncTotalPaxFromCustomerCount(props.invoiceDoc),
);

watch(
	() => props.invoiceDoc?.custom_special_discount_type,
	(val) => {
		selectedDiscountType.value = val || "";
	},
	{ immediate: true },
);

watch(selectedDiscountType, (type) => {
	if ((type === "Senior Citizen" || type === "PWD") && localScPax.value < 1) {
		localScPax.value = 1;
	}
	// Default any empty patron types to the newly selected type.
	const nextType = normalizeDiscountType(type);
	discountPatrons.value = (discountPatrons.value || []).map((p) => ({
		...p,
		type: p?.type ? normalizeDiscountType(p.type) : nextType,
	}));
	syncMetaToStore();
});

watch(
	() => effectiveScPax.value,
	(next) => {
		if (!isScPwdType.value) {
			discountPatrons.value = [];
			return;
		}
		ensurePatronCount(next);
	},
	{ immediate: true },
);

const syncMetaToStore = () => {
	invoiceStore.mergeInvoiceDoc({
		custom_special_discount_type: selectedDiscountType.value,
		custom_special_discount_details: childTableData.value,
		custom_total_pax: normalizedTotalPax.value,
		custom_sc_pwd_pax: isScPwdType.value ? effectiveScPax.value : 0,
	});
};

const handleSave = () => {
	if (!isDiscountEligible.value) return;

	const breakdown = scPwdBreakdown.value;
	if (breakdown.totalDeduction <= 0) {
		frappe?.msgprint?.(
			__(
				"SC/PWD discount is zero. Set SC/PWD Pax to at least 1 and click Apply again.",
			),
		);
		return;
	}

	saving.value = true;

	const currentDoc = { ...(invoiceStore.invoiceDoc || props.invoiceDoc || {}) };
	const original = captureOriginalTotals(currentDoc);
	originalValues.value = original;

	const patched = applyPhScPwdDiscountToDoc(currentDoc, original, breakdown, {
		discountType: selectedDiscountType.value,
		totalPax: normalizedTotalPax.value,
		scPax: effectiveScPax.value,
	});

	patched.payments = syncPaymentsToGrandTotal(patched, patched.grand_total);
	invoiceStore.setInvoiceDoc(patched);

	appliedScDiscount.value = breakdown.scDiscount;
	appliedVatExempt.value = breakdown.vatExempt;
	isApplied.value = true;
	saving.value = false;

	eventBus?.emit?.("payment_invoice_totals_updated");
};

const handleClear = () => {
	const currentDoc = { ...(invoiceStore.invoiceDoc || props.invoiceDoc || {}) };
	const original = captureOriginalTotals(currentDoc);
	const cleared = clearPhScPwdDiscountFromDoc(currentDoc, original);
	cleared.payments = syncPaymentsToGrandTotal(cleared, cleared.grand_total);
	cleared.custom_special_discount_details = [];

	invoiceStore.setInvoiceDoc(cleared);

	selectedDiscountType.value = "";
	discountPatrons.value = [];
	isApplied.value = false;
	appliedScDiscount.value = 0;
	appliedVatExempt.value = 0;
	localScPax.value = 1;
	userAdjustedTotalPax.value = false;
	originalValues.value = original;
	syncTotalPaxFromCustomerCount(cleared, { force: true });

	eventBus?.emit?.("payment_invoice_totals_updated");
};

watch(
	() => props.invoiceDoc?.custom_special_discount_details,
	() => {
		const existing = parseExistingPatrons(props.invoiceDoc);
		if (!existing) return;
		discountPatrons.value = existing;
	},
	{ immediate: true },
);
</script>

<style scoped>
.discount-preview,
.discount-summary {
	padding: 8px 10px;
	border-radius: 8px;
	background: rgba(var(--v-theme-surface-variant), 0.35);
	color: var(--pos-text-primary, #fff);
}

.discount-preview {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.discount-summary {
	display: flex;
	flex-direction: column;
	gap: 4px;
}

.discount-summary__title {
	margin-bottom: 2px;
}

.discount-preview__row {
	display: flex;
	align-items: baseline;
	justify-content: space-between;
	gap: 12px;
}

.discount-preview__row--total {
	padding-top: 4px;
	border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.patrons {
	display: flex;
	flex-direction: column;
	gap: 8px;
}

.patron-card {
	padding: 8px 10px;
	border-radius: 8px;
	background: rgba(var(--v-theme-surface-variant), 0.22);
	border: 1px solid rgba(255, 255, 255, 0.10);
}

.patron-card--stacked {
	background: rgba(var(--v-theme-surface-variant), 0.28);
}

.patron-card__header {
	display: flex;
	align-items: center;
	justify-content: space-between;
	margin-bottom: 4px;
	color: rgba(255, 255, 255, 0.82);
}
</style>
