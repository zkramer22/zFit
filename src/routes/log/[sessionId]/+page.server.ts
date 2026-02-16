import { getPb } from '$lib/pocketbase/client';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type {
	SessionExpanded,
	SessionEntryExpanded,
	ProgramExercise,
	SessionEntry,
	SetData
} from '$lib/pocketbase/types';

export const load: PageServerLoad = async ({ params }) => {
	const pb = await getPb();

	// Load session with program expansion
	let session: SessionExpanded;
	try {
		session = await pb.collection('sessions').getOne<SessionExpanded>(params.sessionId, {
			expand: 'program'
		});
	} catch {
		error(404, 'Session not found');
	}

	// Load session entries with exercise expansion
	const entries = await pb.collection('session_entries').getFullList<SessionEntryExpanded>({
		filter: `session="${params.sessionId}"`,
		sort: 'order',
		expand: 'exercise'
	});

	// Load program exercise targets if this session has a program
	let targets: Record<string, ProgramExercise> = {};
	if (session.program) {
		const programExercises = await pb.collection('program_exercises').getFullList<ProgramExercise>({
			filter: `program="${session.program}"`,
			sort: 'order'
		});
		for (const pe of programExercises) {
			targets[pe.exercise] = pe;
		}
	}

	// Load last session data for the same program (for reference)
	let lastSessionEntries: Record<string, SetData[]> = {};
	if (session.program) {
		try {
			const lastSessions = await pb.collection('sessions').getList(1, 1, {
				filter: `program="${session.program}" && id!="${session.id}"`,
				sort: '-date'
			});
			if (lastSessions.items.length > 0) {
				const lastEntries = await pb.collection('session_entries').getFullList<SessionEntry>({
					filter: `session="${lastSessions.items[0].id}"`
				});
				for (const le of lastEntries) {
					lastSessionEntries[le.exercise] = le.sets;
				}
			}
		} catch {
			// No previous sessions — that's fine
		}
	}

	return {
		session,
		entries,
		targets,
		lastSessionEntries
	};
};

export const actions: Actions = {
	finish: async ({ params }) => {
		const pb = await getPb();
		const session = await pb.collection('sessions').getOne(params.sessionId);
		const startTime = new Date(session.created).getTime();
		const durationMinutes = Math.round((Date.now() - startTime) / 60000);

		await pb.collection('sessions').update(params.sessionId, {
			duration_minutes: durationMinutes
		});

		redirect(303, '/log');
	}
};
