import { getPb } from '$lib/pocketbase/client';
import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import type { Exercise, SessionEntry, Session } from '$lib/pocketbase/types';

export const load: PageServerLoad = async ({ params }) => {
	const pb = await getPb();

	let exercise: Exercise;
	try {
		exercise = await pb.collection('exercises').getOne<Exercise>(params.id);
	} catch {
		error(404, 'Exercise not found');
	}

	// Get recent session entries for this exercise (last 10)
	let recentHistory: Array<{
		date: string;
		sets: SessionEntry['sets'];
		rpe: number | null;
		painFlag: boolean;
		notes: string;
	}> = [];

	try {
		const entries = await pb.collection('session_entries').getList<SessionEntry>(1, 10, {
			filter: `exercise="${params.id}"`,
			sort: '-created'
		});

		// Fetch associated session dates
		const sessionIds = [...new Set(entries.items.map((e) => e.session))];
		const sessions: Record<string, Session> = {};
		for (const sid of sessionIds) {
			try {
				sessions[sid] = await pb.collection('sessions').getOne<Session>(sid);
			} catch {
				// skip
			}
		}

		recentHistory = entries.items.map((entry) => ({
			date: sessions[entry.session]?.date || entry.created,
			sets: entry.sets,
			rpe: entry.rpe,
			painFlag: entry.pain_flag,
			notes: entry.notes
		}));
	} catch {
		// No history yet
	}

	return { exercise, recentHistory };
};
