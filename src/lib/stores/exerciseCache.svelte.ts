import { createLiveCollection } from '$lib/live/collection.svelte';
import type { Exercise } from '$lib/pocketbase/types';

export const exerciseCache = createLiveCollection<Exercise>({
	collection: 'exercises',
	sort: 'name'
});
