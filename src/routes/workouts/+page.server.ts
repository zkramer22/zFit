import { getPb } from '$lib/pocketbase/client';
import type { PageServerLoad, Actions } from './$types';
import type { Workout, WorkoutExercise, WorkoutExerciseExpanded } from '$lib/pocketbase/types';

export const load: PageServerLoad = async () => {
	const pb = await getPb();
	const workouts = await pb.collection('workouts').getFullList<Workout>({ sort: 'name' });

	// Get exercise counts and search metadata per workout
	const counts: Record<string, number> = {};
	const searchMeta: Record<string, string> = {};
	for (const w of workouts) {
		const wes = await pb.collection('workout_exercises').getFullList<WorkoutExerciseExpanded>({
			filter: `workout="${w.id}"`,
			expand: 'exercise'
		});
		counts[w.id] = wes.filter(we => we.section !== 'warmup').length;

		// Build search metadata from exercises
		const parts: string[] = [];
		for (const we of wes) {
			const ex = we.expand?.exercise;
			if (ex) {
				parts.push(ex.name, ex.category, ...(ex.muscle_groups || []));
			}
		}
		searchMeta[w.id] = parts.join(' ').toLowerCase();
	}

	return { workouts, exerciseCounts: counts, searchMeta };
};

export const actions: Actions = {
	createWorkout: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		if (!name) return;
		const description = (data.get('description') as string) || '';
		const tags = data.getAll('tags') as string[];

		await pb.collection('workouts').create({ name, description, tags });
	}
};
