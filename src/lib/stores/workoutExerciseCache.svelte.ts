import { createCacheStore } from './createCacheStore.svelte';
import type { WorkoutExerciseExpanded } from '$lib/pocketbase/types';

export const workoutExerciseCache = createCacheStore<WorkoutExerciseExpanded>({
	collection: 'workout_exercises',
	sort: 'order',
	expand: 'exercise'
});
