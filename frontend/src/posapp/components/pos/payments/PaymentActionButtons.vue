<template>
	<v-card flat :class="['cards mb-0 mt-2 pa-0', { compact }]">
		<v-card-actions class="payment-footer-actions px-2 py-2">
			<v-btn
				variant="text"
				color="error"
				size="default"
				class="payment-cancel-btn text-none"
				@click="$emit('cancel')"
			>
				{{ __("Cancel Payment") }}
			</v-btn>

			<v-spacer />

			<v-btn
				ref="submitButton"
				variant="outlined"
				color="secondary"
				size="large"
				class="payment-submit-btn text-none"
				:class="{ 'submit-highlight': highlightSubmit }"
				@click="$emit('submit')"
				:loading="loading"
				:disabled="loading || validatePayment"
			>
				{{ __("Submit") }}
			</v-btn>

			<v-btn
				variant="flat"
				color="success"
				size="x-large"
				class="payment-submit-print-btn text-none ml-2"
				@click="$emit('submit-and-print')"
				:loading="loading"
				:disabled="loading || validatePayment"
			>
				{{ __("Submit & Print") }}
			</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script setup>
defineProps({
	loading: Boolean,
	validatePayment: Boolean,
	highlightSubmit: Boolean,
	compact: Boolean,
});

defineEmits(["submit", "submit-and-print", "cancel"]);

const __ = window.__;
</script>

<style scoped>
.cards {
	background: transparent !important;
}

.payment-footer-actions {
	flex-wrap: nowrap;
	gap: 8px;
	min-height: 52px;
}

.payment-cancel-btn {
	flex: 0 0 auto;
	font-weight: 600;
}

.payment-submit-btn {
	flex: 0 0 auto;
	min-width: 112px;
	border-width: 1.5px;
	font-weight: 600;
}

.payment-submit-print-btn {
	flex: 0 0 auto;
	min-width: 168px;
	font-weight: 700;
	letter-spacing: 0.01em;
	box-shadow: 0 6px 18px rgba(var(--v-theme-success), 0.28);
}

.payment-submit-print-btn:hover,
.payment-submit-print-btn:focus-visible {
	box-shadow: 0 8px 22px rgba(var(--v-theme-success), 0.36);
}

.submit-highlight.payment-submit-btn {
	box-shadow: 0 0 0 2px rgba(var(--v-theme-secondary), 0.45);
}

.compact .payment-footer-actions {
	min-height: 44px;
	padding-top: 4px !important;
	padding-bottom: 4px !important;
}

.compact .payment-submit-print-btn {
	min-height: 42px !important;
}

.compact .payment-submit-btn {
	min-height: 38px !important;
}

@media (max-width: 768px) {
	.payment-footer-actions {
		flex-wrap: wrap;
		row-gap: 6px;
	}

	.payment-cancel-btn {
		order: 1;
	}

	.v-spacer {
		order: 2;
		flex: 1 1 100% !important;
		display: none;
	}

	.payment-submit-btn {
		order: 3;
		flex: 1 1 calc(50% - 4px);
		min-width: 0;
	}

	.payment-submit-print-btn {
		order: 4;
		flex: 1 1 calc(50% - 4px);
		min-width: 0;
		margin-left: 0 !important;
	}
}

@media (max-width: 480px) {
	.payment-footer-actions {
		flex-direction: column;
		align-items: stretch;
	}

	.payment-cancel-btn,
	.payment-submit-btn,
	.payment-submit-print-btn {
		width: 100%;
		flex: 1 1 auto;
		margin-left: 0 !important;
	}
}
</style>
