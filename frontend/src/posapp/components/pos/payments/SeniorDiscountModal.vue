<template>
	<v-dialog
		:model-value="modelValue"
		@update:model-value="$emit('update:modelValue', $event)"
		max-width="520"
		:retain-focus="false"
	>
		<v-card class="pos-themed-card">
			<v-card-title class="text-h6 d-flex align-center justify-space-between">
				<span>{{ __("Senior Citizen / PWD Discount") }}</span>
				<v-btn
					icon="mdi-close"
					variant="text"
					density="compact"
					@click="$emit('update:modelValue', false)"
					:aria-label="__('Close')"
				/>
			</v-card-title>

			<v-card-text class="pt-2">
				<v-row dense>
					<v-col cols="12" sm="6">
						<v-text-field
							v-model.number="form.totalPax"
							type="number"
							min="1"
							step="1"
							variant="outlined"
							density="compact"
							class="pos-themed-input"
							:label="__('Total Pax')"
							hide-details
						/>
					</v-col>
					<v-col cols="12" sm="6">
						<v-text-field
							v-model.number="form.scPax"
							type="number"
							min="0"
							step="1"
							variant="outlined"
							density="compact"
							class="pos-themed-input"
							:label="__('SC/PWD Pax')"
							hide-details
						/>
					</v-col>
					<v-col cols="12">
						<v-text-field
							v-model="form.name"
							variant="outlined"
							density="compact"
							class="pos-themed-input"
							:label="__('Senior Name')"
							hide-details
						/>
					</v-col>
					<v-col cols="12">
						<v-text-field
							v-model="form.idNumber"
							variant="outlined"
							density="compact"
							class="pos-themed-input"
							:label="__('ID Number')"
							hide-details
						/>
					</v-col>
				</v-row>
			</v-card-text>

			<v-card-actions class="px-4 pb-4 pt-0">
				<v-btn
					variant="text"
					color="error"
					class="text-none"
					@click="handleClear"
				>
					{{ __("Clear") }}
				</v-btn>
				<v-spacer />
				<v-btn
					color="success"
					variant="flat"
					class="text-none"
					:disabled="!canApply"
					@click="handleApply"
				>
					{{ __("Apply") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed, reactive, watch } from "vue";
import { useInvoiceStore } from "../../../stores/invoiceStore";

const __ = window.__;

defineProps({
	modelValue: { type: Boolean, default: false },
});

const emit = defineEmits(["update:modelValue"]);

const invoiceStore = useInvoiceStore();

const form = reactive({
	totalPax: 1,
	scPax: 0,
	name: "",
	idNumber: "",
});

watch(
	() => invoiceStore.invoiceDoc,
	(doc) => {
		if (!doc) return;
		form.totalPax = Number(doc.custom_total_pax ?? 1) || 1;
		form.scPax = Number(doc.custom_sc_pwd_pax ?? 0) || 0;
		form.name = String(doc.custom_sc_name ?? "");
		form.idNumber = String(doc.custom_sc_id_number ?? "");
	},
	{ immediate: true },
);

const canApply = computed(() => {
	const total = Math.max(1, Math.floor(Number(form.totalPax) || 1));
	const sc = Math.max(0, Math.floor(Number(form.scPax) || 0));
	return sc <= total;
});

const handleApply = () => {
	invoiceStore.calculateSeniorDiscount(form.totalPax, form.scPax, {
		name: form.name,
		idNumber: form.idNumber,
	});
	emit("update:modelValue", false);
};

const handleClear = () => {
	form.totalPax = 1;
	form.scPax = 0;
	form.name = "";
	form.idNumber = "";
	invoiceStore.calculateSeniorDiscount(1, 0, { name: "", idNumber: "" });
	emit("update:modelValue", false);
};
</script>

