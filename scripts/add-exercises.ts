import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL || process.env.PUBLIC_POCKETBASE_URL!;
const POCKETBASE_SUPERUSER_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const POCKETBASE_SUPERUSER_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;

if (!POCKETBASE_URL || !POCKETBASE_SUPERUSER_EMAIL || !POCKETBASE_SUPERUSER_PASSWORD) {
	console.error('Missing .env variables.');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

interface ExerciseDef {
	name: string;
	description: string;
	muscle_groups: string[];
	category: string;
}

const newExercises: ExerciseDef[] = [
	// ── Upper Body Push ──────────────────────────────────────────────
	{
		name: 'Push-Up',
		description: 'Hands shoulder-width, body straight from head to heels. Lower chest to floor, press back up. Scale with knees down or incline.',
		muscle_groups: ['chest', 'triceps', 'shoulders', 'core'],
		category: 'bodyweight'
	},
	{
		name: 'Diamond Push-Up',
		description: 'Hands close together forming a diamond shape under chest. Emphasizes triceps. Keep elbows tucked.',
		muscle_groups: ['triceps', 'chest', 'shoulders'],
		category: 'bodyweight'
	},
	{
		name: 'Pike Push-Up',
		description: 'Hips high in an inverted V. Lower head toward floor between hands. Mimics overhead press pattern with bodyweight.',
		muscle_groups: ['shoulders', 'triceps'],
		category: 'bodyweight'
	},
	{
		name: 'Dumbbell Bench Press',
		description: 'Flat bench, dumbbells at chest level. Press up and slightly in. Full range of motion with controlled eccentric.',
		muscle_groups: ['chest', 'triceps', 'shoulders'],
		category: 'strength'
	},
	{
		name: 'Incline Dumbbell Press',
		description: 'Bench at 30-45 degrees. Press dumbbells up from upper chest. Targets upper chest and front delts.',
		muscle_groups: ['chest', 'shoulders', 'triceps'],
		category: 'strength'
	},
	{
		name: 'Overhead Press',
		description: 'Standing or seated. Press dumbbells or barbell from shoulders to overhead lockout. Core tight, no excessive back arch.',
		muscle_groups: ['shoulders', 'triceps', 'core'],
		category: 'strength'
	},
	{
		name: 'Dumbbell Lateral Raise',
		description: 'Standing, slight forward lean. Raise dumbbells out to sides to shoulder height. Control the descent. Light weight, high reps.',
		muscle_groups: ['shoulders'],
		category: 'strength'
	},
	{
		name: 'Tricep Dip',
		description: 'Parallel bars or bench. Lower body by bending elbows to ~90 degrees, press back up. Lean slightly forward for chest emphasis, upright for triceps.',
		muscle_groups: ['triceps', 'chest', 'shoulders'],
		category: 'bodyweight'
	},
	{
		name: 'Cable Tricep Pushdown',
		description: 'Cable machine, rope or bar attachment. Elbows pinned at sides, extend forearms down. Squeeze at bottom.',
		muscle_groups: ['triceps'],
		category: 'strength'
	},
	{
		name: 'Overhead Tricep Extension',
		description: 'Seated or standing. Hold dumbbell overhead with both hands, lower behind head by bending elbows. Extend back to start.',
		muscle_groups: ['triceps'],
		category: 'strength'
	},

	// ── Upper Body Pull ──────────────────────────────────────────────
	{
		name: 'Pull-Up',
		description: 'Overhand grip, hands wider than shoulders. Pull chin above bar, lower with control. Scale with band assist or negatives.',
		muscle_groups: ['lats', 'biceps', 'back', 'forearms'],
		category: 'bodyweight'
	},
	{
		name: 'Chin-Up',
		description: 'Underhand grip, shoulder-width. Pull chin above bar. More bicep emphasis than pull-ups. Scale with band assist.',
		muscle_groups: ['biceps', 'lats', 'back'],
		category: 'bodyweight'
	},
	{
		name: 'Inverted Row',
		description: 'Hang from bar or TRX at an angle. Pull chest to bar keeping body straight. Adjust difficulty by changing body angle.',
		muscle_groups: ['back', 'biceps', 'shoulders'],
		category: 'bodyweight'
	},
	{
		name: 'Dumbbell Row',
		description: 'One hand and knee on bench. Pull dumbbell from arm\'s length to hip, squeezing shoulder blade back. Control the lower.',
		muscle_groups: ['back', 'lats', 'biceps'],
		category: 'strength'
	},
	{
		name: 'Bent Over Barbell Row',
		description: 'Hinge at hips ~45 degrees. Pull barbell to lower chest/upper belly. Squeeze shoulder blades together. Keep back flat.',
		muscle_groups: ['back', 'lats', 'biceps', 'core'],
		category: 'strength'
	},
	{
		name: 'Cable Row (Seated)',
		description: 'Seated cable machine. Pull handle to lower chest, squeezing shoulder blades. Controlled return, don\'t round forward.',
		muscle_groups: ['back', 'lats', 'biceps'],
		category: 'strength'
	},
	{
		name: 'Face Pull',
		description: 'Cable at head height, rope attachment. Pull toward face, rotating hands outward. Targets rear delts and external rotators. Great for posture.',
		muscle_groups: ['shoulders', 'back'],
		category: 'strength'
	},
	{
		name: 'Dumbbell Bicep Curl',
		description: 'Standing or seated. Curl dumbbells from arms extended to full contraction. Control the negative. Don\'t swing.',
		muscle_groups: ['biceps', 'forearms'],
		category: 'strength'
	},
	{
		name: 'Hammer Curl',
		description: 'Neutral grip (palms facing each other). Curl to shoulder. Targets brachialis and forearms in addition to biceps.',
		muscle_groups: ['biceps', 'forearms'],
		category: 'strength'
	},
	{
		name: 'Lat Pulldown',
		description: 'Cable machine, wide bar. Pull to upper chest, squeezing lats. Lean back slightly. Don\'t pull behind neck.',
		muscle_groups: ['lats', 'biceps', 'back'],
		category: 'strength'
	},

	// ── Calisthenics / Full Body ─────────────────────────────────────
	{
		name: 'Burpee',
		description: 'Squat down, hands on floor, jump feet back to plank, push-up, jump feet forward, jump up with arms overhead. Scale by removing push-up or jump.',
		muscle_groups: ['chest', 'quads', 'shoulders', 'core'],
		category: 'bodyweight'
	},
	{
		name: 'Mountain Climber',
		description: 'Plank position. Alternate driving knees toward chest quickly. Keep hips level, core braced. Can be done slow for control or fast for cardio.',
		muscle_groups: ['core', 'hip_flexors', 'shoulders'],
		category: 'bodyweight'
	},
	{
		name: 'Plank',
		description: 'Forearms and toes on floor, body in a straight line. Brace core, squeeze glutes, don\'t let hips sag or pike. Hold for time.',
		muscle_groups: ['core', 'shoulders'],
		category: 'core'
	},
	{
		name: 'Bear Crawl',
		description: 'Hands and feet on floor, knees hovering 1 inch off ground. Crawl forward with opposite hand/foot moving together. Full body stability.',
		muscle_groups: ['core', 'shoulders', 'quads'],
		category: 'bodyweight'
	},
	{
		name: 'Hanging Leg Raise',
		description: 'Hang from pull-up bar. Raise straight legs to parallel or higher. Control the swing. Bend knees to scale easier.',
		muscle_groups: ['core', 'hip_flexors'],
		category: 'core'
	},
	{
		name: 'Ab Wheel Rollout',
		description: 'Kneel behind ab wheel. Roll forward extending body, then pull back using abs. Only go as far as you can control without back arching.',
		muscle_groups: ['core', 'shoulders'],
		category: 'core'
	},
	{
		name: 'Russian Twist',
		description: 'Seated, lean back slightly, feet off floor. Rotate torso side to side. Hold weight for added difficulty. Keep chest up.',
		muscle_groups: ['core'],
		category: 'core'
	},

	// ── Compound Strength ────────────────────────────────────────────
	{
		name: 'Barbell Back Squat',
		description: 'Bar on upper back/traps. Feet shoulder-width. Sit back and down, chest up, knees tracking toes. Depth to at least parallel.',
		muscle_groups: ['quads', 'glutes', 'hamstrings', 'core'],
		category: 'strength'
	},
	{
		name: 'Front Squat',
		description: 'Bar in front rack position (clean grip or crossed arms). More upright torso, emphasis on quads. Requires good thoracic mobility.',
		muscle_groups: ['quads', 'glutes', 'core'],
		category: 'strength'
	},
	{
		name: 'Conventional Deadlift',
		description: 'Barbell on floor, feet hip-width. Hinge at hips and grip bar just outside knees. Drive through floor, lock out hips and knees together. Back stays neutral.',
		muscle_groups: ['hamstrings', 'glutes', 'back', 'core'],
		category: 'strength'
	},
	{
		name: 'Sumo Deadlift',
		description: 'Wide stance, toes turned out. Grip inside knees. Hips closer to bar, more upright torso than conventional. Good for those with long torsos.',
		muscle_groups: ['glutes', 'hamstrings', 'adductors', 'back'],
		category: 'strength'
	},
	{
		name: 'Hip Thrust',
		description: 'Upper back on bench, barbell across hips. Drive through heels to full hip extension. Squeeze glutes hard at top. The gold standard for glute isolation.',
		muscle_groups: ['glutes', 'hamstrings'],
		category: 'strength'
	},
	{
		name: 'Barbell Lunge',
		description: 'Bar on upper back. Step forward or backward into lunge. Front shin stays vertical. Alternate legs or do all reps on one side.',
		muscle_groups: ['quads', 'glutes', 'hamstrings'],
		category: 'strength'
	},
	{
		name: 'Dumbbell Walking Lunge',
		description: 'Dumbbells at sides. Step forward into lunge, drive through front heel to step into next lunge. Continuous walking pattern.',
		muscle_groups: ['quads', 'glutes', 'hamstrings'],
		category: 'strength'
	},
	{
		name: 'Leg Extension Machine',
		description: 'Seated, pad on shins. Extend legs to straight position. Controlled lower. Isolates quads — good for warming up or finishing.',
		muscle_groups: ['quads'],
		category: 'strength'
	},
	{
		name: 'Cable Woodchop',
		description: 'Cable at high or low position. Rotate torso pulling cable diagonally across body. Anti-rotation with controlled rotation. Feet stay planted.',
		muscle_groups: ['core'],
		category: 'core'
	},
	{
		name: 'Kettlebell Swing',
		description: 'Hinge at hips, swing KB between legs, then drive hips forward to swing KB to chest/eye height. Power comes from hip snap, not arms.',
		muscle_groups: ['glutes', 'hamstrings', 'core', 'shoulders'],
		category: 'strength'
	},
	{
		name: 'Turkish Get-Up',
		description: 'Lie on back holding KB/DB overhead. Stand up through a series of controlled positions while keeping weight locked out overhead. Full body stability.',
		muscle_groups: ['shoulders', 'core', 'glutes'],
		category: 'stability'
	},
];

async function findByName(collection: string, name: string) {
	try {
		return await pb.collection(collection).getFirstListItem(`name="${name.replace(/"/g, '\\"')}"`);
	} catch {
		return null;
	}
}

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD);
	console.log('Authenticated.\n');

	console.log('── Adding exercises ──');
	let added = 0;
	let skipped = 0;

	for (const ex of newExercises) {
		const existing = await findByName('exercises', ex.name);
		if (existing) {
			console.log(`  ✓ ${ex.name} (exists)`);
			skipped++;
		} else {
			await pb.collection('exercises').create({
				name: ex.name,
				description: ex.description,
				muscle_groups: ex.muscle_groups,
				category: ex.category,
				video_urls: []
			});
			console.log(`  + ${ex.name}`);
			added++;
		}
	}

	console.log(`\nDone. Added ${added}, skipped ${skipped} existing.`);
}

run().catch(err => {
	console.error('Failed:', err);
	process.exit(1);
});
