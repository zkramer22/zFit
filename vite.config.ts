import { defineConfig, loadEnv } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { router } from 'sv-router/vite-plugin';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { qrcode } from 'vite-plugin-qrcode';
import { fileURLToPath, URL } from 'node:url';

// In dev the app calls its own address, and /api goes on to this checkout's PocketBase, on the PB_PORT zDev gave it.
// A phone on the network then needs only Vite's address.
export default defineConfig(({ mode }) => ({
	server: {
		proxy: {
			'/api': `http://127.0.0.1:${loadEnv(mode, process.cwd(), '').PB_PORT}`,
		},
	},
	plugins: [
		tailwindcss(),
		router(),
		svelte(),
		qrcode(),
		VitePWA({
			devOptions: {
				enabled: true,
			},
			strategies: 'generateSW',
			registerType: 'autoUpdate',
			manifest: {
				name: 'zFit',
				short_name: 'zFit',
				description: 'Post-surgical hip recovery fitness tracker',
				theme_color: '#0f172a',
				background_color: '#ffffff',
				display: 'standalone',
				scope: '/',
				start_url: '/',
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png',
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png',
					},
				],
			},
			workbox: {
				navigateFallback: '/',
				navigateFallbackDenylist: [/^\/api\//],
				runtimeCaching: [
					{
						urlPattern: /\/api\/.*/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pocketbase-api',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24,
							},
						},
					},
				],
			},
		}),
	],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
		},
	},
}));
