import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;

if (!POCKETBASE_URL) {
	console.error('Missing .env variable. Set PUBLIC_POCKETBASE_URL');
	process.exit(1);
}

async function run() {
	console.log(`Checking PocketBase at ${POCKETBASE_URL}...`);
	try {
		const res = await fetch(`${POCKETBASE_URL}/api/health`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		console.log('  PocketBase is healthy.');
	} catch {
		console.error(`  PocketBase is not reachable at ${POCKETBASE_URL}`);
		console.error('  Make sure PocketBase is running before starting dev.');
		process.exit(1);
	}

	console.log('Ready to dev!\n');
}

run().catch(err => {
	console.error('Dev check failed:', err);
	process.exit(1);
});
