import { getPb } from '$lib/pocketbase/client';
import { redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import type { Program, ProgramWorkout, Workout, WorkoutExercise } from '$lib/pocketbase/types';

interface ProgramWorkoutExpanded extends ProgramWorkout {
	expand?: {
		workout?: Workout;
	};
}

export const load: PageServerLoad = async () => {
	const pb = await getPb();

	// Load active program (if any)
	let activeProgram: Program | null = null;
	let programWorkouts: ProgramWorkoutExpanded[] = [];
	let suggestedDayNumber: number | null = null;

	try {
		activeProgram = await pb.collection('programs').getFirstListItem<Program>('active=true');
	} catch {
		// No active program
	}

	if (activeProgram) {
		programWorkouts = await pb.collection('program_workouts').getFullList<ProgramWorkoutExpanded>({
			filter: `program="${activeProgram.id}"`,
			sort: 'day_number',
			expand: 'workout'
		});

		// Determine next workout by finding the last session tagged with this program
		try {
			const lastSession = await pb.collection('sessions').getList(1, 1, {
				filter: `program="${activeProgram.id}"`,
				sort: '-date,-created'
			});

			if (lastSession.items.length > 0) {
				const lastWorkoutId = lastSession.items[0].workout;
				const lastPW = programWorkouts.find(pw => pw.workout === lastWorkoutId);
				if (lastPW) {
					suggestedDayNumber = (lastPW.day_number % programWorkouts.length) + 1;
				} else {
					suggestedDayNumber = 1;
				}
			} else {
				suggestedDayNumber = 1;
			}
		} catch {
			suggestedDayNumber = 1;
		}
	}

	// Load all workouts for the "pick any" option
	const allWorkouts = await pb.collection('workouts').getFullList<Workout>({ sort: 'name' });

	return { activeProgram, programWorkouts, suggestedDayNumber, allWorkouts };
};

export const actions: Actions = {
	start: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const workoutId = data.get('workoutId') as string | null;
		const programId = data.get('programId') as string | null;

		// Create the session
		const session = await pb.collection('sessions').create({
			workout: workoutId || '',
			program: programId || '',
			date: new Date().toISOString().split('T')[0],
			notes: '',
			duration_minutes: 0
		});

		// If a workout was selected, pre-create session entries from workout_exercises
		if (workoutId) {
			const workoutExercises = await pb.collection('workout_exercises').getFullList<WorkoutExercise>({
				filter: `workout="${workoutId}"`,
				sort: 'order'
			});

			for (const we of workoutExercises) {
				await pb.collection('session_entries').create({
					session: session.id,
					exercise: we.exercise,
					order: we.order,
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
