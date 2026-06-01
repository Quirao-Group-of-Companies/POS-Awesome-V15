<template>
	<v-container fluid class="restaurant-dashboard pa-4">
		<v-card class="control-bar pa-3 mb-4" elevation="6">
			<v-row align="center" no-gutters>
				<v-col cols="12" md="3" class="pr-md-4">
					<v-select
						v-model="selectedFloor"
						:items="floors"
						label="Floor"
						density="compact"
						variant="outlined"
						hide-details
						class="floor-select"
						@update:model-value="fetchTables"
					/>
				</v-col>

				<v-col cols="12" md="8" class="legend-wrap my-3 my-md-0">
					<div
						v-for="item in legend"
						:key="item.status"
						class="legend-item"
					>
						<span
							class="legend-dot"
							:style="{ backgroundColor: statusColor(item.status) }"
						/>
						<span>{{ item.label }}</span>
					</div>
				</v-col>
			</v-row>
		</v-card>

		<v-row class="table-grid" dense>
			<v-col
				v-for="table in displayTables"
				:key="table.name"
				cols="4"
				sm="3"
				md="2"
				lg="1"
				class="table-col"
			>
				<v-card
					class="table-card"
					:class="`status-${table.statusKey}`"
					:style="tableCardStyle(table)"
					elevation="4"
					@click="selectTable(table)"
				>
					<v-icon class="table-icon">
						{{ table.status === "Occupied" ? "mdi-account" : "mdi-silverware-fork-knife" }}
					</v-icon>
					<div class="table-name">
						{{ table.label }}
					</div>
					<div class="table-status">
						{{ table.status }}
					</div>
					<div v-if="table.status !== 'Vacant' && table.entry" class="table-meta">
						<div class="table-total">
							{{ getGrandTotalLabel(table.entry) }}
						</div>
						<div class="table-elapsed">
							{{ getElapsedLabel(table.entry) }}
						</div>
					</div>
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useInvoiceStore } from "@/posapp/stores/invoiceStore";
import { useFormat } from "@/posapp/format";
import { useUIStore } from "../../stores/uiStore.js";
import { ensurePosProfile } from "../../../utils/pos_profile";
import {
	fetchRestaurantTableStatus,
	type RestaurantTableStatus,
	type RestaurantTableStatusEntry,
	type RestaurantTableStatusMap,
} from "../../utils/restaurantTableStatus";
import {
	findRestaurantTableStatusEntry,
	resumeRestaurantTableOrder,
	startNewRestaurantTableSession,
} from "../../utils/resumeRestaurantTableOrder";

declare const frappe: any;
declare const __: (text: string, args?: any[]) => string;

type RestaurantTable = {
	name: string;
	label: string;
	floor: string;
	status: RestaurantTableStatus;
	statusKey: string;
	entry?: RestaurantTableStatusEntry | null;
};

const router = useRouter();
const invoiceStore = useInvoiceStore();
const uiStore = useUIStore();
const { posProfile } = storeToRefs(uiStore);
const { formatCurrency, currencySymbol } = useFormat();

const selectedFloor = ref("PALUTO");
const floors = ref(["PALUTO"]);
const tableStatuses = ref<Record<string, RestaurantTableStatus>>({});
const tableStatusDetails = ref<RestaurantTableStatusMap>({});
const nowTick = ref(Date.now());
let elapsedTimer: number | null = null;

const legend = [
	{ label: "VACANT", status: "Vacant" as RestaurantTableStatus },
	{ label: "OCCUPIED", status: "Occupied" as RestaurantTableStatus },
	{ label: "BILL-CUT", status: "Bill-Cut" as RestaurantTableStatus },
];

function parsePositiveInt(value: unknown, fallback: number): number {
	const n =
		typeof value === "number" ? value : parseInt(String(value ?? ""), 10);
	if (!Number.isFinite(n) || n < 1) {
		return fallback;
	}
	return Math.min(n, 500);
}

function receptionistRoleSet(profile: Record<string, unknown> | null): Set<string> {
	const raw = profile?.posa_paluto_receptionist_roles;
	if (typeof raw !== "string" || !raw.trim()) {
		return new Set(["receptionist"]);
	}
	return new Set(raw.split(",").map((s) => s.trim()).filter(Boolean));
}

function userHasReceptionistRole(profile: Record<string, unknown> | null): boolean {
	const roles = profile?.posa_user_roles;
	if (!Array.isArray(roles)) {
		return false;
	}
	const roleSet = new Set(roles.map((r) => String(r)));
	for (const need of receptionistRoleSet(profile)) {
		if (roleSet.has(need)) {
			return true;
		}
	}
	return false;
}

