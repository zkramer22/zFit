import { createLiveCollection } from '$lib/live/collection.svelte';
import type { UserExercise } from '$lib/pocketbase/types';

export const userExerciseCache = createLiveCollection<UserExercise>({
	collection: 'user_exercises'
});
