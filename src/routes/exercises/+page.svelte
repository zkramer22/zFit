<script lang="ts">
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

	const categoryColors: Record<string, string> = {
		strength: 'bg-blue-100 text-blue-800',
		stability: 'bg-green-100 text-green-800',
		core: 'bg-purple-100 text-purple-800',
		warmup: 'bg-amber-100 text-amber-800',
		posterior_chain: 'bg-orange-100 text-orange-800'
	};

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
			<a
				href="/exercises/{exercise.id}"
				class="block p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover
					transition-colors active:scale-[0.99]"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1 min-w-0">
						<div class="font-medium">{exercise.name}</div>
						<div class="flex flex-wrap gap-1 mt-1.5">
							<span
								class="inline-block px-2 py-0.5 rounded-full text-xs font-medium {categoryColors[
									exercise.category
								] || 'bg-gray-100 text-gray-800'}"
							>
								{exercise.category.replace('_', ' ')}
							</span>
							{#each exercise.muscle_groups.slice(0, 3) as mg}
								<span
									class="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600"
								>
									{mg.replace('_', ' ')}
								</span>
							{/each}
						</div>
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
