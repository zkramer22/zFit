import type { SetData, SetUnit, DistanceUnit } from '$lib/pocketbase/types';
import type { TrackedRow } from '$lib/live/merge';

export interface EntryState extends TrackedRow {
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
	targetValue: string;
	targetUnit: SetUnit;
	targetDistance: string;
	targetDistanceUnit: DistanceUnit | null;
	workoutNotes: string;
	lastSessionSets: SetData[];
	dirty: boolean;
}

/** The fields of an entry that a save writes. */
export interface SavedEntry {
	id: string;
	sets: SetData[];
	rpe: number | null;
	painFlag: boolean;
	notes: string;
}

export function savedFieldsKey(e: SavedEntry): string {
	return JSON.stringify([e.sets, e.rpe, e.painFlag, e.notes]);
}

/** Editing an entry means you want your version, so it also settles any conflict. */
function touch(entry: EntryState) {
	entry.dirty = true;
	entry.conflict = null;
}

function createSessionStore() {
	let entries = $state<EntryState[]>([]);
	let sessionId = $state<string>('');
	let workoutName = $state<string>('');
	let startTime = $state<number>(Date.now());
	let saving = $state<boolean>(false);

	// Guided mode state
	let guidedMode = $state(false);
	let guidedExerciseIndex = $state(0);
	let guidedSetIndex = $state(0);

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

	const allSections = $derived(() => {
		const bySection = entriesBySection();
		return sectionOrder.map(s => ({ name: s, entries: bySection[s] || [] }));
	});

	// Entries waiting to save. One flagged as changed elsewhere waits for you
	// to pick a version: "Use theirs", or edit it again to keep yours.
	const dirtyEntries = $derived(() => entries.filter(e => e.dirty && !e.saving && !e.conflict));

	const elapsedMinutes = $derived(() => Math.floor((Date.now() - startTime) / 60000));

	// Flat list of entries in display order for guided mode navigation
	const flatEntries = $derived(() => {
		return orderedSections().flatMap(s => s.entries);
	});

	const currentGuidedEntry = $derived(() => {
		const flat = flatEntries();
		return flat[guidedExerciseIndex] || null;
	});

	const guidedPosition = $derived(() => {
		const flat = flatEntries();
		const entry = flat[guidedExerciseIndex];
		if (!entry) return { exercise: 0, totalExercises: 0, set: 0, totalSets: 0 };
		return {
			exercise: guidedExerciseIndex + 1,
			totalExercises: flat.length,
			set: guidedSetIndex + 1,
			totalSets: entry.targetSets || entry.sets.length || 1
		};
	});

	return {
		get entries() { return entries; },
		get sessionId() { return sessionId; },
		get workoutName() { return workoutName; },
		get startTime() { return startTime; },
		get saving() { return saving; },
		get entriesBySection() { return entriesBySection; },
		get orderedSections() { return orderedSections; },
		get allSections() { return allSections; },
		get dirtyEntries() { return dirtyEntries; },
		get elapsedMinutes() { return elapsedMinutes; },
		get guidedMode() { return guidedMode; },
		get guidedExerciseIndex() { return guidedExerciseIndex; },
		get guidedSetIndex() { return guidedSetIndex; },
		get currentGuidedEntry() { return currentGuidedEntry; },
		get guidedPosition() { return guidedPosition; },
		get flatEntries() { return flatEntries; },
		set saving(v: boolean) { saving = v; },

		init(
			id: string,
			name: string,
			entryData: EntryState[]
		) {
			sessionId = id;
			workoutName = name;
			entries = entryData;
			startTime = Date.now();
			guidedMode = false;
			guidedExerciseIndex = 0;
			guidedSetIndex = 0;
		},

		toggleGuidedMode() {
			guidedMode = !guidedMode;
			if (guidedMode) {
				guidedExerciseIndex = 0;
				guidedSetIndex = 0;
			}
		},

		advanceGuided() {
			const flat = flatEntries();
			const entry = flat[guidedExerciseIndex];
			if (!entry) return;

			const maxSets = entry.targetSets || entry.sets.length;
			if (guidedSetIndex < maxSets - 1) {
				guidedSetIndex++;
			} else if (guidedExerciseIndex < flat.length - 1) {
				guidedExerciseIndex++;
				guidedSetIndex = 0;
			}
			// else: at the end, do nothing
		},

		guidedPrevious() {
			if (guidedSetIndex > 0) {
				guidedSetIndex--;
			} else if (guidedExerciseIndex > 0) {
				guidedExerciseIndex--;
				const flat = flatEntries();
				const prevEntry = flat[guidedExerciseIndex];
				guidedSetIndex = Math.max(0, (prevEntry?.targetSets || prevEntry?.sets.length || 1) - 1);
			}
		},

		guidedNext() {
			const flat = flatEntries();
			if (guidedExerciseIndex < flat.length - 1) {
				guidedExerciseIndex++;
				guidedSetIndex = 0;
			}
		},

		guidedSkip() {
			const flat = flatEntries();
			if (guidedExerciseIndex < flat.length - 1) {
				guidedExerciseIndex++;
				guidedSetIndex = 0;
			}
		},

		addSet(entryId: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;

			const lastSet = entry.sets[entry.sets.length - 1];
			const newSet: SetData = lastSet
				? { ...lastSet, notes: '', completed: false }
				: { reps: null, value: null, unit: entry.targetUnit || 'lb', distance: null, distance_unit: null, notes: '', completed: false };

			entry.sets = [...entry.sets, newSet];
			touch(entry);
		},

		duplicateSet(entryId: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry || entry.sets.length === 0) return;

			const lastSet = entry.sets[entry.sets.length - 1];
			entry.sets = [...entry.sets, { ...lastSet, completed: false }];
			touch(entry);
		},

		updateSet(entryId: string, setIndex: number, field: keyof SetData, value: unknown) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry || !entry.sets[setIndex]) return;

			entry.sets = entry.sets.map((s, i) =>
				i === setIndex ? { ...s, [field]: value } : s
			);
			touch(entry);
		},

		removeSet(entryId: string, setIndex: number) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;

			entry.sets = entry.sets.filter((_, i) => i !== setIndex);
			touch(entry);
		},

		setRpe(entryId: string, rpe: number) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;
			entry.rpe = rpe;
			touch(entry);
		},

		togglePainFlag(entryId: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;
			entry.painFlag = !entry.painFlag;
			touch(entry);
		},

		setEntryNotes(entryId: string, notes: string) {
			const entry = entries.find(e => e.id === entryId);
			if (!entry) return;
			entry.notes = notes;
			touch(entry);
		},

		/** Swaps in a merged list, e.g. after live changes, without resetting guided mode or the clock. */
		replaceEntries(next: EntryState[]) {
			entries = next;
		},

		addEntry(entry: EntryState) {
			entries = [...entries, entry];
		},

		removeEntry(entryId: string) {
			entries = entries.filter(e => e.id !== entryId);
		},

		/** Flags entries as mid-save so live changes leave them alone until the save returns. */
		markSaving(ids: string[]) {
			for (const entry of entries) {
				if (ids.includes(entry.id)) entry.saving = true;
			}
		},

		/**
		 * Records a finished save. The entry's base becomes the server's new
		 * version. It's marked clean only if it wasn't edited again while the
		 * save was in flight; otherwise it stays dirty for the next save.
		 * `newId` is set when a save had to recreate an entry deleted elsewhere.
		 */
		markSaved(saved: SavedEntry, result: { id: string; updated: string }) {
			const entry = entries.find((e) => e.id === saved.id);
			if (!entry) return;
			entry.id = result.id;
			entry.saving = false;
			entry.baseUpdated = result.updated;
			entry.conflict = null;
			if (savedFieldsKey(entry) === savedFieldsKey(saved)) entry.dirty = false;
		},

		/** Clears the mid-save flag after a failed save; the entry stays dirty. */
		markSaveFailed(ids: string[]) {
			for (const entry of entries) {
				if (ids.includes(entry.id)) entry.saving = false;
			}
		}
	};
}

export const sessionStore = createSessionStore();
