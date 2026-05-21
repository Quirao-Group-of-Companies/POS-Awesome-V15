import posLogoFallback from "../components/pos/pos.png";

/**
 * Default navbar logo served from the Frappe site (private file).
 * Use a site-relative path so the same build works on local and production hosts.
 */
export const POS_NAVBAR_LOGO_PATH = "/private/files/PFC%20MAINcf9c94.png";

/**
 * Resolve the image URL shown in the POS navbar and drawer.
 * Priority: explicit source → ERP private file → bundled fallback.
 */
export function resolvePosNavbarLogo(source?: string | null): string {
	const trimmed = String(source || "").trim();
	if (trimmed) {
		return trimmed;
	}
	return POS_NAVBAR_LOGO_PATH || posLogoFallback;
}
