import { describe, expect, it } from "vitest";
import { computePhServiceCharge } from "../src/posapp/utils/phScPwdDiscount.ts";

describe("computePhServiceCharge", () => {
	it("charges 5% on VAT-inclusive share for regular pax only", () => {
		const sc = computePhServiceCharge(1120, 2, 0);
		expect(sc).toBe(56);
	});

	it("uses VAT-exclusive base for SC/PWD pax share", () => {
		const sc = computePhServiceCharge(1120, 2, 1);
		// per person 560; regular 560 * 5% = 28; senior (560/1.12)*5% = 25
		expect(sc).toBe(53);
	});
});
