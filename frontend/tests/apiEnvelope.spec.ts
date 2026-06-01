// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import api from "../src/posapp/services/api";

describe("api envelope handling", () => {
	beforeEach(() => {
		vi.useFakeTimers();
		vi.stubGlobal("frappe", {
			call: vi.fn(),
		});
	});

	afterEach(() => {
		vi.useRealTimers();
		vi.unstubAllGlobals();
		vi.restoreAllMocks();
	});

	it("returns a timeout envelope and passes a request_id", async () => {
		(frappe.call as any).mockImplementation(() => undefined);

		const pending = api.callEnvelope(
			"pos.test.timeout",
			{},
			{ timeoutMs: 10 },
		);
		await vi.advanceTimersByTimeAsync(10);
		const result = await pending;

		expect(result).toMatchObject({
			ok: false,
			error: {
				code: "TIMEOUT",
				retryable: true,
			},
		});
		expect(result.requestId).toEqual(expect.stringMatching(/^posa-/));
		expect(frappe.call).toHaveBeenCalledWith(
			expect.objectContaining({
				args: expect.objectContaining({ request_id: result.requestId }),
			}),
		);
	});

	it("normalizes transport errors into retryable envelopes", async () => {
		(frappe.call as any).mockImplementation(({ error }: any) => {
			error({ status: 503, statusText: "Service Unavailable" });
		});

		const result = await api.callEnvelope("pos.test.http_error");

		expect(result).toMatchObject({
			ok: false,
			error: {
				code: "HTTP_ERROR",
				message: "Service Unavailable",
				retryable: true,
			},
		});
	});

	it("normalizes frappe validation failures from the error callback", async () => {
		const stockPayload = {
			errors: [
				{
					item_code: "ADB-7UP",
					item_name: "7 UP",
					warehouse: "Fruits/Vegetables - PSB",
					requested_qty: 3,
					available_qty: 0,
					policy: "block",
				},
			],
		};
		(frappe.call as any).mockImplementation(({ error }: any) => {
			error({
				responseJSON: {
					exc_type: "ValidationError",
					exc: "ValidationError",
					_server_messages: JSON.stringify([
						JSON.stringify({
							message: JSON.stringify(stockPayload),
							title: "Message",
						}),
					]),
				},
			});
		});

		const result = await api.callEnvelope("pos.test.stock_error");

		expect(result).toMatchObject({
			ok: false,
			error: {
				code: "INSUFFICIENT_STOCK",
				retryable: false,
			},
		});
		expect(result.ok === false && result.error.message).toContain("ADB-7UP");
	});

	it("normalizes business-rule responses into non-retryable envelopes", async () => {
		(frappe.call as any).mockImplementation(({ callback }: any) => {
			callback({
				message: {
					error: {
						code: "VALIDATION_ERROR",
						message: "Customer is required",
					},
				},
			});
		});

		const result = await api.callEnvelope("pos.test.business_error");

		expect(result).toMatchObject({
			ok: false,
			error: {
				code: "VALIDATION_ERROR",
				message: "Customer is required",
				retryable: false,
			},
		});
	});
});
