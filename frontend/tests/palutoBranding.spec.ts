import { describe, expect, it } from "vitest";
import {
	getNavbarBrandParts,
	isPalutoMode,
	PALUTO_BRAND,
} from "../src/posapp/utils/palutoBrand";

describe("palutoBranding", () => {
	it("detects paluto mode from POS Profile", () => {
		expect(isPalutoMode({ posa_paluto_mode: 1 })).toBe(true);
		expect(isPalutoMode({ posa_paluto_mode: "1" })).toBe(true);
		expect(isPalutoMode({ posa_paluto_mode: 0 })).toBe(false);
		expect(isPalutoMode(null)).toBe(false);
	});

	it("returns PALUTO POS navbar labels when enabled", () => {
		expect(getNavbarBrandParts(true)).toEqual({
			light: "PALUTO",
			bold: "POS",
			compact: "PALUTO",
			alt: "PALUTO POS",
		});
	});

	it("uses signature red primary color", () => {
		expect(PALUTO_BRAND.primary).toBe("#d32f2f");
	});
});
