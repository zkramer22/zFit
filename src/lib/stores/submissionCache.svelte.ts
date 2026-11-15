import { createLiveCollection } from '$lib/live/collection.svelte';
import type { SubmissionExpanded } from '$lib/pocketbase/types';

export const submissionCache = createLiveCollection<SubmissionExpanded>({
	collection: 'submissions',
	sort: '-created',
	expand: 'user,exercise,user_exercise'
});
