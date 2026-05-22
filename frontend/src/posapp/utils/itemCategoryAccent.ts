export type ItemCategoryAccent = {
	color: string;
	icon: string;
	borderColor: string;
	label: string;
};

type AccentRule = {
	match: RegExp;
	accent: ItemCategoryAccent;
};

const ACCENT_RULES: AccentRule[] = [
	{
		match: /drink|beverage|juice|soda|coffee|tea|beer|wine|bar|cocktail|smoothie/i,
		accent: {
			color: "info",
			icon: "mdi-cup-water",
			borderColor: "#2196F3",
			label: "Drinks",
		},
	},
	{
		match: /hot|meal|food|kitchen|entree|main|plate|rice|noodle|soup|grill/i,
		accent: {
			color: "warning",
			icon: "mdi-food",
			borderColor: "#FB8C00",
			label: "Hot food",
		},
	},
	{
		match: /dessert|sweet|cake|pastry|ice\s*cream/i,
		accent: {
			color: "secondary",
			icon: "mdi-cupcake",
			borderColor: "#FF5252",
			label: "Dessert",
		},
	},
	{
		match: /appetizer|starter|side|snack|salad/i,
		accent: {
			color: "success",
			icon: "mdi-food-apple",
			borderColor: "#66BB6A",
			label: "Sides",
		},
	},
	{
		match: /grocery|retail|pack|bottle|can/i,
		accent: {
			color: "surface-variant",
			icon: "mdi-package-variant",
			borderColor: "rgba(255, 255, 255, 0.35)",
			label: "Retail",
		},
	},
];

const DEFAULT_ACCENT: ItemCategoryAccent = {
	color: "surface-variant",
	icon: "mdi-tag-outline",
	borderColor: "rgba(255, 255, 255, 0.22)",
	label: "Item",
};

/**
 * Resolve a subtle category accent for item cards (color strip + icon).
 */
export function getItemCategoryAccent(item?: {
	item_group?: string | null;
} | null): ItemCategoryAccent {
	const group = String(item?.item_group || "").trim();
	if (!group) {
		return DEFAULT_ACCENT;
	}

	for (const rule of ACCENT_RULES) {
		if (rule.match.test(group)) {
			return rule.accent;
		}
	}

	return {
		...DEFAULT_ACCENT,
		label: group,
		borderColor: "rgba(211, 47, 47, 0.55)",
	};
}
