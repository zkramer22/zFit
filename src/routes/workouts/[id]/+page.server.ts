import { getPb } from '$lib/pocketbase/client';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Workout, WorkoutExerciseExpanded } from '$lib/pocketbase/types';

export const load: PageServerLoad = async ({ params }) => {
	const pb = await getPb();

	let workout: Workout;
	try {
		workout = await pb.collection('workouts').getOne<Workout>(params.id);
	} catch {
		error(404, 'Workout not found');
	}

	const exercises = await pb.collection('workout_exercises').getFullList<WorkoutExerciseExpanded>({
		filter: `workout="${params.id}"`,
		sort: 'order',
		expand: 'exercise'
	});

	return { workout, exercises };
};
