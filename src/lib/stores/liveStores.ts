import { exerciseCache } from './exerciseCache.svelte';
import { notificationCache } from './notifications.svelte';
import { programCache } from './programCache.svelte';
import { programWorkoutCache } from './programWorkoutCache.svelte';
import { sessionCache } from './sessionCache.svelte';
import { submissionCache } from './submissionCache.svelte';
import { userExerciseCache } from './userExerciseCache.svelte';
import { workoutCache } from './workoutCache.svelte';
import { workoutExerciseCache } from './workoutExerciseCache.svelte';

/** Every app-wide live collection, started and stopped together with the signed-in user. */
export const liveStores = [
	exerciseCache,
	workoutCache,
	workoutExerciseCache,
	sessionCache,
	programCache,
	programWorkoutCache,
	userExerciseCache,
	submissionCache,
	notificationCache
];
