import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env'), quiet: true });

export const LIVE_URL = 'https://zfit.ztkweb.com';

/**
 * Where a script works: this checkout's own PocketBase, on the PB_PORT zDev gave it, or live with --live. Says which
 * before anything runs, and stops when neither is set rather than guessing.
 */
export function pocketbaseUrl(): string {
	if (process.argv.includes('--live')) {
		console.log(`Target: LIVE ${LIVE_URL}`);
		return LIVE_URL;
	}
	const port = process.env.PB_PORT;
	if (!port) {
		console.error('PB_PORT isn\'t set in .env. Start this checkout from zDev (or run zdev setup), or pass --live.');
		process.exit(1);
	}
	const url = `http://127.0.0.1:${port}`;
	console.log(`Target: local ${url}`);
	return url;
}
