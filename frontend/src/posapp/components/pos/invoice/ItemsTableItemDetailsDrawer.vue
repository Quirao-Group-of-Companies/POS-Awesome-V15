<template>
	<v-navigation-drawer
		:model-value="modelValue"
		@update:model-value="$emit('update:modelValue', $event)"
		location="end"
		temporary
		width="420"
		class="posa-item-details-drawer"
		:scrim="true"
	>
		<div class="posa-item-details-drawer__header">
			<div class="posa-item-details-drawer__title-wrap">
				<span class="posa-item-details-drawer__eyebrow">{{ __("Line item details") }}</span>
				<strong class="posa-item-details-drawer__title">{{ item?.item_name || __("Item") }}</strong>
				<span v-if="item?.item_code" class="posa-item-details-drawer__code">{{ item.item_code }}</span>
			</div>
			<v-btn
				icon
				variant="text"
				size="small"
				:aria-label="__('Close item details')"
				@click="$emit('update:modelValue', false)"
			>
				<v-icon>mdi-close</v-icon>
			</v-btn>
		</div>

		<div v-if="item" class="posa-item-details-drawer__body">
			<ItemsTableExpandedRow
				layout="panel"
				:item="item"
				:is-expanded="true"
				:colspan="1"
				:pos_profile="pos_profile"
				:invoice-type="invoice_type"
				:is-return-invoice="is_return_invoice"
				:invoice_doc="invoice_doc"
				:hide_qty_decimals="hide_qty_decimals"
				:expanded-content-classes="expandedContentClasses"
				:format-float="format_float"
				:format-currency="format_currency"
				:currency-symbol="currency_symbol"
				:is-number="is_number"
				:set-formated-currency="setFormatedCurrency"
				:calc-prices="calcPrices"
				:calc-uom="calcUom"
				:change-price-list-rate="changePriceListRate"
				:get-serial-options="getSerialOptions"
				:set-serial-no="setSerialNo"
				:set-batch-qty="setBatchQty"
				:validate-due-date="validateDueDate"
				@qty-change="(lineItem, event) => $emit('qty-change', lineItem, event)"
			/>
		</div>
	</v-navigation-drawer>
</template>

<script setup lang="ts">
import type { PropType } from "vue";
import ItemsTableExpandedRow from "./ItemsTableExpandedRow.vue";

defineProps({
	modelValue: { type: Boolean, default: false },
	item: { type: Object, default: null },
	pos_profile: { type: Object, default: () => ({}) },
	invoice_type: { type: String, default: "" },
	is_return_invoice: { type: Boolean, default: false },
	invoice_doc: { type: Object, default: () => ({}) },
	hide_qty_decimals: { type: Boolean, default: false },
	expandedContentClasses: { type: Object, default: () => ({}) },
	format_float: {
		type: Function as PropType<(_val: any, _precision?: number) => string>,
		required: true,
	},
	format_currency: {
		type: Function as PropType<(_val: any, _precision?: number) => string>,
		required: true,
	},
	currency_symbol: {
		type: Function as PropType<(_currency?: string) => string>,
		required: true,
	},
	is_number: {
		type: Function as PropType<(_val: any) => boolean | string>,
		required: true,
	},
	setFormatedCurrency: {
		type: Function as PropType<
			(_item: any, _field: string, _value: any, _force?: boolean, _event?: any) => void
		>,
		required: true,
	},
	calcPrices: {
		type: Function as PropType<(_item: any, _value: any, _event?: any) => void>,
		required: true,
	},
	calcUom: {
		type: Function as PropType<(_item: any, _uom: string) => void>,
		required: true,
	},
	changePriceListRate: {
		type: Function as PropType<(_item: any) => void>,
		required: true,
	},
	getSerialOptions: {
		type: Function as PropType<(_item: any) => any[]>,
		required: true,
	},
	setSerialNo: {
		type: Function as PropType<(_item: any) => void>,
		required: true,
	},
	setBatchQty: {
		type: Function as PropType<(_item: any, _event: any) => void>,
		required: true,
	},
	validateDueDate: {
		type: Function as PropType<(_item: any) => void>,
		required: true,
	},
});

defineEmits(["update:modelValue", "qty-change"]);

const __ = (window as any).__ || ((text: string) => text);
</script>

<style scoped>
.posa-item-details-drawer__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	padding: 16px;
	border-bottom: 1px solid var(--pos-border);
	background: var(--pos-card-bg);
}

.posa-item-details-drawer__title-wrap {
	display: flex;
	flex-direction: column;
	gap: 4px;
	min-width: 0;
}

.posa-item-details-drawer__eyebrow {
	font-size: 0.72rem;
	font-weight: 600;
	letter-spacing: 0.06em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.posa-item-details-drawer__title {
	font-size: 1rem;
	color: var(--pos-text-primary);
	line-height: 1.3;
}

.posa-item-details-drawer__code {
	font-size: 0.82rem;
	color: var(--pos-text-secondary);
}

.posa-item-details-drawer__body {
	height: calc(100% - 72px);
	overflow-y: auto;
	padding: 12px 12px 24px;
}
</style>
