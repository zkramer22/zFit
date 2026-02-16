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

	// Day 1 — Lower Body Strength
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

	// Day 2 — Posterior Chain
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

	// Day 3 — Stability & Unilateral
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

// ── Program definitions ───────────────────────────────────────────────

interface ProgramDef {
	name: string;
	description: string;
	order: number;
}

const programs: ProgramDef[] = [
	{
		name: 'Day 1 — Lower Body Strength + Core',
		description: 'Bilateral machine work, controlled loading. Build load tolerance through stable, machine-guided movements.',
		order: 1
	},
	{
		name: 'Day 2 — Posterior Chain + Back',
		description: 'Hip hinge patterning, back extension progression, core. Develop posterior chain — where skiing power comes from.',
		order: 2
	},
	{
		name: 'Day 3 — Stability & Unilateral + Core',
		description: 'Balance, single-leg strength, anti-rotation core. Most sport-specific day for skiing, volleyball, skating.',
		order: 3
	}
];

// ── Program exercise mappings ─────────────────────────────────────────

interface ProgramExerciseDef {
	programOrder: number; // references program.order
	exerciseName: string;
	section: string;
	order: number;
	target_sets: number;
	target_reps: string;
	target_weight: string;
	notes: string;
}

// Warmup block shared by all 3 days
const warmupBlock: Omit<ProgramExerciseDef, 'programOrder'>[] = [
	{ exerciseName: 'Banded Clamshells', section: 'warmup', order: 1, target_sets: 1, target_reps: '15 each side', target_weight: 'band', notes: '' },
	{ exerciseName: 'Banded Fire Hydrants', section: 'warmup', order: 2, target_sets: 1, target_reps: '15 each side', target_weight: 'band', notes: '' },
	{ exerciseName: 'Banded Monster Walks', section: 'warmup', order: 3, target_sets: 1, target_reps: '20 each direction', target_weight: 'band', notes: '' },
	{ exerciseName: 'Side-Lying Straight Leg Lift', section: 'warmup', order: 4, target_sets: 1, target_reps: '15 each side', target_weight: 'bw', notes: '' },
	{ exerciseName: 'Single-Leg Balance Hold', section: 'warmup', order: 5, target_sets: 1, target_reps: '30 sec each side', target_weight: 'bw', notes: '' },
];

