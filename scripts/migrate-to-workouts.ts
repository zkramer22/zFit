import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL!;
const POCKETBASE_SUPERUSER_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const POCKETBASE_SUPERUSER_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;

if (!POCKETBASE_URL || !POCKETBASE_SUPERUSER_EMAIL || !POCKETBASE_SUPERUSER_PASSWORD) {
	console.error('Missing .env variables.');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

async function migrate() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD);
	console.log('Authenticated as superuser.\n');

	// ── Step 1: Rename old programs → programs_old ─────────────────────
	console.log('── Step 1: Rename programs → programs_old ──');
	let alreadyRenamed = false;
	try {
		await pb.collections.getOne('programs_old');
		alreadyRenamed = true;
		console.log('  ✓ programs_old already exists (already renamed)');
	} catch {
		// programs_old doesn't exist yet
	}
	if (!alreadyRenamed) {
		try {
			const oldPrograms = await pb.collections.getOne('programs');
			await pb.collections.update(oldPrograms.id, { name: 'programs_old' });
			console.log('  ✓ Renamed programs → programs_old');
		} catch (err: any) {
			if (err.status === 404) {
				console.log('  ✓ programs collection not found (fresh install)');
			} else {
				throw err;
			}
		}
	}

	// ── Step 2: Create new collections ─────────────────────────────────
	console.log('\n── Step 2: Create new collections ──');

	// Create workouts collection
	try {
		await pb.collections.getOne('workouts');
		console.log('  ✓ workouts already exists');
	} catch {
		await pb.collections.create({
			name: 'workouts',
			type: 'base',
			fields: [
				{ name: 'name', type: 'text', required: true },
				{ name: 'description', type: 'text', required: false },
			]
		});
		console.log('  + Created workouts collection');
	}

	// Create workout_exercises collection
	try {
		await pb.collections.getOne('workout_exercises');
		console.log('  ✓ workout_exercises already exists');
	} catch {
		await pb.collections.create({
			name: 'workout_exercises',
			type: 'base',
			fields: [
				{ name: 'workout', type: 'relation', required: true, collectionId: (await pb.collections.getOne('workouts')).id, maxSelect: 1 },
				{ name: 'exercise', type: 'relation', required: true, collectionId: (await pb.collections.getOne('exercises')).id, maxSelect: 1 },
				{ name: 'order', type: 'number', required: true },
				{ name: 'section', type: 'select', required: false, values: ['warmup', 'main', 'core', 'cooldown'] },
				{ name: 'target_sets', type: 'number', required: false },
				{ name: 'target_reps', type: 'text', required: false },
				{ name: 'target_weight', type: 'text', required: false },
				{ name: 'notes', type: 'text', required: false },
			]
		});
		console.log('  + Created workout_exercises collection');
	}

	// Create programs collection (the new multi-day grouping)
	try {
		await pb.collections.getOne('programs');
		console.log('  ✓ programs already exists');
	} catch {
		await pb.collections.create({
			name: 'programs',
			type: 'base',
			fields: [
				{ name: 'name', type: 'text', required: true },
				{ name: 'description', type: 'text', required: false },
				{ name: 'active', type: 'bool', required: false },
			]
		});
		console.log('  + Created programs collection');
	}

	// Create program_workouts collection
	try {
		await pb.collections.getOne('program_workouts');
		console.log('  ✓ program_workouts already exists');
	} catch {
		await pb.collections.create({
			name: 'program_workouts',
			type: 'base',
			fields: [
				{ name: 'program', type: 'relation', required: true, collectionId: (await pb.collections.getOne('programs')).id, maxSelect: 1 },
				{ name: 'workout', type: 'relation', required: true, collectionId: (await pb.collections.getOne('workouts')).id, maxSelect: 1 },
				{ name: 'day_number', type: 'number', required: true },
			]
		});
		console.log('  + Created program_workouts collection');
	}

	// Update sessions: add workout field, repoint program field to new programs collection
	console.log('\n── Step 2b: Update sessions collection fields ──');
	try {
		const sessionsCollection = await pb.collections.getOne('sessions');
		const existingFields = sessionsCollection.fields || [];
		const workoutsCollection = await pb.collections.getOne('workouts');
		const programsCollection = await pb.collections.getOne('programs');

		const hasWorkoutField = existingFields.some((f: any) => f.name === 'workout');
		const programField = existingFields.find((f: any) => f.name === 'program');
		const programFieldCorrect = programField && programField.collectionId === programsCollection.id;
		if (hasWorkoutField && programFieldCorrect) {
			console.log('  ✓ sessions fields already updated');
		} else {
			// Clear stale program references on existing sessions first
			const allSessions = await pb.collection('sessions').getFullList();
			for (const s of allSessions) {
				if (s.program) {
					await pb.collection('sessions').update(s.id, { program: '' });
					console.log(`  ~ Cleared stale program ref on session ${s.id}`);
				}
			}

			// PocketBase won't let us change a relation's collectionId in-place.
			// Step A: Remove the old program field (and add workout if missing)
			const fieldsWithoutProgram = existingFields.filter((f: any) => f.name !== 'program');
			if (!hasWorkoutField) {
				fieldsWithoutProgram.push({
					name: 'workout', type: 'relation', required: false,
					collectionId: workoutsCollection.id, maxSelect: 1
				});
			}
			await pb.collections.update(sessionsCollection.id, { fields: fieldsWithoutProgram });
			console.log('  + Removed old program field');

			// Step B: Re-add program field pointing to new programs collection
			const refreshed = await pb.collections.getOne('sessions');
			const newFields = [...(refreshed.fields || []), {
				name: 'program', type: 'relation', required: false,
				collectionId: programsCollection.id, maxSelect: 1
			}];
			await pb.collections.update(sessionsCollection.id, { fields: newFields });
			console.log('  + Added new program field → programs collection');
		}
	} catch (err: any) {
		console.error('  ✗ Failed to update sessions collection');
		console.error('  Error details:', JSON.stringify(err.response?.data, null, 2));
		throw err;
	}

	// ── Step 3: Migrate data ───────────────────────────────────────────
	console.log('\n── Step 3: Migrate data ──');

	// Check if old programs exist
	let oldPrograms: any[] = [];
	try {
		oldPrograms = await pb.collection('programs_old').getFullList({ sort: 'order' });
	} catch {
		console.log('  No programs_old data to migrate');
	}

	if (oldPrograms.length === 0) {
		console.log('  No old program data found. Skipping data migration.');
		console.log('\nMigration complete! Collections are ready.');
		console.log('Run the updated seed script to populate data: npx tsx scripts/seed.ts');
		return;
	}

	// Copy programs_old → workouts
	const workoutMap = new Map<string, string>(); // old program ID → new workout ID
	console.log('\n  Copying programs → workouts:');
	for (const op of oldPrograms) {
		const cleanName = op.name.replace(/^Day \d+ — /, '');
		// Check if workout already exists
		try {
			const existing = await pb.collection('workouts').getFirstListItem(`name="${cleanName.replace(/"/g, '\\"')}"`);
			workoutMap.set(op.id, existing.id);
			console.log(`    ✓ ${cleanName} (exists)`);
		} catch {
			const workout = await pb.collection('workouts').create({
				name: cleanName,
				description: op.description
			});
			workoutMap.set(op.id, workout.id);
			console.log(`    + ${cleanName}`);
		}
	}

	// Copy program_exercises → workout_exercises
	console.log('\n  Copying program_exercises → workout_exercises:');
	let oldPEs: any[] = [];
	try {
		oldPEs = await pb.collection('program_exercises').getFullList();
	} catch {
		console.log('    No program_exercises to migrate');
	}

	for (const ope of oldPEs) {
		const workoutId = workoutMap.get(ope.program);
		if (!workoutId) {
			console.log(`    ✗ No workout mapping for program ${ope.program}`);
			continue;
		}
		// Check for existing
		try {
			await pb.collection('workout_exercises').getFirstListItem(
				`workout="${workoutId}" && exercise="${ope.exercise}" && order=${ope.order}`
			);
			console.log(`    ✓ workout_exercise order=${ope.order} (exists)`);
		} catch {
			await pb.collection('workout_exercises').create({
				workout: workoutId,
				exercise: ope.exercise,
				order: ope.order,
				section: ope.section,
				target_sets: ope.target_sets,
				target_reps: ope.target_reps,
				target_weight: ope.target_weight,
				notes: ope.notes
			});
			console.log(`    + workout_exercise order=${ope.order}`);
		}
	}

	// Create the program grouping
	console.log('\n  Creating program grouping:');
	let programId: string;
	try {
		const existing = await pb.collection('programs').getFirstListItem('name="3-Day Recovery Split"');
		programId = existing.id;
		console.log('    ✓ 3-Day Recovery Split (exists)');
	} catch {
		const program = await pb.collection('programs').create({
			name: '3-Day Recovery Split',
			description: 'Three-day rotation targeting lower body strength, posterior chain, and stability.',
			active: true
		});
		programId = program.id;
		console.log('    + 3-Day Recovery Split');
	}

	// Create program_workouts
	console.log('\n  Linking workouts to program days:');
	for (const op of oldPrograms) {
		const workoutId = workoutMap.get(op.id);
		if (!workoutId) continue;
		try {
			await pb.collection('program_workouts').getFirstListItem(
				`program="${programId}" && workout="${workoutId}"`
			);
			console.log(`    ✓ Day ${op.order} (exists)`);
		} catch {
			await pb.collection('program_workouts').create({
				program: programId,
				workout: workoutId,
				day_number: op.order
			});
			console.log(`    + Day ${op.order}`);
		}
	}

	// Update sessions to point to new workout field
	console.log('\n  Updating sessions:');
	const sessions = await pb.collection('sessions').getFullList();
	for (const s of sessions) {
		if (s.program && !s.workout) {
			const workoutId = workoutMap.get(s.program);
			if (workoutId) {
				await pb.collection('sessions').update(s.id, {
					workout: workoutId,
					program: programId
				});
				console.log(`    + Updated session ${s.id} → workout=${workoutId}`);
			}
		} else if (s.workout) {
			console.log(`    ✓ Session ${s.id} already has workout`);
		} else {
			console.log(`    - Session ${s.id} is freeform (no program)`);
		}
	}

	console.log('\n✓ Migration complete!');
	console.log('\nYou can now delete the old collections in PB Admin:');
	console.log('  - programs_old');
	console.log('  - program_exercises');
}

migrate().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
