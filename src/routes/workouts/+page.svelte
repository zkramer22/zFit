<script lang="ts">
	import { WORKOUT_TAGS, getLabel } from '$lib/constants';
	import ArrowUpNarrowWide from 'lucide-svelte/icons/arrow-up-narrow-wide';
	import ArrowDownNarrowWide from 'lucide-svelte/icons/arrow-down-narrow-wide';
	import SlideReveal from '$lib/components/SlideReveal.svelte';

	let { data } = $props();

	let showCreateForm = $state(false);
	let searchQuery = $state('');
	let activeTag = $state('all');
	let sortBy = $state<'name' | 'newest' | 'exercises'>('name');
	let sortAsc = $state(true);

	let selectedTags = $state<string[]>([]);

	function toggleTag(tag: string) {
		if (selectedTags.includes(tag)) {
			selectedTags = selectedTags.filter(t => t !== tag);
		} else {
			selectedTags = [...selectedTags, tag];
		}
	}

	const filterTags = [{ value: 'all', label: 'All' }, ...WORKOUT_TAGS];

	const filtered = $derived(() => {
		const q = searchQuery.toLowerCase();
		let list = data.workouts.filter((w) => {
			// Tag filter
			if (activeTag !== 'all') {
				if (!(w.tags || []).includes(activeTag)) return false;
			}
			// Search filter
			if (q) {
				const nameMatch = w.name.toLowerCase().includes(q);
				const descMatch = w.description?.toLowerCase().includes(q);
				const tagMatch = (w.tags || []).some((t: string) => t.toLowerCase().includes(q));
				const metaMatch = (data.searchMeta[w.id] || '').includes(q);
				if (!nameMatch && !descMatch && !tagMatch && !metaMatch) return false;
			}
			return true;
		});

		// Sort
		const dir = sortAsc ? 1 : -1;
		if (sortBy === 'name') {
			list.sort((a, b) => dir * a.name.localeCompare(b.name));
		} else if (sortBy === 'newest') {
			// Recent: compare updated timestamps (PB ISO string format)
			list.sort((a, b) => dir * ((a.updated ?? '').localeCompare(b.updated ?? '')));
		} else if (sortBy === 'exercises') {
			list.sort((a, b) => dir * ((data.exerciseCounts[a.id] || 0) - (data.exerciseCounts[b.id] || 0)));
		}

		return list;
	});
</script>

<svelte:head>
	<title>Workouts — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-bold">Workouts</h1>
		<button
			type="button"
			onclick={() => { showCreateForm = !showCreateForm; if (!showCreateForm) selectedTags = []; }}
			class="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-text-on-primary
				hover:bg-primary/90 transition-colors active:scale-[0.98]"
		>
			{showCreateForm ? 'Cancel' : 'New'}
		</button>
	</div>

	<!-- Create workout form -->
	<SlideReveal open={showCreateForm}>
		<form method="POST" action="?/createWorkout" class="mb-6 p-4 rounded-xl border border-border bg-surface">
			<div class="space-y-3">
				<div>
					<label for="workout-name" class="block text-sm font-medium mb-1">Name</label>
					<input
						id="workout-name"
						name="name"
						type="text"
						required
						placeholder="e.g., Upper Body Push"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
					/>
				</div>
				<div>
					<label for="workout-desc" class="block text-sm font-medium mb-1">Description</label>
					<input
						id="workout-desc"
						name="description"
						type="text"
						placeholder="Optional description"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
					/>
				</div>
				<div>
					<span class="block text-sm font-medium mb-1">Tags</span>
					<div class="flex flex-wrap gap-1.5">
						{#each WORKOUT_TAGS as tag}
							<button
								type="button"
								onclick={() => toggleTag(tag.value)}
								class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors
									{selectedTags.includes(tag.value)
									? 'bg-primary text-text-on-primary'
									: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
							>
								{tag.label}
							</button>
						{/each}
					</div>
					{#each selectedTags as tag}
						<input type="hidden" name="tags" value={tag} />
					{/each}
				</div>
				<button
					type="submit"
					class="w-full py-2 rounded-lg text-sm font-medium bg-primary text-text-on-primary
						hover:bg-primary/90 transition-colors"
				>
					Create Workout
				</button>
			</div>
		</form>
	</SlideReveal>

	<!-- Search + sort -->
	<div class="flex items-center gap-2 mb-3">
		<div class="relative flex-1">
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
				placeholder="Search workouts..."
				class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm
					placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
			/>
		</div>
		<select
			bind:value={sortBy}
			onchange={() => { sortAsc = sortBy === 'name'; }}
			class="shrink-0 w-[100px] h-[42px] px-2 rounded-lg border border-border bg-surface text-sm text-text-muted"
		>
			<option value="name">Name</option>
			<option value="newest">Recent</option>
			<option value="exercises">Exercises</option>
		</select>
		<button
			type="button"
			onclick={() => sortAsc = !sortAsc}
			class="shrink-0 h-[42px] w-[42px] flex items-center justify-center rounded-lg border border-border bg-surface text-text-muted hover:bg-surface-hover transition-colors"
			aria-label={sortAsc ? 'Sort descending' : 'Sort ascending'}
		>
			{#if sortAsc}
				<ArrowUpNarrowWide size={18} />
			{:else}
				<ArrowDownNarrowWide size={18} />
			{/if}
		</button>
	</div>

	<!-- Tag filters -->
	<div class="flex gap-2 overflow-x-auto pb-3 mb-4 -mx-4 px-4 no-scrollbar">
		{#each filterTags as tag}
			<button
				type="button"
				onclick={() => (activeTag = tag.value)}
				class="shrink-0 px-3 py-1.5 rounded-full text-sm font-medium transition-colors
					{activeTag === tag.value
					? 'bg-primary text-text-on-primary'
					: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
			>
				{tag.label}
			</button>
		{/each}
	</div>

	<!-- Workout list -->
	<div class="space-y-2">
		{#each filtered() as workout (workout.id)}
			<a
				href="/workouts/{workout.id}"
				class="block p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover
					transition-colors active:scale-[0.99]"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1 min-w-0">
						<div class="font-medium">{workout.name}</div>
						{#if workout.tags?.length}
							<div class="flex flex-wrap gap-1 mt-1">
								{#each workout.tags as tag}
									<span class="inline-block px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{getLabel(WORKOUT_TAGS, tag)}</span>
								{/each}
							</div>
						{/if}
						{#if workout.description}
							<div class="text-sm text-text-muted mt-1">{workout.description}</div>
						{/if}
						<div class="text-xs text-text-muted mt-1.5">
							{data.exerciseCounts[workout.id] || 0} exercises
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
				<p>No workouts found.</p>
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
