/** PWA / desktop shortcut branding (manifest + head meta). */
export const PWA_APP_NAME = "Paluto POS";
export const PWA_THEME_COLOR = "#D32F2F";
export const PWA_BACKGROUND_COLOR = "#121212";

const PWA_ICON_SIZES = [512, 192, 144] as const;

function upsertMeta(name: string, content: string) {
	let meta = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null;
	if (!meta) {
		meta = document.createElement("meta");
		meta.name = name;
		document.head.appendChild(meta);
	}
	meta.content = content;
}

function upsertLink(rel: string, href: string, sizes?: string) {
	const selector = sizes
		? `link[rel="${rel}"][sizes="${sizes}"]`
		: `link[rel="${rel}"]`;
	let link = document.querySelector(selector) as HTMLLinkElement | null;
	if (!link) {
		link = document.createElement("link");
		link.rel = rel;
		if (sizes) {
			link.sizes = sizes;
		}
		document.head.appendChild(link);
	}
	link.href = href;
}

/** Install manifest link and Apple/Windows install metadata for Paluto POS. */
export function installPwaBranding() {
	if (typeof document === "undefined") {
		return;
	}

	upsertLink("manifest", "/manifest.json");
	upsertMeta("application-name", PWA_APP_NAME);
	upsertMeta("apple-mobile-web-app-title", PWA_APP_NAME);
	upsertMeta("theme-color", PWA_THEME_COLOR);
	upsertMeta("msapplication-TileColor", PWA_THEME_COLOR);

	for (const size of PWA_ICON_SIZES) {
		upsertLink(
			"apple-touch-icon",
			`/assets/posawesome/icons/paluto-logo-${size}.png`,
			`${size}x${size}`,
		);
	}

	if (!document.title || document.title.includes("POS Awesome")) {
		document.title = PWA_APP_NAME;
	}
}
