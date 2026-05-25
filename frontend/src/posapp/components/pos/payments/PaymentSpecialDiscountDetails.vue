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
			<v-col cols="12" class="pb-0">
				<v-textarea
					class="pa-0 sleek-field"
					variant="solo"
					density="compact"
					clearable
					color="primary"
					auto-grow
					rows="2"
					:label="__('Name')"
					v-model="discountName"
				></v-textarea>
			</v-col>
			<v-col cols="12" class="pt-0">
				<v-textarea
					class="pa-0 sleek-field"
					variant="solo"
					density="compact"
					clearable
					color="primary"
					auto-grow
					rows="2"
					:label="__('ID Number')"
					v-model="discountID"
				></v-textarea>
			</v-col>

			<!-- Action buttons — only shown when all three fields are filled -->
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

			<!-- Discount summary — shown after save -->
			<v-col v-if="isApplied" cols="12" class="pt-1">
				<div class="discount-summary">
					<span class="text-caption text-success">
						✓ {{ __("Discount applied") }}:
						{{ selectedDiscountType }} —
						{{ __("Total Discount") }}: {{ totalDiscount }}
					</span>
				</div>
			</v-col>
		</v-row>
	</div>
</template>

<script setup>
import { ref, computed, watch } from "vue";
import { useUIStore } from "../../../stores/uiStore.ts";
import { useInvoiceStore } from "../../../stores/invoiceStore.js";
import { capitalize } from "lodash";

const props = defineProps({
	invoiceDoc: { type: Object, required: true },
});

const uiStore = useUIStore();
const invoiceStore = useInvoiceStore();
const __ = window.__ || ((text) => text);

const discountTypes = ["Senior Citizen", "PWD"];
const selectedDiscountType = ref("");
const discountName = ref("");
const discountID = ref("");
const saving = ref(false);
const isApplied = ref(false);

const originalValues = ref({
	net_total: null,
	total: null,
	grand_total: null,
});

watch(
	() => props.invoiceDoc?.name,
	(newName) => {
		if (!newName) return;
		const doc = props.invoiceDoc;
		originalValues.value = {
			net_total: parseFloat(doc?.custom_original_net_total || doc?.net_total || 0),
			total: parseFloat(doc?.custom_original_total || doc?.total || 0),
			grand_total: parseFloat(doc?.custom_original_grand_total || doc?.grand_total || 0),
		};
		isApplied.value = Boolean(doc?.custom_special_discount_amount);
	},
	{ immediate: true },
);

const customerCount = computed(() => props.invoiceDoc?.custom_customer_count || 1);

const grandTotal = computed(
	() => originalValues.value.grand_total || props.invoiceDoc?.grand_total || 0,
);

const specialDiscountPercent = computed(() => {
	const val = uiStore?.posSettings?.custom_special_discount_percent || 20;
	return val / 100;
});

const isDiscountEligible = computed(
	() =>
		Boolean(selectedDiscountType.value?.trim()) &&
		Boolean(discountName.value?.trim()) &&
		Boolean(discountID.value?.trim()),
);

const totalDiscount = computed(() => {
	if (!isDiscountEligible.value) return 0;
	return Math.round((grandTotal.value / customerCount.value) * specialDiscountPercent.value);
});

const discountedTotals = computed(() => {
	const discount = totalDiscount.value;
	return {
		net_total: parseFloat((originalValues.value.net_total - discount).toFixed(2)),
		total: parseFloat((originalValues.value.total - discount).toFixed(2)),
		grand_total: parseFloat((originalValues.value.grand_total - discount).toFixed(2)),
	};
});

watch(
	() => props.invoiceDoc?.custom_special_discount_type,
	(val) => {
		selectedDiscountType.value = val || "";
	},
	{ immediate: true },
);
watch(
	() => props.invoiceDoc?.custom_special_discount_name,
	(val) => {
		discountName.value = val || "";
	},
	{ immediate: true },
);
watch(
	() => props.invoiceDoc?.custom_special_discount_id_number,
	(val) => {
		discountID.value = val || "";
	},
	{ immediate: true },
);

const syncMetaToStore = () => {
	invoiceStore.setInvoiceDoc({
		...invoiceStore.invoiceDoc,
		custom_special_discount_type: selectedDiscountType.value,
		custom_special_discount_name: discountName.value,
		custom_special_discount_id_number: discountID.value,
	});
};

const handleSave = () => {
	if (!isDiscountEligible.value) return;
	saving.value = true;

	const totals = discountedTotals.value;
	const currentDoc = invoiceStore.invoiceDoc;

	const payments = Array.isArray(currentDoc?.payments)
		? currentDoc.payments.map((p) => ({ ...p }))
		: [];

	const defaultPayment = payments.find((p) => p.default === 1) || payments[0];
	if (defaultPayment) {
		const otherPaymentsTotal = payments
			.filter((p) => p !== defaultPayment)
			.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
		defaultPayment.amount = parseFloat(
			Math.max(totals.grand_total - otherPaymentsTotal, 0).toFixed(2),
		);
	}

	invoiceStore.setInvoiceDoc({
		...currentDoc,
		custom_original_net_total: originalValues.value.net_total,
		custom_original_total: originalValues.value.total,
		custom_original_grand_total: originalValues.value.grand_total,
		custom_special_discount_type: selectedDiscountType.value,
		custom_special_discount_name: discountName.value,
		custom_special_discount_id_number: discountID.value,
		custom_special_discount_amount: totalDiscount.value,
		net_total: totals.net_total,
		total: totals.total,
		grand_total: totals.grand_total,
		payments,
	});

	isApplied.value = true;
	saving.value = false;
};

const handleClear = () => {
	selectedDiscountType.value = "";
	discountName.value = "";
	discountID.value = "";
	isApplied.value = false;

	const currentDoc = invoiceStore.invoiceDoc;

	const payments = Array.isArray(currentDoc?.payments)
		? currentDoc.payments.map((p) => ({ ...p }))
		: [];

	const defaultPayment = payments.find((p) => p.default === 1) || payments[0];
	if (defaultPayment) {
		const otherPaymentsTotal = payments
			.filter((p) => p !== defaultPayment)
			.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
		defaultPayment.amount = parseFloat(
			Math.max(originalValues.value.grand_total - otherPaymentsTotal, 0).toFixed(2),
		);
	}

	invoiceStore.setInvoiceDoc({
		...currentDoc,
		custom_special_discount_type: "",
		custom_special_discount_name: "",
		custom_special_discount_id_number: "",
		custom_special_discount_amount: 0,
		net_total: originalValues.value.net_total,
		total: originalValues.value.total,
		grand_total: originalValues.value.grand_total,
		custom_original_net_total: null,
		custom_original_total: null,
		custom_original_grand_total: null,
		payments,
	});
};

watch(selectedDiscountType, syncMetaToStore);
watch(discountName, (newVal) => {
	discountName.value = capitalize(newVal).trim();
	syncMetaToStore();
});
watch(discountID, syncMetaToStore);
</script>
