import { loadDocumentSourceRecord } from "./documentSources";
import { resolveDraftInvoiceDoctype } from "./draftInvoices";
import {
	fetchRestaurantTableStatus,
	type RestaurantTableStatusEntry,
	type RestaurantTableStatusMap,
} from "./restaurantTableStatus";

export type ResumeRestaurantTableOptions = {
	tableId: string;
	tableLabel?: string;
	floor?: string;
	company?: string;
	posProfile: Record<string, unknown>;
	invoiceStore: {
		startRestaurantTableSession: (table: {
			name: string;
			label?: string;
			floor?: string;
		}) => void;
		markRestaurantOrderSaved?: () => void;
	};
	uiStore?: {
		closeDrafts?: () => void;
		closeInvoiceManagement?: () => void;
	};
};

export type ResumeRestaurantTableResult = {
	resumed: boolean;
	entry?: RestaurantTableStatusEntry;
};

export function findRestaurantTableStatusEntry(
	statusMap: RestaurantTableStatusMap,
	tableId: string,
	tableLabel?: string,
): RestaurantTableStatusEntry | null {
	const label = (tableLabel || tableId).trim();
	return statusMap[tableId] || statusMap[label] || null;
}

/**
 * Load an existing draft for an occupied table, or start a new table session.
 */
export async function resumeRestaurantTableOrder(
	options: ResumeRestaurantTableOptions,
): Promise<ResumeRestaurantTableResult> {
	const {
		tableId,
		tableLabel,
		floor,
		company,
		posProfile,
		invoiceStore,
		uiStore,
	} = options;

	const label = (tableLabel || tableId).trim();
	const statusMap = await fetchRestaurantTableStatus({
		company: company || (posProfile.company as string | undefined),
		posProfile: posProfile.name as string | undefined,
		floor,
	});
	const entry = findRestaurantTableStatusEntry(statusMap, tableId, label);

	if (entry?.status === "Occupied" && entry.invoice_name) {
		const invoiceDoctype = resolveDraftInvoiceDoctype(entry, posProfile);
		await loadDocumentSourceRecord({
			source: "invoice",
			record: {
				name: entry.invoice_name,
				doctype: invoiceDoctype,
				source: "invoice",
				docstatus: 0,
				allowed_actions: ["invoice_load_draft"],
			},
			posProfile,
			currentInvoiceDoctype: invoiceDoctype,
			invoiceStore,
			uiStore,
			closeDrafts: true,
			closeInvoiceManagement: true,
		});
		return { resumed: true, entry };
	}

	return { resumed: false, entry: entry || undefined };
}

export function startNewRestaurantTableSession(
	invoiceStore: ResumeRestaurantTableOptions["invoiceStore"],
	table: { name: string; label?: string; floor?: string },
	markSaved = false,
) {
	invoiceStore.startRestaurantTableSession(table);
	if (markSaved && invoiceStore.markRestaurantOrderSaved) {
		invoiceStore.markRestaurantOrderSaved();
	}
}
