import { describe, expect, it, vi } from "vitest";
import {
	applyRestaurantDefaultCustomer,
	getRestaurantDefaultCustomer,
	resolveRestaurantCustomer,
} from "../src/posapp/utils/restaurantCustomer";

describe("restaurantCustomer", () => {
	it("reads default customer from POS Profile", () => {
		expect(
			getRestaurantDefaultCustomer({ customer: "Various Customers" }),
		).toBe("Various Customers");
		expect(getRestaurantDefaultCustomer({})).toBeNull();
	});

	it("resolves profile default for table orders without a guest", () => {
		expect(
			resolveRestaurantCustomer("", { customer: "Various Customers" }, {
				restaurant_table: "P-1",
			}),
		).toBe("Various Customers");
		expect(
			resolveRestaurantCustomer("VIP Guest", { customer: "Various Customers" }, {
				restaurant_table: "P-1",
			}),
		).toBe("VIP Guest");
	});

	it("applies default customer to context and customers store", () => {
		const setSelectedCustomer = vi.fn();
		const fetch_customer_details = vi.fn();
		const context = {
			customer: "",
			pos_profile: { customer: "Various Customers" },
			invoice_doc: { restaurant_table: "P-2" },
			customersStore: { setSelectedCustomer },
			fetch_customer_details,
		};

		const applied = applyRestaurantDefaultCustomer(context);

		expect(applied).toBe(true);
		expect(context.customer).toBe("Various Customers");
		expect(context.invoice_doc.customer).toBe("Various Customers");
		expect(setSelectedCustomer).toHaveBeenCalledWith("Various Customers");
		expect(fetch_customer_details).toHaveBeenCalled();
	});
});
