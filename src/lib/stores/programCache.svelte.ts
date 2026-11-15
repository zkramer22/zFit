import { createLiveCollection } from '$lib/live/collection.svelte';
import type { Program } from '$lib/pocketbase/types';

export const programCache = createLiveCollection<Program>({
	collection: 'programs',
	sort: '-active,name'
});
