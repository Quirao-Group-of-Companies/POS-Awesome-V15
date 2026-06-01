<template>
	<v-row v-if="invoice_doc" class="invoice-totals-grid">
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Net Total')"
				class="sleek-field pos-themed-input"
				:model-value="formatCurrency(invoice_doc.net_total, displayCurrency)"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Tax and Charges')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.total_taxes_and_charges, displayCurrency)"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Total Amount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.grand_total, displayCurrency)"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="diff_label"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="
					formatCurrency(diff_payment < 0 ? -diff_payment : diff_payment, displayCurrency)
				"
				readonly
				:prefix="currencySymbol()"
				persistent-placeholder
			></v-text-field>
		</v-col>

		<!-- Philippine POS Breakdown -->
		<v-col v-if="posBreakdown" cols="12" class="pt-2">
			<div class="pos-breakdown">
				<div class="pos-breakdown__title">
					{{ frappe._("Amount Breakdown") }}
				</div>

				<div class="pos-breakdown__row">
					<span>{{ frappe._("Subtotal") }}</span>
					<strong>{{ formatCurrency(posBreakdown.subtotal) }}</strong>
				</div>

				<div class="pos-breakdown__row pos-breakdown__row--indent">
					<span>{{ frappe._("VATable Sales (excl. VAT)") }}</span>
					<span>{{ formatCurrency(posBreakdown.vatableSales) }}</span>
				</div>
				<div class="pos-breakdown__row pos-breakdown__row--indent">
					<span>{{ frappe._("VAT Exempt Sales") }}</span>
					<span>{{ formatCurrency(posBreakdown.vatExemptSales) }}</span>
				</div>

				<div class="pos-breakdown__row">
					<span>{{ frappe._("VAT (12%)") }}</span>
					<strong>{{ formatCurrency(posBreakdown.vatAmount) }}</strong>
				</div>

				<div v-if="posBreakdown.serviceCharge > 0" class="pos-breakdown__row">
					<span>{{ frappe._("Service Charge (5%)") }}</span>
					<strong>{{ formatCurrency(posBreakdown.serviceCharge) }}</strong>
				</div>

				<div class="pos-breakdown__divider"></div>

				<div
					v-if="posBreakdown.seniorDiscount > 0"
					class="pos-breakdown__row pos-breakdown__row--deduction"
				>
					<span>{{ frappe._("LESS: Senior/PWD Discount") }}</span>
					<strong class="text-error">
						&minus;{{ formatCurrency(posBreakdown.totalDiscount) }}
					</strong>
				</div>
				<div
					v-if="posBreakdown.vatExemptionAdjustment > 0"
					class="pos-breakdown__row pos-breakdown__row--deduction"
				>
					<span>{{ frappe._("LESS: VAT Exempt Adjustment") }}</span>
					<strong class="text-error">
						&minus;{{ formatCurrency(posBreakdown.vatExemptionAdjustment) }}
					</strong>
				</div>

				<div class="pos-breakdown__divider pos-breakdown__divider--thick"></div>

				<div class="pos-breakdown__row pos-breakdown__row--total">
					<span>{{ frappe._("Total Amount Due") }}</span>
					<strong class="text-primary">
						{{ formatCurrency(posBreakdown.grandTotal) }}
					</strong>
				</div>
			</div>
		</v-col>

		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Item / Rate Discounts')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(itemDiscountTotal)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			>
				<template #append-inner>
					<v-tooltip
						location="top"
						max-width="320"
						open-on-click
						open-on-focus
						open-on-hover
						:text="discountHelpText"
					>
						<template #activator="{ props: tooltipProps }">
							<button
								v-bind="tooltipProps"
								type="button"
								class="discount-help-trigger"
								:aria-label="frappe._('Discount clarity')"
								@click.stop
							>
								<v-icon icon="mdi-information-outline" size="18" />
							</button>
						</template>
					</v-tooltip>
				</template>
			</v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Additional Discount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.discount_amount)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Total Discount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(totalDiscountAmount)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col
			v-if="uiStore.posProfile?.custom_enable_service_charge === 1"
			cols="12"
			sm="6"
		>
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Service Charge (5%)')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(serviceChargeAmount, displayCurrency)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col v-if="invoice_doc" cols="12">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Special Discount')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(specialDiscountDisplay)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
		<v-col v-if="invoice_doc && invoice_doc.rounded_total" cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Rounded Total')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.rounded_total)"
				readonly
				:prefix="currencySymbol(invoice_doc.currency)"
				persistent-placeholder
			></v-text-field>
		</v-col>
	</v-row>
</template>

