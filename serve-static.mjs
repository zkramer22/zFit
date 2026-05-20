import { createServer } from "http";
import { createReadStream, statSync } from "fs";
import { join, extname, resolve } from "path";

const PORT = 3000;
const ROOT = resolve("dist");

const TYPES = {
	".html": "text/html; charset=utf-8",
	".js":   "application/javascript; charset=utf-8",
	".mjs":  "application/javascript; charset=utf-8",
	".css":  "text/css; charset=utf-8",
	".json": "application/json; charset=utf-8",
	".webmanifest": "application/manifest+json; charset=utf-8",
	".svg":  "image/svg+xml",
	".png":  "image/png",
	".jpg":  "image/jpeg",
	".jpeg": "image/jpeg",
	".gif":  "image/gif",
	".webp": "image/webp",
	".ico":  "image/x-icon",
	".woff": "font/woff",
	".woff2": "font/woff2",
	".txt":  "text/plain; charset=utf-8",
	".map":  "application/json; charset=utf-8",
};

function tryStat(path) {
	try {
		const s = statSync(path);
		return s.isFile() ? s : null;
	} catch {
		return null;
	}
}

function send(res, path, stat) {
	const ext = extname(path).toLowerCase();
	const type = TYPES[ext] || "application/octet-stream";
	const isImmutable = path.includes("/assets/"); // Vite hashes asset filenames
	res.writeHead(200, {
		"Content-Type": type,
		"Content-Length": stat.size,
		"Cache-Control": isImmutable
			? "public, max-age=31536000, immutable"
			: "no-cache",
	});
	createReadStream(path).pipe(res);
}

createServer((req, res) => {
	if (req.method !== "GET" && req.method !== "HEAD") {
		res.writeHead(405, { Allow: "GET, HEAD" });
		res.end();
		return;
	}

	// Strip query string
	const url = new URL(req.url, "http://localhost");
	let pathname = decodeURIComponent(url.pathname);

	// Prevent directory traversal
	if (pathname.includes("..")) {
		res.writeHead(400);
		res.end("Bad request");
		return;
	}

	// Try exact path → directory index → SPA fallback to /index.html
	const direct = join(ROOT, pathname);
	let stat = tryStat(direct);
	let filePath = direct;

	if (!stat && pathname.endsWith("/")) {
		filePath = join(direct, "index.html");
		stat = tryStat(filePath);
	}

	if (!stat) {
		// SPA fallback — serve index.html so client-side router handles the path
		filePath = join(ROOT, "index.html");
		stat = tryStat(filePath);
	}

	if (!stat) {
		res.writeHead(404);
		res.end("Not found");
		return;
	}

	send(res, filePath, stat);
}).listen(PORT, "127.0.0.1", () => {
	console.log(`Static server running on http://127.0.0.1:${PORT} (root: ${ROOT})`);
});
