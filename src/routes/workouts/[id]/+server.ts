import { getPb } from '$lib/pocketbase/client';
import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ request, params }) => {
	const pb = await getPb();
	const body = await request.json();

	// Array = order updates
	if (Array.isArray(body)) {
		for (const { id, order } of body) {
			await pb.collection('workout_exercises').update(id, { order });
		}
		return json({ saved: body.length });
	}

	// Object with "tags" = workout-level update
	if ('tags' in body) {
		await pb.collection('workouts').update(params.id, { tags: body.tags });
		return json({ updated: params.id });
	}

	// Object with "id" = target update on a workout_exercise
	const { id, target_sets, target_reps, target_weight } = body;
	await pb.collection('workout_exercises').update(id, {
		target_sets,
		target_reps,
		target_weight
	});
	return json({ updated: id });
};

export const POST: RequestHandler = async ({ request, params }) => {
	const pb = await getPb();
	const { exercise, section } = await request.json();

	// Find max order in this workout
	const existing = await pb.collection('workout_exercises').getFullList({
		filter: `workout="${params.id}"`,
		sort: '-order',
		fields: 'order'
	});
	const nextOrder = existing.length > 0 ? (existing[0].order || 0) + 1 : 1;

	const record = await pb.collection('workout_exercises').create(
		{
			workout: params.id,
			exercise,
			section,
			order: nextOrder,
			target_sets: 0,
			target_reps: '',
			target_weight: '',
			notes: ''
		},
		{ expand: 'exercise' }
	);

	return json(record);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const pb = await getPb();
	const { workoutExerciseId } = await request.json();

	await pb.collection('workout_exercises').delete(workoutExerciseId);

	return json({ deleted: workoutExerciseId });
};
