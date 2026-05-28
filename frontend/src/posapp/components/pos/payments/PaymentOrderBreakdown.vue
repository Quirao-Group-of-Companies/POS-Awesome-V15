<template>
	<v-card
		v-if="orderLines.length"
		flat
		color="surface"
		class="payment-order-breakdown-card pos-themed-card pa-2"
		:aria-label="__('Order Breakdown')"
	>
		<div class="payment-order-breakdown__scroll" role="region" :aria-label="__('Order line items')">
			<v-table class="payment-order-breakdown__table">
				<thead>
					<tr>
						<th
							scope="col"
							class="text-start px-4 py-3 payment-order-breakdown__head-cell"
							style="width: 60%"
						>
							{{ __("Item Name") }}
						</th>
						<th
							scope="col"
							class="text-end px-4 py-3 payment-order-breakdown__head-cell"
							style="width: 20%"
						>
							{{ __("QTY") }}
						</th>
						<th
							scope="col"
							class="text-end px-4 py-3 payment-order-breakdown__head-cell"
							style="width: 20%"
						>
							{{ __("Total") }}
						</th>
					</tr>
				</thead>
				<tbody>
					<tr
						v-for="line in orderLines"
						:key="line.key"
						class="payment-order-breakdown__row"
					>
						<td
							class="text-start align-middle px-4 py-3 payment-order-breakdown__name"
							style="width: 60%"
						>
							{{ line.name }}
						</td>
						<td
							class="text-end align-middle px-4 py-3 payment-order-breakdown__qty-col"
							style="width: 20%"
						>
							{{ line.qtyDisplay }}
						</td>
						<td
							class="text-end align-middle px-4 py-3 payment-order-breakdown__amount"
							style="width: 20%"
						>
							{{ line.amountDisplay }}
						</td>
					</tr>
				</tbody>
			</v-table>
		</div>
	</v-card>
	<v-card
		v-else
		flat
		color="surface"
		class="payment-order-breakdown-card pos-themed-card pa-2"
	>
		<p class="payment-order-breakdown__empty text-medium-emphasis mb-0">
			{{ __("No items in this order.") }}
		</p>
	</v-card>
</template>

<script setup>
import { computed } from "vue";

const __ = window.__;

const props = defineProps({
	invoiceDoc: {
		type: Object,
		default: null,
	},
	formatCurrency: {
		type: Function,
		required: true,
	},
});

const flt = (value, precision = null) => {
	if (typeof window !== "undefined" && window.frappe?.utils?.flt) {
		return window.frappe.utils.flt(value, precision);
	}
	const numeric = Number(value);
	return Number.isFinite(numeric) ? numeric : 0;
};

const resolveLineAmount = (item) => {
	const amount = flt(item?.amount);
	if (amount) {
		return amount;
	}

	return flt(item?.qty) * flt(item?.rate);
};

const resolveLineKey = (item, index) => {
	return (
		item?.posa_row_id ||
		item?.name ||
		`${item?.item_code || "item"}-${index}`
	);
};

const orderLines = computed(() => {
	const doc = props.invoiceDoc;
	const currency = doc?.currency || "";
	const items = Array.isArray(doc?.items) ? doc.items : [];

	return items
		.filter((item) => item && !item.posa_is_offer)
		.map((item, index) => {
			const qty = flt(item.qty);
			const amount = resolveLineAmount(item);

			return {
				key: resolveLineKey(item, index),
				name: item.item_name || item.item_code || __("Item"),
				qtyDisplay: formatQty(qty),
				amountDisplay: props.formatCurrency(amount, currency),
			};
		});
});

function formatQty(qty) {
	const numeric = flt(qty);
	if (Number.isInteger(numeric)) {
		return String(numeric);
	}
	return numeric.toFixed(3).replace(/\.?0+$/, "");
}
</script>

<style scoped>
.payment-order-breakdown-card {
	background: var(--pos-surface-raised, rgb(var(--v-theme-surface)));
	border: 1px solid var(--pos-border-light, rgba(255, 255, 255, 0.08));
	border-radius: var(--pos-radius-md, 8px);
}

.payment-order-breakdown__scroll {
	max-height: 220px;
	overflow-y: auto;
	overscroll-behavior: contain;
}

.payment-order-breakdown__table {
	background: transparent !important;
	color: var(--pos-text-primary, rgba(255, 255, 255, 0.92));
	table-layout: fixed;
	width: 100%;
}

.payment-order-breakdown__table :deep(.v-table__wrapper) {
	background: transparent !important;
}

.payment-order-breakdown__table :deep(table) {
	background: transparent !important;
}

.payment-order-breakdown__table :deep(thead),
.payment-order-breakdown__table :deep(tbody) {
	background: transparent !important;
}

.payment-order-breakdown__table :deep(thead th.payment-order-breakdown__head-cell) {
	position: sticky;
	top: 0;
	z-index: 1;
	vertical-align: middle;
	font-size: 0.75rem;
	font-weight: 700;
	letter-spacing: 0.05em;
	text-transform: uppercase;
	color: var(--pos-text-secondary, rgba(255, 255, 255, 0.72));
	background: var(--pos-surface-raised, rgb(var(--v-theme-surface)));
	border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.payment-order-breakdown__table :deep(tbody td) {
	vertical-align: middle;
	font-size: 0.9rem;
	line-height: 1.45;
	background: transparent !important;
}

.payment-order-breakdown__table :deep(tbody tr.payment-order-breakdown__row:not(:last-child) td) {
	border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.payment-order-breakdown__name {
	white-space: normal;
	word-break: break-word;
	color: var(--pos-text-primary, #fff);
}

.payment-order-breakdown__qty-col {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	color: var(--pos-text-secondary, rgba(255, 255, 255, 0.82));
}

.payment-order-breakdown__amount {
	white-space: nowrap;
	font-variant-numeric: tabular-nums;
	font-weight: 600;
	color: var(--pos-text-primary, #fff);
}

.payment-order-breakdown__empty {
	font-size: 0.875rem;
}
</style>
