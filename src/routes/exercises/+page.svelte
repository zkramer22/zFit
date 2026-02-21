<script lang="ts">
	import ExerciseListItem from '$lib/components/ExerciseListItem.svelte';
	import type { PageData } from './$types';

	let { data } = $props();

	let searchQuery = $state('');
	let activeCategory = $state('all');

	const categories = [
		{ value: 'all', label: 'All' },
		{ value: 'strength', label: 'Strength' },
		{ value: 'stability', label: 'Stability' },
		{ value: 'core', label: 'Core' },
		{ value: 'warmup', label: 'Warmup' },
		{ value: 'posterior_chain', label: 'Posterior Chain' }
	];

	const filtered = $derived(() => {
		return data.exercises.filter((ex) => {
			const matchesSearch =
				!searchQuery ||
				ex.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				ex.muscle_groups.some((mg) => mg.toLowerCase().includes(searchQuery.toLowerCase()));
			const matchesCategory = activeCategory === 'all' || ex.category === activeCategory;
			return matchesSearch && matchesCategory;
		});
	});
</script>

<svelte:head>
	<title>Exercises — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<h1 class="text-2xl font-bold mb-4">Exercises</h1>

	<!-- Search -->
	<div class="relative mb-3">
		<svg
			class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted"
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
			stroke-width="2"
		>
			<path
				stroke-linecap="round"
				stroke-linejoin="round"
				d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
			/>
		</svg>
		<input
			type="text"
			bind:value={searchQuery}
			placeholder="Search exercises..."
			class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm
				placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
		/>
	</div>

	<!-- Category filters -->
	<div class="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 no-scrollbar">
		{#each categories as cat}
			<button
				type="button"
				onclick={() => (activeCategory = cat.value)}
				class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
					{activeCategory === cat.value
					? 'bg-primary text-text-on-primary'
					: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
			>
				{cat.label}
			</button>
		{/each}
	</div>

	<!-- Exercise list -->
	<div class="space-y-2">
		{#each filtered() as exercise (exercise.id)}
			<ExerciseListItem {exercise} showVideos />
		{/each}

		{#if filtered().length === 0}
			<div class="text-center py-8 text-text-muted">
				<p>No exercises found.</p>
			</div>
		{/if}
	</div>
</div>

<style>
	.no-scrollbar::-webkit-scrollbar {
		display: none;
	}
	.no-scrollbar {
		-ms-overflow-style: none;
		scrollbar-width: none;
	}
</style>
