import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];

if (!POCKETBASE_URL || !email || !password) {
	console.error('Usage: tsx scripts/fix-main-branch.ts <superuser-email> <superuser-password>');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

// Collections where main branch (shared) records should have user = ""
// Exercises are the primary "main branch" content
// Workouts stay user-scoped for now (each user builds their own)
const mainBranchCollections = ['exercises'];

// Collections that need updated API rules to show main branch + user's own
const sharedViewCollections = ['exercises'];

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	// Step 1: Clear `user` field on all exercises (making them main branch)
	console.log('--- Clearing user field on main branch collections ---\n');

	for (const name of mainBranchCollections) {
		try {
			const records = await pb.collection(name).getFullList();
			const withUser = records.filter(r => r.user);
			if (withUser.length === 0) {
				console.log(`  ⏭ ${name} — all records already on main branch`);
				continue;
			}
			for (const record of withUser) {
				await pb.collection(name).update(record.id, { user: '' });
			}
			console.log(`  ✓ ${name} — moved ${withUser.length} record(s) to main branch`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err.message || err}`);
		}
	}

	// Step 2: Update API rules for shared-view collections
	// Users can see: main branch (user = "") OR their own (user = @request.auth.id)
	// Users can only edit/delete their own records
	console.log('\n--- Updating API rules for shared visibility ---\n');

	for (const name of sharedViewCollections) {
		try {
			const col = await pb.collections.getOne(name);
			await pb.collections.update(col.id, {
				listRule: 'user = "" || user = @request.auth.id',
				viewRule: 'user = "" || user = @request.auth.id',
				createRule: '@request.auth.id != ""',
				updateRule: 'user = @request.auth.id',
				deleteRule: 'user = @request.auth.id',
			});
			console.log(`  ✓ ${name} — shared view + user-scoped write`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err.message || err}`);
		}
	}

	console.log('\nDone! Main branch exercises are now visible to all users.');
}

run().catch(err => {
	console.error('Fix failed:', err);
	process.exit(1);
});
