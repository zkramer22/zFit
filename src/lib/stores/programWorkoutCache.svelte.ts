import { createLiveCollection } from '$lib/live/collection.svelte';
import type { ProgramWorkout } from '$lib/pocketbase/types';

export const programWorkoutCache = createLiveCollection<ProgramWorkout>({
	collection: 'program_workouts',
	sort: 'day_number'
});
