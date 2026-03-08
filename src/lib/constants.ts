export interface LabelValue {
	label: string;
	value: string;
}

export const CATEGORIES: LabelValue[] = [
	{ value: 'bodyweight', label: 'Bodyweight' },
	{ value: 'core', label: 'Core' },
	{ value: 'posterior_chain', label: 'Posterior Chain' },
	{ value: 'pt', label: 'PT' },
	{ value: 'stability', label: 'Stability' },
	{ value: 'strength', label: 'Strength' },
	{ value: 'warmup', label: 'Warmup' }
];

export const CATEGORY_COLORS: Record<string, string> = {
	strength: 'bg-blue-100 text-blue-800',
	stability: 'bg-green-100 text-green-800',
	core: 'bg-purple-100 text-purple-800',
	warmup: 'bg-amber-100 text-amber-800',
	posterior_chain: 'bg-orange-100 text-orange-800',
	pt: 'bg-pink-100 text-pink-800',
	bodyweight: 'bg-teal-100 text-teal-800'
};

export const MUSCLE_GROUPS: LabelValue[] = [
	{ value: 'abductors', label: 'Abductors' },
	{ value: 'adductors', label: 'Adductors' },
	{ value: 'back', label: 'Back' },
	{ value: 'biceps', label: 'Biceps' },
	{ value: 'calves', label: 'Calves' },
	{ value: 'chest', label: 'Chest' },
	{ value: 'core', label: 'Core' },
	{ value: 'forearms', label: 'Forearms' },
	{ value: 'glutes', label: 'Glutes' },
	{ value: 'hamstrings', label: 'Hamstrings' },
	{ value: 'hip_flexors', label: 'Hip Flexors' },
	{ value: 'lats', label: 'Lats' },
	{ value: 'quads', label: 'Quads' },
	{ value: 'shoulders', label: 'Shoulders' },
	{ value: 'triceps', label: 'Triceps' }
];

export const WORKOUT_TAGS: LabelValue[] = [
	{ value: 'conditioning', label: 'Conditioning' },
	{ value: 'full body', label: 'Full Body' },
	{ value: 'lower body', label: 'Lower Body' },
	{ value: 'mobility', label: 'Mobility' },
	{ value: 'pull', label: 'Pull' },
	{ value: 'push', label: 'Push' },
	{ value: 'recovery', label: 'Recovery' },
	{ value: 'upper body', label: 'Upper Body' }
];

export const SET_UNITS: LabelValue[] = [
	{ value: 'lb', label: 'lb' },
	{ value: 'kg', label: 'kg' },
	{ value: 'sec', label: 'sec' },
	{ value: 'bw', label: 'BW' },
	{ value: 'band', label: 'Band' }
];

export const DISTANCE_UNITS: LabelValue[] = [
	{ value: 'yds', label: 'yds' },
	{ value: 'ft', label: 'ft' },
	{ value: 'm', label: 'm' }
];

/** Look up the display label for a given value from a LabelValue list. Falls back to the raw value. */
export function getLabel(list: LabelValue[], value: string): string {
	return list.find((item) => item.value === value)?.label ?? value;
}