const programExercises: ProgramExerciseDef[] = [
	// Day 1 — warmup
	...warmupBlock.map(e => ({ ...e, programOrder: 1 })),
	// Day 1 — main
	{ programOrder: 1, exerciseName: 'Leg Press (Bilateral)', section: 'main', order: 6, target_sets: 3, target_reps: '12-15', target_weight: '125 lb', notes: 'Feet slightly high on platform. Depth above 90° at hip.' },
	{ programOrder: 1, exerciseName: 'Leg Press (Single Leg)', section: 'main', order: 7, target_sets: 2, target_reps: '10-12 each', target_weight: '75 lb', notes: 'Right leg may need less weight' },
	{ programOrder: 1, exerciseName: 'Leg Curl Machine', section: 'main', order: 8, target_sets: 3, target_reps: '12-15', target_weight: '', notes: 'Start light. Critical for hip stability and ski readiness.' },
	{ programOrder: 1, exerciseName: 'Hip Abduction Machine', section: 'main', order: 9, target_sets: 3, target_reps: '15', target_weight: '', notes: 'Controlled on return. Don\'t let it slam shut.' },
	{ programOrder: 1, exerciseName: 'Goblet Squat', section: 'main', order: 10, target_sets: 2, target_reps: '12-15', target_weight: '20 lb KB', notes: 'Partial ROM. Heels elevated on plate if needed. Deepen ROM before adding weight.' },
	// Day 1 — core
	{ programOrder: 1, exerciseName: 'Dead Bugs', section: 'core', order: 11, target_sets: 3, target_reps: '8 each side', target_weight: 'bw', notes: 'Keep low back pressed into floor' },
	{ programOrder: 1, exerciseName: 'Pallof Press', section: 'core', order: 12, target_sets: 3, target_reps: '10 each side', target_weight: '', notes: 'Anti-rotation. Light resistance.' },

	// Day 2 — warmup
	...warmupBlock.map(e => ({ ...e, programOrder: 2 })),
	// Day 2 — main
	{ programOrder: 2, exerciseName: 'Back Extension Hold', section: 'main', order: 6, target_sets: 3, target_reps: '30-45 sec hold', target_weight: 'bw', notes: 'Iso hold progression. Log hold times every session.' },
	{ programOrder: 2, exerciseName: 'Kettlebell Romanian Deadlift', section: 'main', order: 7, target_sets: 3, target_reps: '10-12', target_weight: '20 lb KB', notes: 'Deepen hinge before adding weight' },
	{ programOrder: 2, exerciseName: 'Glute Bridge', section: 'main', order: 8, target_sets: 3, target_reps: '15', target_weight: 'bw', notes: 'Squeeze hard at top, hold 2 sec. Progress: BW bilateral → BW single leg → weighted.' },
	{ programOrder: 2, exerciseName: 'Leg Curl Machine', section: 'main', order: 9, target_sets: 3, target_reps: '12-15', target_weight: '', notes: 'Same as Day 1 — hammering hamstrings 2x/week' },
	{ programOrder: 2, exerciseName: "Farmer's Carry", section: 'main', order: 10, target_sets: 3, target_reps: '30-40 sec', target_weight: '', notes: 'Moderate weight. Deliberate, even steps.' },
	// Day 2 — core
	{ programOrder: 2, exerciseName: 'Bird-Dog', section: 'core', order: 11, target_sets: 3, target_reps: '8 each side', target_weight: 'bw', notes: 'Hold top position 3 sec' },
	{ programOrder: 2, exerciseName: 'Side Plank', section: 'core', order: 12, target_sets: 3, target_reps: '20-30 sec each side', target_weight: 'bw', notes: 'Modified from knees if needed' },

	// Day 3 — warmup
	...warmupBlock.map(e => ({ ...e, programOrder: 3 })),
	// Day 3 — main
	{ programOrder: 3, exerciseName: 'Balance Board Squats', section: 'main', order: 6, target_sets: 3, target_reps: '12-15', target_weight: '20 lb KB', notes: 'RevBalance or BOSU. Add weight only when balance is automatic.' },
	{ programOrder: 3, exerciseName: 'Step-Ups', section: 'main', order: 7, target_sets: 3, target_reps: '10 each leg', target_weight: 'bw', notes: 'Low box 6-8 inches. Drive through heel, don\'t push off back foot.' },
	{ programOrder: 3, exerciseName: 'Cable Hip Abduction', section: 'main', order: 8, target_sets: 2, target_reps: '12-15 each leg', target_weight: '', notes: 'Stand tall, don\'t lean away' },
	{ programOrder: 3, exerciseName: 'Cable Hip Extension', section: 'main', order: 9, target_sets: 2, target_reps: '12-15 each leg', target_weight: '', notes: 'No adduction past midline' },
	{ programOrder: 3, exerciseName: 'Single-Leg Calf Raise', section: 'main', order: 10, target_sets: 3, target_reps: '15 each leg', target_weight: 'bw', notes: 'Full range on a step' },
	// Day 3 — core
	{ programOrder: 3, exerciseName: 'Pallof Press', section: 'core', order: 11, target_sets: 3, target_reps: '8 each side', target_weight: '', notes: 'With lateral step away from anchor' },
	{ programOrder: 3, exerciseName: 'Dead Bugs', section: 'core', order: 12, target_sets: 3, target_reps: '8 each side', target_weight: 'bw', notes: 'Slow tempo: 3 sec extend, 3 sec return' },
];

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

	// Seed programs
	console.log('\n── Seeding programs ──');
	const programMap = new Map<number, string>(); // order → id

	for (const prog of programs) {
		const existing = await findByName('programs', prog.name);
		if (existing) {
			console.log(`  ✓ ${prog.name} (exists)`);
			programMap.set(prog.order, existing.id);
		} else {
			const created = await pb.collection('programs').create({
				name: prog.name,
				description: prog.description,
				order: prog.order
			});
			console.log(`  + ${prog.name}`);
			programMap.set(prog.order, created.id);
		}
	}

	// Seed program_exercises
	console.log('\n── Seeding program_exercises ──');
	// Get existing program_exercises to check for duplicates
	const existingPE = await pb.collection('program_exercises').getFullList();
	const existingPEKeys = new Set(existingPE.map(pe => `${pe.program}:${pe.exercise}:${pe.order}`));

	for (const pe of programExercises) {
		const programId = programMap.get(pe.programOrder);
		const exerciseId = exerciseMap.get(pe.exerciseName);

		if (!programId || !exerciseId) {
			console.error(`  ✗ Missing mapping: program=${pe.programOrder}, exercise=${pe.exerciseName}`);
			continue;
		}

		const key = `${programId}:${exerciseId}:${pe.order}`;
		if (existingPEKeys.has(key)) {
			console.log(`  ✓ Day ${pe.programOrder} #${pe.order} ${pe.exerciseName} (exists)`);
			continue;
		}

		await pb.collection('program_exercises').create({
			program: programId,
			exercise: exerciseId,
			order: pe.order,
			section: pe.section,
			target_sets: pe.target_sets,
			target_reps: pe.target_reps,
			target_weight: pe.target_weight,
			notes: pe.notes
		});
		console.log(`  + Day ${pe.programOrder} #${pe.order} ${pe.exerciseName}`);
	}

	console.log('\nSeed complete!');
}

seed().catch(err => {
	console.error('Seed failed:', err);
	process.exit(1);
});
