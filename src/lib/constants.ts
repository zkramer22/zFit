export interface LabelValue {
	label: string;
	value: string;
}

export const CATEGORIES: LabelValue[] = [
	{ value: 'strength', label: 'Strength' },
	{ value: 'stability', label: 'Stability' },
	{ value: 'core', label: 'Core' },
	{ value: 'warmup', label: 'Warmup' },
	{ value: 'posterior_chain', label: 'Posterior Chain' }
];

export const CATEGORY_COLORS: Record<string, string> = {
	strength: 'bg-blue-100 text-blue-800',
	stability: 'bg-green-100 text-green-800',
	core: 'bg-purple-100 text-purple-800',
	warmup: 'bg-amber-100 text-amber-800',
	posterior_chain: 'bg-orange-100 text-orange-800'
};

export const MUSCLE_GROUPS: LabelValue[] = [
	{ value: 'quads', label: 'Quads' },
	{ value: 'glutes', label: 'Glutes' },
	{ value: 'hamstrings', label: 'Hamstrings' },
	{ value: 'hip_flexors', label: 'Hip Flexors' },
	{ value: 'calves', label: 'Calves' },
	{ value: 'core', label: 'Core' },
	{ value: 'back', label: 'Back' },
	{ value: 'shoulders', label: 'Shoulders' },
	{ value: 'adductors', label: 'Adductors' },
	{ value: 'abductors', label: 'Abductors' }
];

export const WORKOUT_TAGS: LabelValue[] = [
	{ value: 'upper body', label: 'Upper Body' },
	{ value: 'lower body', label: 'Lower Body' },
	{ value: 'full body', label: 'Full Body' },
	{ value: 'push', label: 'Push' },
	{ value: 'pull', label: 'Pull' },
	{ value: 'recovery', label: 'Recovery' },
	{ value: 'mobility', label: 'Mobility' },
	{ value: 'conditioning', label: 'Conditioning' }
];

/** Look up the display label for a given value from a LabelValue list. Falls back to the raw value. */
export function getLabel(list: LabelValue[], value: string): string {
	return list.find((item) => item.value === value)?.label ?? value;
}
