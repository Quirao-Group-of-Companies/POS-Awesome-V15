declare const frappe: any;

export type RestaurantTableStatus = "Vacant" | "Occupied" | "Bill-Cut";

export type RestaurantTableStatusEntry = {
	status: RestaurantTableStatus;
	invoice_name?: string;
	restaurant_table?: string;
	restaurant_table_label?: string;
	restaurant_floor?: string;
	docstatus?: number;
};

export type RestaurantTableStatusMap = Record<string, RestaurantTableStatusEntry>;

export const fetchRestaurantTableStatus = async ({
	company,
	posProfile,
	floor,
}: {
	company?: string;
	posProfile?: string;
	floor?: string;
}): Promise<RestaurantTableStatusMap> => {
	const { message } = await frappe.call({
		method: "posawesome.posawesome.api.restaurant.get_restaurant_table_status",
		args: {
			company,
			pos_profile: posProfile,
			floor,
		},
	});

	const tables = message?.tables;
	return tables && typeof tables === "object" ? tables : {};
};
