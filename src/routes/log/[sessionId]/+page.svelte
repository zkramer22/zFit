<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import SessionHeader from '$lib/components/log/SessionHeader.svelte';
	import ExerciseCard from '$lib/components/log/ExerciseCard.svelte';
	import { sessionStore, type EntryState } from '$lib/stores/session.svelte';
	import type { PageData } from './$types';

	let { data } = $props();

	// Section display names
	const sectionLabels: Record<string, string> = {
		warmup: 'Warm-Up',
		main: 'Main Block',
		core: 'Core',
		cooldown: 'Cooldown'
	};

	// Initialize session store from server data
	$effect(() => {
		const entryData: EntryState[] = data.entries.map((entry) => {
			const exercise = entry.expand?.exercise;
			const target = data.targets[entry.exercise];
			const lastSets = data.lastSessionEntries[entry.exercise] || [];

			return {
				id: entry.id,
				exerciseId: entry.exercise,
				exerciseName: exercise?.name || 'Unknown Exercise',
				section: target?.section || 'main',
				order: entry.order,
				sets: entry.sets || [],
				rpe: entry.rpe,
				painFlag: entry.pain_flag,
				notes: entry.notes || '',
				targetSets: target?.target_sets || 0,
				targetReps: target?.target_reps || '',
				targetWeight: target?.target_weight || '',
				workoutNotes: target?.notes || '',
				lastSessionSets: lastSets,
				dirty: false
			};
		});

		sessionStore.init(data.session.id, data.session.expand?.workout?.name || '', entryData);
	});

	// Auto-save with 1s debounce
	let saveTimeout: ReturnType<typeof setTimeout> | undefined;

	$effect(() => {
		const dirty = sessionStore.dirtyEntries();
		if (dirty.length === 0) return;

		clearTimeout(saveTimeout);
		saveTimeout = setTimeout(async () => {
			const toSave = sessionStore.dirtyEntries();
			if (toSave.length === 0) return;

			sessionStore.saving = true;
			try {
				const response = await fetch(`/log/${sessionStore.sessionId}`, {
					method: 'PATCH',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(
						toSave.map((e) => ({
							id: e.id,
							sets: e.sets,
							rpe: e.rpe,
							pain_flag: e.painFlag,
							notes: e.notes
						}))
					)
				});

				if (response.ok) {
					sessionStore.markClean(toSave.map((e) => e.id));
				}
			} catch (err) {
				console.error('Auto-save failed:', err);
			} finally {
				sessionStore.saving = false;
			}
		}, 1000);

		return () => clearTimeout(saveTimeout);
	});
</script>

<svelte:head>
	<title>Session — zFit</title>
</svelte:head>

<SessionHeader
	workoutName={sessionStore.workoutName}
	date={data.session.date}
	sessionId={data.session.id}
	saving={sessionStore.saving}
/>

<div class="p-4 max-w-lg mx-auto space-y-6">
	{#each sessionStore.orderedSections() as section}
		<div>
			<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
				{sectionLabels[section.name] || section.name}
			</h2>
			<div class="space-y-3">
				{#each section.entries as entry (entry.id)}
					<ExerciseCard {entry} />
				{/each}
			</div>
		</div>
	{/each}

	{#if sessionStore.entries.length === 0}
		<div class="text-center py-12 text-text-muted">
			<p class="text-lg font-medium">No exercises yet</p>
			<p class="text-sm mt-1">This is a freeform session — exercise adding coming in Phase 2.</p>
		</div>
	{/if}
</div>
