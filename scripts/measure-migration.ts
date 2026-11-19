import type { Measure, SetData, WeightUnit } from '../src/lib/pocketbase/types.ts';

/** A set as logged before exercises had a measure: one value whose meaning came from its unit. */
export interface LegacySet {
	reps: number | null;
	value: number | null;
	unit: 'lb' | 'kg' | 'sec' | 'bw' | 'band';
	distance: number | null;
	distance_unit: SetData['distance_unit'];
	notes?: string;
	completed?: boolean;
}

export function isLegacySet(s: object): s is LegacySet {
	return 'unit' in s && !('load' in s);
}

export function migrateSet(s: LegacySet): SetData {
	const isWeight = s.unit === 'lb' || s.unit === 'kg';
	return {
		reps: s.reps,
		load: isWeight ? s.value : null,
		load_unit: isWeight ? (s.unit as WeightUnit) : null,
		seconds: s.unit === 'sec' ? s.value : null,
		band: null,
		distance: s.distance,
		distance_unit: s.distance_unit,
		notes: s.notes ?? '',
		completed: s.completed ?? false
	};
}

const BODYWEIGHT_CATEGORIES = ['bodyweight', 'warmup', 'core', 'pt', 'stability'];

/**
 * Picks an exercise's measure from how it was logged. Weight and time units only
 * count when a value was entered, since 'lb' was the default on every new set.
 */
export function inferMeasure(units: { unit: string; hasValue: boolean }[], category: string): Measure {
	const counts: Record<Measure, number> = { weight: 0, bodyweight: 0, time: 0, band: 0 };
	for (const { unit, hasValue } of units) {
		if ((unit === 'lb' || unit === 'kg') && hasValue) counts.weight++;
		else if (unit === 'sec' && hasValue) counts.time++;
		else if (unit === 'bw') counts.bodyweight++;
		else if (unit === 'band') counts.band++;
	}
	const best = (Object.entries(counts) as [Measure, number][]).sort((a, b) => b[1] - a[1])[0];
	if (best[1] > 0) return best[0];
	return BODYWEIGHT_CATEGORIES.includes(category) ? 'bodyweight' : 'weight';
}

export function migrateTarget(value: string, unit: string): { target_load: number | null; target_seconds: number | null } {
	const n = value ? parseFloat(value) : NaN;
	const num = Number.isFinite(n) ? n : null;
	return {
		target_load: unit === 'lb' || unit === 'kg' ? num : null,
		target_seconds: unit === 'sec' ? num : null
	};
}

/**
 * Exercises whose loads were logged as the total of both dumbbells or both sides. They move to a
 * load factor, which doubles the per-hand or per-side number for volume, so their logged loads halve.
 */
export const TOTAL_LOGGED: Record<string, 'pair' | 'each_side'> = {
	'Dumbbell Bench Press': 'pair',
	'Dumbbell Row': 'each_side'
};

export function halveLoads(sets: SetData[]): SetData[] {
	return sets.map((s) => (s.load ? { ...s, load: s.load / 2 } : s));
}
