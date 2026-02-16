import { getPb } from '$lib/pocketbase/client';
import type { PageServerLoad } from './$types';
import type { Exercise } from '$lib/pocketbase/types';

export const load: PageServerLoad = async () => {
	const pb = await getPb();
	const exercises = await pb.collection('exercises').getFullList<Exercise>({
		sort: 'name'
	});
	return { exercises };
};
