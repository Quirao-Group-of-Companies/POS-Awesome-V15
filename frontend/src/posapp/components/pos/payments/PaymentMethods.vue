<template>
	<div v-if="payments && payments.length" class="payment-methods">
		<div v-for="payment in payments" :key="payment.name" class="payment-method-card">
			<div class="payment-method-card__header">
				<div>
					<p class="payment-method-card__label">{{ frappe._("Method") }}</p>
					<h4 class="payment-method-card__title">{{ payment.mode_of_payment }}</h4>
				</div>
				<div class="payment-method-card__badges">
					<span
						v-if="isReturn"
						class="payment-method-card__badge payment-method-card__badge--refund"
					>
						{{ __("Refund") }}
					</span>
					<span v-if="payment.default === 1" class="payment-method-card__badge">
						{{ __("Default") }}
					</span>
				</div>
			</div>

			<v-row class="payments ma-0" dense>
				<v-col cols="12" md="7" v-if="!isMpesaC2bPayment(payment)">
					<v-text-field
						density="compact"
						variant="solo"
						:color="isReturn ? 'error' : 'primary'"
						:label="frappe._('Amount')"
						:class="['sleek-field pos-themed-input', isReturn ? 'pos-themed-input--refund' : '']"
						hide-details
						:model-value="payment.default === 1 ? formatCurrency(total) : formatCurrency(payment.amount)"
						@change="$emit('update-amount', payment, $event)"
						:rules="[isNumber]"
						:prefix="currencySymbol(currency)"
						@focus="$emit('set-rest-amount', payment, isReturn)"
						:readonly="isGiftCardPayment(payment)"
					></v-text-field>
				</v-col>
				<v-col cols="12" md="5" v-if="!isMpesaC2bPayment(payment)">
					<div class="payment-method-actions">
						<v-btn
							block
							color="primary"
							variant="flat"
							class="payment-method-action-btn"
							:data-test="`payment-method-action-${payment.mode_of_payment}`"
							@click="handlePrimaryAction(payment)"
						>
							{{ isGiftCardPayment(payment) ? __("Redeem / Scan") : payment.mode_of_payment }}
						</v-btn>
					</div>
				</v-col>

				<v-col
					cols="12"
					v-if="
						payment.default === 1 &&
						isCashLikePayment(payment) &&
						getVisibleDenominations(payment).length
					"
					class="pa-0"
				>
					<div class="payment-denominations">
						<v-btn
							v-for="d in getVisibleDenominations(payment)"
							:key="d"
							size="small"
							color="secondary"
							variant="tonal"
							class="payment-denominations__btn"
							@click="$emit('set-denomination', payment, d)"
						>
							{{ formatCurrency(d) }}
						</v-btn>
					</div>
				</v-col>

				<v-col cols="12" v-if="isMpesaC2bPayment(payment)" class="pa-0">
					<v-btn
						block
						color="success"
						variant="flat"
						class="payment-method-action-btn payment-method-action-btn--success"
						@click="$emit('mpesa-dialog', payment)"
					>
						{{ __("Get Payments") }}
					</v-btn>
				</v-col>

				<v-col
					cols="12"
					v-if="payment.type === 'Phone' && payment.amount > 0 && requestPaymentField"
					class="pa-0"
				>
					<v-btn
						block
						color="success"
						variant="tonal"
						class="payment-method-action-btn payment-method-action-btn--secondary"
						:disabled="payment.amount === 0"
						@click="$emit('request-payment', payment)"
					>
						{{ __("Request Payment") }}
					</v-btn>
				</v-col>
				<!-- Card Payment Details -->
				<v-col cols="12" v-if="isCardPayment(payment) && payment.amount && payment.amount !== 0">
					<div class="card-details-section">
						<p class="card-details-section__label">{{ __("Card Details") }} <span class="card-details-section__required">*</span></p>
						<v-row dense class="ma-0">
							<v-col cols="12" md="3">
								<v-select
									density="compact"
									variant="solo"
									color="primary"
									:label="__('Card Type')"
									class="sleek-field pos-themed-input"
									hide-details="auto"
									:model-value="payment.posa_card_type"
									:items="cardTypes"
									:rules="[v => !!v || __('Card Type is required')]"
									@update:model-value="$emit('update-card-detail', payment, 'posa_card_type', $event)"
								/>
							</v-col>
							<v-col cols="12" md="3">
								<v-text-field
									density="compact"
									variant="solo"
									color="primary"
									:label="__('Account No.')"
									class="sleek-field pos-themed-input"
									hide-details="auto"
									:model-value="payment.posa_card_last4"
									maxlength="4"
									:rules="[
										v => !v || /^\d{4}$/.test(v) || __('Must be exactly 4 digits')
									]"
									@change="$emit('update-card-detail', payment, 'posa_card_last4', $event.target?.value ?? $event)"
								/>
							</v-col>
							<v-col cols="12" md="3">
								<v-text-field
									density="compact"
									variant="solo"
									color="primary"
									:label="__('Transaction Reference')"
									class="sleek-field pos-themed-input"
									hide-details="auto"
									:model-value="payment.posa_card_ref"
									:rules="[v => !!v || __('Transaction reference required')]"
									@change="$emit('update-card-detail', payment, 'posa_card_ref', $event.target?.value ?? $event)"
								/>
							</v-col>
							<v-col cols="12" md="3">
								<v-text-field
									density="compact"
									variant="solo"
									color="primary"
									:label="__('Batch No.')"
									class="sleek-field pos-themed-input"
									hide-details="auto"
									:model-value="payment.posa_batch_no"
									:rules="[v => !!v || __('Batch No. required')]"
									@change="$emit('update-card-detail', payment, 'posa_batch_no', $event.target?.value ?? $event)"
								/>
							</v-col>
							<v-col cols="12" md="3">
								<v-text-field
									density="compact"
									variant="solo"
									color="primary"
									:label="__('Aproval No.')"
									class="sleek-field pos-themed-input"
									hide-details="auto"
									:model-value="payment.posa_approval_no"
									:rules="[v => !!v || __('Approval No. required')]"
									@change="$emit('update-card-detail', payment, 'posa_approval_no', $event.target?.value ?? $event)"
								/>
							</v-col>
						</v-row>
					</div>
				</v-col>
			</v-row>
		</div>
	</div>
