import PocketBase from 'pocketbase';
import { pocketbaseUrl } from './target.ts';
import { isLegacySet, migrateSet, inferMeasure, migrateTarget, halveLoads, TOTAL_LOGGED, LOGGED_PER_HAND } from './measure-migration.ts';

/**
 * Moves exercises to a per-exercise measure (weight, bodyweight, time, band).
 * Prints the plan by default; pass --apply to back up, change the schema, and
 * rewrite sets and targets. Safe to re-run: migrated records are skipped.
 *
 *   npx tsx scripts/migrate-measure.ts [--apply] [--live]
 */

const URL = pocketbaseUrl();
const EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;
const APPLY = process.argv.includes('--apply');

const pb = new PocketBase(URL);
pb.autoCancellation(false);

const NEW_FIELDS: Record<string, object[]> = {
	exercises: [
		{ name: 'measure', type: 'select', values: ['weight', 'bodyweight', 'time', 'band'], maxSelect: 1 },
		{ name: 'load_factor', type: 'select', values: ['single', 'pair', 'each_side'], maxSelect: 1 }
	],
	users: [
		{ name: 'weight_unit', type: 'select', values: ['lb', 'kg'], maxSelect: 1 },
		{ name: 'band_levels', type: 'json' }
	],
	workout_exercises: [
		{ name: 'target_load', type: 'number' },
		{ name: 'target_seconds', type: 'number' },
		{ name: 'target_band', type: 'text' }
	]
};
const REMOVED_FIELDS = { workout_exercises: ['target_value', 'target_unit', 'target_weight'] };

async function addFields(name: string, fields: object[]) {
	const col = await pb.collections.getOne(name);
	const have = new Set(col.fields.map((f: { name: string }) => f.name));
	const missing = fields.filter((f) => !have.has((f as { name: string }).name));
	if (missing.length) await pb.collections.update(col.id, { fields: [...col.fields, ...missing] });
	console.log(`  ${name}: added ${missing.length} field(s)`);
}

async function removeFields(name: string, names: string[]) {
	const col = await pb.collections.getOne(name);
	const kept = col.fields.filter((f: { name: string }) => !names.includes(f.name));
	if (kept.length !== col.fields.length) await pb.collections.update(col.id, { fields: kept });
	console.log(`  ${name}: removed ${col.fields.length - kept.length} field(s)`);
}

