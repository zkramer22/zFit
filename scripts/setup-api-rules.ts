import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];

if (!POCKETBASE_URL || !email || !password) {
	console.error('Usage: tsx scripts/setup-api-rules.ts <superuser-email> <superuser-password>');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

const collections = [
	'exercises',
	'workouts',
	'workout_exercises',
	'programs',
	'program_workouts',
	'sessions',
	'session_entries',
];

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	for (const name of collections) {
		try {
			const col = await pb.collections.getOne(name);
			await pb.collections.update(col.id, {
				listRule: '',
				viewRule: '',
				createRule: '',
				updateRule: '',
				deleteRule: '',
			});
			console.log(`  ✓ ${name} — API rules opened`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err.message || err}`);
		}
	}

	console.log('\nDone. All collections are now publicly accessible.');
}

run().catch(err => {
	console.error('Setup failed:', err);
	process.exit(1);
});
