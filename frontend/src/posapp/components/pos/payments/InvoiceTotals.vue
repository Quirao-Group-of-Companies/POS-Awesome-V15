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
				:model-value="formatCurrency(invoice_doc.total, displayCurrency)"
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
		<v-col cols="12" sm="6">
			<v-text-field
				density="compact"
				variant="solo"
				color="primary"
				:label="frappe._('Grand Total')"
				class="sleek-field pos-themed-input"
				hide-details
				:model-value="formatCurrency(invoice_doc.grand_total)"
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
</style>