</template>

<script setup>
const frappe = window.frappe;
const __ = window.__;

const props = defineProps({
	payments: Array,
	currency: String,
	grandTotal: { type: Number, default: 0 },
	total: { type: Number, default: 0 },
	isReturn: Boolean,
	requestPaymentField: Boolean,
	currencySymbol: Function,
	formatCurrency: Function,
	isNumber: Function,
	getVisibleDenominations: Function,
	isCashLikePayment: Function,
	isMpesaC2bPayment: Function,
	isGiftCardPayment: {
		type: Function,
		default: () => false,
	},
});

const emit = defineEmits([
	"update-amount",
	"set-full-amount",
	"set-denomination",
	"mpesa-dialog",
	"request-payment",
	"set-rest-amount",
	"open-gift-card",
	"update-card-detail",
]);

const cardTypes = ["Visa", "Matercard", "JCB", "UnionPay", "American Express", "Others"]

const isCardPayment = (payment) => {
    const mop = String(payment?.mode_of_payment || "").toLowerCase();
    return mop.includes("credit card") || mop.includes("debit card") || mop.includes("gcash") || mop.includes("gotyme") || mop.includes("maribank");
};

const handlePrimaryAction = (payment) => {
	if (props.isGiftCardPayment(payment)) {
		emit("open-gift-card", payment);
		return;
	}
	emit("set-full-amount", payment, props.isReturn);
};
</script>

<style scoped>
.card-details-section {
    background: rgba(var(--v-theme-primary), 0.04);
    border: 1px dashed rgba(var(--v-theme-primary), 0.3);
    border-radius: var(--pos-radius-sm);
    padding: var(--pos-space-2);
    display: flex;
    flex-direction: column;
    gap: var(--pos-space-2);
}

.card-details-section__label {
    margin: 0;
    font-size: 0.72rem;
    font-weight: 700;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: var(--pos-text-secondary);
}

