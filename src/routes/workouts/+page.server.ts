import { getPb } from '$lib/pocketbase/client';
import type { PageServerLoad } from './$types';
import type { Workout, WorkoutExercise } from '$lib/pocketbase/types';

export const load: PageServerLoad = async () => {
	const pb = await getPb();
	const workouts = await pb.collection('workouts').getFullList<Workout>({ sort: 'name' });

	// Get exercise counts per workout
	const counts: Record<string, number> = {};
	for (const w of workouts) {
		const wes = await pb.collection('workout_exercises').getList<WorkoutExercise>(1, 1, {
			filter: `workout="${w.id}" && section!="warmup"`,
		});
		counts[w.id] = wes.totalItems;
	}

	return { workouts, exerciseCounts: counts };
};
