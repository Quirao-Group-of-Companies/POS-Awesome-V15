<template>
	<div class="invoice-customer-compact">
		<v-row dense align="center" class="invoice-customer-compact__row ma-0">
			<v-col cols="auto" class="pa-1">
				<v-btn
					variant="tonal"
					color="surface-variant"
					size="small"
					class="invoice-customer-compact__info-btn text-white"
					prepend-icon="mdi-account-outline"
					@click="dialogOpen = true"
				>
					{{ __("Customer Info") }}
				</v-btn>
			</v-col>
			<v-col class="pa-1 min-width-0">
				<span class="invoice-customer-compact__summary text-medium-emphasis text-truncate d-block">
					{{ customerSummary }}
				</span>
			</v-col>
			<v-col cols="auto" class="pa-1 invoice-customer-compact__count-col">
				<CustomerCount compact />
			</v-col>
		</v-row>

		<v-dialog v-model="dialogOpen" max-width="560" scrollable>
			<v-card class="pos-themed-card">
				<v-card-title class="d-flex align-center justify-space-between">
					<span>{{ __("Customer Info") }}</span>
					<v-btn icon variant="text" size="small" @click="dialogOpen = false">
						<v-icon>mdi-close</v-icon>
					</v-btn>
				</v-card-title>
				<v-divider />
				<v-card-text class="pa-0">
					<div class="invoice-customer-compact__dialog-section">
						<h4 class="invoice-customer-compact__dialog-label">{{ __("Customer Details") }}</h4>
						<InvoiceCustomerSection
							ref="customerSection"
							:pos_profile="pos_profile"
							:invoiceTypes="invoiceTypes"
							:model-value="invoiceType"
							@update:model-value="$emit('update:invoiceType', $event)"
						/>
					</div>
					<v-divider />
					<div class="invoice-customer-compact__dialog-section">
						<h4 class="invoice-customer-compact__dialog-label">{{ __("Customer Count") }}</h4>
						<CustomerCount />
					</div>
				</v-card-text>
				<v-card-actions>
					<v-spacer />
					<v-btn variant="text" @click="dialogOpen = false">{{ __("Close") }}</v-btn>
				</v-card-actions>
			</v-card>
		</v-dialog>
	</div>
</template>

<script setup>
import { computed, ref } from "vue";
import { storeToRefs } from "pinia";
import InvoiceCustomerSection from "./InvoiceCustomerSection.vue";
import CustomerCount from "./CustomerCount.vue";
import { useCustomersStore } from "../../../stores/customersStore";

const props = defineProps({
	pos_profile: { type: Object, required: true, default: () => ({}) },
	invoiceTypes: { type: Array, default: () => ["Invoice", "Order", "Quotation"] },
	invoiceType: { type: String, default: "Invoice" },
});

defineEmits(["update:invoiceType"]);

const __ = window.__ || ((text) => text);
const dialogOpen = ref(false);
const customerSection = ref(null);

const { selectedCustomer } = storeToRefs(useCustomersStore());

const customerSummary = computed(() => {
	const name =
		selectedCustomer.value?.customer_name ||
		selectedCustomer.value?.name ||
		props.pos_profile?.customer;
	if (name) {
		return name;
	}
	return __("Walk-in / table guest");
});

const focusCustomerSearch = () => {
	customerSection.value?.focusCustomerSearch?.();
};

const selectFirstCustomer = () => {
	customerSection.value?.selectFirstCustomer?.();
};

const openNewCustomer = () => {
	customerSection.value?.openNewCustomer?.();
};

defineExpose({
	focusCustomerSearch,
	selectFirstCustomer,
	openNewCustomer,
});
</script>

<style scoped>
.invoice-customer-compact {
	flex: 0 0 auto;
	border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
	border-radius: var(--pos-radius-md, 14px);
	background: var(--pos-card-bg);
}

.invoice-customer-compact__row {
	min-height: 44px;
}

.invoice-customer-compact__summary {
	font-size: 0.85rem;
	line-height: 1.3;
	color: rgba(255, 255, 255, 0.78);
}

.invoice-customer-compact__count-col {
	max-width: 132px;
}

.invoice-customer-compact__dialog-section {
	padding: 12px 16px 16px;
}

.invoice-customer-compact__dialog-label {
	margin: 0 0 8px;
	font-size: 0.82rem;
	font-weight: 700;
	letter-spacing: 0.04em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}
</style>
