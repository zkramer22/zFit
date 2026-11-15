import type { Measure, SetData, TargetFields, WeightUnit } from '../pocketbase/types';

/** Load text for one set or target, e.g. "125 lb", "BW + 25 lb", "45 sec", "Red band". */
function amountText(
	measure: Measure,
	v: { load: number | null; loadUnit: WeightUnit | null; seconds: number | null; band: string | null }
): string {
	switch (measure) {
		case 'weight':
			return v.load != null ? `${v.load} ${v.loadUnit ?? 'lb'}` : '';
		case 'bodyweight':
			return v.load ? `BW + ${v.load} ${v.loadUnit ?? 'lb'}` : 'BW';
		case 'time':
			return v.seconds != null ? `${v.seconds} sec` : '';
		case 'band':
			return v.band ? `${v.band} band` : 'Band';
	}
}

/** Workout target summary, e.g. "3x12 @ 125 lb", "3x 45 sec", "3x12 BW" */
export function formatTarget(t: Partial<TargetFields>, measure: Measure, loadUnit: WeightUnit): string {
	const parts: string[] = [];
	if (t.target_sets) parts.push(`${t.target_sets}x`);
	if (t.target_reps) parts.push(t.target_reps);
	const amount = amountText(measure, {
		load: t.target_load || null,
		loadUnit,
		seconds: t.target_seconds || null,
		band: t.target_band || null
	});
	if (amount) {
		const joiner = measure === 'weight' || (measure === 'bodyweight' && t.target_load) || (measure === 'time' && t.target_reps) ? ' @ ' : ' ';
		parts.push(parts.length ? joiner + amount : amount);
	}
	if (t.target_distance && t.target_distance_unit) {
		parts.push(` ${t.target_distance} ${t.target_distance_unit}`);
	}
	return parts.join('').trim();
}

/** One set, e.g. "12 reps @ 125 lb", "45 sec", "12 reps @ Red band" */
export function formatSetData(s: SetData, measure: Measure): string {
	const parts: string[] = [];
	if (s.reps) parts.push(`${s.reps} reps`);
	const amount = amountText(measure, { load: s.load, loadUnit: s.load_unit, seconds: s.seconds, band: s.band });
	if (amount) parts.push(amount);
	if (s.distance != null && s.distance_unit) parts.push(`${s.distance} ${s.distance_unit}`);
	return parts.join(' @ ') || '—';
}

/** A list of sets, e.g. "12 reps @ 125 lb / 10 reps @ 135 lb" */
export function formatSets(sets: SetData[], measure: Measure): string {
	if (!sets?.length) return 'No sets';
	return sets.map((s) => formatSetData(s, measure)).join(' / ');
}

/** Compact summary of logged sets in target style, e.g. "3x12 BW" or "12/10/8 @ 135 lb" */
export function formatSetsSummary(sets: SetData[], measure: Measure): string {
	if (!sets?.length) return '';
	const first = sets[0];

	let repsPart: string;
	const allReps = sets.map((s) => s.reps);
	if (allReps.every((r) => r === allReps[0]) && allReps[0]) {
		repsPart = `${sets.length}x${allReps[0]}`;
	} else if (allReps.some((r) => r != null)) {
		repsPart = allReps.map((r) => r ?? '–').join('/');
	} else {
		repsPart = `${sets.length}x`;
	}

	const amount = amountText(measure, { load: first.load, loadUnit: first.load_unit, seconds: first.seconds, band: first.band });
	const joiner = measure === 'weight' || (measure === 'bodyweight' && first.load) || (measure === 'time' && first.reps) ? ' @ ' : ' ';
	let result = amount ? `${repsPart}${joiner}${amount}` : repsPart;
	if (first.distance != null && first.distance_unit) {
		result += ` ${first.distance} ${first.distance_unit}`;
	}
	return result;
}
