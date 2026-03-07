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

/** Compact summary of actual sets in target-style format, e.g. "3x12BW" or "12/10/8 @ 135 lb" */
export function formatSetsSummary(sets: SetData[]): string {
	if (!sets?.length) return '';
	const unit = sets[0].unit || 'lb';
	const allReps = sets.map(s => s.reps);
	const allSameReps = allReps.every(r => r === allReps[0]);

	let repsPart: string;
	if (allSameReps && allReps[0]) {
		repsPart = `${sets.length}x${allReps[0]}`;
	} else if (allReps.some(r => r != null)) {
		repsPart = allReps.map(r => r ?? '–').join('/');
	} else {
		repsPart = `${sets.length}x`;
	}

	let unitPart: string;
	if (unit === 'bw') {
		unitPart = 'BW';
	} else if (unit === 'band') {
		unitPart = 'Band';
	} else if (sets[0].value != null) {
		unitPart = `@ ${sets[0].value} ${unit}`;
	} else {
		unitPart = unit;
	}

	let result = `${repsPart} ${unitPart}`.trim();
	if (sets[0].distance != null && sets[0].distance_unit) {
		result += ` ${sets[0].distance} ${sets[0].distance_unit}`;
	}
	return result;
}
