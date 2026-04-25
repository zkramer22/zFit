import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { router } from 'sv-router/vite-plugin';
import tailwindcss from '@tailwindcss/vite';
import { qrcode } from 'vite-plugin-qrcode';
import { fileURLToPath, URL } from 'node:url';

export default defineConfig({
	plugins: [
		tailwindcss(),
		router(),
		svelte(),
		qrcode(),
	],
	resolve: {
		alias: {
			$lib: fileURLToPath(new URL('./src/lib', import.meta.url)),
		},
	},
});
