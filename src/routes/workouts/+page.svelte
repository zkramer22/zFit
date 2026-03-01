<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import type { Workout, WorkoutExerciseExpanded } from '$lib/pocketbase/types';
	import { WORKOUT_TAGS, getLabel } from '$lib/constants';
	import ArrowUpNarrowWide from 'lucide-svelte/icons/arrow-up-narrow-wide';
	import ArrowDownNarrowWide from 'lucide-svelte/icons/arrow-down-narrow-wide';
	import SlideReveal from '$lib/components/SlideReveal.svelte';
	import { dialogStore } from '$lib/stores/dialog.svelte';

	let workouts = $state<Workout[]>([]);
	let exerciseCounts = $state<Record<string, number>>({});
	let searchMeta = $state<Record<string, string>>({});
	let loading = $state(true);

	let showCreateForm = $state(false);
	let editingList = $state(false);
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

	async function loadWorkouts() {
		loading = true;
		const [ws, allWE] = await Promise.all([
			pb.collection('workouts').getFullList<Workout>({ sort: 'name' }),
			pb.collection('workout_exercises').getFullList<WorkoutExerciseExpanded>({ expand: 'exercise' })
		]);

		const counts: Record<string, number> = {};
		const meta: Record<string, string> = {};
		const byWorkout = new Map<string, WorkoutExerciseExpanded[]>();

		for (const we of allWE) {
			const list = byWorkout.get(we.workout) || [];
			list.push(we);
			byWorkout.set(we.workout, list);
		}

		for (const w of ws) {
			const wes = byWorkout.get(w.id) || [];
			counts[w.id] = wes.filter(we => we.section !== 'warmup').length;

			const parts: string[] = [];
			for (const we of wes) {
				const ex = we.expand?.exercise;
				if (ex) {
					parts.push(ex.name, ex.category, ...(ex.muscle_groups || []));
				}
			}
			meta[w.id] = parts.join(' ').toLowerCase();
		}

		workouts = ws;
		exerciseCounts = counts;
		searchMeta = meta;
		loading = false;
	}

	$effect(() => { loadWorkouts(); });

	const filtered = $derived(() => {
		const q = searchQuery.toLowerCase();
		let list = workouts.filter((w) => {
			if (activeTag !== 'all') {
				if (!(w.tags || []).includes(activeTag)) return false;
			}
			if (q) {
				const nameMatch = w.name.toLowerCase().includes(q);
				const descMatch = w.description?.toLowerCase().includes(q);
				const tagMatch = (w.tags || []).some((t: string) => t.toLowerCase().includes(q));
				const metaMatch = (searchMeta[w.id] || '').includes(q);
				if (!nameMatch && !descMatch && !tagMatch && !metaMatch) return false;
			}
			return true;
		});

		const dir = sortAsc ? 1 : -1;
		if (sortBy === 'name') {
			list.sort((a, b) => dir * a.name.localeCompare(b.name));
		} else if (sortBy === 'newest') {
			list.sort((a, b) => dir * ((a.updated ?? '').localeCompare(b.updated ?? '')));
		} else if (sortBy === 'exercises') {
			list.sort((a, b) => dir * ((exerciseCounts[a.id] || 0) - (exerciseCounts[b.id] || 0)));
		}

		return list;
	});

	async function createWorkout(e: SubmitEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const name = (formData.get('name') as string)?.trim();
		if (!name) return;

		const record = await pb.collection('workouts').create({
			name,
			description: formData.get('description') || '',
			tags: formData.getAll('tags')
		});

		selectedTags = [];
		showCreateForm = false;
		await goto(`/workouts/${record.id}?edit=1`);
	}

	function promptDeleteWorkout(workout: Workout) {
		dialogStore.confirm({
			title: 'Delete workout?',
			description: `This will permanently delete <strong>${workout.name}</strong>.`,
			confirmLabel: 'Delete',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			async onConfirm() {
				const wes = await pb.collection('workout_exercises').getFullList({
					filter: `workout = "${workout.id}"`
				});
				for (const we of wes) {
					await pb.collection('workout_exercises').delete(we.id);
				}
				await pb.collection('workouts').delete(workout.id);
				workouts = workouts.filter(w => w.id !== workout.id);
			}
		});
	}
</script>

<svelte:head>
	<title>Workouts — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<div class="flex items-center justify-between mb-4">
		<h1 class="text-2xl font-bold">Workouts</h1>
		{#if showCreateForm}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => { showCreateForm = false; selectedTags = []; }}
					class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
					aria-label="Cancel"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<button
					type="submit"
					form="create-workout-form"
					class="p-2 rounded-lg text-primary bg-primary/10 transition-colors"
					aria-label="Create workout"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</button>
			</div>
		{:else if editingList}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => editingList = false}
					class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
					aria-label="Cancel editing"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<button
					type="button"
					onclick={() => editingList = false}
					class="p-2 rounded-lg text-primary bg-primary/10 transition-colors"
					aria-label="Done editing"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</button>
			</div>
		{:else}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => editingList = true}
					class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
					aria-label="Edit workout list"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
				</button>
				<button
					type="button"
					onclick={() => (showCreateForm = true)}
					class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
					aria-label="New workout"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
					</svg>
				</button>
			</div>
		{/if}
	</div>

	<!-- Create workout form -->
	<SlideReveal open={showCreateForm}>
		<form id="create-workout-form" onsubmit={createWorkout} class="mb-6 p-4 rounded-xl border border-border bg-surface">
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
									? 'bg-primary text-text-on-primary border border-transparent'
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
					? 'bg-primary text-text-on-primary border border-transparent'
					: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
			>
				{tag.label}
			</button>
		{/each}
	</div>

	<!-- Workout list -->
	{#if loading}
		<div class="space-y-2">
			{#each Array(6) as _}
				<div class="h-20 rounded-xl bg-surface-dim animate-pulse"></div>
			{/each}
		</div>
	{:else}
		<div class="space-y-2">
			{#each filtered() as workout (workout.id)}
				<div class="relative">
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
									{exerciseCounts[workout.id] || 0} exercises
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
					{#if editingList}
						<button
							type="button"
							onclick={() => promptDeleteWorkout(workout)}
							class="absolute bottom-2 right-2 p-2 rounded-lg border border-border bg-surface text-text-muted
								hover:border-red-400 hover:text-red-500 transition-colors"
							aria-label="Delete {workout.name}"
						>
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
							</svg>
						</button>
					{/if}
				</div>
			{/each}

			{#if filtered().length === 0}
				<div class="text-center py-8 text-text-muted">
					<p>No workouts found.</p>
				</div>
			{/if}
		</div>
	{/if}
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
