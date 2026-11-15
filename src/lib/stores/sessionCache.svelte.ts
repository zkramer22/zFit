import { createLiveCollection } from '$lib/live/collection.svelte';
import type { SessionExpanded } from '$lib/pocketbase/types';

export const sessionCache = createLiveCollection<SessionExpanded>({
	collection: 'sessions',
	sort: '-date',
	expand: 'workout'
});
