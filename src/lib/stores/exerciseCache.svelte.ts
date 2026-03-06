import { createCacheStore } from './createCacheStore.svelte';
import type { Exercise } from '$lib/pocketbase/types';

export const exerciseCache = createCacheStore<Exercise>({
	collection: 'exercises',
	sort: 'name'
});
