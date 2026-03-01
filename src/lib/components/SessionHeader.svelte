<script lang="ts">
	import Button from '$lib/components/Button.svelte';

	import { Check } from 'lucide-svelte';

	interface Props {
		workoutName: string;
		saving: boolean;
		saved: boolean;
		completed?: boolean;
		editingHistory?: boolean;
		guidedMode?: boolean;
		guidedPosition?: { exercise: number; totalExercises: number; set: number; totalSets: number };
		onfinish?: () => void;
		ontoggleGuided?: () => void;
		onguidedPrevious?: () => void;
		onguidedNext?: () => void;
		onguidedSkip?: () => void;
		oneditHistory?: () => void;
		oncancelEdit?: () => void;
	}

	let {
		workoutName, saving, saved, completed = false, editingHistory = false, guidedMode = false, guidedPosition,
		onfinish, ontoggleGuided, onguidedPrevious, onguidedNext, onguidedSkip, oneditHistory, oncancelEdit
	}: Props = $props();
</script>

<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
	<div class="flex items-start justify-between max-w-lg mx-auto">
		<div class="min-w-0">
			<h1 class="font-bold text-lg leading-tight truncate">{workoutName || 'Freeform Session'}</h1>
			{#if completed && !editingHistory}
				<div class="flex items-center gap-1 text-xs mt-0.5">
					<Check class="w-3 h-3 text-green-600" />
					<span class="text-green-600">Completed</span>
				</div>
			{:else}
				<div class="flex items-center gap-0.5 text-xs mt-0.5 transition-opacity duration-300 {saving || saved ? 'opacity-100' : 'opacity-0'}">
					{#if saving}
						<span class="text-primary animate-pulse">Saving changes...</span>
					{:else}
						<Check class="w-3 h-3 text-green-600" />
						<span class="text-green-600">Saved</span>
					{/if}
				</div>
			{/if}
		</div>
		<div class="flex items-center gap-2 shrink-0">
			{#if completed}
				{#if editingHistory}
					<Button type="button" variant="secondary" size="sm" onclick={oncancelEdit}>
						Done
					</Button>
				{:else}
					<Button type="button" variant="secondary" size="sm" onclick={oneditHistory}>
						Edit
					</Button>
				{/if}
			{:else}
				{#if ontoggleGuided}
					<Button
						type="button"
						variant={guidedMode ? 'primary' : 'secondary'}
						size="sm"
						onclick={ontoggleGuided}
					>
						Guide
					</Button>
				{/if}
				{#if onfinish}
					<Button type="button" variant="primary" size="sm" onclick={onfinish}>
						Finish
					</Button>
				{/if}
			{/if}
		</div>
	</div>

	<!-- Guided mode bar -->
	{#if guidedMode && guidedPosition}
		<div class="flex items-center justify-between max-w-lg mx-auto mt-2 pt-2 border-t border-border/50">
			<div class="flex items-center gap-2">
				<button type="button" onclick={onguidedPrevious} class="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Previous">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
				</button>
				<span class="text-xs text-text-muted tabular-nums">
					Exercise {guidedPosition.exercise}/{guidedPosition.totalExercises}, Set {guidedPosition.set}/{guidedPosition.totalSets}
				</span>
				<button type="button" onclick={onguidedNext} class="p-1 rounded text-text-muted hover:text-text hover:bg-surface-hover transition-colors" aria-label="Next">
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" /></svg>
				</button>
			</div>
			<button type="button" onclick={onguidedSkip} class="text-xs text-text-muted hover:text-primary transition-colors">
				Skip
			</button>
		</div>
	{/if}
</div>