.card-details-section__required {
    color: rgb(var(--v-theme-error));
}

.payment-methods {
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-2);
}

.payment-method-card {
	background: var(--pos-surface-raised);
	border: 1px solid var(--pos-border-light);
	border-radius: var(--pos-radius-md);
	padding: var(--pos-space-3);
	display: flex;
	flex-direction: column;
	gap: var(--pos-space-3);
}

.payment-method-card__header {
	display: flex;
	align-items: flex-start;
	justify-content: space-between;
	gap: var(--pos-space-2);
}

.payment-method-card__label {
	margin: 0 0 var(--pos-space-1);
	font-size: 0.72rem;
	font-weight: 700;
	letter-spacing: 0.08em;
	text-transform: uppercase;
	color: var(--pos-text-secondary);
}

.payment-method-card__title {
	margin: 0;
	font-size: 1rem;
	line-height: 1.2;
	font-weight: 700;
	color: var(--pos-text-primary);
}

.payment-method-card__badges {
	display: flex;
	gap: var(--pos-space-1);
	align-items: center;
	flex-wrap: wrap;
	justify-content: flex-end;
}

.payment-method-card__badge {
	padding: 6px 10px;
	border-radius: 999px;
	background: rgba(var(--v-theme-primary), 0.12);
	color: rgb(var(--v-theme-primary));
	font-size: 0.78rem;
	font-weight: 700;
	white-space: nowrap;
}

.payment-method-card__badge--refund {
	background: rgba(var(--v-theme-error), 0.12);
	color: rgb(var(--v-theme-error));
}

:deep(.pos-themed-input--refund input) {
	color: rgb(var(--v-theme-error)) !important;
	font-weight: 700;
}

.payment-method-action-btn {
	--v-theme-overlay-multiplier: 0 !important;
	min-height: 44px;
	border-radius: var(--pos-radius-sm);
	font-weight: 700;
	text-transform: none;
	letter-spacing: 0.01em;
	transition:
		box-shadow 0.18s ease,
		background-color 0.18s ease,
		transform 0.18s ease !important;
	background-color: rgb(var(--v-theme-primary)) !important;
	color: #ffffff !important;
}

.payment-method-actions {
	display: block;
}

.payment-method-action-btn:hover,
.payment-method-action-btn:focus,
.payment-method-action-btn:focus-visible,
.payment-method-action-btn:active {
	box-shadow: 0 4px 10px rgba(0, 0, 0, 0.18) !important;
	transform: translateY(-1px);
	background-color: rgba(var(--v-theme-primary), 0.9) !important;
}

.payment-method-action-btn:active {
	transform: translateY(0);
}

:deep(.payment-method-action-btn .v-btn__overlay),
:deep(.payment-method-action-btn .v-btn__underlay) {
	opacity: 0 !important;
	background: transparent !important;
}

.payment-method-action-btn--success {
	background: rgb(var(--v-theme-success)) !important;
	color: #ffffff !important;
}

.payment-method-action-btn--success:hover,
.payment-method-action-btn--success:focus,
.payment-method-action-btn--success:focus-visible,
.payment-method-action-btn--success:active {
	background-color: rgba(var(--v-theme-success), 0.9) !important;
}

.payment-method-action-btn--secondary {
	background: rgba(var(--v-theme-success), 0.14) !important;
	color: rgb(var(--v-theme-success)) !important;
}

.payment-method-action-btn--secondary:hover,
.payment-method-action-btn--secondary:focus,
.payment-method-action-btn--secondary:focus-visible,
.payment-method-action-btn--secondary:active {
	background-color: rgba(var(--v-theme-success), 0.2) !important;
}

.payment-denominations {
	display: flex;
	flex-wrap: wrap;
	gap: var(--pos-space-2);
}

.payment-denominations__btn {
	border-radius: var(--pos-radius-sm);
	text-transform: none;
	font-weight: 600;
}

@media (max-width: 768px) {
	.payment-method-card {
		padding: var(--pos-space-2);
		gap: var(--pos-space-2);
	}

	.payment-method-actions {
		grid-template-columns: 1fr;
	}
}
</style>
