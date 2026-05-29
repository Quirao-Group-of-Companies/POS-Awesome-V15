<template>
	<section class="kitchen-display">
		<header class="kitchen-display__header">
			<div class="kitchen-display__title-block">
				<h1 class="kitchen-display__title">{{ __("Kitchen Display") }}</h1>
				<p class="kitchen-display__subtitle">
					{{ companyLabel }}
					<span v-if="lastRefreshedLabel" class="kitchen-display__refresh">
						· {{ __("Updated") }} {{ lastRefreshedLabel }}
					</span>
				</p>
			</div>
			<div class="kitchen-display__actions">
				<v-btn
					variant="tonal"
					color="primary"
					:loading="loading"
					prepend-icon="mdi-refresh"
					@click="fetchOrders({ silent: false })"
				>
					{{ __("Refresh") }}
				</v-btn>
				<v-btn variant="flat" color="secondary" prepend-icon="mdi-arrow-left" @click="goBack">
					{{ __("Back to POS") }}
				</v-btn>
			</div>
		</header>

		<v-alert
			v-if="warningMessage"
			type="warning"
			variant="tonal"
			class="mb-4"
			closable
			@click:close="warningMessage = ''"
		>
			{{ warningMessage }}
		</v-alert>

		<v-alert v-if="errorMessage" type="error" variant="tonal" class="mb-4" closable @click:close="errorMessage = ''">
			{{ errorMessage }}
		</v-alert>

		<div v-if="loading && !visibleOrders.length" class="kitchen-display__loading">
			<v-progress-circular indeterminate color="primary" size="48" />
			<p>{{ __("Loading kitchen orders...") }}</p>
		</div>

		<div v-else-if="!visibleOrders.length" class="kitchen-display__empty">
			<v-icon icon="mdi-silverware-fork-knife" size="64" color="primary" />
			<h2>{{ __("No open orders") }}</h2>
			<p>{{ __("New cashier orders will appear here automatically.") }}</p>
		</div>

		<transition-group v-else name="kitchen-card-fade" tag="div" class="kitchen-display__grid">
			<article
				v-for="order in visibleOrders"
				:key="order.name"
				class="kitchen-order-card"
				:class="{
					'kitchen-order-card--complete': isOrderComplete(order),
					'kitchen-order-card--dismissing': isOrderDismissing(order.name),
				}"
			>
				<header
					class="kitchen-order-card__header"
					:class="urgencyHeaderClass(order)"
				>
					<div class="kitchen-order-card__header-main">
						<h2 class="kitchen-order-card__table">
							{{ resolveTableLabel(order) || __("Walk-in") }}
						</h2>
						<p class="kitchen-order-card__customer">
							{{ order.customer_name || order.customer || __("Guest") }}
						</p>
					</div>
					<div class="kitchen-order-card__elapsed">
						<v-icon icon="mdi-clock-outline" size="18" class="mr-1" />
						{{ formatElapsedLabel(order) }}
					</div>
				</header>

				<ul class="kitchen-order-card__items">
					<li
						v-for="item in order.items"
						:key="item.name"
						class="kitchen-order-card__item"
						:class="{ 'kitchen-order-card__item--served': item.custom_kitchen_served }"
					>
						<v-checkbox
							:model-value="Boolean(item.custom_kitchen_served)"
							hide-details
							density="compact"
							color="success"
							:disabled="Boolean(item._saving)"
							@update:model-value="(checked) => toggleItemServed(order, item, checked)"
						>
							<template #label>
								<span class="kitchen-item-label">
									<v-chip
										v-if="itemQty(item) > 1"
										class="kitchen-qty-chip"
										color="deep-orange"
										variant="flat"
										size="small"
									>
										{{ formatQty(item) }}
									</v-chip>
									<span class="kitchen-item-name">{{ itemDisplayName(item) }}</span>
								</span>
							</template>
						</v-checkbox>
					</li>
				</ul>

				<footer class="kitchen-order-card__footer">
					<span>
						{{ servedCount(order) }} / {{ order.items.length }}
						{{ __("served") }}
					</span>
				</footer>
			</article>
		</transition-group>
	</section>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useUIStore } from "../posapp/stores/uiStore.js";
import { ensurePosProfile } from "../utils/pos_profile";

const frappe = window.frappe;
const __ = window.__ || ((text, args) => {
	if (Array.isArray(args) && args.length) {
		return String(text).replace(/\{(\d+)\}/g, (_, index) => String(args[Number(index)] ?? ""));
	}
	return text;
});

const POLL_INTERVAL_MS = 10_000;
const ELAPSED_TICK_MS = 60_000;
const DISMISS_DELAY_MS = 3_000;

const router = useRouter();
const route = useRoute();
const uiStore = useUIStore();

