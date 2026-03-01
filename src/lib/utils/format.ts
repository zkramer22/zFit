import type { WorkoutExercise, SetData } from '$lib/pocketbase/types';

/** Format a workout exercise target summary, e.g. "3x12 @ 125 lb" */
export function formatTarget(we: Partial<WorkoutExercise>): string {
	const parts: string[] = [];
	if (we.target_sets) parts.push(`${we.target_sets}x`);
	if (we.target_reps) parts.push(we.target_reps);
	if (we.target_value && we.target_unit && we.target_unit !== 'bw' && we.target_unit !== 'band') {
		parts.push(`@ ${we.target_value} ${we.target_unit}`);
	} else if (we.target_unit === 'bw') {
		parts.push('BW');
	} else if (we.target_unit === 'band') {
		parts.push('Band');
	}
	if (we.target_distance && we.target_distance_unit) {
		parts.push(`${we.target_distance} ${we.target_distance_unit}`);
	}
	return parts.join('') || '';
}

/** Format a single set for display, e.g. "12 reps @ 125 lb" */
export function formatSetData(s: SetData): string {
	const parts: string[] = [];
	if (s.reps) parts.push(`${s.reps} reps`);
	if (s.unit === 'bw') {
		parts.push('BW');
	} else if (s.unit === 'band') {
		parts.push('Band');
	} else if (s.value != null) {
		parts.push(`${s.value} ${s.unit}`);
	}
	if (s.distance != null && s.distance_unit) {
		parts.push(`${s.distance} ${s.distance_unit}`);
	}
	return parts.join(' @ ') || '—';
}

/** Format a list of sets for display, e.g. "12 reps @ 125 lb / 10 reps @ 135 lb" */
export function formatSets(sets: SetData[]): string {
	if (!sets?.length) return 'No sets';
	return sets.map(formatSetData).join(' / ');
}
