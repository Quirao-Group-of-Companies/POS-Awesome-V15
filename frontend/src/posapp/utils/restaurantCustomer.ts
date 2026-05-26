/**
 * Default customer helpers for restaurant / table orders.
 * Uses POS Profile.customer (e.g. "Various Customers") when no guest is selected.
 */

export function getRestaurantDefaultCustomer(
	posProfile: unknown,
): string | null {
	if (!posProfile || typeof posProfile !== "object") {
		return null;
	}
	const raw = (posProfile as Record<string, unknown>).customer;
	if (typeof raw === "string" && raw.trim()) {
		return raw.trim();
	}
	return null;
}

export function hasRestaurantTable(source: unknown): boolean {
	if (!source || typeof source !== "object") {
		return false;
	}
	const table = (source as Record<string, unknown>).restaurant_table;
	return typeof table === "string" && table.trim().length > 0;
}

function readCustomerId(value: unknown): string {
	return typeof value === "string" ? value.trim() : "";
}

/**
 * Resolve customer for a restaurant table order: keep explicit selection, else POS default.
 */
export function resolveRestaurantCustomer(
	currentCustomer: unknown,
	posProfile: unknown,
	doc?: { restaurant_table?: string | null; customer?: string | null } | null,
): string | null {
	const existing = readCustomerId(currentCustomer);
	if (existing) {
		return existing;
	}
	if (doc) {
		const onDoc = readCustomerId(doc.customer);
		if (onDoc) {
			return onDoc;
		}
	}
	if (!hasRestaurantTable(doc)) {
		return null;
	}
	return getRestaurantDefaultCustomer(posProfile);
}

export type RestaurantCustomerContext = {
	customer?: string;
	pos_profile?: { customer?: string };
	invoice_doc?: { customer?: string; restaurant_table?: string };
	customersStore?: { setSelectedCustomer?: (name: string | null) => void };
	fetch_customer_details?: () => void | Promise<void>;
};

function syncCustomerSelection(
	context: RestaurantCustomerContext,
	customerId: string,
) {
	context.customersStore?.setSelectedCustomer?.(customerId);
}

/**
 * Apply POS Profile default customer for restaurant table flows (UI + draft payload).
 */
export function applyRestaurantDefaultCustomer(
	context: RestaurantCustomerContext,
	data?: { customer?: string; restaurant_table?: string } | null,
): boolean {
	const tableSource = data || context.invoice_doc || context;
	if (!hasRestaurantTable(tableSource)) {
		return false;
	}

	const defaultCustomer = getRestaurantDefaultCustomer(context.pos_profile);
	if (!defaultCustomer) {
		return false;
	}

	const existing = readCustomerId(
		context.customer || data?.customer || context.invoice_doc?.customer,
	);
	const resolved =
		existing ||
		resolveRestaurantCustomer(null, context.pos_profile, {
			restaurant_table: (tableSource as { restaurant_table?: string })
				.restaurant_table,
		});

	if (!resolved) {
		return false;
	}

	const hadCustomer = Boolean(existing);

	context.customer = resolved;
	if (context.invoice_doc) {
		context.invoice_doc.customer = resolved;
	}
	if (data) {
		data.customer = resolved;
	}

	syncCustomerSelection(context, resolved);

	if (!hadCustomer && typeof context.fetch_customer_details === "function") {
		void context.fetch_customer_details();
	}

	return !hadCustomer;
}
