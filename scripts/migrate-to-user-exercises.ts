import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];

if (!POCKETBASE_URL || !email || !password) {
	console.error('Usage: tsx scripts/migrate-to-user-exercises.ts <superuser-email> <superuser-password>');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	// Step 1: Find all user-owned exercises (forks)
	console.log('--- Finding forked exercises ---');
	const allExercises = await pb.collection('exercises').getFullList({ sort: 'name' });
	const canonical = allExercises.filter((e: any) => !e.user);
	const forks = allExercises.filter((e: any) => !!e.user);

	console.log(`  Found ${canonical.length} canonical exercises, ${forks.length} user-owned exercises`);

	// Build a name→canonical map for matching
	const canonicalByName = new Map<string, any>();
	for (const ex of canonical) {
		canonicalByName.set(ex.name.toLowerCase().trim(), ex);
	}

	let migratedCount = 0;
	let skippedCount = 0;
	let fkUpdatedCount = 0;

	for (const fork of forks) {
		const matchingCanonical = canonicalByName.get(fork.name.toLowerCase().trim());

		if (!matchingCanonical) {
			// This is a user-created exercise (not a fork of a canonical one) — leave it alone
			console.log(`  ⏭ "${fork.name}" (${fork.id}) — no canonical match, keeping as user-created exercise`);
			skippedCount++;
			continue;
		}

		const canonicalId = matchingCanonical.id;
		const forkId = fork.id;
		const userId = fork.user;

		console.log(`\n  Processing fork: "${fork.name}" (${forkId}) → canonical (${canonicalId})`);

		// Step 2: Create user_exercises record with overrides
		const hasDescriptionOverride = fork.description && fork.description !== matchingCanonical.description;
		const hasVideoOverride = JSON.stringify(fork.video_urls || []) !== JSON.stringify(matchingCanonical.video_urls || []);

		if (hasDescriptionOverride || hasVideoOverride) {
			try {
				// Check if user_exercise already exists for this combo
				const existing = await pb.collection('user_exercises').getFullList({
					filter: `user = "${userId}" && exercise = "${canonicalId}"`,
				});
				if (existing.length === 0) {
					await pb.collection('user_exercises').create({
						user: userId,
						exercise: canonicalId,
						description: fork.description || '',
						video_urls: fork.video_urls || [],
					});
					console.log(`    ✓ Created user_exercise (description: ${hasDescriptionOverride}, videos: ${hasVideoOverride})`);
				} else {
					console.log(`    ⏭ user_exercise already exists for this user+exercise`);
				}
			} catch (err: any) {
				console.error(`    ✗ Failed to create user_exercise:`, err?.response?.data || err?.message);
				continue;
			}
		} else {
			console.log(`    ℹ No overrides to migrate (fork matches canonical)`);
		}

		// Step 3: Update session_entries referencing this fork → point to canonical
		try {
			const entries = await pb.collection('session_entries').getFullList({
				filter: `exercise = "${forkId}"`,
			});
			for (const entry of entries) {
				await pb.collection('session_entries').update(entry.id, { exercise: canonicalId });
				fkUpdatedCount++;
			}
			if (entries.length > 0) {
				console.log(`    ✓ Updated ${entries.length} session_entries → canonical`);
			}
		} catch (err: any) {
			console.error(`    ✗ Failed to update session_entries:`, err?.message);
		}

		// Step 4: Update workout_exercises referencing this fork → point to canonical
		try {
			const wes = await pb.collection('workout_exercises').getFullList({
				filter: `exercise = "${forkId}"`,
			});
			for (const we of wes) {
				await pb.collection('workout_exercises').update(we.id, { exercise: canonicalId });
				fkUpdatedCount++;
			}
			if (wes.length > 0) {
				console.log(`    ✓ Updated ${wes.length} workout_exercises → canonical`);
			}
		} catch (err: any) {
			console.error(`    ✗ Failed to update workout_exercises:`, err?.message);
		}

		// Step 5: Update goals referencing this fork → point to canonical
		try {
			const goals = await pb.collection('goals').getFullList({
				filter: `exercise = "${forkId}"`,
			});
			for (const goal of goals) {
				await pb.collection('goals').update(goal.id, { exercise: canonicalId });
				fkUpdatedCount++;
			}
			if (goals.length > 0) {
				console.log(`    ✓ Updated ${goals.length} goals → canonical`);
			}
		} catch (err: any) {
			// goals collection may not exist
			if (!err?.message?.includes('not found')) {
				console.error(`    ✗ Failed to update goals:`, err?.message);
			}
		}

		// Step 6: Delete the fork from exercises
		try {
			await pb.collection('exercises').delete(forkId);
			console.log(`    ✓ Deleted fork ${forkId}`);
			migratedCount++;
		} catch (err: any) {
			console.error(`    ✗ Failed to delete fork:`, err?.message);
		}
	}

	// Step 7: Migrate existing submissions to new schema
	console.log('\n--- Migrating existing submissions ---');
	try {
		const subs = await pb.collection('submissions').getFullList();
		let subMigrated = 0;
		for (const sub of subs) {
			// Old schema had: type, record_id, global_exercise
			// New schema has: exercise, user_exercise, diff
			const oldRecordId = (sub as any).record_id;
			const oldGlobalExercise = (sub as any).global_exercise;

			if (!oldRecordId) {
				// Already migrated or invalid
				continue;
			}

			// Determine the canonical exercise ID
			let exerciseId = oldGlobalExercise || oldRecordId;

			// Check if the old record_id still exists — if it was a fork that got deleted,
			// use the global_exercise instead
			try {
				await pb.collection('exercises').getOne(oldRecordId);
				// Fork still exists (wasn't migrated above) — exercise FK = the fork itself
				if (!oldGlobalExercise) {
					exerciseId = oldRecordId;
				}
			} catch {
				// Fork was deleted during migration — use canonical
				exerciseId = oldGlobalExercise || oldRecordId;
			}

			try {
				await pb.collection('submissions').update(sub.id, {
					exercise: exerciseId,
					user_exercise: '', // Can't retroactively link to user_exercises
					diff: {},
				});
				subMigrated++;
			} catch (err: any) {
				console.error(`    ✗ Failed to migrate submission ${sub.id}:`, err?.response?.data || err?.message);
			}
		}
		console.log(`  ✓ Migrated ${subMigrated} submissions`);
	} catch (err: any) {
		console.error('  ✗ Failed to migrate submissions:', err?.message);
	}

	console.log(`\n--- Summary ---`);
	console.log(`  Forks migrated to user_exercises: ${migratedCount}`);
	console.log(`  User-created exercises kept as-is: ${skippedCount}`);
	console.log(`  FK references updated: ${fkUpdatedCount}`);
	console.log('\nDone!');
}

run().catch(err => {
	console.error('Migration failed:', err?.response || err?.message || err);
	process.exit(1);
});
