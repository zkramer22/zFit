<script lang="ts">
	import { dragHandle } from 'svelte-dnd-action';
	import type { Exercise } from '$lib/pocketbase/types';

	interface Props {
		exercise: Exercise;
		target?: string;
		showVideos?: boolean;
		editing?: boolean;
		ondelete?: () => void;
		onselect?: () => void;
		oneditTarget?: () => void;
	}

	let { exercise, target = '', showVideos = false, editing = false, ondelete, onselect, oneditTarget }: Props = $props();

	const categoryColors: Record<string, string> = {
		strength: 'bg-blue-100 text-blue-800',
		stability: 'bg-green-100 text-green-800',
		core: 'bg-purple-100 text-purple-800',
		warmup: 'bg-amber-100 text-amber-800',
		posterior_chain: 'bg-orange-100 text-orange-800'
	};
</script>

{#snippet content()}
	<div class="font-medium">
		{exercise.name}
		{#if showVideos && exercise.video_urls?.length}
			<span class="ml-1.5 text-xs font-normal text-red-600 bg-red-50 px-1.5 py-0.5 rounded-full">{exercise.video_urls.length} video{exercise.video_urls.length > 1 ? 's' : ''}</span>
		{/if}
	</div>
	<div class="flex flex-wrap gap-1 mt-1.5">
		<span
			class="inline-block px-2 py-0.5 rounded-full text-xs font-medium {categoryColors[exercise.category] || 'bg-gray-100 text-gray-800'}"
		>
			{exercise.category.replace('_', ' ')}
		</span>
		{#each (exercise.muscle_groups || []).slice(0, 3) as mg}
			<span class="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">
				{mg.replace('_', ' ')}
			</span>
		{/each}
	</div>
	{#if editing && oneditTarget}
		{#if target}
			<button
				type="button"
				onclick={(e) => { e.stopPropagation(); oneditTarget?.(); }}
				class="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-primary/15 text-primary mt-1.5 hover:bg-primary/25 transition-colors"
			>
				{target}
			</button>
		{:else}
			<button
				type="button"
				onclick={(e) => { e.stopPropagation(); oneditTarget?.(); }}
				class="inline-block px-3 py-1 rounded-lg text-xs font-medium text-primary/60 bg-primary/5 border border-dashed border-primary/20 mt-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary/30 transition-colors"
			>
				+ target
			</button>
		{/if}
	{:else if target}
		<span class="inline-block px-3 py-1 rounded-lg text-xs font-semibold bg-gray-100 text-gray-600 mt-1.5">
			{target}
		</span>
	{/if}
{/snippet}

{#if editing}
	<div class="p-3 rounded-xl border border-border bg-surface">
		<div class="flex items-start gap-3">
			<div
				use:dragHandle
				class="drag-handle shrink-0 cursor-grab active:cursor-grabbing touch-none mt-0.5"
				aria-label="Drag to reorder"
			>
				<svg class="w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M4 8h16M4 16h16" />
				</svg>
			</div>
			<div class="flex-1 min-w-0">
				{@render content()}
			</div>
			{#if ondelete}
				<button
					type="button"
					onclick={ondelete}
					class="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0"
					aria-label="Remove exercise"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			{/if}
		</div>
	</div>
{:else if onselect}
	<button
		type="button"
		onclick={onselect}
		class="block w-full text-left p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover
			transition-colors active:scale-[0.99]"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 min-w-0">
				{@render content()}
			</div>
			<svg
				class="w-5 h-5 text-primary shrink-0 mt-1"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
			</svg>
		</div>
	</button>
{:else}
	<a
		href="/exercises/{exercise.id}"
		class="block p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover
			transition-colors active:scale-[0.99]"
	>
		<div class="flex items-start justify-between gap-2">
			<div class="flex-1 min-w-0">
				{@render content()}
			</div>
			<svg
				class="w-5 h-5 text-text-muted shrink-0 mt-1"
				fill="none"
				viewBox="0 0 24 24"
				stroke="currentColor"
				stroke-width="2"
			>
				<path stroke-linecap="round" stroke-linejoin="round" d="M9 5l7 7-7 7" />
			</svg>
		</div>
	</a>
{/if}

<style>
	.drag-handle {
		-webkit-touch-callout: none;
		-webkit-user-select: none;
		user-select: none;
	}
</style>
