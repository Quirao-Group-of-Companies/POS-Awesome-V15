<template>
	<v-row dense>
		<!-- Paluto-style: first visit to table — only Save Order -->
		<template v-if="restaurantSaveOnly">
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="warning"
					theme="dark"
					size="large"
					prepend-icon="mdi-content-save"
					class="summary-btn restaurant-save-btn"
					:loading="saveLoading"
					@click="$emit('save-order')"
				>
					{{ __("Save Order") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="warning"
					theme="dark"
					prepend-icon="mdi-tray-full"
					@click="$emit('load-drafts')"
					class="summary-btn restaurant-save-btn"
					:loading="loadDraftsLoading"
				>
					{{ __("Drafts") }}
				</v-btn>
			</v-col>
		</template>

		<!-- Paluto-style: order saved — 2×2 grid: Save | Drafts / Cancel | Pay -->
		<template v-else-if="restaurantTableActive">
			<v-col cols="6">
				<v-btn
					block
					color="warning"
					theme="dark"
					prepend-icon="mdi-content-save"
					class="summary-btn restaurant-save-btn"
					:loading="saveLoading"
					@click="$emit('save-order')"
				>
					{{ __("Save Order") }}
				</v-btn>
			</v-col>
			<v-col cols="6">
				<v-btn
					block
					color="warning"
					theme="dark"
					prepend-icon="mdi-tray-full"
					@click="$emit('load-drafts')"
					class="summary-btn restaurant-save-btn"
					:loading="loadDraftsLoading"
				>
					{{ __("Drafts") }}
				</v-btn>
			</v-col>
			<v-col cols="6">
				<v-btn
					block
					color="error"
					theme="dark"
					prepend-icon="mdi-close-circle"
					class="summary-btn"
					:loading="cancelLoading"
					@click="$emit('cancel-sale')"
				>
					{{ __("Cancel Sale") }}
				</v-btn>
			</v-col>
			<v-col cols="6">
				<v-btn
					block
					color="success"
					theme="dark"
					size="large"
					prepend-icon="mdi-credit-card"
					class="summary-btn pay-btn"
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
					@click="$emit('save-and-clear')"
					class="summary-btn"
					:loading="saveLoading"
				>
					{{ __("Save & Clear") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="warning"
					theme="dark"
					prepend-icon="mdi-tray-full"
					@click="$emit('load-drafts')"
					class="white-text-btn summary-btn"
					:loading="loadDraftsLoading"
				>
					{{ __("Drafts") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6" v-if="pos_profile.custom_allow_select_sales_order == 1">
				<v-btn
					block
					color="info"
					theme="dark"
					prepend-icon="mdi-book-search"
					@click="$emit('select-order')"
					class="summary-btn"
					:loading="selectOrderLoading"
				>
					{{ __("Select S.O") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="deep-purple"
					theme="dark"
					prepend-icon="mdi-folder-search-outline"
					@click="$emit('open-invoice-management')"
					class="summary-btn"
					:loading="invoiceManagementLoading"
				>
					{{ __("Invoice Mgmt") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6">
				<v-btn
					block
					color="error"
					theme="dark"
					prepend-icon="mdi-close-circle"
					@click="$emit('cancel-sale')"
					class="summary-btn"
					:loading="cancelLoading"
				>
					{{ __("Cancel Sale") }}
				</v-btn>
			</v-col>

			<v-col cols="12" sm="6" v-if="pos_profile.posa_allow_return == 1">
				<v-btn
					block
					color="secondary"
					theme="dark"
					prepend-icon="mdi-backup-restore"
					@click="$emit('open-returns')"
					class="summary-btn"
					:loading="returnsLoading"
				>
					{{ __("Sales Return") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6" v-if="pos_profile.posa_allow_print_draft_invoices">
				<v-btn
					block
					color="primary"
					theme="dark"
					prepend-icon="mdi-printer"
					@click="$emit('print-draft')"
					class="summary-btn"
					:loading="printLoading"
				>
					{{ __("Print Draft") }}
				</v-btn>
			</v-col>
			<v-col cols="12" sm="6" v-if="showCustomerDisplayButton">
				<v-btn
					block
					color="indigo"
					theme="dark"
					prepend-icon="mdi-monitor"
					@click="$emit('open-customer-display')"
					class="summary-btn"
					:loading="customerDisplayLoading"
				>
					{{ __("Customer Screen") }}
				</v-btn>
			</v-col>
			<v-col cols="12">
				<v-btn
					block
					color="success"
					theme="dark"
					size="large"
					prepend-icon="mdi-credit-card"
					@click="$emit('show-payment')"
					class="summary-btn pay-btn"
					:loading="paymentLoading"
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
.white-text-btn {
	color: var(--pos-text-primary) !important;
}

.white-text-btn :deep(.v-btn__content) {
	color: var(--pos-text-primary) !important;
}

.summary-btn {
	transition: all 0.2s ease !important;
	position: relative;
	overflow: hidden;
	min-height: 46px !important;
	text-transform: none !important;
}

.restaurant-save-btn {
	font-weight: 700 !important;
	font-size: 1.05rem !important;
	min-height: 52px !important;
}

.summary-btn :deep(.v-btn__content) {
	white-space: normal !important;
	transition: all 0.2s ease;
}

.summary-btn:hover {
	transform: translateY(-1px);
	box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

.pay-btn {
	font-weight: 600 !important;
	font-size: 1.1rem !important;
	background: linear-gradient(135deg, #4caf50, #45a049) !important;
	box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3) !important;
}

.pay-btn:hover {
	background: linear-gradient(135deg, #45a049, #3d8b40) !important;
	box-shadow: 0 6px 16px rgba(76, 175, 80, 0.4) !important;
	transform: translateY(-2px);
}
</style>