const orders = ref([]);
const itemDoctype = ref("POS Invoice Item");
const kitchenServedFieldReady = ref(true);
const loading = ref(false);
const errorMessage = ref("");
const warningMessage = ref("");
const lastRefreshedAt = ref(null);
const sessionReady = ref(false);
const nowTick = ref(Date.now());
const dismissingOrderNames = ref(new Set());
const dismissedOrderNames = ref(new Set());

let pollTimer = null;
let elapsedTimer = null;
const dismissTimers = new Map();

const resolveCompany = () => {
	const fromQuery = String(route.query.company || "").trim();
	if (fromQuery) {
		return fromQuery;
	}

	const profile = uiStore.posProfile || frappe?.boot?.pos_profile || null;
	return (
		uiStore.company ||
		profile?.company ||
		frappe?.boot?.sysdefaults?.company ||
		(typeof frappe?.defaults?.get_user_default === "function"
			? frappe.defaults.get_user_default("Company")
			: "") ||
		""
	);
};

const currentCompany = computed(() => resolveCompany());

const visibleOrders = computed(() =>
	orders.value.filter((order) => !dismissedOrderNames.value.has(order.name)),
);

const companyLabel = computed(() => {
	const company = currentCompany.value;
	if (company) {
		return `${__("Company")}: ${company}`;
	}
	if (!sessionReady.value) {
		return __("Loading company...");
	}
	return __("Company not set");
});

const lastRefreshedLabel = computed(() => {
	if (!lastRefreshedAt.value) return "";
	try {
		return new Date(lastRefreshedAt.value).toLocaleTimeString();
	} catch {
		return "";
	}
});

const resolveTableLabel = (order) =>
	String(order?.table || order?.restaurant_table_label || order?.restaurant_table || "").trim();

const getOrderTimestamp = (order) => {
	const raw = order?.creation || order?.modified || order?.posting_time;
	if (!raw) {
		return Date.now();
	}
	const parsed = new Date(raw).getTime();
	return Number.isFinite(parsed) ? parsed : Date.now();
};

const getElapsedMinutes = (order) => {
	const elapsedMs = nowTick.value - getOrderTimestamp(order);
	return Math.max(0, Math.floor(elapsedMs / 60_000));
};

const formatElapsedLabel = (order) => {
	const minutes = getElapsedMinutes(order);
	if (minutes < 1) {
		return __("Just now");
	}
	if (minutes === 1) {
		return __("1 min ago");
	}
	return __("{0} mins ago", [minutes]);
};

const urgencyHeaderClass = (order) => {
	const minutes = getElapsedMinutes(order);
	if (minutes >= 15) {
		return "kitchen-order-card__header--danger";
	}
	if (minutes >= 10) {
		return "kitchen-order-card__header--warning";
	}
	return "kitchen-order-card__header--normal";
};

const itemQty = (item) => Number(item?.qty || 0);

const formatQty = (item) => {
	const qty = itemQty(item);
	return Number.isInteger(qty) ? String(qty) : qty.toFixed(1);
};

const itemDisplayName = (item) => item?.item_name || item?.item_code || __("Item");

const servedCount = (order) =>
	(order?.items || []).filter((item) => Boolean(item.custom_kitchen_served)).length;

const isOrderComplete = (order) => {
	const items = order?.items || [];
	return items.length > 0 && servedCount(order) === items.length;
};

const isOrderDismissing = (orderName) => dismissingOrderNames.value.has(orderName);

const clearDismissTimer = (orderName) => {
	const existing = dismissTimers.get(orderName);
	if (existing) {
		window.clearTimeout(existing);
		dismissTimers.delete(orderName);
	}
};

const scheduleOrderDismiss = (orderName) => {
	if (!orderName || dismissedOrderNames.value.has(orderName)) {
		return;
	}

	clearDismissTimer(orderName);
	dismissingOrderNames.value = new Set([...dismissingOrderNames.value, orderName]);

	const timerId = window.setTimeout(() => {
		const nextDismissing = new Set(dismissingOrderNames.value);
		nextDismissing.delete(orderName);
		dismissingOrderNames.value = nextDismissing;

		dismissedOrderNames.value = new Set([...dismissedOrderNames.value, orderName]);
		dismissTimers.delete(orderName);
	}, DISMISS_DELAY_MS);

	dismissTimers.set(orderName, timerId);
};

const maybeDismissCompletedOrder = (order) => {
	if (order && isOrderComplete(order)) {
		scheduleOrderDismiss(order.name);
	}
};

const syncDismissStateWithOrders = (incomingOrders) => {
	const nextDismissed = new Set(dismissedOrderNames.value);

	for (const order of incomingOrders) {
		if (!isOrderComplete(order)) {
			nextDismissed.delete(order.name);
			clearDismissTimer(order.name);

			const nextDismissing = new Set(dismissingOrderNames.value);
			nextDismissing.delete(order.name);
			dismissingOrderNames.value = nextDismissing;
		}
	}

	dismissedOrderNames.value = nextDismissed;
};

