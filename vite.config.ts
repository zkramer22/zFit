import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { SvelteKitPWA } from '@vite-pwa/sveltekit';
import { defineConfig } from 'vite';

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		SvelteKitPWA({
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
				start_url: '/log',
				icons: [
					{
						src: '/icons/icon-192.png',
						sizes: '192x192',
						type: 'image/png'
					},
					{
						src: '/icons/icon-512.png',
						sizes: '512x512',
						type: 'image/png'
					}
				]
			},
			workbox: {
				runtimeCaching: [
					{
						urlPattern: /^https?:\/\/192\.168\.\d+\.\d+:8090\/api\/.*/,
						handler: 'NetworkFirst',
						options: {
							cacheName: 'pocketbase-api',
							expiration: {
								maxEntries: 100,
								maxAgeSeconds: 60 * 60 * 24
							}
						}
					}
				]
			}
		})
	]
});
