import { spawn } from 'child_process';
import { config } from 'dotenv';
import { existsSync } from 'fs';
import { join, resolve } from 'path';
import { binary, checkout, dataDir } from './pocketbase.ts';

/**
 * Serves this checkout's copy of the data on the PB_PORT zDev gave it, with the repo's hooks, as the server does.
 * Its admin is at http://127.0.0.1:<PB_PORT>/_/.
 *
 *   npm run pb
 */

config({ path: resolve(import.meta.dirname, '..', '.env'), quiet: true });

const port = process.env.PB_PORT;
if (!port) {
	console.error('PB_PORT isn\'t set in .env. Start this checkout from zDev, or run zdev setup.');
	process.exit(1);
}
if (!existsSync(join(dataDir, 'data.db'))) {
	console.error('This checkout has no copy of the data yet. Run: npm run pull');
	process.exit(1);
}

const child = spawn(
	await binary(),
	['serve', '--dir', dataDir, '--hooksDir', join(checkout, 'pb_hooks'), '--http', `127.0.0.1:${port}`],
	{ stdio: 'inherit' },
);
for (const name of ['SIGINT', 'SIGTERM', 'SIGHUP'] as const) process.on(name, () => child.kill(name));
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)));
