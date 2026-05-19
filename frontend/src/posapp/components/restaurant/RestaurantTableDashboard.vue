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

				<v-col cols="12" md="4" class="legend-wrap my-3 my-md-0">
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

				<v-col cols="12" md="5" class="action-wrap">
					<v-btn
						v-for="action in actions"
						:key="action.label"
						size="small"
						class="action-btn"
						:prepend-icon="action.icon"
						@click="handleAction(action.key)"
					>
						{{ action.label }}
					</v-btn>
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
					:style="{ backgroundColor: statusColor(table.status) }"
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
				</v-card>
			</v-col>
		</v-row>
	</v-container>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { storeToRefs } from "pinia";
import { useRouter } from "vue-router";
import { useInvoiceStore } from "@/posapp/stores/invoiceStore";
import { useUIStore } from "../../stores/uiStore.js";
import { ensurePosProfile } from "../../../utils/pos_profile";

declare const frappe: any;

type RestaurantTableStatus = "Vacant" | "Occupied" | "Bill-Cut";

type RestaurantTable = {
	name: string;
	label: string;
	floor: string;
	status: RestaurantTableStatus;
	statusKey: string;
};

const router = useRouter();
const invoiceStore = useInvoiceStore();
const uiStore = useUIStore();
const { posProfile } = storeToRefs(uiStore);

const selectedFloor = ref("PALUTO");
const floors = ref(["PALUTO"]);
const tableStatuses = ref<Record<string, RestaurantTableStatus>>({});

const legend = [
	{ label: "VACANT", status: "Vacant" as RestaurantTableStatus },
	{ label: "OCCUPIED", status: "Occupied" as RestaurantTableStatus },
	{ label: "BILL-CUT", status: "Bill-Cut" as RestaurantTableStatus },
];

const actions = [
	{
		key: "customer_time_info",
		label: "CUSTOMER TIME INFO",
		icon: "mdi-clock-outline",
	},
	{ key: "reservation", label: "RESERVATION", icon: "mdi-calendar-check" },
	{ key: "payment_form", label: "PAYMENT FORM", icon: "mdi-credit-card-outline" },
	{ key: "manage_table", label: "MANAGE TABLE", icon: "mdi-table-chair" },
	{ key: "manage_item", label: "MANAGE ITEM", icon: "mdi-food" },
	{ key: "refresh", label: "REFRESH", icon: "mdi-refresh" },
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

const displayTables = computed(() => {
	return Array.from({ length: tableSlotCount.value }, (_, index) => {
		const label = `P-${index + 1}`;
		const status = tableStatuses.value[label] || "Vacant";

		return {
			name: label,
			label,
			floor: selectedFloor.value,
			status,
			statusKey: statusKey(status),
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
	return "#9a5a24";
}

async function fetchTables() {
	const profile = await ensurePosProfile();
	if (profile) {
		uiStore.setPosProfile(profile as any);
	}
	// No Restaurant Table DocType exists yet, so keep local table numbers for now.
}

onMounted(() => {
	fetchTables();
});

async function selectTable(table: RestaurantTable) {
	invoiceStore.clear();
	invoiceStore.startRestaurantTableSession({
		name: table.name,
		label: table.label,
		floor: table.floor,
	});
	tableStatuses.value = {
		...tableStatuses.value,
		[table.label]: "Occupied",
	};

	await router.push({
		path: "/pos",
		query: {
			table_id: table.name,
			table_label: table.label,
			floor: table.floor,
		},
	});
}

function handleAction(key: string) {
	if (key === "refresh") {
		fetchTables();
		return;
	}

	if (key === "manage_table") {
		frappe.show_alert({
			message: "Restaurant Table DocType is not created yet.",
			indicator: "orange",
		});
		return;
	}

	if (key === "manage_item") {
		frappe.set_route("List", "Item");
		return;
	}

	frappe.show_alert({
		message: `${key.replaceAll("_", " ")} is not wired yet.`,
		indicator: "blue",
	});
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

.action-wrap {
	display: flex;
	justify-content: flex-end;
	gap: 8px;
	flex-wrap: wrap;
}

.action-btn {
	background: linear-gradient(180deg, #2f88d8, #1669ad);
	color: #fff;
	font-size: 11px;
	font-weight: 700;
	border-radius: 10px;
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
	height: 58px;
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
	.action-wrap {
		justify-content: flex-start;
	}

	.table-card {
		width: 76px;
		height: 56px;
	}
}
</style>
