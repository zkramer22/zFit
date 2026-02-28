<script lang="ts">
	import ExerciseListItem from '$lib/components/ExerciseListItem.svelte';
	import SlideReveal from '$lib/components/SlideReveal.svelte';
	import { CATEGORIES, MUSCLE_GROUPS } from '$lib/constants';
	import type { PageData } from './$types';

	let { data } = $props();

	let searchQuery = $state('');
	let activeCategory = $state('all');
	let showCreateForm = $state(false);

	const categoryFilters = [{ value: 'all', label: 'All' }, ...CATEGORIES];

	let selectedMuscleGroups = $state<string[]>([]);

	function toggleMuscleGroup(mg: string) {
		if (selectedMuscleGroups.includes(mg)) {
			selectedMuscleGroups = selectedMuscleGroups.filter(m => m !== mg);
		} else {
			selectedMuscleGroups = [...selectedMuscleGroups, mg];
		}
	}

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
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-bold">Exercises</h1>
		<button
			type="button"
			onclick={() => { showCreateForm = !showCreateForm; if (!showCreateForm) selectedMuscleGroups = []; }}
			class="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-text-on-primary
				hover:bg-primary/90 transition-colors active:scale-[0.98]"
		>
			{showCreateForm ? 'Cancel' : 'New'}
		</button>
	</div>

	<!-- Create exercise form -->
	<SlideReveal open={showCreateForm}>
		<form method="POST" action="?/createExercise" class="mb-6 p-4 rounded-xl border border-border bg-surface">
			<div class="space-y-3">
				<div>
					<label for="exercise-name" class="block text-sm font-medium mb-1">Name</label>
					<input
						id="exercise-name"
						name="name"
						type="text"
						required
						placeholder="e.g., Bulgarian Split Squat"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
					/>
				</div>
				<div>
					<label for="exercise-category" class="block text-sm font-medium mb-1">Category</label>
					<select
						id="exercise-category"
						name="category"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
					>
						{#each CATEGORIES as cat}
							<option value={cat.value}>{cat.label}</option>
						{/each}
					</select>
				</div>
				<div>
					<label class="block text-sm font-medium mb-1">Muscle Groups</label>
					<div class="flex flex-wrap gap-1.5">
						{#each MUSCLE_GROUPS as mg}
							<button
								type="button"
								onclick={() => toggleMuscleGroup(mg.value)}
								class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors
									{selectedMuscleGroups.includes(mg.value)
									? 'bg-primary text-text-on-primary'
									: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
							>
								{mg.label}
							</button>
						{/each}
					</div>
					{#each selectedMuscleGroups as mg}
						<input type="hidden" name="muscle_groups" value={mg} />
					{/each}
				</div>
				<div>
					<label for="exercise-desc" class="block text-sm font-medium mb-1">Description</label>
					<textarea
						id="exercise-desc"
						name="description"
						placeholder="Optional description"
						rows="2"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none"
					></textarea>
				</div>
				<button
					type="submit"
					class="w-full py-2 rounded-lg text-sm font-medium bg-primary text-text-on-primary
						hover:bg-primary/90 transition-colors"
				>
					Create Exercise
				</button>
			</div>
		</form>
	</SlideReveal>

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
		{#each categoryFilters as cat}
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
