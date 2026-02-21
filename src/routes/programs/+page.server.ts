import { getPb } from '$lib/pocketbase/client';
import type { PageServerLoad, Actions } from './$types';
import type { Program, ProgramWorkout, Workout } from '$lib/pocketbase/types';

interface ProgramWorkoutExpanded extends ProgramWorkout {
	expand?: {
		workout?: Workout;
	};
}

export interface ProgramWithWorkouts extends Program {
	workouts: ProgramWorkoutExpanded[];
}

export const load: PageServerLoad = async () => {
	const pb = await getPb();

	const programs = await pb.collection('programs').getFullList<Program>({ sort: '-active,name' });

	const programsWithWorkouts: ProgramWithWorkouts[] = await Promise.all(
		programs.map(async (program) => {
			const workouts = await pb.collection('program_workouts').getFullList<ProgramWorkoutExpanded>({
				filter: `program="${program.id}"`,
				sort: 'day_number',
				expand: 'workout'
			});
			return { ...program, workouts };
		})
	);

	const allWorkouts = await pb.collection('workouts').getFullList<Workout>({ sort: 'name' });

	return { programs: programsWithWorkouts, allWorkouts };
};

export const actions: Actions = {
	createProgram: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const name = (data.get('name') as string)?.trim();
		if (!name) return;
		const description = (data.get('description') as string) || '';

		await pb.collection('programs').create({ name, description, active: false });
	},

	deleteProgram: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const programId = data.get('programId') as string;
		if (!programId) return;

		// Delete all program_workouts for this program first
		const pws = await pb.collection('program_workouts').getFullList({
			filter: `program="${programId}"`
		});
		for (const pw of pws) {
			await pb.collection('program_workouts').delete(pw.id);
		}

		await pb.collection('programs').delete(programId);
	},

	setActive: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const programId = data.get('programId') as string;
		if (!programId) return;

		// Deactivate all programs first
		const allPrograms = await pb.collection('programs').getFullList<Program>();
		for (const p of allPrograms) {
			if (p.active) {
				await pb.collection('programs').update(p.id, { active: false });
			}
		}

		// Activate the selected one
		await pb.collection('programs').update(programId, { active: true });
	},

	deactivate: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const programId = data.get('programId') as string;
		if (!programId) return;

		await pb.collection('programs').update(programId, { active: false });
	},

	addWorkout: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const programId = data.get('programId') as string;
		const workoutId = data.get('workoutId') as string;
		if (!programId || !workoutId) return;

		// Determine next day_number
		const existing = await pb.collection('program_workouts').getFullList({
			filter: `program="${programId}"`,
			sort: '-day_number'
		});
		const nextDay = existing.length > 0 ? (existing[0] as any).day_number + 1 : 1;

		await pb.collection('program_workouts').create({
			program: programId,
			workout: workoutId,
			day_number: nextDay
		});
	},

	removeWorkout: async ({ request }) => {
		const pb = await getPb();
		const data = await request.formData();
		const programWorkoutId = data.get('programWorkoutId') as string;
		if (!programWorkoutId) return;

		await pb.collection('program_workouts').delete(programWorkoutId);
	}
};