const bootstrapKitchenSession = async () => {
	try {
		const profile = await ensurePosProfile();
		if (profile) {
			uiStore.setPosProfile(profile);
		}
	} catch (error) {
		console.error("Kitchen display profile bootstrap failed", error);
		if (!resolveCompany()) {
			warningMessage.value = __("POS Profile could not be loaded. Using session defaults.");
		}
	} finally {
		sessionReady.value = true;
	}
};

const fetchOrders = async ({ silent = false } = {}) => {
	if (!sessionReady.value) {
		await bootstrapKitchenSession();
	}

	if (!silent) {
		loading.value = true;
	}
	errorMessage.value = "";

	try {
		const company = currentCompany.value;
		if (!company && !silent) {
			warningMessage.value = __(
				"No company found. Open POS once or run: bench --site <site> migrate",
			);
		}

		const response = await new Promise((resolve, reject) => {
			frappe.call({
				method: "posawesome.posawesome.api.kitchen.get_kitchen_orders",
				args: company ? { company } : {},
				callback: (r) => resolve(r?.message || { orders: [] }),
				error: reject,
			});
		});

		const incoming = Array.isArray(response?.orders) ? response.orders : [];
		syncDismissStateWithOrders(incoming);
		orders.value = incoming;
		itemDoctype.value = response?.item_doctype || "POS Invoice Item";
		kitchenServedFieldReady.value = response?.kitchen_served_enabled !== false;
		lastRefreshedAt.value = Date.now();

		if (!kitchenServedFieldReady.value) {
			warningMessage.value = __(
				"Kitchen served checkbox is not installed. Run bench migrate on this site.",
			);
		} else if (orders.value.length) {
			warningMessage.value = "";
		}
	} catch (error) {
		console.error("Kitchen display fetch failed", error);
		if (!silent) {
			errorMessage.value = __("Could not load kitchen orders. Please try again.");
		}
	} finally {
		if (!silent) {
			loading.value = false;
		}
	}
};

const toggleItemServed = async (order, item, checked) => {
	if (!kitchenServedFieldReady.value) {
		frappe?.show_alert?.({
			message: __("Run bench migrate to enable kitchen checkboxes."),
			indicator: "orange",
		});
		return;
	}

	if (!item?.name) {
		return;
	}

	const previous = Boolean(item.custom_kitchen_served);
	const nextValue = checked ? 1 : 0;

	item.custom_kitchen_served = nextValue;
	item._saving = true;

	try {
		const lineDoctype = itemDoctype.value || "POS Invoice Item";

		await new Promise((resolve, reject) => {
			frappe.call({
				method: "frappe.client.set_value",
				args: {
					doctype: lineDoctype,
					name: item.name,
					fieldname: "custom_kitchen_served",
					value: nextValue,
				},
				callback: () => resolve(true),
				error: reject,
			});
		});

		maybeDismissCompletedOrder(order);
	} catch (error) {
		console.error("Kitchen item update failed", error);
		item.custom_kitchen_served = previous ? 1 : 0;
		errorMessage.value = __("Could not update item status. Please try again.");
		frappe?.show_alert?.({
			message: __("Could not save kitchen status"),
			indicator: "red",
		});
	} finally {
		item._saving = false;
	}
};

const goBack = () => {
	router.push({ path: "/tables" });
};

const startPolling = () => {
	stopPolling();
	pollTimer = window.setInterval(() => {
		void fetchOrders({ silent: true });
	}, POLL_INTERVAL_MS);
};

const stopPolling = () => {
	if (pollTimer) {
		window.clearInterval(pollTimer);
		pollTimer = null;
	}
};

const startElapsedTimer = () => {
	stopElapsedTimer();
	elapsedTimer = window.setInterval(() => {
		nowTick.value = Date.now();
	}, ELAPSED_TICK_MS);
};

const stopElapsedTimer = () => {
	if (elapsedTimer) {
		window.clearInterval(elapsedTimer);
		elapsedTimer = null;
	}
};

const clearAllDismissTimers = () => {
	for (const timerId of dismissTimers.values()) {
		window.clearTimeout(timerId);
	}
	dismissTimers.clear();
};

onMounted(async () => {
	nowTick.value = Date.now();
	startElapsedTimer();
	await bootstrapKitchenSession();
	await fetchOrders({ silent: false });
	startPolling();
});

onBeforeUnmount(() => {
	stopPolling();
	stopElapsedTimer();
	clearAllDismissTimers();
});
</script>

