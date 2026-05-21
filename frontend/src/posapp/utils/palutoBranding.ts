import { RESTAURANT_LIGHT_THEME, RESTAURANT_THEME } from "../styles/restaurantTheme";
import {
	applyPalutoCssVariables,
	isPalutoMode,
	PALUTO_BRAND,
} from "./palutoBrand";
import { installPwaBranding, PWA_APP_NAME } from "./pwaBranding";

export {
	getNavbarBrandParts,
	isPalutoMode,
	PALUTO_BRAND,
} from "./palutoBrand";

const DEFAULT_LIGHT_PRIMARY = RESTAURANT_LIGHT_THEME.primary;
const DEFAULT_LIGHT_PRIMARY_VARIANT = RESTAURANT_LIGHT_THEME.primaryVariant;
const DEFAULT_DARK_PRIMARY = RESTAURANT_THEME.primary;
const DEFAULT_DARK_PRIMARY_VARIANT = RESTAURANT_THEME.primaryVariant;

function patchVuetifyTheme(vuetify: unknown, enabled: boolean) {
	const themeRef = (vuetify as {
		theme?: { current?: { value?: { colors?: Record<string, string> } } };
	})?.theme?.current?.value;
	const colors = themeRef?.colors;
	if (!colors) {
		return;
	}

	if (enabled) {
		colors.primary = PALUTO_BRAND.primary;
		if ("primary-variant" in colors) {
			colors["primary-variant"] = PALUTO_BRAND.primaryVariant;
		}
		colors.secondary = PALUTO_BRAND.secondary;
		return;
	}

	const themeName =
		(vuetify as { theme?: { global?: { name?: { value?: string } } } })?.theme
			?.global?.name?.value || "light";

	if (themeName === "dark") {
		colors.primary = DEFAULT_DARK_PRIMARY;
		if ("primary-variant" in colors) {
			colors["primary-variant"] = DEFAULT_DARK_PRIMARY_VARIANT;
		}
		colors.secondary = RESTAURANT_THEME.secondary;
		return;
	}

	colors.primary = DEFAULT_LIGHT_PRIMARY;
	if ("primary-variant" in colors) {
		colors["primary-variant"] = DEFAULT_LIGHT_PRIMARY_VARIANT;
	}
	colors.secondary = RESTAURANT_LIGHT_THEME.secondary;
}

/**
 * Apply or remove Paluto signature-red branding based on POS Profile.
 */
export function applyPalutoBranding(profile: unknown) {
	if (typeof document === "undefined") {
		return;
	}

	const enabled = isPalutoMode(profile);
	const root = document.documentElement;
	const resolvedTheme = root.getAttribute("data-theme") === "dark" ? "dark" : "light";

	if (enabled) {
		applyPalutoCssVariables(resolvedTheme);
		installPwaBranding();
		if (document.title.includes("POS Awesome")) {
			document.title = document.title.replace(/POS Awesome/g, PWA_APP_NAME);
		}
	} else {
		root.setAttribute("data-paluto-mode", "0");
	}

	try {
		// Lazy import avoids pulling browser-only theme init into unit tests.
		const { getVuetifyInstance, useTheme } = require("../composables/core/useTheme");
		if (!enabled) {
			const theme = useTheme();
			theme.setTheme(theme.mode.value);
		}
		patchVuetifyTheme(getVuetifyInstance(), enabled);
	} catch {
		/* Theme module unavailable in tests / SSR */
	}
}
