import { getPb } from '$lib/pocketbase/client';
import { error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type {
	SessionExpanded,
	SessionEntryExpanded,
	WorkoutExercise,
	SessionEntry,
	SetData
} from '$lib/pocketbase/types';

export const load: PageServerLoad = async ({ params }) => {
	const pb = await getPb();

	// Load session with workout expansion
	let session: SessionExpanded;
	try {
		session = await pb.collection('sessions').getOne<SessionExpanded>(params.sessionId, {
			expand: 'workout'
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

	// Load workout exercise targets if this session has a workout
	let targets: Record<string, WorkoutExercise> = {};
	if (session.workout) {
		const workoutExercises = await pb.collection('workout_exercises').getFullList<WorkoutExercise>({
			filter: `workout="${session.workout}"`,
			sort: 'order'
		});
		for (const we of workoutExercises) {
			targets[we.exercise] = we;
		}
	}

	// Load last session data for the same workout (for reference)
	let lastSessionEntries: Record<string, SetData[]> = {};
	if (session.workout) {
		try {
			const lastSessions = await pb.collection('sessions').getList(1, 1, {
				filter: `workout="${session.workout}" && id!="${session.id}"`,
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
