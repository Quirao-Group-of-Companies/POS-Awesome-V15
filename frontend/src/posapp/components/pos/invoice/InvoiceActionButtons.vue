<template>
	<v-row dense class="invoice-action-buttons">
		<!-- Paluto-style: first visit to table — Save Order + secondary Drafts -->
		<template v-if="restaurantSaveOnly">
			<v-col cols="12" sm="7">
				<v-btn
					block
					color="warning"
					theme="dark"
					size="large"
					prepend-icon="mdi-bell-ring-outline"
					class="summary-btn restaurant-save-btn"
					:loading="saveLoading"
					@click="$emit('save-order')"
				>
					{{ __("Send to Kitchen") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="5">
				<v-btn
					block
					variant="outlined"
					color="surface-variant"
					prepend-icon="mdi-tray-full"
					class="summary-btn drafts-btn"
					:loading="loadDraftsLoading"
					@click="$emit('load-drafts')"
				>
					{{ __("Drafts") }}
				</v-btn>
			</v-col>
		</template>

		<!-- Paluto-style: order saved — Save + Cancel, then Drafts, then dominant PAY -->
		<template v-else-if="restaurantTableActive">
			<v-col cols="6">
				<v-btn
					block
					color="warning"
					theme="dark"
					size="large"
					prepend-icon="mdi-bell-ring-outline"
					class="summary-btn restaurant-save-btn"
					:loading="saveLoading"
					@click="$emit('save-order')"
				>
					{{ __("Send to Kitchen") }}
				</v-btn>
			</v-col>
			<v-col cols="6">
				<v-btn
					block
					color="error"
					variant="flat"
					theme="dark"
					prepend-icon="mdi-close-circle"
					class="summary-btn cancel-sale-btn text-white"
					:loading="cancelLoading"
					@click="$emit('cancel-sale')"
				>
					{{ __("Cancel Sale") }}
				</v-btn>
			</v-col>
			<v-col cols="12">
				<v-btn
					block
					variant="outlined"
					color="surface-variant"
					prepend-icon="mdi-tray-full"
					class="summary-btn drafts-btn"
					:loading="loadDraftsLoading"
					@click="$emit('load-drafts')"
				>
					{{ __("Drafts") }}
				</v-btn>
			</v-col>
			<v-col cols="12" class="invoice-action-buttons__pay-col">
				<v-btn
					block
					color="success"
					theme="dark"
					size="x-large"
					prepend-icon="mdi-credit-card"
					class="summary-btn pay-btn pay-btn--hero"
					:loading="paymentLoading"
					@click="$emit('show-payment')"
				>
					{{ __("PAY") }}
				</v-btn>
			</v-col>
		</template>

		<!-- Standard POS -->
		<template v-else>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="accent"
					theme="dark"
					prepend-icon="mdi-content-save"
					class="summary-btn"
					:loading="saveLoading"
					@click="$emit('save-and-clear')"
				>
					{{ __("Save & Clear") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					variant="outlined"
					color="surface-variant"
					prepend-icon="mdi-tray-full"
					class="summary-btn drafts-btn"
					:loading="loadDraftsLoading"
					@click="$emit('load-drafts')"
				>
					{{ __("Drafts") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6" v-if="pos_profile.custom_allow_select_sales_order == 1">
				<v-btn
					block
					color="info"
					variant="tonal"
					theme="dark"
					prepend-icon="mdi-book-search"
					class="summary-btn secondary-action-btn"
					:loading="selectOrderLoading"
					@click="$emit('select-order')"
				>
					{{ __("Select S.O") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="deep-purple"
					variant="tonal"
					theme="dark"
					prepend-icon="mdi-folder-search-outline"
					class="summary-btn secondary-action-btn"
					:loading="invoiceManagementLoading"
					@click="$emit('open-invoice-management')"
				>
					{{ __("Invoice Mgmt") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="error"
					variant="flat"
					theme="dark"
					prepend-icon="mdi-close-circle"
					class="summary-btn cancel-sale-btn text-white"
					:loading="cancelLoading"
					@click="$emit('cancel-sale')"
				>
					{{ __("Cancel Sale") }}
				</v-btn>
			</v-col>

			<v-col cols="12" sm="6" v-if="pos_profile.posa_allow_return == 1">
				<v-btn
					block
					color="secondary"
					variant="tonal"
					theme="dark"
					prepend-icon="mdi-backup-restore"
					class="summary-btn secondary-action-btn"
					:loading="returnsLoading"
					@click="$emit('open-returns')"
				>
					{{ __("Sales Return") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6" v-if="pos_profile.posa_allow_print_draft_invoices">
				<v-btn
					block
					color="primary"
					variant="tonal"
					theme="dark"
					prepend-icon="mdi-printer"
					class="summary-btn secondary-action-btn"
					:loading="printLoading"
					@click="$emit('print-draft')"
				>
					{{ __("Print Draft") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6" v-if="showCustomerDisplayButton">
				<v-btn
					block
					color="indigo"
					variant="tonal"
					theme="dark"
					prepend-icon="mdi-monitor"
					class="summary-btn secondary-action-btn"
					:loading="customerDisplayLoading"
					@click="$emit('open-customer-display')"
				>
					{{ __("Customer Screen") }}
				</v-btn>
			</v-col>
			<v-col cols="12" class="invoice-action-buttons__pay-col">
				<v-btn
					block
					color="success"
					theme="dark"
					size="x-large"
					prepend-icon="mdi-credit-card"
					class="summary-btn pay-btn pay-btn--hero"
					:loading="paymentLoading"
					@click="$emit('show-payment')"
				>
					{{ __("PAY") }}
				</v-btn>
			</v-col>
		</template>
	</v-row>
</template>

<script setup>
import { computed } from "vue";
import { parseBooleanSetting } from "../../../utils/stock";

const props = defineProps({
	pos_profile: {
		type: Object,
		required: true,
		default: () => ({}),
	},
	restaurantSaveOnly: {
		type: Boolean,
		default: false,
	},
	restaurantTableActive: {
		type: Boolean,
		default: false,
	},
	saveLoading: Boolean,
	loadDraftsLoading: Boolean,
	selectOrderLoading: Boolean,
	cancelLoading: Boolean,
	invoiceManagementLoading: Boolean,
	returnsLoading: Boolean,
	printLoading: Boolean,
	paymentLoading: Boolean,
	customerDisplayLoading: Boolean,
});

defineEmits([
	"save-order",
	"save-and-clear",
	"load-drafts",
	"select-order",
	"cancel-sale",
	"open-invoice-management",
	"open-returns",
	"print-draft",
	"show-payment",
	"open-customer-display",
]);

const __ = window.__ || ((text) => text);
const showCustomerDisplayButton = computed(() =>
	parseBooleanSetting(props.pos_profile?.posa_enable_customer_display),
);
</script>

<style scoped>
.invoice-action-buttons {
	width: 100%;
}

.invoice-action-buttons__pay-col {
	margin-top: 4px;
}

.summary-btn {
	transition: all 0.2s ease !important;
	position: relative;
	overflow: hidden;
	min-height: 46px !important;
	text-transform: none !important;
}

.summary-btn :deep(.v-btn__content) {
	white-space: normal !important;
	transition: all 0.2s ease;
}

.summary-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.restaurant-save-btn {
	font-weight: 700 !important;
	font-size: 1.05rem !important;
	min-height: 52px !important;
}

.secondary-action-btn {
	min-height: 48px !important;
	font-weight: 600 !important;
}

.secondary-action-btn:hover {
	transform: none;
	box-shadow: none !important;
}

.drafts-btn {
	min-height: 44px !important;
	font-weight: 500 !important;
	font-size: 0.95rem !important;
	border-color: rgba(var(--v-theme-on-surface), 0.28) !important;
	color: var(--pos-text-secondary, rgba(255, 255, 255, 0.72)) !important;
	background: transparent !important;
}

.drafts-btn :deep(.v-btn__content),
.drafts-btn :deep(.v-icon) {
	color: var(--pos-text-secondary, rgba(255, 255, 255, 0.72)) !important;
}

.drafts-btn:hover {
	transform: none;
	box-shadow: none !important;
	background: rgba(var(--v-theme-on-surface), 0.06) !important;
}

.pay-btn--hero {
	font-weight: 800 !important;
	font-size: 1.35rem !important;
	letter-spacing: 0.06em;
	min-height: 64px !important;
	background: linear-gradient(135deg, #43a047, #2e7d32) !important;
	box-shadow: 0 6px 20px rgba(46, 125, 50, 0.45) !important;
}

.pay-btn--hero:hover {
	background: linear-gradient(135deg, #388e3c, #1b5e20) !important;
	box-shadow: 0 8px 24px rgba(46, 125, 50, 0.55) !important;
	transform: translateY(-2px);
}

.pay-btn--hero :deep(.v-icon) {
	font-size: 1.5rem !important;
}

.cancel-sale-btn,
.cancel-sale-btn :deep(.v-btn__content),
.cancel-sale-btn :deep(.v-icon) {
	color: #ffffff !important;
}
</style>
