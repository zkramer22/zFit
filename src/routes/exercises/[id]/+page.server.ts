import { getPb } from '$lib/pocketbase/client';
import { error, fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
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

export const actions: Actions = {
	addVideo: async ({ params, request }) => {
		const formData = await request.formData();
		const url = formData.get('url')?.toString()?.trim();

		if (!url) return fail(400, { error: 'URL is required' });

		// Validate it's a YouTube URL
		const ytMatch = url.match(
			/(?:youtu\.be\/|youtube\.com\/(?:.*[?&]v=|.*\/))([\w-]+)/
		);
		if (!ytMatch) return fail(400, { error: 'Please paste a valid YouTube URL' });

		const pb = await getPb();
		const exercise = await pb.collection('exercises').getOne<Exercise>(params.id);

		const videos = exercise.video_urls || [];
		videos.push({ url, title: '', thumbnail_url: '' });

		await pb.collection('exercises').update(params.id, { video_urls: videos });
	},

	removeVideo: async ({ params, request }) => {
		const formData = await request.formData();
		const index = Number(formData.get('index'));

		const pb = await getPb();
		const exercise = await pb.collection('exercises').getOne<Exercise>(params.id);

		const videos = exercise.video_urls || [];
		videos.splice(index, 1);

		await pb.collection('exercises').update(params.id, { video_urls: videos });
	},

	updateExercise: async ({ params, request }) => {
		const formData = await request.formData();
		const name = (formData.get('name') as string)?.trim();
		if (!name) return fail(400, { error: 'Name is required' });
		const category = (formData.get('category') as string) || 'strength';
		const description = (formData.get('description') as string) || '';
		const muscleGroups = formData.getAll('muscle_groups') as string[];

		const pb = await getPb();
		await pb.collection('exercises').update(params.id, {
			name,
			category,
			description,
			muscle_groups: muscleGroups
		});
	}
};
