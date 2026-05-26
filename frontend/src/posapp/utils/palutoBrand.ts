import {
	applyRestaurantDarkCssVars,
	applyRestaurantLightCssVars,
} from "../styles/restaurantTheme";

/** Paluto signature red palette (matches restaurant theme). */
export const PALUTO_BRAND = {
	primary: "#d32f2f",
	primaryVariant: "#c62828",
	primaryLight: "#f44336",
	primaryContainer: "#ffebee",
	secondary: "#ff5252",
	hoverBg: "rgba(211, 47, 47, 0.08)",
} as const;

export function isPalutoMode(profile: unknown): boolean {
	if (!profile || typeof profile !== "object") {
		return false;
	}
	const raw = (profile as Record<string, unknown>).posa_paluto_mode;
	return raw === 1 || raw === true || raw === "1";
}

export function getNavbarBrandParts(isPaluto: boolean) {
	if (isPaluto) {
		return {
			light: "PALUTO",
			bold: "POS",
			compact: "PALUTO",
			alt: "PALUTO POS",
		};
	}
	return {
		light: "POS",
		bold: "Awesome",
		compact: "POS",
		alt: "POS Awesome",
	};
}

export function applyPalutoCssVariables(resolvedTheme: "light" | "dark") {
	if (typeof document === "undefined") {
		return;
	}

	const root = document.documentElement;
	root.setAttribute("data-paluto-mode", "1");

	if (resolvedTheme === "dark") {
		applyRestaurantDarkCssVars(root);
		return;
	}

	applyRestaurantLightCssVars(root);
}
