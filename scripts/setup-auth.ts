import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];

if (!POCKETBASE_URL || !email || !password) {
	console.error('Usage: tsx scripts/setup-auth.ts <superuser-email> <superuser-password>');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

// Collections that need a `user` relation field
const userScopedCollections = [
	'exercises',
	'workouts',
	'workout_exercises',
	'programs',
	'program_workouts',
	'sessions',
	'session_entries',
];

// API rules: users can only see/modify their own records
// The `user` field check ensures data isolation between users
const userScopedRules = {
	listRule: 'user = @request.auth.id',
	viewRule: 'user = @request.auth.id',
	createRule: '@request.auth.id != ""',
	updateRule: 'user = @request.auth.id',
	deleteRule: 'user = @request.auth.id',
};

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	// Step 1: Add `user` field to each collection
	console.log('--- Adding `user` field to collections ---\n');

	for (const name of userScopedCollections) {
		try {
			const col = await pb.collections.getOne(name);

			// Check if `user` field already exists
			const hasUserField = col.fields?.some((f: any) => f.name === 'user');
			if (hasUserField) {
				console.log(`  ⏭ ${name} — already has \`user\` field`);
			} else {
				const existingFields = col.fields || [];
				await pb.collections.update(col.id, {
					fields: [
						...existingFields,
						{
							name: 'user',
							type: 'relation',
							required: false,
							collectionId: '_pb_users_auth_',
							cascadeDelete: false,
							maxSelect: 1,
							minSelect: 0,
						},
					],
				});
				console.log(`  ✓ ${name} — added \`user\` field`);
			}
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err.message || err}`);
		}
	}

	// Step 2: Update API rules for user-scoped access
	console.log('\n--- Updating API rules ---\n');

	for (const name of userScopedCollections) {
		try {
			const col = await pb.collections.getOne(name);
			await pb.collections.update(col.id, userScopedRules);
			console.log(`  ✓ ${name} — rules set to user-scoped`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err.message || err}`);
		}
	}

	console.log('\nDone! Next steps:');
	console.log('  1. Register a user account via the app');
	console.log('  2. Run: npx tsx scripts/backfill-user.ts <email> <password> <user-id>');
	console.log('  3. Then make `user` field required in PocketBase admin (optional)');
}

run().catch(err => {
	console.error('Setup failed:', err);
	process.exit(1);
});
