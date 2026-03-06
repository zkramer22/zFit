import { createCacheStore } from './createCacheStore.svelte';
import type { Workout } from '$lib/pocketbase/types';

export const workoutCache = createCacheStore<Workout>({
	collection: 'workouts',
	sort: 'name'
});
