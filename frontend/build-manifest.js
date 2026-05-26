import { promises as fs } from "fs";
import path from "path";

const DIST_BASE_URL = "/assets/posawesome/dist/js/";
const STATIC_ENTRY_NAMES = new Set(["posawesome", "loader"]);

export function getEntryFileName(chunkInfo) {
	return STATIC_ENTRY_NAMES.has(chunkInfo?.name) ? "[name].js" : "[name]-[hash].js";
}

function toPublicAssetUrl(fileName) {
	return `${DIST_BASE_URL}${String(fileName || "").replace(/^\/+/, "")}`;
}

function toVersionedPublicAssetUrl(fileName, version) {
	const url = toPublicAssetUrl(fileName);
	return version ? `${url}?v=${encodeURIComponent(version)}` : url;
}

function getChunkFileName(bundle, chunkName) {
	const match = Object.values(bundle || {}).find(
		(entry) => entry?.type === "chunk" && entry?.name === chunkName,
	);
	return match?.fileName || null;
}

/**
 * Cache-bust imports of the stable `posawesome.js` entry from hashed lazy chunks.
 * Without this, browsers can pair a new chunk with a stale `posawesome.js` and fail
 * on minified export names (e.g. "does not provide an export named 'G'").
 */
export function stampPosawesomeEntryImports(source, version) {
	if (!source || !version) {
		return source;
	}
	const versionQuery = `?v=${encodeURIComponent(version)}`;
	return source
		.replace(/from"\.\/posawesome\.js"/g, `from"./posawesome.js${versionQuery}"`)
		.replace(
			/import\("\.\/posawesome\.js"\)/g,
			`import("./posawesome.js${versionQuery}")`,
		);
}

export async function stampBuiltChunkImports(distDir, version) {
	if (!distDir || !version) {
		return;
	}
	const entries = await fs.readdir(distDir);
	await Promise.all(
		entries
			.filter(
				(file) =>
					file.endsWith(".js") &&
					file !== "posawesome.js" &&
					file !== "loader.js",
			)
			.map(async (file) => {
				const filePath = path.join(distDir, file);
				const content = await fs.readFile(filePath, "utf8");
				const next = stampPosawesomeEntryImports(content, version);
				if (next !== content) {
					await fs.writeFile(filePath, next, "utf8");
				}
			}),
	);
}

export function buildVersionPayload(version, bundle = {}) {
	const offlineIndexFile = getChunkFileName(bundle, "offline/index");

	return {
		version,
		assets: {
			loader: toVersionedPublicAssetUrl("loader.js", version),
			posawesome: toVersionedPublicAssetUrl("posawesome.js", version),
			css: toVersionedPublicAssetUrl("posawesome.css", version),
			offlineIndex: offlineIndexFile
				? toPublicAssetUrl(offlineIndexFile)
				: toPublicAssetUrl("offline/index.js"),
		},
	};
}
