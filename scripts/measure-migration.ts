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
 * Exercises that get a load factor, which doubles the per-hand or per-side number for volume.
 * `halve` marks those logged as the total of both dumbbells or both sides, so their loads halve;
 * the rest were already logged per side.
 */
export const LOAD_FACTOR_SET: Record<string, { factor: 'pair' | 'each_side'; halve: boolean }> = {
	'Dumbbell Bench Press': { factor: 'pair', halve: true },
	'Dumbbell Row': { factor: 'each_side', halve: true },
	'Banded Fire Hydrants': { factor: 'each_side', halve: false },
	'Banded Side Step / Strafe': { factor: 'each_side', halve: false },
	'Banded Monster Walks': { factor: 'each_side', halve: false },
	'Banded Clamshells': { factor: 'each_side', halve: false },
	'Active Straight Leg Raise': { factor: 'each_side', halve: false },
	'Single Leg Glute Bridge': { factor: 'each_side', halve: false },
	'Single-Leg Calf Raise': { factor: 'each_side', halve: false },
	'Leg Press (Single Leg)': { factor: 'each_side', halve: false },
	'Single-Leg Balance Hold': { factor: 'each_side', halve: false },
	'Side Plank': { factor: 'each_side', halve: false },
	'Isometric hold - hip flexor leg lift': { factor: 'each_side', halve: false },
	'Side-Lying Straight Leg Lift': { factor: 'each_side', halve: false },
	'Cable Hip Abduction': { factor: 'each_side', halve: false },
	'Cable Hip Extension': { factor: 'each_side', halve: false },
	'Bird-Dog': { factor: 'each_side', halve: false },
	'Pallof Press': { factor: 'each_side', halve: false },
	'Reverse Lunge': { factor: 'each_side', halve: false },
	'Reverse step up': { factor: 'each_side', halve: false },
	'Standing Knee Drive': { factor: 'each_side', halve: false },
	'Hip hikes': { factor: 'each_side', halve: false },
	'Seated Internal Hip Rotation': { factor: 'each_side', halve: false },
	'Kettlebell Romanian Deadlift': { factor: 'each_side', halve: false }
};

/** Measures set by hand where history alone picks wrong: these carry weight, so they aren't bodyweight. */
export const MEASURE_SET: Record<string, Measure> = {
	'Balance Board Squats': 'weight',
	'Dead Bugs': 'weight',
	'Bird-Dog': 'weight'
};

/** Session entries of those exercises that were logged per dumbbell or per side after all, so they keep their loads. */
export const LOGGED_PER_HAND = new Set([
	'onz7rfnxmhtndn3', // Dumbbell Row, 2026-03-08: 25 each side
	'd2dzkh15blhyzbt', // Dumbbell Row, 2026-03-10: 25 each side
	'1om0t85b0xjhw4i' // Dumbbell Bench Press, 2026-04-19: a pair of 40s
]);

export function halveLoads(sets: SetData[]): SetData[] {
	return sets.map((s) => (s.load ? { ...s, load: s.load / 2 } : s));
}
