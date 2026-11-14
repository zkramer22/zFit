/// <reference path="../pb_data/types.d.ts" />

// PocketBase serves pb_public without Cache-Control, which lets Cloudflare
// cache sw.js for hours and delays app updates. Vite hashes everything in
// /assets/, so those can be cached forever; the rest must be revalidated.
routerUse((e) => {
	const path = e.request.url.path;
	if (!path.startsWith("/api/") && !path.startsWith("/_/")) {
		e.response.header().set(
			"Cache-Control",
			path.startsWith("/assets/") ? "public, max-age=31536000, immutable" : "no-cache",
		);
	}
	return e.next();
});
