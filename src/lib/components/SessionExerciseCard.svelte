<script lang="ts">
	import type { EntryState } from '$lib/stores/session.svelte';
	import type { SetData } from '$lib/pocketbase/types';
	import { formatTarget } from '$lib/utils/format';
	import { formatSets } from '$lib/utils/format';
	import SlideReveal from './SlideReveal.svelte';
	import SetRow from './SetRow.svelte';

	interface Props {
		entry: EntryState;
		readonly?: boolean;
		expanded: boolean;
		countdownSetIndex?: number;
		ontoggle: () => void;
		onaddSet: () => void;
		onupdateSet: (setIndex: number, field: keyof SetData, value: unknown) => void;
		onremoveSet: (setIndex: number) => void;
		onsetDone: (setIndex: number) => void;
		onsetRpe: (rpe: number) => void;
		ontogglePain: () => void;
		onsetnotes: (notes: string) => void;
		onstarttimer?: (setIndex: number) => void;
	}

	let {
		entry, readonly = false, expanded, countdownSetIndex, ontoggle, onaddSet, onupdateSet,
		onremoveSet, onsetDone, onsetRpe, ontogglePain, onsetnotes, onstarttimer
	}: Props = $props();

	function handleSetDone(idx: number) {
		onupdateSet(idx, 'completed', !entry.sets[idx].completed);
		onsetDone(idx);
	}

	const targetSummary = $derived(() => {
		return formatTarget({
			target_sets: entry.targetSets,
			target_reps: entry.targetReps,
			target_value: entry.targetValue,
			target_unit: entry.targetUnit,
			target_distance: entry.targetDistance,
			target_distance_unit: entry.targetDistanceUnit
		});
	});

	const allCompleted = $derived(() => entry.sets.length > 0 && entry.sets.every(s => s.completed));

	const lastSessionPreview = $derived(() => {
		if (!entry.lastSessionSets?.length) return '';
		return formatSets(entry.lastSessionSets);
	});
</script>

<div class="rounded-xl border transition-colors {expanded ? 'border-primary/40 bg-surface' : allCompleted() ? 'border-green-300 bg-green-50/50' : 'border-border bg-surface'}">
	<!-- Collapsed header (always visible) -->
	<button type="button" onclick={ontoggle} class="w-full text-left p-3 active:bg-surface-hover transition-colors rounded-xl">
		<div class="flex items-center justify-between gap-2">
			<div class="flex-1 min-w-0">
				<div class="font-medium leading-tight">{entry.exerciseName}</div>
				{#if targetSummary()}
					<div class="text-xs text-text-muted mt-0.5">{targetSummary()}</div>
				{/if}
			</div>
			<div class="shrink-0">
				<svg class="w-4 h-4 text-text-muted transition-transform {expanded ? 'rotate-180' : ''}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
				</svg>
			</div>
		</div>
		{#if !expanded && lastSessionPreview()}
			<div class="text-xs text-text-muted mt-1 truncate">Last: {lastSessionPreview()}</div>
		{/if}
	</button>

	<!-- Expanded content -->
	<SlideReveal open={expanded}>
		<div class="px-3 pb-3 space-y-3">
			<!-- Workout notes -->
			{#if entry.workoutNotes}
				<p class="text-xs text-text-muted italic">{entry.workoutNotes}</p>
			{/if}

			<!-- Last session reference -->
			{#if lastSessionPreview()}
				<div class="text-xs text-text-muted bg-surface-dim rounded-lg px-2 py-1.5">
					<span class="font-medium">Last:</span> {lastSessionPreview()}
				</div>
			{/if}

			<!-- Set rows -->
			<div class="space-y-0.5">
				{#each entry.sets as set, i (i)}
					<SetRow
						index={i}
						{set}
						{readonly}
						done={set.completed}
						timerRunning={countdownSetIndex === i}
						onupdate={(field, value) => onupdateSet(i, field, value)}
						ondone={() => handleSetDone(i)}
						onstarttimer={onstarttimer ? () => onstarttimer(i) : undefined}
					/>
				{/each}
			</div>

			{#if !readonly}
				<!-- Remove / Add Set buttons -->
				<div class="flex gap-2">
					{#if entry.sets.length > 0}
						<button type="button" onclick={() => onremoveSet(entry.sets.length - 1)}
							class="flex-1 py-1.5 rounded-lg border border-dashed border-border text-xs text-text-muted
								hover:border-red-400 hover:text-red-500 transition-colors flex items-center justify-center gap-1">
							<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M5 12h14" />
							</svg>
							Remove Set
						</button>
					{/if}
					<button type="button" onclick={onaddSet}
						class="flex-1 py-1.5 rounded-lg border border-dashed border-border text-xs text-text-muted
							hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
						<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
						</svg>
						Add Set
					</button>
				</div>

				<!-- RPE selector -->
				<div>
					<span class="block text-xs font-medium text-text-muted mb-1">RPE</span>
					<div class="flex gap-1">
						{#each Array(10) as _, i}
							{@const rpe = i + 1}
							<button type="button" onclick={() => onsetRpe(entry.rpe === rpe ? 0 : rpe)}
								class="flex-1 py-1 rounded text-xs font-medium transition-colors tabular-nums
									{entry.rpe === rpe ? 'bg-primary text-text-on-primary' : 'bg-surface-dim text-text-muted hover:bg-surface-hover'}">
								{rpe}
							</button>
						{/each}
					</div>
				</div>

				<!-- Pain flag + Notes row -->
				<div class="flex gap-2 items-start">
					<button type="button" onclick={ontogglePain}
						class="px-3 py-1.5 rounded-lg text-xs font-medium transition-colors shrink-0
							{entry.painFlag ? 'bg-red-100 text-red-700 border border-red-300' : 'bg-surface-dim text-text-muted border border-border hover:border-red-300 hover:text-red-600'}">
						<svg class="w-3.5 h-3.5 inline -mt-0.5 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
						</svg>
						Pain
					</button>
					<textarea
						placeholder="Notes..."
						value={entry.notes}
						oninput={(e) => onsetnotes(e.currentTarget.value)}
						rows="1"
						class="flex-1 px-2 py-1.5 rounded-lg border border-border bg-surface text-xs resize-none
							focus:outline-none focus:ring-1 focus:ring-primary/30 focus:border-primary"
					></textarea>
				</div>
			{:else}
				<!-- Readonly: show RPE, pain flag, and notes as static display -->
				{#if entry.rpe || entry.painFlag || entry.notes}
					<div class="flex flex-wrap items-center gap-2 text-xs text-text-muted">
						{#if entry.rpe}
							<span class="px-2 py-0.5 rounded bg-surface-dim font-medium">RPE {entry.rpe}</span>
						{/if}
						{#if entry.painFlag}
							<span class="px-2 py-0.5 rounded bg-red-100 text-red-700 font-medium">Pain</span>
						{/if}
						{#if entry.notes}
							<span class="italic">{entry.notes}</span>
						{/if}
					</div>
				{/if}
			{/if}
		</div>
	</SlideReveal>
</div>