/** Paluto: receptionist ~70 tables, others ~150 when `posa_paluto_mode` is set on POS Profile. */
const tableSlotCount = computed(() => {
	const p = posProfile.value as Record<string, unknown> | null;
	if (!p?.posa_paluto_mode) {
		return 70;
	}
	const recv = parsePositiveInt(p.posa_paluto_receptionist_table_count, 70);
	const def = parsePositiveInt(p.posa_paluto_default_table_count, 150);
	return userHasReceptionistRole(p) ? recv : def;
});

function resolveTableStatus(label: string): RestaurantTableStatus {
	return (
		tableStatuses.value[label] ||
		tableStatusDetails.value[label]?.status ||
		"Vacant"
	);
}

function resolveTableEntry(label: string): RestaurantTableStatusEntry | null {
	return findRestaurantTableStatusEntry(
		tableStatusDetails.value,
		label,
		label,
	);
}

const displayTables = computed(() => {
	return Array.from({ length: tableSlotCount.value }, (_, index) => {
		const label = `P-${index + 1}`;
		const status = resolveTableStatus(label);

		return {
			name: label,
			label,
			floor: selectedFloor.value,
			status,
			statusKey: statusKey(status),
			entry: resolveTableEntry(label),
		};
	});
});

function statusKey(status: RestaurantTableStatus) {
	return status.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function statusColor(status: RestaurantTableStatus) {
	if (status === "Occupied") {
		return "#1677c9";
	}
	if (status === "Bill-Cut") {
		return "#2e8b57";
	}
	return "#2a2f36";
}

const displayCurrency = computed(() => {
	const p = posProfile.value as Record<string, unknown> | null;
	return (
		(p?.currency as string) ||
		(frappe?.boot?.sysdefaults?.currency as string) ||
		""
	);
});

const displayCurrencySymbol = computed(() => {
	const cur = displayCurrency.value;
	return cur ? currencySymbol(cur) : "";
});

function tableCardStyle(table: RestaurantTable): Record<string, string> {
	if (table.status === "Occupied" || table.status === "Bill-Cut") {
		return { backgroundColor: statusColor(table.status) };
	}
	return {};
}

function getElapsedLabel(entry: RestaurantTableStatusEntry | null): string {
	if (!entry) return "";
	const raw = entry.creation || entry.modified || "";
	const parsed = raw ? new Date(raw).getTime() : NaN;
	if (!Number.isFinite(parsed)) return "";

	const minutes = Math.max(0, Math.floor((nowTick.value - parsed) / 60_000));
	if (minutes < 60) return `${minutes}m`;
	const hours = Math.floor(minutes / 60);
	const rem = minutes % 60;
	return rem ? `${hours}h ${rem}m` : `${hours}h`;
}

function getGrandTotalLabel(entry: RestaurantTableStatusEntry | null): string {
	if (!entry) return "";
	const total = Number(entry.grand_total || 0);
	if (!Number.isFinite(total) || total <= 0) return "";
	const formatted = formatCurrency(total);
	const symbol = displayCurrencySymbol.value;
	return symbol ? `${symbol} ${formatted}` : formatted;
}

function startElapsedTimer() {
	stopElapsedTimer();
	elapsedTimer = window.setInterval(() => {
		nowTick.value = Date.now();
	}, 60_000);
}

function stopElapsedTimer() {
	if (elapsedTimer) {
		window.clearInterval(elapsedTimer);
		elapsedTimer = null;
	}
}

function applyTableStatusMap(statusMap: RestaurantTableStatusMap) {
	const nextStatuses: Record<string, RestaurantTableStatus> = {};
	for (const [key, entry] of Object.entries(statusMap)) {
		const label = (entry?.restaurant_table_label || key).trim();
		if (!label || !entry?.status || entry.status === "Vacant") {
			continue;
		}
		nextStatuses[label] = entry.status;
	}
	tableStatusDetails.value = statusMap;
	tableStatuses.value = nextStatuses;
}

async function fetchTables() {
	const profile = await ensurePosProfile();
	if (profile) {
		uiStore.setPosProfile(profile as any);
	}

	try {
		const statusMap = await fetchRestaurantTableStatus({
			company: profile?.company,
			posProfile: profile?.name,
			floor: selectedFloor.value,
		});
		applyTableStatusMap(statusMap);
	} catch (error) {
		console.error("Failed to load restaurant table status:", error);
		frappe.show_alert({
			message: __("Unable to refresh table status"),
			indicator: "orange",
		});
	}
}

onMounted(() => {
	nowTick.value = Date.now();
	startElapsedTimer();
	fetchTables();
});

onBeforeUnmount(() => {
	stopElapsedTimer();
});

function getTableStatusEntry(table: RestaurantTable): RestaurantTableStatusEntry | null {
	return table.entry || null;
}

async function selectTable(table: RestaurantTable) {
	const profile = (await ensurePosProfile()) || posProfile.value;
	const status = resolveTableStatus(table.label);
	const entry = getTableStatusEntry(table);
	const routeQuery: Record<string, string> = {
		table_id: table.name,
		table_label: table.label,
		floor: table.floor,
	};

	if (status !== "Vacant" && status !== "Occupied") {
		frappe.show_alert({
			message: __(
				"This table has a billed order. Open it from invoice management or complete payment.",
			),
			indicator: "orange",
		});
		return;
	}

	if (status === "Occupied" && entry?.invoice_name && profile) {
		try {
			await resumeRestaurantTableOrder({
				tableId: table.name,
				tableLabel: table.label,
				floor: table.floor,
				company: profile.company as string | undefined,
				posProfile: profile as Record<string, unknown>,
				invoiceStore,
				uiStore,
			});
			routeQuery.order_saved = "1";
		} catch (error) {
			console.error("Failed to resume restaurant table order:", error);
			frappe.show_alert({
				message: __("Unable to open saved table order"),
				indicator: "red",
			});
			return;
		}

		await router.push({ path: "/pos", query: routeQuery });
		return;
	}

	invoiceStore.clear();
	startNewRestaurantTableSession(invoiceStore, {
		name: table.name,
		label: table.label,
		floor: table.floor,
	});

	await router.push({ path: "/pos", query: routeQuery });
}
</script>

<style scoped>
.restaurant-dashboard {
	min-height: 100vh;
	background:
		radial-gradient(circle at top left, rgba(35, 75, 110, 0.28), transparent 32rem),
		linear-gradient(135deg, #111418 0%, #1b1f24 55%, #101214 100%);
	color: #f4f4f4;
}

.control-bar {
	background: rgba(24, 28, 33, 0.96);
	border: 1px solid rgba(255, 255, 255, 0.08);
	border-radius: 14px;
}

.floor-select {
	color: #fff;
}

.legend-wrap {
	display: flex;
	align-items: center;
	gap: 12px;
	flex-wrap: wrap;
}

.legend-item {
	display: flex;
	align-items: center;
	gap: 6px;
	font-size: 12px;
	font-weight: 700;
	letter-spacing: 0.08em;
	color: #e7e7e7;
}

.legend-dot {
	width: 18px;
	height: 18px;
	border-radius: 4px;
	border: 1px solid rgba(255, 255, 255, 0.35);
}

.table-grid {
	margin-top: 8px;
}

.table-col {
	display: flex;
	justify-content: center;
}

.table-card {
	width: 82px;
	height: 66px;
	border-radius: 6px;
	cursor: pointer;
	color: #fff;
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	border: 1px solid rgba(255, 255, 255, 0.18);
	box-shadow:
		inset 0 1px 0 rgba(255, 255, 255, 0.18),
		0 6px 16px rgba(0, 0, 0, 0.35);
	transition:
		transform 0.15s ease,
		box-shadow 0.15s ease,
		filter 0.15s ease;
}

.status-vacant {
	background: rgba(255, 255, 255, 0.035);
	border-color: rgba(255, 255, 255, 0.08);
	opacity: 0.55;
	box-shadow: none;
}

.status-vacant:hover {
	opacity: 0.7;
	transform: translateY(-1px);
	filter: none;
	box-shadow: none;
}

.table-card:hover {
	transform: translateY(-3px);
	filter: brightness(1.12);
	box-shadow: 0 10px 22px rgba(0, 0, 0, 0.45);
}

.table-icon {
	font-size: 18px;
	margin-bottom: 2px;
}

.table-name {
	font-size: 12px;
	font-weight: 800;
	line-height: 1;
}

.table-status {
	font-size: 8px;
	text-transform: uppercase;
	opacity: 0.85;
	margin-top: 3px;
}

.table-meta {
	margin-top: 2px;
	display: flex;
	gap: 4px;
	align-items: center;
	font-size: 9px;
	line-height: 1;
	opacity: 0.92;
}

.table-total {
	font-weight: 800;
	white-space: nowrap;
	max-width: 64px;
	overflow: hidden;
	text-overflow: ellipsis;
}

.table-elapsed {
	font-weight: 700;
	opacity: 0.85;
	white-space: nowrap;
}

.status-occupied {
	box-shadow:
		0 0 0 1px rgba(44, 150, 255, 0.45),
		0 6px 16px rgba(0, 0, 0, 0.35);
}

.status-billcut {
	box-shadow:
		0 0 0 1px rgba(76, 175, 80, 0.45),
		0 6px 16px rgba(0, 0, 0, 0.35);
}

@media (max-width: 960px) {
	.table-card {
		width: 76px;
		height: 64px;
	}
}
</style>
