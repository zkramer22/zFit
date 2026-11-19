import type { Measure, WeightUnit, SetData, WorkoutExercise, TargetFields } from './pocketbase/types';

export function emptySet(measure: Measure, loadUnit: WeightUnit): SetData {
	return {
		reps: null,
		load: null,
		load_unit: measure === 'weight' ? loadUnit : null,
		seconds: null,
		band: null,
		distance: null,
		distance_unit: null,
		notes: '',
		completed: false
	};
}

/** Prefilled sets for a new session entry, from a workout's targets. */
export function setsFromTarget(target: TargetFields, measure: Measure, loadUnit: WeightUnit): SetData[] {
	const reps = target.target_reps ? parseInt(target.target_reps, 10) || null : null;
	const distance = target.target_distance ? parseFloat(target.target_distance) || null : null;
	return Array.from({ length: target.target_sets || 1 }, () => ({
		...emptySet(measure, loadUnit),
		reps,
		load: measure === 'weight' ? target.target_load : null,
		seconds: measure === 'time' ? target.target_seconds : null,
		band: measure === 'band' ? target.target_band || null : null,
		distance,
		distance_unit: distance != null ? target.target_distance_unit : null
	}));
}

/** Workout targets taken from a logged entry's sets, e.g. when saving a session as a workout. */
export function targetFromSets(sets: SetData[]): TargetFields {
	const first = sets[0];
	return {
		target_sets: sets.length || 1,
		target_reps: first?.reps ? String(first.reps) : '',
		target_load: first?.load ?? null,
		target_seconds: first?.seconds ?? null,
		target_band: first?.band ?? '',
		target_distance: first?.distance ? String(first.distance) : '',
		target_distance_unit: first?.distance_unit ?? null
	};
}

export function targetOf(we: Partial<WorkoutExercise> | undefined): TargetFields {
	return {
		target_sets: we?.target_sets || 0,
		target_reps: we?.target_reps || '',
		// PocketBase stores an empty number field as 0
		target_load: we?.target_load || null,
		target_seconds: we?.target_seconds || null,
		target_band: we?.target_band || '',
		target_distance: we?.target_distance || '',
		target_distance_unit: we?.target_distance_unit ?? null
	};
}
