import { createLiveCollection } from '$lib/live/collection.svelte';
import type { Workout } from '$lib/pocketbase/types';

export const workoutCache = createLiveCollection<Workout>({
	collection: 'workouts',
	sort: 'name'
});
