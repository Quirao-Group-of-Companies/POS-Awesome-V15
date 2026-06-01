// @vitest-environment jsdom

import { beforeEach, describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";

import InvoiceTotals from "../src/posapp/components/pos/payments/InvoiceTotals.vue";
import { useInvoiceStore } from "../src/posapp/stores/invoiceStore.js";
import { useUIStore } from "../src/posapp/stores/uiStore.js";

const BoxStub = defineComponent({
	setup(_, { slots }) {
		return () => h("div", {}, slots.default?.());
	},
});

const VIconStub = defineComponent({
	props: {
		icon: {
			type: String,
			default: "",
		},
	},
	setup(props) {
		return () => h("span", { class: "v-icon-stub" }, props.icon);
	},
});

const VTooltipStub = defineComponent({
	props: {
		text: {
			type: String,
			default: "",
		},
	},
	setup(props, { slots }) {
		return () =>
			h("div", { class: "v-tooltip-stub", "data-tooltip": props.text }, [
				slots.activator?.({ props: { "aria-label": props.text } }),
				slots.default?.(),
			]);
	},
});

const VTextFieldStub = defineComponent({
	name: "VTextFieldStub",
	props: {
		modelValue: {
			type: [String, Number],
			default: "",
		},
		label: {
			type: String,
			default: "",
		},
	},
	setup(props, { slots }) {
		return () =>
			h("div", { "data-label": props.label }, [
				h("span", String(props.modelValue ?? "")),
				slots["append-inner"]?.(),
			]);
	},
});

describe("InvoiceTotals", () => {
	let pinia: ReturnType<typeof createPinia>;

	beforeEach(() => {
		(window as any).frappe = {
			_: (value: string) => value,
			datetime: { nowdate: () => "2026-05-29" },
		};
		pinia = createPinia();
		setActivePinia(pinia);
	});

	it("separates item/rate discounts from additional discount", () => {
		const invoiceDoc = {
			currency: "PKR",
			net_total: 900,
			total_taxes_and_charges: 0,
			total: 900,
			discount_amount: 50,
			grand_total: 850,
			custom_service_charge_amount: 0,
		};

		const invoiceStore = useInvoiceStore();
		invoiceStore.setInvoiceDoc(invoiceDoc);
		useUIStore().setPosProfile({ custom_enable_service_charge: 0 } as any);

		const wrapper = mount(InvoiceTotals, {
			props: {
				invoice_doc: invoiceDoc,
				itemDiscountTotal: 120,
				displayCurrency: "PKR",
				diff_payment: 0,
				diff_label: "Remaining",
				currencySymbol: () => "Rs",
				formatCurrency: (value: number) => String(value),
			},
			global: {
				plugins: [pinia],
				components: {
					VRow: BoxStub,
					VCol: BoxStub,
					VIcon: VIconStub,
					VTooltip: VTooltipStub,
					VTextField: VTextFieldStub,
				},
			},
		});

		expect(wrapper.find('[data-label="Item / Rate Discounts"]').text()).toContain("120");
		expect(wrapper.find('[data-label="Additional Discount"]').text()).toContain("50");
		expect(wrapper.find('[data-label="Total Discount"]').text()).toContain("170");
		expect(wrapper.find('[data-label="Discount Amount"]').exists()).toBe(false);
		expect(wrapper.find(".discount-context-card").exists()).toBe(false);
		const itemDiscountField = wrapper.find('[data-label="Item / Rate Discounts"]');
		expect(itemDiscountField.find(".discount-help-trigger").exists()).toBe(true);
		expect(itemDiscountField.find(".v-icon-stub").text()).toContain(
			"mdi-information-outline",
		);
		const itemDiscountTooltip = itemDiscountField.find(".v-tooltip-stub");
		expect(itemDiscountTooltip.attributes("data-tooltip")).toContain(
			"Item and rate discounts are already included in item rates and Net Total.",
		);
		expect(itemDiscountTooltip.attributes("data-tooltip")).toContain(
			"Additional Discount is the separate invoice-level discount.",
		);
	});
});
