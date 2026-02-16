<script lang="ts">
	import SetRow from './SetRow.svelte';
	import type { EntryState } from '$lib/stores/session.svelte';
	import { sessionStore } from '$lib/stores/session.svelte';

	interface Props {
		entry: EntryState;
	}

	let { entry }: Props = $props();

	let showRpe = $state(false);
	let showNotes = $state(false);

	// Build the target reference string
	const targetRef = $derived(() => {
		if (!entry.targetSets && !entry.targetReps) return '';
		const parts = [];
		if (entry.targetSets) parts.push(`${entry.targetSets}x`);
		if (entry.targetReps) parts.push(entry.targetReps);
		if (entry.targetWeight && entry.targetWeight !== 'bw') parts.push(`@ ${entry.targetWeight}`);
		return parts.join('');
	});

	// Build last session reference
	const lastRef = $derived(() => {
		if (!entry.lastSessionSets?.length) return '';
		const sets = entry.lastSessionSets;
		const setCount = sets.length;
		const weights = [...new Set(sets.map(s => s.weight).filter(Boolean))];
		const reps = sets.map(s => s.reps).filter(Boolean);
		if (!reps.length) return `${setCount} sets`;
		const repStr = reps.join('/');
		const weightStr = weights.length ? ` @ ${weights.join('/')}lb` : '';
		return `${repStr}${weightStr}`;
	});

	const sectionColors: Record<string, string> = {
		warmup: 'border-l-warmup',
		main: 'border-l-main',
		core: 'border-l-core',
		cooldown: 'border-l-cooldown'
	};
</script>

<div class="border border-border rounded-xl overflow-hidden border-l-4 {sectionColors[entry.section] || 'border-l-main'}">
	<!-- Exercise header -->
	<div class="p-3 bg-surface">
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 min-w-0">
				<h3 class="font-semibold text-base truncate">{entry.exerciseName}</h3>
				<div class="flex flex-wrap gap-2 mt-1 text-xs text-text-muted">
					{#if targetRef()}
						<span class="bg-surface-dim px-2 py-0.5 rounded">Target: {targetRef()}</span>
					{/if}
					{#if lastRef()}
						<span class="bg-surface-dim px-2 py-0.5 rounded">Last: {lastRef()}</span>
					{/if}
				</div>
				{#if entry.programNotes}
					<p class="text-xs text-text-muted mt-1 italic">{entry.programNotes}</p>
				{/if}
			</div>

			<!-- Pain flag -->
			<button
				type="button"
				onclick={() => sessionStore.togglePainFlag(entry.id)}
				class="w-9 h-9 flex items-center justify-center rounded-lg transition-colors
					{entry.painFlag ? 'bg-danger text-white' : 'text-text-muted hover:bg-surface-hover'}"
				aria-label="Toggle pain flag"
				title="Flag pain/discomfort"
			>
				<svg class="w-5 h-5" fill={entry.painFlag ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
				</svg>
			</button>
		</div>
	</div>

	<!-- Sets -->
	<div class="p-3 space-y-2 bg-surface-dim/30">
		{#each entry.sets as set, i}
			<SetRow
				setIndex={i}
				{set}
				onupdate={(field, value) => sessionStore.updateSet(entry.id, i, field, value)}
				onremove={() => sessionStore.removeSet(entry.id, i)}
			/>
		{/each}

		<!-- Add set button -->
		<button
			type="button"
			onclick={() => sessionStore.addSet(entry.id)}
			class="w-full py-2 rounded-lg border border-dashed border-border text-sm text-text-muted
				hover:bg-surface-hover transition-colors touch-target flex items-center justify-center gap-1"
		>
			<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
			Add Set
		</button>
	</div>

	<!-- RPE & Notes toggle bar -->
	<div class="flex border-t border-border divide-x divide-border text-xs">
		<button
			type="button"
			onclick={() => showRpe = !showRpe}
			class="flex-1 py-2 text-center text-text-muted hover:bg-surface-hover transition-colors
				{entry.rpe ? 'font-semibold text-primary' : ''}"
		>
			RPE {entry.rpe ? entry.rpe : ''}
		</button>
		<button
			type="button"
			onclick={() => showNotes = !showNotes}
			class="flex-1 py-2 text-center text-text-muted hover:bg-surface-hover transition-colors
				{entry.notes ? 'font-semibold text-primary' : ''}"
		>
			Notes {entry.notes ? '*' : ''}
		</button>
	</div>

	<!-- RPE Selector -->
	{#if showRpe}
		<div class="p-3 border-t border-border bg-surface-dim">
			<div class="text-xs text-text-muted mb-2">Rate of Perceived Exertion</div>
			<div class="flex gap-1">
				{#each Array.from({ length: 10 }, (_, i) => i + 1) as rpe}
					<button
						type="button"
						onclick={() => sessionStore.setRpe(entry.id, rpe)}
						class="flex-1 h-9 rounded text-xs font-bold transition-colors
							{entry.rpe === rpe ? 'bg-primary text-text-on-primary' : 'bg-surface border border-border text-text-muted hover:bg-surface-hover'}"
					>
						{rpe}
					</button>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Notes -->
	{#if showNotes}
		<div class="p-3 border-t border-border bg-surface-dim">
			<textarea
				value={entry.notes}
				oninput={(e) => sessionStore.setEntryNotes(entry.id, (e.target as HTMLTextAreaElement).value)}
				placeholder="Exercise notes..."
				rows="2"
				class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none"
			></textarea>
		</div>
	{/if}
</div>