<style scoped>
.kitchen-display {
	min-height: 100%;
	padding: 16px 20px 24px;
	background:
		radial-gradient(
			circle at top,
			color-mix(in srgb, var(--pos-primary) 16%, transparent) 0%,
			transparent 45%
		),
		var(--pos-bg-primary, #111);
	color: var(--pos-text-primary, #fff);
}

.kitchen-display__header {
	display: flex;
	flex-wrap: wrap;
	align-items: flex-start;
	justify-content: space-between;
	gap: 12px;
	margin-bottom: 20px;
}

.kitchen-display__title {
	margin: 0;
	font-size: 1.75rem;
	font-weight: 700;
}

.kitchen-display__subtitle {
	margin: 4px 0 0;
	opacity: 0.8;
}

.kitchen-display__refresh {
	opacity: 0.7;
}

.kitchen-display__actions {
	display: flex;
	flex-wrap: wrap;
	gap: 8px;
}

.kitchen-display__loading,
.kitchen-display__empty {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	gap: 12px;
	min-height: 320px;
	text-align: center;
	opacity: 0.9;
}

.kitchen-display__grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
	gap: 16px;
}

.kitchen-order-card {
	display: flex;
	flex-direction: column;
	min-height: 220px;
	border-radius: 14px;
	border: 1px solid color-mix(in srgb, var(--pos-primary) 35%, transparent);
	background: var(--pos-surface-raised, rgba(255, 255, 255, 0.04));
	box-shadow: 0 10px 24px rgba(0, 0, 0, 0.18);
	overflow: hidden;
	transition:
		opacity 0.8s ease,
		transform 0.8s ease,
		border-color 0.3s ease;
}

.kitchen-order-card--complete {
	border-color: color-mix(in srgb, #4caf50 55%, transparent);
}

.kitchen-order-card--dismissing {
	opacity: 0;
	transform: scale(0.94) translateY(8px);
	pointer-events: none;
}

.kitchen-order-card__header {
	display: flex;
	justify-content: space-between;
	align-items: flex-start;
	gap: 12px;
	padding: 14px 16px;
	transition: background-color 0.3s ease, color 0.3s ease;
}

.kitchen-order-card__header--normal {
	background: color-mix(in srgb, var(--pos-primary) 22%, transparent);
	color: inherit;
}

.kitchen-order-card__header--warning {
	background: #f9a825;
	color: #1a1a1a;
}

.kitchen-order-card__header--danger {
	background: #c62828;
	color: #fff;
}

.kitchen-order-card__header-main {
	min-width: 0;
	flex: 1;
}

.kitchen-order-card__table {
	margin: 0;
	font-size: clamp(1.6rem, 3vw, 2.1rem);
	font-weight: 800;
	line-height: 1.05;
	letter-spacing: 0.02em;
	text-transform: uppercase;
}

.kitchen-order-card__customer {
	margin: 6px 0 0;
	font-size: 0.88rem;
	font-weight: 500;
	opacity: 0.88;
	line-height: 1.2;
}

.kitchen-order-card__elapsed {
	display: inline-flex;
	align-items: center;
	flex-shrink: 0;
	font-size: 0.95rem;
	font-weight: 700;
	white-space: nowrap;
	padding: 6px 10px;
	border-radius: 999px;
	background: rgba(0, 0, 0, 0.18);
}

.kitchen-order-card__header--warning .kitchen-order-card__elapsed,
.kitchen-order-card__header--danger .kitchen-order-card__elapsed {
	background: rgba(0, 0, 0, 0.22);
}

.kitchen-order-card__items {
	flex: 1;
	list-style: none;
	margin: 0;
	padding: 8px 8px 4px;
}

.kitchen-order-card__item {
	border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.kitchen-order-card__item:last-child {
	border-bottom: 0;
}

.kitchen-item-label {
	display: inline-flex;
	align-items: center;
	gap: 10px;
	min-height: 28px;
}

.kitchen-qty-chip {
	min-width: 36px;
	justify-content: center;
	font-size: 1rem !important;
	font-weight: 800 !important;
	letter-spacing: 0.02em;
}

.kitchen-item-name {
	font-size: 1rem;
	font-weight: 600;
	line-height: 1.25;
}

.kitchen-order-card__item--served .kitchen-item-name {
	text-decoration: line-through;
	opacity: 0.65;
}

.kitchen-order-card__footer {
	padding: 8px 16px 12px;
	font-size: 0.85rem;
	opacity: 0.75;
}

.kitchen-card-fade-enter-active,
.kitchen-card-fade-leave-active {
	transition: all 0.8s ease;
}

.kitchen-card-fade-enter-from,
.kitchen-card-fade-leave-to {
	opacity: 0;
	transform: scale(0.94) translateY(8px);
}

.kitchen-card-fade-move {
	transition: transform 0.5s ease;
}
</style>
