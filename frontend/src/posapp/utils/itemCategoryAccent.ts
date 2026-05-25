import { RESTAURANT_THEME } from "../styles/restaurantTheme";

export type ItemCategoryAccent = {
	color: string;
	icon: string;
	borderColor: string;
	label: string;
};

/** Unified red strip — matches Restaurant Red theme on hover/highlight. */
const THEME_ACCENT_BORDER = RESTAURANT_THEME.primary;
const THEME_ACCENT_COLOR = "primary";

type AccentRule = {
	match: RegExp;
	accent: Omit<ItemCategoryAccent, "borderColor" | "color">;
};

const ACCENT_RULES: AccentRule[] = [
	{
		match: /drink|beverage|juice|soda|coffee|tea|beer|wine|bar|cocktail|smoothie/i,
		accent: { icon: "mdi-cup-water", label: "Drinks" },
	},
	{
		match: /hot|meal|food|kitchen|entree|main|plate|rice|noodle|soup|grill/i,
		accent: { icon: "mdi-food", label: "Hot food" },
	},
	{
		match: /dessert|sweet|cake|pastry|ice\s*cream/i,
		accent: { icon: "mdi-cupcake", label: "Dessert" },
	},
	{
		match: /appetizer|starter|side|snack|salad/i,
		accent: { icon: "mdi-food-apple", label: "Sides" },
	},
	{
		match: /grocery|retail|pack|bottle|can/i,
		accent: { icon: "mdi-package-variant", label: "Retail" },
	},
];

const DEFAULT_ACCENT: ItemCategoryAccent = {
	color: THEME_ACCENT_COLOR,
	icon: "mdi-tag-outline",
	borderColor: THEME_ACCENT_BORDER,
	label: "Item",
};

const withThemeColors = (partial: Omit<ItemCategoryAccent, "borderColor" | "color">): ItemCategoryAccent => ({
	...partial,
	color: THEME_ACCENT_COLOR,
	borderColor: THEME_ACCENT_BORDER,
});

/**
 * Resolve a subtle category accent for item cards (red side strip + icon on hover).
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
			return withThemeColors(rule.accent);
		}
	}

	return withThemeColors({ icon: "mdi-tag-outline", label: group });
}
