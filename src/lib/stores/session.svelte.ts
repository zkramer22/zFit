import type { SessionEntryExpanded, SetData } from '$lib/pocketbase/types';

export interface EntryState {
	id: string;
	exerciseId: string;
	exerciseName: string;
	section: string;
	order: number;
	sets: SetData[];
	rpe: number | null;
	painFlag: boolean;
	notes: string;
	targetSets: number;
	targetReps: string;
	targetWeight: string;
	programNotes: string;
	lastSessionSets: SetData[];
	dirty: boolean;
}

function createSessionStore() {
	let entries = $state<EntryState[]>([]);
	let sessionId = $state<string>('');
	let programName = $state<string>('');
	let startTime = $state<number>(Date.now());
	let saving = $state<boolean>(false);

	const entriesBySection = $derived(() => {
		const sections: Record<string, EntryState[]> = {};
		for (const entry of entries) {
			const s = entry.section || 'main';
			if (!sections[s]) sections[s] = [];
			sections[s].push(entry);
		}
		return sections;
	});

	const sectionOrder = ['warmup', 'main', 'core', 'cooldown'];

	const orderedSections = $derived(() => {
		const bySection = entriesBySection();
		return sectionOrder
			.filter(s => bySection[s]?.length)
			.map(s => ({ name: s, entries: bySection[s] }));
	});

	const dirtyEntries = $derived(() => entries.filter(e => e.dirty));

	const elapsedMinutes = $derived(() => Math.floor((Date.now() - startTime) / 60000));

	return {
		get entries() { return entries; },
		get sessionId() { return sessionId; },
		get programName() { return programName; },
		get startTime() { return startTime; },
		get saving() { return saving; },
		get entriesBySection() { return entriesBySection; },
		get orderedSections() { return orderedSections; },
		get dirtyEntries() { return dirtyEntries; },
		get elapsedMinutes() { return elapsedMinutes; },
		set saving(v: boolean) { saving = v; },

		init(
			id: string,
			name: string,
			entryData: EntryState[]
		) {
			sessionId = id;
			programName = name;
			entries = entryData;
			startTime = Date.now();
		},

		addSet(entryId: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;

			const lastSet = entry.sets[entry.sets.length - 1];
			const newSet: SetData = lastSet
				? { ...lastSet, notes: '' }
				: { reps: null, weight: null, weight_unit: 'lb', duration_sec: null, notes: '' };

			entry.sets = [...entry.sets, newSet];
			entry.dirty = true;
		},

		updateSet(entryId: string, setIndex: number, field: keyof SetData, value: unknown) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry || !entry.sets[setIndex]) return;

			entry.sets = entry.sets.map((s, i) =>
				i === setIndex ? { ...s, [field]: value } : s
			);
			entry.dirty = true;
		},

		removeSet(entryId: string, setIndex: number) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;

			entry.sets = entry.sets.filter((_, i) => i !== setIndex);
			entry.dirty = true;
		},

		setRpe(entryId: string, rpe: number) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;
			entry.rpe = rpe;
			entry.dirty = true;
		},

		togglePainFlag(entryId: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;
			entry.painFlag = !entry.painFlag;
			entry.dirty = true;
		},

		setEntryNotes(entryId: string, notes: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;
			entry.notes = notes;
			entry.dirty = true;
		},

		markClean(entryIds: string[]) {
			for (const entry of entries) {
				if (entryIds.includes(entry.id)) {
					entry.dirty = false;
				}
			}
		}
	};
}

export const sessionStore = createSessionStore();
