import { getPb } from '$lib/pocketbase/client';
import type { PageServerLoad, Actions } from './$types';
import type { Exercise } from '$lib/pocketbase/types';

export const load: PageServerLoad = async () => {
	const pb = await getPb();
	const exercises = await pb.collection('exercises').getFullList<Exercise>({
		sort: 'name'
	});
	return { exercises };
};

export const actions: Actions = {
	createExercise: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		if (!name) return;
		const category = (data.get('category') as string) || 'strength';
		const description = (data.get('description') as string) || '';
		const muscleGroups = data.getAll('muscle_groups') as string[];

		await pb.collection('exercises').create({
			name,
			category,
			description,
			muscle_groups: muscleGroups,
			video_urls: []
		});
	}
};
