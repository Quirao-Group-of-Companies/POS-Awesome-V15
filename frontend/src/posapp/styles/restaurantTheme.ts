/**
 * Restaurant Red theme palette — single source of truth for Vuetify + CSS variables.
 */
export const RESTAURANT_THEME = {
	background: "#121212",
	surface: "#1E1E1E",
	surfaceVariant: "#2d2d2d",
	surfaceBright: "#252525",
	surfaceLight: "#1a1a1a",
	primary: "#D32F2F",
	primaryVariant: "#B71C1C",
	primaryContainer: "#4a1c1c",
	secondary: "#FF5252",
	secondaryVariant: "#E53935",
	accent: "#FF8A80",
	accentVariant: "#FF6E63",
	error: "#B00020",
	info: "#2196F3",
	success: "#4CAF50",
	warning: "#FB8C00",
	onPrimary: "#FFFFFF",
	onSecondary: "#FFFFFF",
	onBackground: "#FFFFFF",
	onSurface: "#FFFFFF",
	outline: "rgba(255, 255, 255, 0.2)",
	hoverBg: "rgba(211, 47, 47, 0.12)",
	pressedBg: "rgba(211, 47, 47, 0.18)",
	selectedBg: "rgba(211, 47, 47, 0.24)",
	focusBg: "rgba(211, 47, 47, 0.16)",
	tableRowHover: "rgba(211, 47, 47, 0.08)",
} as const;

/** Light mode keeps red primaries on a light shell (counter / back office). */
export const RESTAURANT_LIGHT_THEME = {
	background: "#FFFFFF",
	surface: "#FFFFFF",
	surfaceVariant: "#f5f5f5",
	primary: "#D32F2F",
	primaryVariant: "#B71C1C",
	secondary: "#FF5252",
	accent: "#FF8A80",
	error: "#B00020",
	info: "#2196F3",
	success: "#4CAF50",
	warning: "#FB8C00",
	hoverBg: "rgba(211, 47, 47, 0.06)",
	selectedBg: "rgba(211, 47, 47, 0.12)",
} as const;

export function applyRestaurantLightCssVars(root: HTMLElement) {
	root.style.setProperty("--pos-bg-primary", RESTAURANT_LIGHT_THEME.background);
	root.style.setProperty("--pos-bg-secondary", "#f8f9fa");
	root.style.setProperty("--pos-bg-tertiary", "#ffebee");
	root.style.setProperty("--pos-surface", RESTAURANT_LIGHT_THEME.surface);
	root.style.setProperty("--pos-surface-variant", RESTAURANT_LIGHT_THEME.surfaceVariant);
	root.style.setProperty("--pos-primary", RESTAURANT_LIGHT_THEME.primary);
	root.style.setProperty("--pos-primary-variant", RESTAURANT_LIGHT_THEME.primaryVariant);
	root.style.setProperty("--pos-secondary", RESTAURANT_LIGHT_THEME.secondary);
	root.style.setProperty("--pos-accent", RESTAURANT_LIGHT_THEME.accent);
	root.style.setProperty("--pos-error", RESTAURANT_LIGHT_THEME.error);
	root.style.setProperty("--pos-hover-bg", RESTAURANT_LIGHT_THEME.hoverBg);
	root.style.setProperty("--pos-selected-bg", RESTAURANT_LIGHT_THEME.selectedBg);
	root.style.setProperty("--pos-card-bg", RESTAURANT_LIGHT_THEME.surface);
	root.style.setProperty("--pos-input-bg", "#f5f5f5");
}

export function applyRestaurantDarkCssVars(root: HTMLElement) {
	root.style.setProperty("--pos-bg-primary", RESTAURANT_THEME.background);
	root.style.setProperty("--pos-bg-secondary", RESTAURANT_THEME.surface);
	root.style.setProperty("--pos-bg-tertiary", RESTAURANT_THEME.surfaceVariant);
	root.style.setProperty("--pos-surface", RESTAURANT_THEME.surface);
	root.style.setProperty("--pos-surface-variant", RESTAURANT_THEME.surfaceVariant);
	root.style.setProperty("--pos-primary", RESTAURANT_THEME.primary);
	root.style.setProperty("--pos-primary-variant", RESTAURANT_THEME.primaryVariant);
	root.style.setProperty("--pos-primary-container", RESTAURANT_THEME.primaryContainer);
	root.style.setProperty("--pos-secondary", RESTAURANT_THEME.secondary);
	root.style.setProperty("--pos-accent", RESTAURANT_THEME.accent);
	root.style.setProperty("--pos-error", RESTAURANT_THEME.error);
	root.style.setProperty("--pos-success", RESTAURANT_THEME.success);
	root.style.setProperty("--pos-warning", RESTAURANT_THEME.warning);
	root.style.setProperty("--pos-info", RESTAURANT_THEME.info);
	root.style.setProperty("--pos-hover-bg", RESTAURANT_THEME.hoverBg);
	root.style.setProperty("--pos-pressed-bg", RESTAURANT_THEME.pressedBg);
	root.style.setProperty("--pos-selected-bg", RESTAURANT_THEME.selectedBg);
	root.style.setProperty("--pos-focus-bg", RESTAURANT_THEME.focusBg);
	root.style.setProperty("--pos-card-bg", RESTAURANT_THEME.surface);
	root.style.setProperty("--pos-input-bg", RESTAURANT_THEME.surfaceVariant);
	root.style.setProperty("--pos-navbar-bg", RESTAURANT_THEME.surface);
	root.style.setProperty("--pos-sidebar-bg", RESTAURANT_THEME.background);
	root.style.setProperty("--pos-table-row-hover", RESTAURANT_THEME.tableRowHover);
	root.style.setProperty("--pos-surface-raised", RESTAURANT_THEME.surfaceBright);
	root.style.setProperty("--pos-surface-muted", RESTAURANT_THEME.surfaceLight);
}
