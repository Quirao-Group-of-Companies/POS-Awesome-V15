<template>
    <div class="px-3 py-2">
      <v-number-input
        v-model="count"
        :min="1"
        density="compact"
        hide-details
        variant="solo"
        class="pos-themed-input"
        :label="__('Count')"
      />
    </div>
  </template>
  
  <script setup>
  import { ref, watch } from "vue";
  import { useInvoiceStore } from "../../../stores/invoiceStore.js";
  
  const invoiceStore = useInvoiceStore();
  const count = ref(invoiceStore.invoiceDoc?.custom_customer_count || 1);
  
  watch(count, (val) => {
      // Try invoiceDoc first
      if (invoiceStore.invoiceDoc) {
          invoiceStore.invoiceDoc.custom_customer_count = val;
      } else {
          // invoiceDoc is null, patch the store to create the field
          invoiceStore.$patch((state) => {
              if (!state.invoiceDoc) state.invoiceDoc = {};
              state.invoiceDoc.custom_customer_count = val;
          });
      }
  });
  
  // Sync back if invoice is cleared/loaded externally
  watch(
    () => invoiceStore.invoiceDoc?.custom_customer_count,
    (val) => {
      count.value = val || 1;
    }
  );
  
  defineExpose({ count });
  </script>