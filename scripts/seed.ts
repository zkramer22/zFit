import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL!;
const POCKETBASE_SUPERUSER_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const POCKETBASE_SUPERUSER_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;

if (!POCKETBASE_URL || !POCKETBASE_SUPERUSER_EMAIL || !POCKETBASE_SUPERUSER_PASSWORD) {
	console.error('Missing .env variables. Set POCKETBASE_URL, POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

// ── Exercise definitions ──────────────────────────────────────────────

interface ExerciseDef {
	name: string;
	description: string;
	muscle_groups: string[];
	category: string;
}

// Valid PB muscle_groups select values:
// quads, glutes, hamstrings, hip_flexors, calves, core, back, shoulders, adductors, abductors
const exercises: ExerciseDef[] = [
	// Warmup (shared across all days)
	{
		name: 'Banded Clamshells',
		description: 'Side-lying. 15 each side. Neural activation for hip external rotators.',
		muscle_groups: ['glutes'],
		category: 'warmup'
	},
	{
		name: 'Banded Fire Hydrants',
		description: '15 each side. Hip abduction in quadruped position.',
		muscle_groups: ['glutes', 'abductors'],
		category: 'warmup'
	},
	{
		name: 'Banded Monster Walks',
		description: '20 steps each direction. Lateral glute activation under tension.',
		muscle_groups: ['glutes', 'abductors'],
		category: 'warmup'
	},
	{
		name: 'Side-Lying Straight Leg Lift',
		description: '15 each side. Hip abduction from side-lying position.',
		muscle_groups: ['glutes', 'abductors'],
		category: 'warmup'
	},
	{
		name: 'Single-Leg Balance Hold',
		description: 'Opposite knee to 90°. 30 sec each side. Proprioception and stability.',
		muscle_groups: ['glutes', 'core', 'calves'],
		category: 'warmup'
	},

	// Lower Body Strength
	{
		name: 'Leg Press (Bilateral)',
		description: 'Machine, bilateral. Moderate width foot placement, feet slightly high to reduce deep hip flexion. Depth only as deep as comfortable.',
		muscle_groups: ['quads', 'glutes', 'hamstrings'],
		category: 'strength'
	},
	{
		name: 'Leg Press (Single Leg)',
		description: 'Machine, single leg. Lighter than bilateral. Right leg may need less weight or fewer reps.',
		muscle_groups: ['quads', 'glutes', 'hamstrings'],
		category: 'strength'
	},
	{
		name: 'Leg Curl Machine',
		description: 'Seated or lying — whichever feels better on the hip. Isolated hamstring work, no hip stress.',
		muscle_groups: ['hamstrings'],
		category: 'strength'
	},
	{
		name: 'Hip Abduction Machine',
		description: 'Light to moderate. Reinforces banded glute work under more consistent load. Controlled on the return.',
		muscle_groups: ['glutes', 'abductors'],
		category: 'strength'
	},
	{
		name: 'Goblet Squat',
		description: 'Kettlebell, partial ROM. Only go as deep as you can while maintaining control and zero pain. Heels elevated on a plate if needed.',
		muscle_groups: ['quads', 'glutes', 'core'],
		category: 'strength'
	},

	// Posterior Chain
	{
		name: 'Back Extension Hold',
		description: 'Back extension chair — isometric hold progression from LowBackAbility. Hold at top position for time, building toward 60 sec holds, then progress to reps.',
		muscle_groups: ['back', 'glutes', 'hamstrings'],
		category: 'posterior_chain'
	},
	{
		name: 'Kettlebell Romanian Deadlift',
		description: 'Hip hinge learning movement. Push hips back, slight knee bend. Only go as low as you can maintain neutral spine with no hip pinching.',
		muscle_groups: ['hamstrings', 'glutes', 'back'],
		category: 'posterior_chain'
	},
	{
		name: 'Glute Bridge',
		description: 'Floor-based, progressing to hip thrust. Squeeze glutes hard at top, hold 2 sec. Bilateral to start, progress to single-leg.',
		muscle_groups: ['glutes', 'hamstrings'],
		category: 'posterior_chain'
	},
	{
		name: "Farmer's Carry",
		description: 'Moderate weight KBs or DBs, one in each hand. Walk with deliberate, even steps. Builds grip, core bracing, and hip stability under load.',
		muscle_groups: ['core', 'shoulders', 'glutes'],
		category: 'posterior_chain'
	},

	// Stability & Unilateral
	{
		name: 'Balance Board Squats',
		description: 'RevBalance 101 v2 or BOSU ball. KB goblet hold. Progression: add weight only when balance feels automatic.',
		muscle_groups: ['quads', 'glutes', 'core', 'calves'],
		category: 'stability'
	},
	{
		name: 'Step-Ups',
		description: 'Low box (6-8 inches). Drive through heel of working leg, don\'t push off back foot. Unilateral quad/glute in a functional pattern.',
		muscle_groups: ['quads', 'glutes'],
		category: 'stability'
	},
	{
		name: 'Cable Hip Abduction',
		description: 'Standing, ankle cuff. Light weight — stability challenge as much as strengthening. Stand tall, don\'t lean away.',
		muscle_groups: ['glutes', 'abductors'],
		category: 'stability'
	},
	{
		name: 'Cable Hip Extension',
		description: 'Standing, ankle cuff, kick back. Light, glute focused. Squeeze at top, don\'t hyperextend low back. Avoid adduction past midline.',
		muscle_groups: ['glutes', 'hamstrings'],
		category: 'stability'
	},
	{
		name: 'Single-Leg Calf Raise',
		description: 'On a step. Full range — drop heel below step, rise to full extension. Important for skiing boots and landing mechanics.',
		muscle_groups: ['calves'],
		category: 'stability'
	},

	// Core exercises (used across days)
	{
		name: 'Dead Bugs',
		description: 'Keep low back pressed into floor. Slow and controlled — anti-extension core stability. Modify right side leg extension if hip flexor demand is too much.',
		muscle_groups: ['core', 'hip_flexors'],
		category: 'core'
	},
	{
		name: 'Pallof Press',
		description: 'Cable or band. Anti-rotation. Stand perpendicular to cable, press handle straight out from chest, hold 2 sec, return. Light resistance.',
		muscle_groups: ['core'],
		category: 'core'
	},
	{
		name: 'Bird-Dog',
		description: 'Hold top position 3 sec each rep. Anti-extension + anti-rotation. Complements back extension work.',
		muscle_groups: ['core', 'back', 'glutes'],
		category: 'core'
	},
	{
		name: 'Side Plank',
		description: 'Modified from knees if needed. Build toward full side plank from feet. Lateral core stability for skiing and cutting.',
		muscle_groups: ['core'],
		category: 'core'
	},
];

// ── Workout definitions (formerly "programs") ────────────────────────

interface WorkoutDef {
	name: string;
	description: string;
}

const workouts: WorkoutDef[] = [
	{
		name: 'Lower Body Strength + Core',
		description: 'Bilateral machine work, controlled loading. Build load tolerance through stable, machine-guided movements.',
	},
	{
		name: 'Posterior Chain + Back',
		description: 'Hip hinge patterning, back extension progression, core. Develop posterior chain — where skiing power comes from.',
	},
	{
		name: 'Stability & Unilateral + Core',
		description: 'Balance, single-leg strength, anti-rotation core. Most sport-specific day for skiing, volleyball, skating.',
	}
];

// ── Workout exercise mappings ─────────────────────────────────────────

interface WorkoutExerciseDef {
	workoutIndex: number; // index into workouts array (0, 1, 2)
	exerciseName: string;
	section: string;
	order: number;
	target_sets: number;
	target_reps: string;
	target_value: string;
	target_unit: 'lb' | 'kg' | 'sec' | 'bw' | 'band';
	target_distance: string;
	target_distance_unit: 'yds' | 'ft' | 'm' | null;
	notes: string;
}

// Warmup block shared by all 3 workouts
const warmupBlock: Omit<WorkoutExerciseDef, 'workoutIndex'>[] = [
	{ exerciseName: 'Banded Clamshells', section: 'warmup', order: 1, target_sets: 1, target_reps: '15 each side', target_value: '', target_unit: 'band', target_distance: '', target_distance_unit: null, notes: '' },
	{ exerciseName: 'Banded Fire Hydrants', section: 'warmup', order: 2, target_sets: 1, target_reps: '15 each side', target_value: '', target_unit: 'band', target_distance: '', target_distance_unit: null, notes: '' },
	{ exerciseName: 'Banded Monster Walks', section: 'warmup', order: 3, target_sets: 1, target_reps: '20 each direction', target_value: '', target_unit: 'band', target_distance: '', target_distance_unit: null, notes: '' },
	{ exerciseName: 'Side-Lying Straight Leg Lift', section: 'warmup', order: 4, target_sets: 1, target_reps: '15 each side', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: '' },
	{ exerciseName: 'Single-Leg Balance Hold', section: 'warmup', order: 5, target_sets: 1, target_reps: '30 sec each side', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: '' },
];

const workoutExercises: WorkoutExerciseDef[] = [
	// Workout 0 (Lower Body Strength + Core) — warmup
	...warmupBlock.map(e => ({ ...e, workoutIndex: 0 })),
	// Workout 0 — main
	{ workoutIndex: 0, exerciseName: 'Leg Press (Bilateral)', section: 'main', order: 6, target_sets: 3, target_reps: '12-15', target_value: '125', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Feet slightly high on platform. Depth above 90° at hip.' },
	{ workoutIndex: 0, exerciseName: 'Leg Press (Single Leg)', section: 'main', order: 7, target_sets: 2, target_reps: '10-12 each', target_value: '75', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Right leg may need less weight' },
	{ workoutIndex: 0, exerciseName: 'Leg Curl Machine', section: 'main', order: 8, target_sets: 3, target_reps: '12-15', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Start light. Critical for hip stability and ski readiness.' },
	{ workoutIndex: 0, exerciseName: 'Hip Abduction Machine', section: 'main', order: 9, target_sets: 3, target_reps: '15', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Controlled on return. Don\'t let it slam shut.' },
	{ workoutIndex: 0, exerciseName: 'Goblet Squat', section: 'main', order: 10, target_sets: 2, target_reps: '12-15', target_value: '20', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Partial ROM. Heels elevated on plate if needed. Deepen ROM before adding weight.' },
	// Workout 0 — core
	{ workoutIndex: 0, exerciseName: 'Dead Bugs', section: 'core', order: 11, target_sets: 3, target_reps: '8 each side', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Keep low back pressed into floor' },
	{ workoutIndex: 0, exerciseName: 'Pallof Press', section: 'core', order: 12, target_sets: 3, target_reps: '10 each side', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Anti-rotation. Light resistance.' },

	// Workout 1 (Posterior Chain + Back) — warmup
	...warmupBlock.map(e => ({ ...e, workoutIndex: 1 })),
	// Workout 1 — main
	{ workoutIndex: 1, exerciseName: 'Back Extension Hold', section: 'main', order: 6, target_sets: 3, target_reps: '30-45 sec hold', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Iso hold progression. Log hold times every session.' },
	{ workoutIndex: 1, exerciseName: 'Kettlebell Romanian Deadlift', section: 'main', order: 7, target_sets: 3, target_reps: '10-12', target_value: '20', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Deepen hinge before adding weight' },
	{ workoutIndex: 1, exerciseName: 'Glute Bridge', section: 'main', order: 8, target_sets: 3, target_reps: '15', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Squeeze hard at top, hold 2 sec. Progress: BW bilateral → BW single leg → weighted.' },
	{ workoutIndex: 1, exerciseName: 'Leg Curl Machine', section: 'main', order: 9, target_sets: 3, target_reps: '12-15', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Same as Day 1 — hammering hamstrings 2x/week' },
	{ workoutIndex: 1, exerciseName: "Farmer's Carry", section: 'main', order: 10, target_sets: 3, target_reps: '30-40 sec', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Moderate weight. Deliberate, even steps.' },
	// Workout 1 — core
	{ workoutIndex: 1, exerciseName: 'Bird-Dog', section: 'core', order: 11, target_sets: 3, target_reps: '8 each side', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Hold top position 3 sec' },
	{ workoutIndex: 1, exerciseName: 'Side Plank', section: 'core', order: 12, target_sets: 3, target_reps: '20-30 sec each side', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Modified from knees if needed' },

	// Workout 2 (Stability & Unilateral + Core) — warmup
	...warmupBlock.map(e => ({ ...e, workoutIndex: 2 })),
	// Workout 2 — main
	{ workoutIndex: 2, exerciseName: 'Balance Board Squats', section: 'main', order: 6, target_sets: 3, target_reps: '12-15', target_value: '20', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'RevBalance or BOSU. Add weight only when balance is automatic.' },
	{ workoutIndex: 2, exerciseName: 'Step-Ups', section: 'main', order: 7, target_sets: 3, target_reps: '10 each leg', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Low box 6-8 inches. Drive through heel, don\'t push off back foot.' },
	{ workoutIndex: 2, exerciseName: 'Cable Hip Abduction', section: 'main', order: 8, target_sets: 2, target_reps: '12-15 each leg', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'Stand tall, don\'t lean away' },
	{ workoutIndex: 2, exerciseName: 'Cable Hip Extension', section: 'main', order: 9, target_sets: 2, target_reps: '12-15 each leg', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'No adduction past midline' },
	{ workoutIndex: 2, exerciseName: 'Single-Leg Calf Raise', section: 'main', order: 10, target_sets: 3, target_reps: '15 each leg', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Full range on a step' },
	// Workout 2 — core
	{ workoutIndex: 2, exerciseName: 'Pallof Press', section: 'core', order: 11, target_sets: 3, target_reps: '8 each side', target_value: '', target_unit: 'lb', target_distance: '', target_distance_unit: null, notes: 'With lateral step away from anchor' },
	{ workoutIndex: 2, exerciseName: 'Dead Bugs', section: 'core', order: 12, target_sets: 3, target_reps: '8 each side', target_value: '', target_unit: 'bw', target_distance: '', target_distance_unit: null, notes: 'Slow tempo: 3 sec extend, 3 sec return' },
];

// ── Program definition ────────────────────────────────────────────────

const programDef = {
	name: '3-Day Recovery Split',
	description: 'Three-day rotation targeting lower body strength, posterior chain, and stability.',
};

// ── Seed logic ────────────────────────────────────────────────────────

async function findByName(collection: string, name: string) {
	try {
		const result = await pb.collection(collection).getFirstListItem(`name="${name.replace(/"/g, '\\"')}"`);
		return result;
	} catch {
		return null;
	}
}

async function seed() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD);
	console.log('Authenticated as superuser.\n');

	// Seed exercises
	console.log('── Seeding exercises ──');
	const exerciseMap = new Map<string, string>(); // name → id

	for (const ex of exercises) {
		const existing = await findByName('exercises', ex.name);
		if (existing) {
			console.log(`  ✓ ${ex.name} (exists)`);
			exerciseMap.set(ex.name, existing.id);
		} else {
			const created = await pb.collection('exercises').create({
				name: ex.name,
				description: ex.description,
				muscle_groups: ex.muscle_groups,
				category: ex.category,
				video_urls: []
			});
			console.log(`  + ${ex.name}`);
			exerciseMap.set(ex.name, created.id);
		}
	}

	// Seed workouts
	console.log('\n── Seeding workouts ──');
	const workoutIds: string[] = [];

	for (const w of workouts) {
		const existing = await findByName('workouts', w.name);
		if (existing) {
			console.log(`  ✓ ${w.name} (exists)`);
			workoutIds.push(existing.id);
		} else {
			const created = await pb.collection('workouts').create({
				name: w.name,
				description: w.description,
			});
			console.log(`  + ${w.name}`);
			workoutIds.push(created.id);
		}
	}

	// Seed workout_exercises
	console.log('\n── Seeding workout_exercises ──');
	const existingWE = await pb.collection('workout_exercises').getFullList();
	const existingWEKeys = new Set(existingWE.map(we => `${we.workout}:${we.exercise}:${we.order}`));

	for (const we of workoutExercises) {
		const workoutId = workoutIds[we.workoutIndex];
		const exerciseId = exerciseMap.get(we.exerciseName);

		if (!workoutId || !exerciseId) {
			console.error(`  ✗ Missing mapping: workout=${we.workoutIndex}, exercise=${we.exerciseName}`);
			continue;
		}

		const key = `${workoutId}:${exerciseId}:${we.order}`;
		if (existingWEKeys.has(key)) {
			console.log(`  ✓ ${workouts[we.workoutIndex].name} #${we.order} ${we.exerciseName} (exists)`);
			continue;
		}

		await pb.collection('workout_exercises').create({
			workout: workoutId,
			exercise: exerciseId,
			order: we.order,
			section: we.section,
			target_sets: we.target_sets,
			target_reps: we.target_reps,
			target_value: we.target_value,
			target_unit: we.target_unit,
			target_distance: we.target_distance,
			target_distance_unit: we.target_distance_unit,
			notes: we.notes
		});
		console.log(`  + ${workouts[we.workoutIndex].name} #${we.order} ${we.exerciseName}`);
	}

	// Seed program
	console.log('\n── Seeding program ──');
	let programId: string;
	const existingProgram = await findByName('programs', programDef.name);
	if (existingProgram) {
		console.log(`  ✓ ${programDef.name} (exists)`);
		programId = existingProgram.id;
	} else {
		const created = await pb.collection('programs').create({
			name: programDef.name,
			description: programDef.description,
			active: true
		});
		console.log(`  + ${programDef.name}`);
		programId = created.id;
	}

	// Seed program_workouts
	console.log('\n── Seeding program_workouts ──');
	const existingPW = await pb.collection('program_workouts').getFullList();
	const existingPWKeys = new Set(existingPW.map(pw => `${pw.program}:${pw.workout}`));

	for (let i = 0; i < workoutIds.length; i++) {
		const key = `${programId}:${workoutIds[i]}`;
		if (existingPWKeys.has(key)) {
			console.log(`  ✓ Day ${i + 1} → ${workouts[i].name} (exists)`);
			continue;
		}
		await pb.collection('program_workouts').create({
			program: programId,
			workout: workoutIds[i],
			day_number: i + 1
		});
		console.log(`  + Day ${i + 1} → ${workouts[i].name}`);
	}

	console.log('\nSeed complete!');
}

seed().catch(err => {
	console.error('Seed failed:', err);
	process.exit(1);
});