<script setup>
import { computed } from "vue";
import { useInvoiceStore } from "../../../stores/invoiceStore.js";
import { useUIStore } from "../../../stores/uiStore.js";
import { calculatePosBreakdownFromDoc } from "../../../utils/phScPwdDiscount.js";

const invoiceStore = useInvoiceStore();
const uiStore = useUIStore();

const props = defineProps({
	invoice_doc: Object,
	displayCurrency: String,
	diff_payment: Number,
	diff_label: String,
	itemDiscountTotal: {
		type: Number,
		default: 0,
	},
	currencySymbol: Function,
	formatCurrency: Function,
});

const frappe = window.frappe;

const serviceChargeAmount = computed(() =>
	Number(invoiceStore.invoiceDoc?.custom_service_charge_amount || 0),
);

const toNumber = (value) => {
	const parsed = Number(value || 0);
	return Number.isFinite(parsed) ? parsed : 0;
};

const totalDiscountAmount = computed(() => {
	const additional = Math.abs(toNumber(props.invoice_doc?.discount_amount));
	const itemDisc = Math.abs(toNumber(props.itemDiscountTotal));
	// Prefer invoice-level additional discount when set (includes SC/PWD total deduction).
	if (additional > 0) {
		return itemDisc + additional;
	}
	const scPwd =
		Math.abs(toNumber(props.invoice_doc?.custom_sc_discount_amount)) +
		Math.abs(toNumber(props.invoice_doc?.custom_vat_exempt_amount));
	return itemDisc + scPwd;
});

const specialDiscountDisplay = computed(() => {
	const sc = Math.abs(toNumber(props.invoice_doc?.custom_sc_discount_amount));
	const vat = Math.abs(toNumber(props.invoice_doc?.custom_vat_exempt_amount));
	if (sc > 0 || vat > 0) {
		return sc + vat;
	}
	return Math.abs(toNumber(props.invoice_doc?.custom_special_discount_amount));
});

const discountHelpText = computed(
	() =>
		`${frappe._("Item and rate discounts are already included in item rates and Net Total.")} ${frappe._("Additional Discount is the separate invoice-level discount.")}`,
);

const posBreakdown = computed(() => {
	const doc = props.invoice_doc;
	if (!doc) return null;
	const hasScPwd =
		Number(doc.custom_sc_pwd_pax) > 0 ||
		Number(doc.custom_sc_discount_amount) > 0 ||
		Number(doc.custom_service_charge_amount) > 0;
	if (!hasScPwd) return null;
	return calculatePosBreakdownFromDoc(doc);
});
</script>

<style scoped>
.invoice-totals-grid {
	margin: 0;
	row-gap: var(--pos-space-2);
}

.invoice-totals-grid :deep(.v-col) {
	padding-top: 0;
	padding-bottom: 0;
}

.invoice-totals-grid :deep(.v-field) {
	border-radius: var(--pos-radius-sm);
	background: var(--pos-surface-raised);
}

.discount-help-trigger {
	display: inline-flex;
	align-items: center;
	justify-content: center;
	width: 24px;
	height: 24px;
	margin-inline-start: 2px;
	border-radius: 999px;
	border: 0;
	background: transparent;
	color: rgb(var(--v-theme-info));
	cursor: help;
	transition:
		background-color 140ms ease,
		color 140ms ease;
}

.discount-help-trigger:hover,
.discount-help-trigger:focus-visible {
	background: rgba(var(--v-theme-info), 0.14);
	outline: none;
}

/* Philippine POS Breakdown */
.pos-breakdown {
	background: var(--pos-surface-raised, rgb(var(--v-theme-surface)));
	border: 1px solid rgba(var(--v-border-color), 0.15);
	border-radius: var(--pos-radius-sm, 8px);
	padding: var(--pos-space-2, 8px) var(--pos-space-3, 12px);
}

.pos-breakdown__title {
	font-size: 0.8rem;
	font-weight: 600;
	text-transform: uppercase;
	letter-spacing: 0.04em;
	color: rgba(var(--v-theme-on-surface), 0.6);
	margin-bottom: var(--pos-space-2, 8px);
}

.pos-breakdown__row {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 2px 0;
	font-size: 0.88rem;
}

.pos-breakdown__row--indent {
	padding-left: 1rem;
	font-size: 0.82rem;
	color: rgba(var(--v-theme-on-surface), 0.7);
}

.pos-breakdown__row--deduction {
	color: rgb(var(--v-theme-error));
}

.pos-breakdown__row--total {
	font-size: 1rem;
	font-weight: 700;
}

.pos-breakdown__divider {
	border-top: 1px dashed rgba(var(--v-border-color), 0.3);
	margin: 4px 0;
}

.pos-breakdown__divider--thick {
	border-top-width: 2px;
	border-style: solid;
	margin: 6px 0;
}
</style>
