import { createLiveCollection } from '$lib/live/collection.svelte';
import type { WorkoutExerciseExpanded } from '$lib/pocketbase/types';

export const workoutExerciseCache = createLiveCollection<WorkoutExerciseExpanded>({
	collection: 'workout_exercises',
	sort: 'order',
	expand: 'exercise'
});
