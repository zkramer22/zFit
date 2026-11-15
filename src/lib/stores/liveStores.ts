import { exerciseCache } from './exerciseCache.svelte';
import { workoutCache } from './workoutCache.svelte';
import { workoutExerciseCache } from './workoutExerciseCache.svelte';

/** Every app-wide live collection, started and stopped together with the signed-in user. */
export const liveStores = [exerciseCache, workoutCache, workoutExerciseCache];
