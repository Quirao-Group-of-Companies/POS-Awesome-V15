import { describe, expect, it } from "vitest";
import { findRestaurantTableStatusEntry } from "../src/posapp/utils/resumeRestaurantTableOrder";

describe("findRestaurantTableStatusEntry", () => {
	it("resolves by table id or label", () => {
		const map = {
			"P-1": {
				status: "Occupied" as const,
				invoice_name: "POS-INV-001",
				restaurant_table: "P-1",
				restaurant_table_label: "P-1",
			},
		};

		expect(findRestaurantTableStatusEntry(map, "P-1", "P-1")?.invoice_name).toBe(
			"POS-INV-001",
		);
		expect(findRestaurantTableStatusEntry(map, "P-1")?.invoice_name).toBe(
			"POS-INV-001",
		);
		expect(findRestaurantTableStatusEntry(map, "P-99")).toBeNull();
	});
});
