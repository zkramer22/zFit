<script lang="ts">
	import { page } from '$app/stores';
	import { goto, beforeNavigate } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import type { SessionExpanded, SessionEntryExpanded, WorkoutExerciseExpanded, SetData } from '$lib/pocketbase/types';
	import SessionHeader from '$lib/components/SessionHeader.svelte';
	import SessionExerciseCard from '$lib/components/SessionExerciseCard.svelte';
	import RestTimer from '$lib/components/RestTimer.svelte';
	import { sessionStore, type EntryState } from '$lib/stores/session.svelte';
	import { restTimerStore } from '$lib/stores/restTimer.svelte';
	import { countdownTimerStore } from '$lib/stores/countdownTimer.svelte';

	let loading = $state(true);
	let session = $state<SessionExpanded | null>(null);
	let expandedEntry = $state<string | null>(null);
	let saved = $state(false);
	let editingHistory = $state(false);

	const isCompleted = $derived(session?.completed === true);
	const readonly = $derived(isCompleted && !editingHistory);

	const sectionLabels: Record<string, string> = {
		warmup: 'Warm-Up',
		main: 'Main Block',
		core: 'Core',
		cooldown: 'Cooldown'
	};

	function toggleExpanded(entryId: string) {
		expandedEntry = expandedEntry === entryId ? null : entryId;
	}

	async function loadSession() {
		loading = true;
		const sessionId = $page.params.sessionId!;
		try {
			const [sess, entries] = await Promise.all([
				pb.collection('sessions').getOne<SessionExpanded>(sessionId, { expand: 'workout' }),
				pb.collection('session_entries').getFullList<SessionEntryExpanded>({
					filter: `session = "${sessionId}"`,
					sort: 'order',
					expand: 'exercise'
				})
			]);

			session = sess;

			// Load workout exercise targets if this session has a workout
			let targets: Record<string, WorkoutExerciseExpanded> = {};
			if (sess.workout) {
				const wes = await pb.collection('workout_exercises').getFullList<WorkoutExerciseExpanded>({
					filter: `workout = "${sess.workout}"`,
					expand: 'exercise'
				});
				for (const we of wes) {
					targets[we.exercise] = we;
				}
			}

			// Load last session entries for comparison
			let lastSessionEntries: Record<string, any[]> = {};
			try {
				const prevSessions = await pb.collection('sessions').getList(1, 1, {
					filter: `workout = "${sess.workout}" && id != "${sessionId}"`,
					sort: '-date'
				});
				if (prevSessions.items.length > 0) {
					const prevEntries = await pb.collection('session_entries').getFullList({
						filter: `session = "${prevSessions.items[0].id}"`,
						sort: 'order'
					});
					for (const pe of prevEntries) {
						lastSessionEntries[pe.exercise] = pe.sets || [];
					}
				}
			} catch {
				// No previous session data available
			}

			const entryData: EntryState[] = entries.map((entry) => {
				const exercise = entry.expand?.exercise;
				const target = targets[entry.exercise];
				const lastSets = lastSessionEntries[entry.exercise] || [];

				return {
					id: entry.id,
					exerciseId: entry.exercise,
					exerciseName: exercise?.name || 'Unknown Exercise',
					section: target?.section || 'main',
					order: entry.order,
					sets: (entry.sets || []).map(s => ({ ...s, completed: s.completed ?? false })),
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
					lastSessionSets: lastSets,
					dirty: false
				};
			});

			sessionStore.init(sess.id, sess.expand?.workout?.name || '', entryData);
		} catch (err) {
			console.error('Failed to load session:', err);
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		$page.params.sessionId;
		loadSession();
	});

	// Immediate auto-save with minimum "Saving" display time
	const MIN_SAVING_MS = 600;
	let saveInFlight = false;

	async function flushSave() {
		const toSave = sessionStore.dirtyEntries();
		if (toSave.length === 0) return;
		if (saveInFlight) return;

		saveInFlight = true;
		sessionStore.saving = true;
		saved = false;
		const startTime = Date.now();
		try {
			for (const e of toSave) {
				await pb.collection('session_entries').update(e.id, {
					sets: e.sets,
					rpe: e.rpe,
					pain_flag: e.painFlag,
					notes: e.notes
				});
			}
			sessionStore.markClean(toSave.map((e) => e.id));
			// Ensure "Saving" shows for at least MIN_SAVING_MS
			const elapsed = Date.now() - startTime;
			if (elapsed < MIN_SAVING_MS) {
				await new Promise((r) => setTimeout(r, MIN_SAVING_MS - elapsed));
			}
			saved = true;
		} catch (err) {
			console.error('Auto-save failed:', err);
		} finally {
			sessionStore.saving = false;
			saveInFlight = false;
		}
	}

	$effect(() => {
		if (readonly) return;
		const dirty = sessionStore.dirtyEntries();
		if (dirty.length === 0) return;
		flushSave();
	});

	// Flush any pending saves before navigating away
	beforeNavigate(() => { flushSave(); });

	async function finishSession() {
		if (!session) return;
		await pb.collection('sessions').update(session.id, { completed: true });
		await goto('/session');
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
</script>

<svelte:head>
	<title>Session — zFit</title>
</svelte:head>

{#if loading}
	<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
		<div class="flex items-center gap-3 max-w-lg mx-auto">
			<div class="h-5 w-40 rounded bg-surface-dim animate-pulse"></div>
		</div>
	</div>
	<div class="p-4 max-w-lg mx-auto space-y-3">
		{#each Array(4) as _}
			<div class="h-16 rounded-xl bg-surface-dim animate-pulse"></div>
		{/each}
	</div>
{:else if session}
	<SessionHeader
		workoutName={sessionStore.workoutName}
		saving={sessionStore.saving}
		{saved}
		completed={isCompleted}
		{editingHistory}
		guidedMode={readonly ? false : sessionStore.guidedMode}
		guidedPosition={readonly ? undefined : sessionStore.guidedPosition()}
		onfinish={readonly ? undefined : finishSession}
		ontoggleGuided={readonly ? undefined : () => sessionStore.toggleGuidedMode()}
		onguidedPrevious={readonly ? undefined : () => sessionStore.guidedPrevious()}
		onguidedNext={readonly ? undefined : () => sessionStore.guidedNext()}
		onguidedSkip={readonly ? undefined : () => sessionStore.guidedSkip()}
		oneditHistory={() => editingHistory = true}
		oncancelEdit={() => editingHistory = false}
	/>

	<div class="p-4 max-w-lg mx-auto space-y-6 pb-24">
		{#each sessionStore.orderedSections() as section}
			<div>
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
					{sectionLabels[section.name] || section.name}
				</h2>
				<div class="space-y-2">
					{#each section.entries as entry (entry.id)}
						<div id="entry-{entry.id}" class="{sessionStore.guidedMode && sessionStore.currentGuidedEntry()?.id === entry.id ? 'ring-2 ring-primary/30 rounded-xl' : ''}">
						<SessionExerciseCard
							{entry}
							{readonly}
							expanded={expandedEntry === entry.id}
							countdownSetIndex={readonly ? undefined : (countdownTimerStore.running && countdownTarget?.entryId === entry.id ? countdownTarget.setIndex : undefined)}
							ontoggle={() => toggleExpanded(entry.id)}
							onaddSet={() => sessionStore.addSet(entry.id)}
							onupdateSet={(setIndex, field, value) => sessionStore.updateSet(entry.id, setIndex, field, value)}
							onremoveSet={(setIndex) => sessionStore.removeSet(entry.id, setIndex)}
							onsetDone={(setIndex) => handleSetDone(entry.id, setIndex)}
							onsetRpe={(rpe) => sessionStore.setRpe(entry.id, rpe)}
							ontogglePain={() => sessionStore.togglePainFlag(entry.id)}
							onsetnotes={(notes) => sessionStore.setEntryNotes(entry.id, notes)}
							onstarttimer={readonly ? undefined : ((setIndex) => handleStartTimer(entry.id, setIndex))}
						/>
						</div>
					{/each}
				</div>
			</div>
		{/each}

		{#if sessionStore.entries.length === 0}
			<div class="text-center py-12 text-text-muted">
				<p class="text-lg font-medium">No exercises yet</p>
				<p class="text-sm mt-1">This is a freeform session — add exercises as you go.</p>
			</div>
		{/if}
	</div>

	{#if !readonly}
		<RestTimer />
	{/if}
{/if}
