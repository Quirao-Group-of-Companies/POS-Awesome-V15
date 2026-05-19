<template>
	<v-dialog v-model="dialogOpen" max-width="720px" persistent>
		<v-card class="shift-reading-card" elevation="8">
			<v-card-title class="d-flex align-center justify-space-between pa-4">
				<span class="text-h6">{{ dialogTitle }}</span>
				<v-btn icon variant="text" @click="closeDialog">
					<v-icon>mdi-close</v-icon>
				</v-btn>
			</v-card-title>

			<v-card-text class="pa-4 pt-0">
				<v-progress-linear v-if="loading" indeterminate color="primary" class="mb-4" />

				<v-alert
					v-else-if="report?.blocked"
					type="warning"
					variant="tonal"
					class="mb-4"
				>
					{{ report.block_reason }}
				</v-alert>

				<template v-else-if="report">
					<p class="text-body-2 text-medium-emphasis mb-4">
						{{ __("Generated") }}: {{ report.generated_display }}
						· {{ __("Shift") }}: {{ report.pos_opening_shift }}
						· {{ __("Cashier") }}: {{ report.cashier_name }}
					</p>

					<p v-if="report.invoice_range?.display" class="text-body-2 mb-4">
						<strong>{{ __("Invoice range") }}:</strong>
						{{ report.invoice_range.display }}
					</p>

					<v-row dense>
						<v-col
							v-for="card in summaryCards"
							:key="card.key"
							cols="6"
							sm="4"
						>
							<div class="summary-card">
								<div class="summary-label">{{ card.label }}</div>
								<div class="summary-value">{{ card.value }}</div>
							</div>
						</v-col>
					</v-row>

					<div v-if="paymentRows.length" class="mt-4">
						<div class="text-subtitle-2 mb-2">{{ __("Payments by mode") }}</div>
						<v-table density="compact" class="reading-table">
							<thead>
								<tr>
									<th>{{ __("Mode") }}</th>
									<th class="text-end">{{ __("Amount") }}</th>
								</tr>
							</thead>
							<tbody>
								<tr v-for="row in paymentRows" :key="row.mode">
									<td>{{ row.mode }}</td>
									<td class="text-end">{{ row.amount }}</td>
								</tr>
							</tbody>
						</v-table>
					</div>
				</template>
			</v-card-text>

			<v-divider />

			<v-card-actions class="pa-4">
				<v-btn variant="text" @click="closeDialog">{{ __("Close") }}</v-btn>
				<v-spacer />
				<v-btn
					v-if="report && !report.blocked"
					variant="outlined"
					prepend-icon="mdi-printer"
					@click="handlePrint"
				>
					{{ __("Print") }}
				</v-btn>
				<v-btn
					v-if="report?.reading_type === 'z' && !report.blocked"
					color="primary"
					variant="flat"
					prepend-icon="mdi-content-save-move-outline"
					@click="handleCloseShift"
				>
					{{ __("Close Shift") }}
				</v-btn>
			</v-card-actions>
		</v-card>
	</v-dialog>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { storeToRefs } from "pinia";
import { useUIStore } from "../../../stores/uiStore.js";
import { useShiftReading } from "../../../composables/pos/shift/useShiftReading";

const __ = (text: string, ...args: unknown[]) => {
	if (typeof window !== "undefined" && typeof window.__ === "function") {
		return window.__(text, ...args);
	}
	return text;
};

const emit = defineEmits<{
	(e: "close-shift"): void;
}>();

const uiStore = useUIStore();
const { posProfile, posOpeningShift } = storeToRefs(uiStore);

const {
	dialogOpen,
	loading,
	report,
	closeDialog,
	printReport,
	openXReading,
	openZReading,
} = useShiftReading();

const dialogTitle = computed(() => report.value?.title || __("Shift Reading"));

const currency = computed(() => posProfile.value?.currency || "");

function formatAmount(value: unknown) {
	const n = Number(value);
	if (!Number.isFinite(n)) {
		return "0.00";
	}
	const cur = currency.value;
	const formatted = n.toLocaleString(undefined, {
		minimumFractionDigits: 2,
		maximumFractionDigits: 2,
	});
	return cur ? `${cur} ${formatted}` : formatted;
}

const summaryCards = computed(() => {
	const s = report.value?.summary;
	if (!s) {
		return [];
	}
	return [
		{ key: "gross", label: __("Gross sales"), value: formatAmount(s.gross_sales) },
		{ key: "net", label: __("Net shift total"), value: formatAmount(s.total_sales) },
		{
			key: "txns",
			label: __("Transactions"),
			value: String(s.total_transactions ?? 0),
		},
		{
			key: "avg",
			label: __("Average sale"),
			value: formatAmount(s.average_transaction),
		},
		{
			key: "returns",
			label: __("Returns"),
			value: `${formatAmount(s.returns_total)} (${s.returns_count ?? 0})`,
		},
		{
			key: "cash",
			label: __("Cash expected"),
			value: formatAmount(s.cash_expected?.company_currency_total),
		},
	];
});

const paymentRows = computed(() => {
	const payments = report.value?.summary?.payments || {};
	return Object.entries(payments).map(([mode, amount]) => ({
		mode,
		amount: formatAmount(amount),
	}));
});

function handlePrint() {
	printReport(currency.value);
}

function handleCloseShift() {
	closeDialog();
	emit("close-shift");
}

function openX(shiftName?: string) {
	return openXReading(shiftName || posOpeningShift.value?.name);
}

function openZ(shiftName?: string) {
	return openZReading(shiftName || posOpeningShift.value?.name);
}

defineExpose({
	openX,
	openZ,
});
</script>

<style scoped>
.shift-reading-card {
	border-radius: 12px;
}

.summary-card {
	border: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
	border-radius: 8px;
	padding: 12px;
	height: 100%;
}

.summary-label {
	font-size: 11px;
	text-transform: uppercase;
	color: rgba(var(--v-theme-on-surface), 0.6);
	margin-bottom: 4px;
}

.summary-value {
	font-size: 15px;
	font-weight: 700;
}

.reading-table th,
.reading-table td {
	font-size: 13px;
}
</style>
