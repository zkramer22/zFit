<script lang="ts">
	import { navigate, route } from 'sv-router/generated';
	import { blockNavigation } from 'sv-router';
	import { untrack } from 'svelte';
	import { pb, currentUserId } from '$lib/pocketbase/client';
	import { workoutExerciseCache } from '$lib/stores/workoutExerciseCache.svelte';
	import { sessionCache } from '$lib/stores/sessionCache.svelte';
	import { createLiveQuery } from '$lib/live/query.svelte';
	import { mergeTracked, takeTheirs } from '$lib/live/merge';
	import { ClientResponseError } from 'pocketbase';
	import ConflictNotice from '$lib/components/ConflictNotice.svelte';
	import type { SessionExpanded, SessionEntry, SessionEntryExpanded, WorkoutExerciseExpanded, SetData } from '$lib/pocketbase/types';
	import { useHeader } from '$lib/header/header.svelte';
	import Button from '$lib/components/Button.svelte';
	import { Check, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import SessionExerciseCard from '$lib/components/SessionExerciseCard.svelte';
	import RestTimer from '$lib/components/RestTimer.svelte';
	import { sessionStore, type EntryState, type SavedEntry } from '$lib/stores/session.svelte';
	import { restTimerStore } from '$lib/stores/restTimer.svelte';
	import { countdownTimerStore } from '$lib/stores/countdownTimer.svelte';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { exerciseCache } from '$lib/stores/exerciseCache.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import ExerciseListItem from '$lib/components/ExerciseListItem.svelte';
	import type { Exercise } from '$lib/pocketbase/types';

	let expandedEntry = $state<string | null>(null);
	let saved = $state(false);
	let editingHistory = $state(false);
	let sessionNotes = $state('');
	let notesSaveTimer: ReturnType<typeof setTimeout> | null = null;

	const sectionLabels: Record<string, string> = {
		warmup: 'Warm-Up',
		main: 'Main Block',
		core: 'Core',
		cooldown: 'Cooldown'
	};

	function toggleExpanded(entryId: string) {
		expandedEntry = expandedEntry === entryId ? null : entryId;
	}

	const sessionId = $derived(route.params.sessionId!);

	// A session started just before navigating here may not have reached the
	// sessions store yet, so fetch it directly rather than wait.
	let fetchedSession = $state<SessionExpanded | null>(null);
	const session = $derived(sessionCache.getById(sessionId) ?? fetchedSession);
	const isCompleted = $derived(session?.completed === true);
	const readonly = $derived(isCompleted && !editingHistory);
	$effect(() => {
		const id = sessionId;
		untrack(() => {
			fetchedSession = null;
			if (sessionCache.getById(id)) return;
			pb.collection('sessions')
				.getOne<SessionExpanded>(id, { expand: 'workout' })
				.then((s) => { if (id === sessionId) fetchedSession = s; })
				.catch((err) => console.error('Failed to load session:', err));
		});
	});

	const entriesQuery = createLiveQuery<SessionEntryExpanded>(() => ({
		collection: 'session_entries',
		filter: pb.filter('session = {:id}', { id: sessionId }),
		sort: 'order',
		expand: 'exercise'
	}));

	// "Last time" numbers come from the most recent other session of the same workout.
	const lastSession = $derived(
		session?.workout ? sessionCache.items.find((s) => s.workout === session.workout && s.id !== session.id) : undefined
	);
	const lastQuery = createLiveQuery<SessionEntry>(() =>
		lastSession
			? { collection: 'session_entries', filter: pb.filter('session = {:id}', { id: lastSession.id }), sort: 'order' }
			: null
	);

	const loading = $derived(!session || entriesQuery.status === 'loading');

	function toEntryState(
		entry: SessionEntryExpanded,
		targets: Map<string, WorkoutExerciseExpanded>,
		lastSets: Map<string, SetData[]>,
		current: EntryState | undefined
	): EntryState {
		const target = targets.get(entry.exercise);
		return {
			id: entry.id,
			exerciseId: entry.exercise,
			exerciseName: entry.expand?.exercise?.name || 'Unknown Exercise',
			// Entries added mid-session have no target; keep the section they were added to.
			section: target?.section || current?.section || 'main',
			order: entry.order,
			sets: (entry.sets || []).map((s) => ({ ...s, completed: s.completed ?? false })),
			rpe: entry.rpe,
			painFlag: entry.pain_flag,
			notes: entry.notes || '',
			targetSets: target?.target_sets || 0,
			targetReps: target?.target_reps || '',
			targetValue: target?.target_value || '',
			targetUnit: target?.target_unit || 'lb',
			targetDistance: target?.target_distance || '',
			targetDistanceUnit: target?.target_distance_unit || null,
			workoutNotes: target?.notes || '',
			lastSessionSets: lastSets.get(entry.exercise) || [],
			dirty: false,
			saving: false,
			baseUpdated: entry.updated,
			conflict: null
		};
	}

	/** The server's entries for this session, in the shape the logging store uses. */
	function serverEntryStates(sess: SessionExpanded, current: Map<string, EntryState>): EntryState[] {
		const targets = new Map(
			workoutExerciseCache.items.filter((we) => we.workout === sess.workout).map((we) => [we.exercise, we])
		);
		const lastSets = new Map(lastQuery.items.map((e) => [e.exercise, e.sets || []]));
		return entriesQuery.items.map((entry) => toEntryState(entry, targets, lastSets, current.get(entry.id)));
	}

	// Keeps the logging store in step with the server: entries you haven't
	// touched follow live changes, entries with unsaved sets keep yours and
	// are flagged if the server's copy changed or was deleted.
	$effect(() => {
		const sess = session;
		if (!sess || entriesQuery.status === 'loading') return;
		// Read what the merge depends on so it reruns when any of it changes.
		void entriesQuery.items;
		void lastQuery.items;
		void workoutExerciseCache.items;

		untrack(() => {
			const isNewSession = sessionStore.sessionId !== sess.id;
			const current = new Map(isNewSession ? [] : sessionStore.entries.map((e) => [e.id, e]));
			const fresh = serverEntryStates(sess, current);
			if (isNewSession) {
				sessionStore.init(sess.id, sess.expand?.workout?.name || '', fresh);
				sessionNotes = sess.notes || '';
			} else {
				sessionStore.replaceEntries(mergeTracked(sessionStore.entries, fresh));
			}
		});
	});

	function useTheirs(entryId: string) {
		if (!session) return;
		const current = new Map(sessionStore.entries.map((e) => [e.id, e]));
		sessionStore.replaceEntries(takeTheirs(sessionStore.entries, serverEntryStates(session, current), entryId));
	}

	// Session notes follow live changes unless you're mid-edit.
	$effect(() => {
		const notes = session?.notes ?? '';
		untrack(() => {
			if (!notesSaveTimer && sessionStore.sessionId === session?.id) sessionNotes = notes;
		});
	});

	// Immediate auto-save with minimum "Saving" display time
	const MIN_SAVING_MS = 600;
	let saveInFlight = false;

	/** Saves one entry. One deleted elsewhere while you were editing it is brought back, since saving keeps yours. */
	async function saveEntry(e: SavedEntry): Promise<{ id: string; updated: string }> {
		const fields = { sets: e.sets, rpe: e.rpe, pain_flag: e.painFlag, notes: e.notes };
		try {
			return await pb.collection('session_entries').update(e.id, fields);
		} catch (err) {
			const entry = sessionStore.entries.find((x) => x.id === e.id);
			if (!(err instanceof ClientResponseError && err.status === 404) || !entry || !session) throw err;
			return await pb.collection('session_entries').create({
				user: currentUserId(),
				session: session.id,
				exercise: entry.exerciseId,
				order: entry.order,
				...fields
			});
		}
	}

	/** `includeConflicts` saves entries flagged as changed elsewhere too, keeping yours, e.g. when leaving the page. */
	async function flushSave(includeConflicts = false) {
		const toSave = sessionStore.entries.filter((e) => e.dirty && !e.saving && (includeConflicts || !e.conflict));
		if (toSave.length === 0) return;
		if (saveInFlight) return;

		saveInFlight = true;
		sessionStore.saving = true;
		saved = false;
		const startTime = Date.now();
		// Copy what's being saved so edits made during the save aren't marked clean.
		const snapshot: SavedEntry[] = toSave.map((e) => ({
			id: e.id,
			sets: $state.snapshot(e.sets),
			rpe: e.rpe,
			painFlag: e.painFlag,
			notes: e.notes
		}));
		sessionStore.markSaving(snapshot.map((e) => e.id));
		try {
			for (const e of snapshot) {
				sessionStore.markSaved(e, await saveEntry(e));
			}
			// Ensure "Saving" shows for at least MIN_SAVING_MS
			const elapsed = Date.now() - startTime;
			if (elapsed < MIN_SAVING_MS) {
				await new Promise((r) => setTimeout(r, MIN_SAVING_MS - elapsed));
			}
			saved = true;
		} catch (err) {
			console.error('Auto-save failed:', err);
			sessionStore.markSaveFailed(snapshot.map((e) => e.id));
		} finally {
			sessionStore.saving = false;
			saveInFlight = false;
		}
		// Edits made during this save were skipped by the in-flight guard; save them now.
		if (saved && sessionStore.dirtyEntries().length > 0) await flushSave();
	}

	$effect(() => {
		if (readonly) return;
		const dirty = sessionStore.dirtyEntries();
		if (dirty.length === 0) return;
		flushSave();
	});

	// Flush any pending saves before navigating away (or before tab close)
	$effect(() => blockNavigation({
		async onNavigate() {
			await flushSave(true);
			if (notesSaveTimer) {
				clearTimeout(notesSaveTimer);
				notesSaveTimer = null;
				if (session) await pb.collection('sessions').update(session.id, { notes: sessionNotes });
			}
			return true;
		},
		beforeUnload() {
			// Sync only — fire-and-forget the save attempt
			flushSave(true);
			if (notesSaveTimer && session) {
				clearTimeout(notesSaveTimer);
				notesSaveTimer = null;
				pb.collection('sessions').update(session.id, { notes: sessionNotes });
			}
			return true;
		}
	}));

	function handleNotesInput() {
		if (notesSaveTimer) clearTimeout(notesSaveTimer);
		notesSaveTimer = setTimeout(async () => {
			notesSaveTimer = null;
			if (!session) return;
			await pb.collection('sessions').update(session.id, { notes: sessionNotes });
		}, 1000);
	}

	let addingToSection = $state<string | null>(null);
	let drawerSearch = $state('');

	function availableExercises(): Exercise[] {
		const q = drawerSearch.toLowerCase();
		return exerciseCache.items.filter(ex => {
			if (!q) return true;
			return ex.name.toLowerCase().includes(q) ||
				ex.muscle_groups?.some((mg: string) => mg.toLowerCase().includes(q));
		}).sort((a, b) => a.name.localeCompare(b.name));
	}

	function defaultUnit(exercise: Exercise): 'lb' | 'bw' {
		const bwCategories = ['bodyweight', 'warmup', 'core', 'pt', 'stability'];
		return bwCategories.includes(exercise.category) ? 'bw' : 'lb';
	}

	async function addExerciseToSession(section: string, exerciseId: string) {
		const exercise = exerciseCache.getById(exerciseId);
		if (!exercise || !session) return;

		const unit = defaultUnit(exercise);
		const maxOrder = sessionStore.entries.reduce((max, e) => Math.max(max, e.order), 0);

		const newEntry = await pb.collection('session_entries').create({
			user: currentUserId(),
			session: session.id,
			exercise: exerciseId,
			order: maxOrder + 1,
			sets: [{ reps: null, value: null, unit, distance: null, distance_unit: null, notes: '', completed: false }],
			rpe: null,
			pain_flag: false,
			notes: ''
		});

		sessionStore.addEntry({
			id: newEntry.id,
			exerciseId,
			exerciseName: exercise.name,
			section,
			order: maxOrder + 1,
			sets: [{ reps: null, value: null, unit, distance: null, distance_unit: null, notes: '', completed: false }],
			rpe: null,
			painFlag: false,
			notes: '',
			targetSets: 0,
			targetReps: '',
			targetValue: '',
			targetUnit: unit,
			targetDistance: '',
			targetDistanceUnit: null,
			workoutNotes: '',
			lastSessionSets: [],
			dirty: false,
			saving: false,
			baseUpdated: newEntry.updated,
			conflict: null
		});

		addingToSection = null;
		expandedEntry = newEntry.id;
	}

	function promptRemoveEntry(entry: EntryState) {
		dialogStore.confirm({
			title: 'Remove exercise?',
			description: `Remove <strong>${entry.exerciseName}</strong> from this session?`,
			confirmLabel: 'Remove',
			pendingLabel: 'Removing...',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			async onConfirm() {
				await pb.collection('session_entries').delete(entry.id);
				sessionStore.removeEntry(entry.id);
			}
		});
	}

	async function finishSession() {
		if (!session) return;
		await pb.collection('sessions').update(session.id, { completed: true });
		await navigate('/');
	}

	function handleSetDone(entryId: string, setIndex: number) {
		const entry = sessionStore.entries.find(e => e.id === entryId);
		if (!entry) return;
		// Only trigger rest timer + guided advance when marking completed (not uncompleting)
		if (entry.sets[setIndex]?.completed) {
			restTimerStore.start();
			if (sessionStore.guidedMode) {
				sessionStore.advanceGuided();
			}
		}
	}

	// Track which entry/set the countdown is for so we can auto-mark done
	let countdownTarget = $state<{ entryId: string; setIndex: number } | null>(null);

	function handleStartTimer(entryId: string, setIndex: number) {
		const entry = sessionStore.entries.find((e) => e.id === entryId);
		if (!entry) return;
		const set = entry.sets[setIndex];
		if (!set?.value) return;
		// Interrupt rest timer when starting a countdown
		restTimerStore.reset();
		countdownTarget = { entryId, setIndex };
		countdownTimerStore.start(set.value);
	}

	// When countdown finishes, auto-mark set completed + start rest timer
	$effect(() => {
		if (!countdownTimerStore.finished) return;
		if (countdownTarget) {
			// Mark the set as completed
			sessionStore.updateSet(countdownTarget.entryId, countdownTarget.setIndex, 'completed', true);
			handleSetDone(countdownTarget.entryId, countdownTarget.setIndex);
			countdownTarget = null;
		}
		countdownTimerStore.reset();
	});

	// Auto-expand and scroll for guided mode
	$effect(() => {
		if (!sessionStore.guidedMode) return;
		const entry = sessionStore.currentGuidedEntry();
		if (!entry) return;

		// Auto-expand the guided entry
		expandedEntry = entry.id;

		// Scroll into view
		const el = document.getElementById(`entry-${entry.id}`);
		if (el) {
			el.scrollIntoView({ behavior: 'smooth', block: 'center' });
		}
	});

	useHeader(() => ({
		title: session ? session.expand?.workout?.name || 'Freeform Session' : undefined,
		subtitle: session ? statusLine : undefined,
		actions: session ? headerActions : undefined,
		below: !readonly && sessionStore.guidedMode ? guidedBar : undefined
	}));
</script>

{#snippet statusLine()}
	{#if isCompleted && !editingHistory}
		<div class="flex items-center gap-1 text-xs mt-0.5">
			<Check class="w-3 h-3 text-green-600" />
			<span class="text-green-600">Completed</span>
		</div>
	{:else}
		<div class="flex items-center gap-0.5 text-xs mt-0.5 transition-opacity duration-300 {sessionStore.saving || saved ? 'opacity-100' : 'opacity-0'}">
			{#if sessionStore.saving}
				<span class="text-primary animate-pulse">Saving changes...</span>
			{:else}
				<Check class="w-3 h-3 text-green-600" />
				<span class="text-green-600">Saved</span>
			{/if}
		</div>
	{/if}
{/snippet}

{#snippet headerActions()}
	{#if isCompleted}
		{#if editingHistory}
			<Button type="button" variant="secondary" size="sm" onclick={() => (editingHistory = false)}>Done</Button>
		{:else}
			<Button type="button" variant="secondary" size="sm" onclick={() => (editingHistory = true)}>Edit</Button>
		{/if}
	{:else}
		<div class="flex items-center gap-2">
			<Button
				type="button"
				variant={sessionStore.guidedMode ? 'primary' : 'secondary'}
				size="sm"
				onclick={() => sessionStore.toggleGuidedMode()}
			>
				Guide
			</Button>
			<Button type="button" variant="primary" size="sm" onclick={finishSession}>Finish</Button>
		</div>
	{/if}
{/snippet}

{#snippet guidedBar()}
	{@const position = sessionStore.guidedPosition()}
	<div class="flex items-center justify-between mt-2 pt-2 border-t border-border/50">
		<div class="flex items-center gap-2">
			<button type="button" onclick={() => sessionStore.guidedPrevious()} class="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Previous">
				<ChevronLeft class="w-4 h-4" />
			</button>
			<span class="text-xs text-text-muted tabular-nums">
				Exercise {position.exercise}/{position.totalExercises}, Set {position.set}/{position.totalSets}
			</span>
			<button type="button" onclick={() => sessionStore.guidedNext()} class="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Next">
				<ChevronRight class="w-4 h-4" />
			</button>
		</div>
		<button type="button" onclick={() => sessionStore.guidedSkip()} class="text-xs text-text-muted hover:text-primary transition-colors">
			Skip
		</button>
	</div>
{/snippet}

{#if loading}
	<div class="p-4 max-w-lg mx-auto space-y-3">
		{#each Array(4) as _}
			<div class="h-16 rounded-xl bg-surface-dim animate-pulse"></div>
		{/each}
	</div>
{:else if session}
	<div class="p-4 max-w-lg mx-auto space-y-6 pb-24">
		{#if !readonly}
			<textarea
				bind:value={sessionNotes}
				oninput={handleNotesInput}
				placeholder="Session notes..."
				rows="2"
				class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none
					placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
			></textarea>
		{:else if sessionNotes}
			<p class="text-sm text-text-muted italic">{sessionNotes}</p>
		{/if}
		{#each (readonly ? sessionStore.orderedSections() : sessionStore.allSections()) as section}
			<div>
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
					{sectionLabels[section.name] || section.name}
				</h2>
				<div class="space-y-2">
					{#each section.entries as entry (entry.id)}
						<div id="entry-{entry.id}" class="{sessionStore.guidedMode && sessionStore.currentGuidedEntry()?.id === entry.id ? 'ring-2 ring-primary/30 rounded-xl' : ''}">
						{#if entry.conflict}
							<div class="mb-1">
								<ConflictNotice conflict={entry.conflict} onusetheirs={() => useTheirs(entry.id)} />
							</div>
						{/if}
						<SessionExerciseCard
							{entry}
							{readonly}
							expanded={expandedEntry === entry.id}
							countdownSetIndex={readonly ? undefined : (countdownTimerStore.running && countdownTarget?.entryId === entry.id ? countdownTarget.setIndex : undefined)}
							ontoggle={() => toggleExpanded(entry.id)}
							onaddSet={() => sessionStore.addSet(entry.id)}
						onduplicateSet={() => sessionStore.duplicateSet(entry.id)}
							onupdateSet={(setIndex, field, value) => sessionStore.updateSet(entry.id, setIndex, field, value)}
							onremoveSet={(setIndex) => sessionStore.removeSet(entry.id, setIndex)}
							onsetDone={(setIndex) => handleSetDone(entry.id, setIndex)}
							onsetRpe={(rpe) => sessionStore.setRpe(entry.id, rpe)}
							ontogglePain={() => sessionStore.togglePainFlag(entry.id)}
							onsetnotes={(notes) => sessionStore.setEntryNotes(entry.id, notes)}
							onstarttimer={readonly ? undefined : ((setIndex) => handleStartTimer(entry.id, setIndex))}
							onremoveEntry={readonly ? undefined : () => promptRemoveEntry(entry)}
						/>
						</div>
					{/each}
				</div>
				{#if !readonly}
					<button type="button" onclick={() => { addingToSection = section.name; drawerSearch = ''; }}
						class="mt-2 w-full p-2 rounded-lg border border-dashed border-border text-sm text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
						<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Add Exercise
					</button>
				{/if}
			</div>
		{/each}
	</div>

	{#if !readonly}
		<RestTimer />
	{/if}

	<Drawer open={addingToSection !== null} onclose={() => addingToSection = null}>
		<h2 class="text-lg font-bold mb-3">Add Exercise</h2>

		<div class="relative mb-3">
			<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input type="text" bind:value={drawerSearch} placeholder="Search exercises..."
				class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm
					placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
		</div>

		<div class="space-y-2">
			{#each availableExercises() as exercise (exercise.id)}
				<ExerciseListItem
					{exercise}
					onselect={() => {
						if (addingToSection) addExerciseToSession(addingToSection, exercise.id);
					}}
				/>
			{/each}

			{#if availableExercises().length === 0}
				<div class="text-center py-8 text-text-muted">
					<p>No exercises found.</p>
				</div>
			{/if}
		</div>
	</Drawer>
{/if}
