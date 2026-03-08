import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];
const userId = process.argv[4];

if (!POCKETBASE_URL || !email || !password || !userId) {
	console.error('Usage: tsx scripts/backfill-user.ts <superuser-email> <superuser-password> <user-id>');
	console.error('\nTo find your user ID:');
	console.error('  - Check PocketBase admin → Collections → users');
	console.error('  - Or look in browser devtools after logging in');
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
	console.log(`Authenticated as superuser.`);
	console.log(`Backfilling all records with user: ${userId}\n`);

	for (const name of collections) {
		try {
			const records = await pb.collection(name).getFullList();
			const needsUpdate = records.filter(r => !r.user);
			if (needsUpdate.length === 0) {
				console.log(`  ⏭ ${name} — all records already have a user`);
				continue;
			}
			for (const record of needsUpdate) {
				await pb.collection(name).update(record.id, { user: userId });
			}
			console.log(`  ✓ ${name} — updated ${needsUpdate.length} record(s)`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err.message || err}`);
		}
	}

	console.log('\nDone! All existing records now belong to your user account.');
}

run().catch(err => {
	console.error('Backfill failed:', err);
	process.exit(1);
});