async function run() {
	await pb.collection('_superusers').authWithPassword(EMAIL, PASSWORD);

	const [exercises, entries, targets, users] = await Promise.all([
		pb.collection('exercises').getFullList(),
		pb.collection('session_entries').getFullList(),
		pb.collection('workout_exercises').getFullList(),
		pb.collection('users').getFullList()
	]);

	// How each exercise was logged, and each user's weight unit
	const usage = new Map<string, { unit: string; hasValue: boolean }[]>();
	const userUnits = new Map<string, { lb: number; kg: number }>();
	let legacySets = 0;
	for (const e of entries) {
		for (const s of (e.sets ?? []) as object[]) {
			if (!isLegacySet(s)) continue;
			legacySets++;
			const list = usage.get(e.exercise) ?? [];
			list.push({ unit: s.unit, hasValue: s.value != null });
			usage.set(e.exercise, list);
			if ((s.unit === 'lb' || s.unit === 'kg') && s.value != null) {
				const u = userUnits.get(e.user) ?? { lb: 0, kg: 0 };
				u[s.unit]++;
				userUnits.set(e.user, u);
			}
		}
	}
	for (const t of targets) {
		if (!t.target_unit) continue;
		const list = usage.get(t.exercise) ?? [];
		list.push({ unit: t.target_unit, hasValue: !!t.target_value });
		usage.set(t.exercise, list);
	}

	const plan = exercises
		.filter((ex) => !ex.measure)
		.map((ex) => ({ ex, measure: inferMeasure(usage.get(ex.id) ?? [], ex.category), logged: usage.get(ex.id)?.length ?? 0 }))
		.sort((a, b) => a.measure.localeCompare(b.measure) || a.ex.name.localeCompare(b.ex.name));

	console.log(`\nMeasure per exercise (${plan.length} to set):\n`);
	for (const p of plan) {
		const basis = p.logged ? `${p.logged} logged set/target(s)` : `no history, from category "${p.ex.category}"`;
		console.log(`  ${p.measure.padEnd(10)} ${p.ex.name}  — ${basis}`);
	}
	const targetWeights = targets.filter((t) => t.target_weight).length;
	console.log(`\nSets to rewrite: ${legacySets} across ${entries.length} entries`);
	console.log(`Targets to rewrite: ${targets.filter((t) => t.target_unit).length} of ${targets.length}`);
	console.log(`Old target_weight values still present (dropped with the field): ${targetWeights}`);
	for (const u of users) {
		const c = userUnits.get(u.id) ?? { lb: 0, kg: 0 };
		console.log(`User ${u.email}: weight unit → ${c.kg > c.lb ? 'kg' : 'lb'} (lb ${c.lb}, kg ${c.kg})`);
	}

	const totalLogged = exercises.filter((ex) => TOTAL_LOGGED[ex.name] && !ex.load_factor);
	for (const ex of totalLogged) {
		const sets = entries
			.filter((e) => e.exercise === ex.id && !LOGGED_PER_HAND.has(e.id))
			.reduce((n, e) => n + (e.sets ?? []).length, 0);
		console.log(`Load factor: ${ex.name} → ${TOTAL_LOGGED[ex.name]}, halving loads in ${sets} set(s) and its targets`);
	}

	if (!APPLY) {
		console.log('\nDry run. Re-run with --apply to make these changes.');
		return;
	}

	// Lowercase, as PocketBase requires, and timed so a re-run doesn't collide
	const backup = `pre_measure_${new Date().toISOString().replace(/[:.]/g, '-').toLowerCase()}.zip`;
	await pb.backups.create(backup);
	console.log(`\nBackup created: ${backup}`);

	console.log('Schema:');
	for (const [name, fields] of Object.entries(NEW_FIELDS)) await addFields(name, fields);

	for (const p of plan) await pb.collection('exercises').update(p.ex.id, { measure: p.measure });
	for (const u of users) {
		if (u.weight_unit) continue;
		const c = userUnits.get(u.id) ?? { lb: 0, kg: 0 };
		await pb.collection('users').update(u.id, { weight_unit: c.kg > c.lb ? 'kg' : 'lb' });
	}

	let rewritten = 0;
	for (const e of entries) {
		const sets = (e.sets ?? []) as object[];
		if (!sets.some(isLegacySet)) continue;
		await pb.collection('session_entries').update(e.id, {
			sets: sets.map((s) => (isLegacySet(s) ? migrateSet(s) : s))
		});
		rewritten++;
	}
	console.log(`Entries rewritten: ${rewritten}`);

	let targetCount = 0;
	for (const t of targets) {
		if (!t.target_unit) continue;
		await pb.collection('workout_exercises').update(t.id, migrateTarget(t.target_value, t.target_unit));
		targetCount++;
	}
	console.log(`Targets rewritten: ${targetCount}`);

	// Runs after the set rewrite, so it reads the migrated sets. load_factor is set last and marks it done.
	for (const ex of totalLogged) {
		const exEntries = (await pb.collection('session_entries').getFullList({ filter: `exercise = "${ex.id}"` }))
			.filter((e) => !LOGGED_PER_HAND.has(e.id));
		for (const e of exEntries) {
			await pb.collection('session_entries').update(e.id, { sets: halveLoads(e.sets ?? []) });
		}
		const exTargets = await pb.collection('workout_exercises').getFullList({ filter: `exercise = "${ex.id}"` });
		for (const t of exTargets) {
			if (t.target_load) await pb.collection('workout_exercises').update(t.id, { target_load: t.target_load / 2 });
		}
		await pb.collection('exercises').update(ex.id, { load_factor: TOTAL_LOGGED[ex.name] });
		console.log(`${ex.name}: ${TOTAL_LOGGED[ex.name]}, ${exEntries.length} entries and ${exTargets.length} targets halved`);
	}

	console.log('Schema cleanup:');
	for (const [name, fields] of Object.entries(REMOVED_FIELDS)) await removeFields(name, fields);
	console.log('\nDone.');
}

run().catch((err) => {
	console.error(err?.response ?? err);
	process.exit(1);
});
