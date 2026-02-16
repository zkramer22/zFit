import { getPb } from '$lib/pocketbase/client';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// PATCH: auto-save session entries
export const PATCH: RequestHandler = async ({ request }) => {
	const pb = await getPb();
	const updates: Array<{
		id: string;
		sets: unknown[];
		rpe: number | null;
		pain_flag: boolean;
		notes: string;
	}> = await request.json();

	const results = [];
	for (const update of updates) {
		const result = await pb.collection('session_entries').update(update.id, {
			sets: update.sets,
			rpe: update.rpe,
			pain_flag: update.pain_flag,
			notes: update.notes
		});
		results.push(result.id);
	}

	return json({ saved: results });
};
