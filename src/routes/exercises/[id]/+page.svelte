<script lang="ts">
	import type { PageData } from './$types';
	import type { SetData } from '$lib/pocketbase/types';

	let { data } = $props();

	const categoryColors: Record<string, string> = {
		strength: 'bg-blue-100 text-blue-800',
		stability: 'bg-green-100 text-green-800',
		core: 'bg-purple-100 text-purple-800',
		warmup: 'bg-amber-100 text-amber-800',
		posterior_chain: 'bg-orange-100 text-orange-800'
	};

	function formatSets(sets: SetData[]): string {
		if (!sets?.length) return 'No sets';
		return sets
			.map((s) => {
				const parts = [];
				if (s.reps) parts.push(`${s.reps} reps`);
				if (s.weight) parts.push(`${s.weight} ${s.weight_unit}`);
				if (s.duration_sec) parts.push(`${s.duration_sec}s`);
				return parts.join(' @ ') || '—';
			})
			.join(' / ');
	}

	function formatDate(d: string): string {
		return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const youtubeSearchUrl = $derived(`https://www.youtube.com/results?search_query=${encodeURIComponent(data.exercise.name + ' exercise form')}`);
</script>

<svelte:head>
	<title>{data.exercise.name} — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<!-- Back link -->
	<a
		href="/exercises"
		class="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
		Exercises
	</a>

	<!-- Exercise info -->
	<h1 class="text-2xl font-bold mb-2">{data.exercise.name}</h1>

	<div class="flex flex-wrap gap-1.5 mb-4">
		<span
			class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold {categoryColors[
				data.exercise.category
			] || 'bg-gray-100 text-gray-800'}"
		>
			{data.exercise.category.replace('_', ' ')}
		</span>
		{#each data.exercise.muscle_groups as mg}
			<span class="inline-block px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
				{mg.replace('_', ' ')}
			</span>
		{/each}
	</div>

	{#if data.exercise.description}
		<p class="text-sm text-text-muted leading-relaxed mb-6">{data.exercise.description}</p>
	{/if}

	<!-- YouTube search -->
	<a
		href={youtubeSearchUrl}
		target="_blank"
		rel="noopener noreferrer"
		class="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-red-50 text-red-700 border border-red-200
			hover:bg-red-100 transition-colors text-sm font-medium mb-8"
	>
		<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
			<path
				d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"
			/>
		</svg>
		Search YouTube
	</a>

	<!-- Video placeholder -->
	{#if data.exercise.video_urls?.length}
		<div class="mb-8">
			<h2 class="text-lg font-semibold mb-3">Videos</h2>
			<div class="space-y-2">
				{#each data.exercise.video_urls as video}
					<a
						href={video.url}
						target="_blank"
						rel="noopener noreferrer"
						class="block p-3 rounded-lg border border-border hover:bg-surface-hover transition-colors"
					>
						<span class="text-sm font-medium">{video.title || video.url}</span>
					</a>
				{/each}
			</div>
		</div>
	{/if}

	<!-- Recent History -->
	<div>
		<h2 class="text-lg font-semibold mb-3">Recent History</h2>
		{#if data.recentHistory.length > 0}
			<div class="space-y-2">
				{#each data.recentHistory as entry}
					<div class="p-3 rounded-lg border border-border bg-surface-dim">
						<div class="flex items-center justify-between mb-1">
							<span class="text-sm font-medium">{formatDate(entry.date)}</span>
							<div class="flex items-center gap-2">
								{#if entry.rpe}
									<span class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded"
										>RPE {entry.rpe}</span
									>
								{/if}
								{#if entry.painFlag}
									<span class="text-xs bg-danger/10 text-danger px-1.5 py-0.5 rounded">Pain</span>
								{/if}
							</div>
						</div>
						<div class="text-sm text-text-muted">{formatSets(entry.sets)}</div>
						{#if entry.notes}
							<div class="text-xs text-text-muted mt-1 italic">{entry.notes}</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="text-center py-6 text-text-muted text-sm border border-dashed border-border rounded-lg">
				No history yet. Start logging to build your record.
			</div>
		{/if}
	</div>
</div>
