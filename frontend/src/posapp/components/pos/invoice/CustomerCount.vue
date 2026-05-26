<template>
	<div :class="compact ? 'customer-count--compact' : 'px-3 py-2'">
		<v-number-input
			v-model="count"
			:min="1"
			density="compact"
			hide-details
			:variant="compact ? 'outlined' : 'solo'"
			class="pos-themed-input customer-count-input"
			:label="compact ? undefined : __('Count')"
			:placeholder="compact ? __('Guests') : undefined"
		/>
	</div>
</template>

<script setup>
import { ref, watch } from "vue";
import { useInvoiceStore } from "../../../stores/invoiceStore.js";

defineProps({
	compact: { type: Boolean, default: false },
});

const invoiceStore = useInvoiceStore();
const count = ref(invoiceStore.invoiceDoc?.custom_customer_count || 1);

watch(count, (val) => {
	if (invoiceStore.invoiceDoc) {
		invoiceStore.invoiceDoc.custom_customer_count = val;
	} else {
		invoiceStore.$patch((state) => {
			if (!state.invoiceDoc) state.invoiceDoc = {};
			state.invoiceDoc.custom_customer_count = val;
		});
	}
});

watch(
	() => invoiceStore.invoiceDoc?.custom_customer_count,
	(val) => {
		count.value = val || 1;
	},
);

defineExpose({ count });
</script>

<style scoped>
.customer-count--compact {
	padding: 0;
}

.customer-count--compact .customer-count-input {
	max-width: 120px;
}

.customer-count--compact :deep(.v-field__input) {
	color: rgba(255, 255, 255, 0.92);
}
</style>
