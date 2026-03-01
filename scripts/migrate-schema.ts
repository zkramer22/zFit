import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];

if (!POCKETBASE_URL || !email || !password) {
	console.error('Usage: tsx scripts/migrate-schema.ts <superuser-email> <superuser-password>');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

/** Parse old target_weight string into value + unit, e.g. "125 lb" → { value: "125", unit: "lb" } */
function parseTargetWeight(tw: string): { value: string; unit: string } {
	if (!tw) return { value: '', unit: 'lb' };
	const trimmed = tw.trim().toLowerCase();
	if (trimmed === 'bw') return { value: '', unit: 'bw' };
	if (trimmed === 'band') return { value: '', unit: 'band' };

	// Try to extract number + unit, e.g. "125 lb", "20 lb KB", "75 lb"
	const match = trimmed.match(/^([\d.]+)\s*(lb|kg)?/);
	if (match) {
		return { value: match[1], unit: match[2] || 'lb' };
	}

	// Fallback: treat the whole string as a value with lb
	return { value: tw, unit: 'lb' };
}

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	// ── Migrate workout_exercises ──────────────────────────────────────
	console.log('── Migrating workout_exercises ──');
	try {
		const col = await pb.collections.getOne('workout_exercises');
		const existingFieldNames = col.fields?.map((f: any) => f.name) || [];

		// Add new fields if they don't exist
		const fieldsToAdd: any[] = [];
		if (!existingFieldNames.includes('target_value')) {
			fieldsToAdd.push({ name: 'target_value', type: 'text' });
		}
		if (!existingFieldNames.includes('target_unit')) {
			fieldsToAdd.push({ name: 'target_unit', type: 'text' });
		}
		if (!existingFieldNames.includes('target_distance')) {
			fieldsToAdd.push({ name: 'target_distance', type: 'text' });
		}
		if (!existingFieldNames.includes('target_distance_unit')) {
			fieldsToAdd.push({ name: 'target_distance_unit', type: 'text' });
		}

		if (fieldsToAdd.length > 0) {
			await pb.collections.update(col.id, {
				fields: [...(col.fields || []), ...fieldsToAdd]
			});
			console.log(`  Added fields: ${fieldsToAdd.map(f => f.name).join(', ')}`);
		} else {
			console.log('  Fields already exist, skipping schema update.');
		}

		// Migrate data from target_weight to new fields
		const wes = await pb.collection('workout_exercises').getFullList();
		let migratedCount = 0;
		for (const we of wes) {
			// Only migrate if new fields are empty and old field has data
			if (!we.target_value && !we.target_unit && we.target_weight) {
				const { value, unit } = parseTargetWeight(we.target_weight);
				await pb.collection('workout_exercises').update(we.id, {
					target_value: value,
					target_unit: unit,
					target_distance: '',
					target_distance_unit: null
				});
				migratedCount++;
			} else if (!we.target_unit) {
				// Ensure target_unit has a default
				await pb.collection('workout_exercises').update(we.id, {
					target_unit: 'lb',
					target_distance: we.target_distance || '',
					target_distance_unit: we.target_distance_unit || null
				});
				migratedCount++;
			}
		}
		console.log(`  Migrated ${migratedCount}/${wes.length} workout_exercises records.`);
	} catch (err) {
		console.error('  Failed to migrate workout_exercises:', err);
	}

	// ── Add 'completed' field to sessions ─────────────────────────────
	console.log('\n── Migrating sessions schema ──');
	try {
		const col = await pb.collections.getOne('sessions');
		const existingFieldNames = col.fields?.map((f: any) => f.name) || [];

		if (!existingFieldNames.includes('completed')) {
			await pb.collections.update(col.id, {
				fields: [...(col.fields || []), { name: 'completed', type: 'bool' }]
			});
			console.log('  Added "completed" bool field to sessions.');
		} else {
			console.log('  "completed" field already exists, skipping.');
		}
	} catch (err) {
		console.error('  Failed to migrate sessions schema:', err);
	}

	// ── Migrate session_entries ────────────────────────────────────────
	console.log('\n── Migrating session_entries ──');
	try {
		const entries = await pb.collection('session_entries').getFullList();
		let migratedCount = 0;

		for (const entry of entries) {
			const sets = entry.sets as any[];
			if (!sets?.length) continue;

			let needsUpdate = false;
			const newSets = sets.map((s: any) => {
				// Already migrated?
				if ('value' in s && 'unit' in s && !('weight' in s)) return s;

				needsUpdate = true;
				const unit = s.duration_sec ? 'sec' : (s.weight_unit || 'lb');
				const value = s.duration_sec ? s.duration_sec : s.weight;

				return {
					reps: s.reps ?? null,
					value: value ?? null,
					unit: unit,
					distance: null,
					distance_unit: null,
					notes: s.notes || ''
				};
			});

			if (needsUpdate) {
				await pb.collection('session_entries').update(entry.id, { sets: newSets });
				migratedCount++;
			}
		}
		console.log(`  Migrated ${migratedCount}/${entries.length} session_entries records.`);
	} catch (err) {
		console.error('  Failed to migrate session_entries:', err);
	}

	console.log('\nMigration complete!');
}

run().catch(err => {
	console.error('Migration failed:', err);
	process.exit(1);
});
