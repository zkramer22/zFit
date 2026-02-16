import { getPb } from '$lib/pocketbase/client';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Program, ProgramExercise } from '$lib/pocketbase/types';

export const load: PageServerLoad = async () => {
	const pb = await getPb();
	const programs = await pb.collection('programs').getFullList<Program>({
		sort: 'order'
	});
	return { programs };
};

export const actions: Actions = {
	start: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const programId = data.get('programId') as string | null;

		// Create the session
		const session = await pb.collection('sessions').create({
			program: programId || '',
			date: new Date().toISOString().split('T')[0],
			notes: '',
			duration_minutes: 0
		});

		// If a program was selected, pre-create session entries from program_exercises
		if (programId) {
			const programExercises = await pb.collection('program_exercises').getFullList<ProgramExercise>({
				filter: `program="${programId}"`,
				sort: 'order'
			});

			for (const pe of programExercises) {
				await pb.collection('session_entries').create({
					session: session.id,
					exercise: pe.exercise,
					order: pe.order,
					sets: [],
					rpe: null,
					pain_flag: false,
					notes: ''
				});
			}
		}

		redirect(303, `/log/${session.id}`);
	}
};
