import { createVuetify } from "vuetify";
import * as components from "vuetify/components";
import * as directives from "vuetify/directives";
import "@mdi/font/css/materialdesignicons.css";
import {
	RESTAURANT_LIGHT_THEME,
	RESTAURANT_THEME,
} from "../styles/restaurantTheme";

const THEME_STORAGE_KEY = "posawesome_theme_preference";

const getSystemTheme = () => {
	if (
		typeof window !== "undefined" &&
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-color-scheme: dark)").matches
	) {
		return "dark";
	}
	return "light";
};

const normalizeThemeMode = (value: string | null) => {
	return value === "light" || value === "dark" || value === "automatic"
		? value
		: null;
};

const normalizeResolvedTheme = (value: string | null) => {
	return value === "light" || value === "dark" ? value : null;
};

const resolveInitialThemeMode = () => {
	if (typeof document !== "undefined") {
		const domMode = normalizeThemeMode(
			document.documentElement.getAttribute("data-theme-mode"),
		);
		if (domMode) {
			return domMode;
		}

		const domTheme = normalizeResolvedTheme(
			document.documentElement.getAttribute("data-theme"),
		);
		if (domTheme) {
			return domTheme;
		}
	}

	if (typeof localStorage !== "undefined") {
		let storedThemePreference: string | null = null;
		try {
			storedThemePreference = localStorage.getItem(THEME_STORAGE_KEY);
		} catch {
			storedThemePreference = null;
		}
		const storedMode = normalizeThemeMode(storedThemePreference);
		if (storedMode) {
			return storedMode;
		}
	}

	/* Restaurant POS defaults to dark shell */
	return "dark";
};

const resolveInitialTheme = () => {
	const mode = resolveInitialThemeMode();
	return mode === "automatic" ? getSystemTheme() : mode;
};

const bootstrapThemeAttributes = () => {
	if (typeof document === "undefined") {
		return;
	}

	const mode = resolveInitialThemeMode();
	const resolvedTheme = mode === "automatic" ? getSystemTheme() : mode;
	const root = document.documentElement;
	root.setAttribute("data-theme", resolvedTheme);
	root.setAttribute("data-theme-mode", mode);
	root.style.setProperty("color-scheme", resolvedTheme);
};

bootstrapThemeAttributes();

const lightTheme = {
	dark: false,
	colors: {
		background: RESTAURANT_LIGHT_THEME.background,
		surface: RESTAURANT_LIGHT_THEME.surface,
		"surface-variant": RESTAURANT_LIGHT_THEME.surfaceVariant,
		"surface-bright": "#ffffff",
		"surface-light": "#fafafa",
		primary: RESTAURANT_LIGHT_THEME.primary,
		"primary-variant": RESTAURANT_LIGHT_THEME.primaryVariant,
		secondary: RESTAURANT_LIGHT_THEME.secondary,
		"secondary-variant": "#E53935",
		accent: RESTAURANT_LIGHT_THEME.accent,
		"accent-variant": "#FF6E63",
		success: RESTAURANT_LIGHT_THEME.success,
		warning: RESTAURANT_LIGHT_THEME.warning,
		error: RESTAURANT_LIGHT_THEME.error,
		info: RESTAURANT_LIGHT_THEME.info,
		outline: "rgba(0, 0, 0, 0.2)",
		"on-primary": "#ffffff",
		"on-secondary": "#ffffff",
		"on-background": "#212121",
		"on-surface": "#212121",
		"on-surface-variant": "#212121",
		"on-error": "#ffffff",
		"on-warning": "#212121",
		"on-info": "#ffffff",
		"on-success": "#ffffff",
	},
};

const darkTheme = {
	dark: true,
	colors: {
		background: RESTAURANT_THEME.background,
		surface: RESTAURANT_THEME.surface,
		"surface-variant": RESTAURANT_THEME.surfaceVariant,
		"surface-bright": RESTAURANT_THEME.surfaceBright,
		"surface-light": RESTAURANT_THEME.surfaceLight,
		primary: RESTAURANT_THEME.primary,
		"primary-variant": RESTAURANT_THEME.primaryVariant,
		secondary: RESTAURANT_THEME.secondary,
		"secondary-variant": RESTAURANT_THEME.secondaryVariant,
		accent: RESTAURANT_THEME.accent,
		"accent-variant": RESTAURANT_THEME.accentVariant,
		success: RESTAURANT_THEME.success,
		warning: RESTAURANT_THEME.warning,
		error: RESTAURANT_THEME.error,
		info: RESTAURANT_THEME.info,
		outline: RESTAURANT_THEME.outline,
		"on-primary": RESTAURANT_THEME.onPrimary,
		"on-secondary": RESTAURANT_THEME.onSecondary,
		"on-background": RESTAURANT_THEME.onBackground,
		"on-surface": RESTAURANT_THEME.onSurface,
		"on-surface-variant": RESTAURANT_THEME.onSurface,
		"on-error": "#ffffff",
		"on-warning": "#000000",
		"on-info": "#ffffff",
		"on-success": "#ffffff",
	},
};

export default createVuetify({
	components,
	directives,
	locale: {
		rtl: typeof frappe !== "undefined" && frappe.utils ? frappe.utils.is_rtl() : false,
	},
	theme: {
		defaultTheme: resolveInitialTheme(),
		themes: {
			light: lightTheme,
			dark: darkTheme,
		},
	},
});
