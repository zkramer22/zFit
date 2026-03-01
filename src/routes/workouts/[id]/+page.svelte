<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import type { Workout, Exercise, WorkoutExerciseExpanded } from '$lib/pocketbase/types';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { dragHandleZone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import ExerciseListItem from '$lib/components/ExerciseListItem.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { WORKOUT_TAGS, SET_UNITS, DISTANCE_UNITS, getLabel } from '$lib/constants';
	import { formatTarget } from '$lib/utils/format';
	import { NumberStepper } from '$lib/components/ui/number-stepper';
	import { SelectButton } from '$lib/components/ui/select-button';
	import type { SetUnit, DistanceUnit } from '$lib/pocketbase/types';

	let workout = $state<Workout | null>(null);
	let allExercises = $state<Exercise[]>([]);
	let loading = $state(true);

	// Tag editing
	let editTags = $state<string[]>([]);
	let tagsSnapshot: string[] | null = $state(null);

	function toggleEditTag(tag: string) {
		if (editTags.includes(tag)) {
			editTags = editTags.filter(t => t !== tag);
		} else {
			editTags = [...editTags, tag];
		}
	}

	async function saveTags() {
		if (!workout) return;
		saving = true;
		try {
			await pb.collection('workouts').update(workout.id, { tags: editTags });
			workout.tags = [...editTags];
		} catch (err) {
			console.error('Failed to save tags:', err);
		} finally {
			saving = false;
		}
	}

	const flipDurationMs = 200;

	const sectionLabels: Record<string, string> = {
		warmup: 'Warm-Up',
		main: 'Main Block',
		core: 'Core',
		cooldown: 'Cooldown'
	};

	const sectionOrder = ['warmup', 'main', 'core', 'cooldown'];

	let editing = $state(false);
	let saving = $state(false);

	// Snapshot for undo — captured when entering edit mode
	let snapshot: typeof sections | null = $state(null);
	// Track changes during edit session for undo
	let addedIds: string[] = $state([]);
	let deletedItems: { sectionKey: string; item: any }[] = $state([]);

	// Build mutable section groups for dnd
	let sections = $state<{ key: string; label: string; items: any[] }[]>([]);

	// When editing, show all section slots so user can add exercises to any section
	const displaySections = $derived(
		editing
			? sectionOrder.map(key => {
				const existing = sections.find(s => s.key === key);
				return existing || { key, label: sectionLabels[key] || key, items: [] };
			})
			: sections
	);

	function buildSections(exercises: WorkoutExerciseExpanded[]) {
		const groups: Record<string, any[]> = {};
		for (const we of exercises) {
			const s = we.section || 'main';
			if (!groups[s]) groups[s] = [];
			groups[s].push({ ...we });
		}
		return sectionOrder
			.filter(s => groups[s]?.length)
			.map(s => ({ key: s, label: sectionLabels[s] || s, items: groups[s] }));
	}

	async function loadWorkout() {
		loading = true;
		const id = $page.params.id!;
		try {
			const [w, wes, exs] = await Promise.all([
				pb.collection('workouts').getOne<Workout>(id),
				pb.collection('workout_exercises').getFullList<WorkoutExerciseExpanded>({
					filter: `workout = "${id}"`,
					sort: 'order',
					expand: 'exercise'
				}),
				pb.collection('exercises').getFullList<Exercise>({ sort: 'name' })
			]);
			workout = w;
			allExercises = exs;
			editTags = [...(w.tags || [])];
			sections = buildSections(wes);

			// Auto-enter edit mode if ?edit=1
			if ($page.url.searchParams.get('edit') === '1') {
				enterEditMode();
				history.replaceState({}, '', $page.url.pathname);
			}
		} catch (err) {
			console.error('Failed to load workout:', err);
		} finally {
			loading = false;
		}
	}

	$effect(() => { loadWorkout(); });

	function enterEditMode() {
		snapshot = sections.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) }));
		tagsSnapshot = [...editTags];
		addedIds = [];
		deletedItems = [];
		editing = true;
	}

	function exitEditMode() {
		if (JSON.stringify(editTags) !== JSON.stringify(workout?.tags || [])) {
			saveTags();
		}
		snapshot = null;
		tagsSnapshot = null;
		addedIds = [];
		deletedItems = [];
		addingToSection = null;
		editingTargetId = null;
		editing = false;
	}

	async function undoEdits() {
		if (!snapshot || !workout) return;
		saving = true;
		try {
			for (const id of addedIds) {
				await pb.collection('workout_exercises').delete(id);
			}
			for (const { sectionKey, item } of deletedItems) {
				await pb.collection('workout_exercises').create({
					workout: workout.id,
					exercise: item.exercise || item.expand?.exercise?.id,
					section: sectionKey,
					order: item.order || 0
				});
			}
			sections = snapshot.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) }));
			await persistOrder();
			if (tagsSnapshot) {
				editTags = [...tagsSnapshot];
				if (JSON.stringify(editTags) !== JSON.stringify(workout.tags || [])) {
					await saveTags();
				}
			}
		} catch (err) {
			console.error('Failed to undo:', err);
		} finally {
			saving = false;
			snapshot = null;
			tagsSnapshot = null;
			addedIds = [];
			deletedItems = [];
			addingToSection = null;
			editingTargetId = null;
			editing = false;
		}
	}

	function handleConsider(sectionKey: string, e: CustomEvent<{ items: any[] }>) {
		const section = sections.find(s => s.key === sectionKey);
		if (section) section.items = e.detail.items;
	}

	function handleFinalize(sectionKey: string, e: CustomEvent<{ items: any[] }>) {
		const section = sections.find(s => s.key === sectionKey);
		if (section) {
			section.items = e.detail.items;
			persistOrder();
		}
	}

	async function persistOrder() {
		saving = true;
		try {
			let orderCounter = 1;
			for (const section of sections) {
				for (const item of section.items) {
					await pb.collection('workout_exercises').update(item.id, { order: orderCounter });
					orderCounter++;
				}
			}
		} catch (err) {
			console.error('Failed to save order:', err);
		} finally {
			saving = false;
		}
	}

	async function deleteExercise(sectionKey: string, itemId: string) {
		const section = sections.find(s => s.key === sectionKey);
		const item = section?.items.find(i => i.id === itemId);
		if (item) deletedItems = [...deletedItems, { sectionKey, item: { ...item } }];

		saving = true;
		try {
			await pb.collection('workout_exercises').delete(itemId);

			const section = sections.find(s => s.key === sectionKey);
			if (section) {
				section.items = section.items.filter(i => i.id !== itemId);
				if (section.items.length === 0) {
					sections = sections.filter(s => s.key !== sectionKey);
				}
			}
			persistOrder();
		} catch (err) {
			console.error('Failed to delete exercise:', err);
		} finally {
			saving = false;
		}
	}

	let addingToSection = $state<string | null>(null);

	async function addExercise(sectionKey: string, exerciseId: string) {
		if (!workout) return;
		saving = true;
		addingToSection = null;
		try {
			const record = await pb.collection('workout_exercises').create<WorkoutExerciseExpanded>(
				{
					workout: workout.id,
					exercise: exerciseId,
					section: sectionKey,
					order: sections.flatMap(s => s.items).length + 1
				},
				{ expand: 'exercise' }
			);
			addedIds = [...addedIds, record.id];
			openTargetEditor(record);

			let section = sections.find(s => s.key === sectionKey);
			if (section) {
				section.items = [...section.items, record];
			} else {
				const insertIdx = sectionOrder.indexOf(sectionKey);
				const newSection = { key: sectionKey, label: sectionLabels[sectionKey] || sectionKey, items: [record] };
				let placed = false;
				for (let i = 0; i < sections.length; i++) {
					if (sectionOrder.indexOf(sections[i].key) > insertIdx) {
						sections = [...sections.slice(0, i), newSection, ...sections.slice(i)];
						placed = true;
						break;
					}
				}
				if (!placed) sections = [...sections, newSection];
			}
		} catch (err) {
			console.error('Failed to add exercise:', err);
		} finally {
			saving = false;
		}
	}

	// Inline target editing
	let editingTargetId = $state<string | null>(null);
	let editSets = $state<number | null>(null);
	let editReps = $state<number | null>(null);
	let editValue = $state('');
	let editUnit = $state<SetUnit>('lb');
	let editDistance = $state('');
	let editDistanceUnit = $state<DistanceUnit | null>(null);
	let showDistanceRow = $state(false);

	function openTargetEditor(item: any) {
		editingTargetId = item.id;
		editSets = item.target_sets || null;
		editReps = item.target_reps ? Number(item.target_reps) || null : null;
		editValue = item.target_value || '';
		editUnit = item.target_unit || 'lb';
		editDistance = item.target_distance || '';
		editDistanceUnit = item.target_distance_unit || null;
		showDistanceRow = !!(item.target_distance);
	}

	async function saveTarget() {
		if (!editingTargetId) return;
		saving = true;
		try {
			await pb.collection('workout_exercises').update(editingTargetId, {
				target_sets: editSets || 0,
				target_reps: editReps ? String(editReps) : '',
				target_value: editValue,
				target_unit: editUnit,
				target_distance: editDistance,
				target_distance_unit: editDistanceUnit
			});
			for (const section of sections) {
				const item = section.items.find(i => i.id === editingTargetId);
				if (item) {
					item.target_sets = editSets || 0;
					item.target_reps = editReps ? String(editReps) : '';
					item.target_value = editValue;
					item.target_unit = editUnit;
					item.target_distance = editDistance;
					item.target_distance_unit = editDistanceUnit;
					break;
				}
			}
			editingTargetId = null;
		} catch (err) {
			console.error('Failed to save target:', err);
		} finally {
			saving = false;
		}
	}

	let drawerSearch = $state('');

	function promptDeleteWorkout() {
		if (!workout) return;
		const w = workout;
		dialogStore.confirm({
			title: 'Delete workout?',
			description: `This will permanently delete <strong>${w.name}</strong>.`,
			confirmLabel: 'Delete',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			async onConfirm() {
				const wes = await pb.collection('workout_exercises').getFullList({
					filter: `workout = "${w.id}"`
				});
				for (const we of wes) {
					await pb.collection('workout_exercises').delete(we.id);
				}
				await pb.collection('workouts').delete(w.id);
				await goto('/workouts');
			}
		});
	}

	function availableExercises() {
		const usedIds = new Set(sections.flatMap(s => s.items.map(i => i.exercise || i.expand?.exercise?.id)));
		let list = allExercises.filter(e => !usedIds.has(e.id));
		if (drawerSearch) {
			const q = drawerSearch.toLowerCase();
			list = list.filter(e =>
				e.name.toLowerCase().includes(q) ||
				e.category.toLowerCase().includes(q) ||
				e.muscle_groups?.some(mg => mg.toLowerCase().includes(q))
			);
		}
		return list;
	}
</script>

<svelte:head>
	<title>{workout?.name ?? 'Loading...'} — zFit</title>
</svelte:head>

{#if loading}
	<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
		<div class="flex items-center gap-3 max-w-lg mx-auto">
			<div class="w-5 h-5 rounded bg-surface-dim animate-pulse"></div>
			<div class="h-5 w-40 rounded bg-surface-dim animate-pulse"></div>
		</div>
	</div>
	<div class="p-4 max-w-lg mx-auto space-y-6">
		{#each Array(3) as _}
			<div>
				<div class="h-4 w-24 rounded bg-surface-dim animate-pulse mb-3"></div>
				<div class="space-y-2">
					{#each Array(3) as _}
						<div class="h-16 rounded-xl bg-surface-dim animate-pulse"></div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
{:else if workout}
	<!-- Sticky header -->
	<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
		<div class="flex items-center justify-between max-w-lg mx-auto">
			<div class="flex items-center gap-3 min-w-0">
				<button type="button" onclick={() => history.back()} class="text-text-muted hover:text-text shrink-0" aria-label="Go back">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<h1 class="font-bold text-lg leading-tight truncate">{workout.name}</h1>
				{#if saving}
					<span class="text-xs text-primary animate-pulse shrink-0">Saving...</span>
				{/if}
			</div>
			{#if editing}
				<div class="flex items-center gap-1">
					<button type="button" disabled={saving} onclick={undoEdits} class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors disabled:opacity-50" aria-label="Undo all changes">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
						</svg>
					</button>
					<button type="button" disabled={saving} onclick={exitEditMode} class="p-2 rounded-lg text-primary bg-primary/10 transition-colors disabled:opacity-50" aria-label="Done editing">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
						</svg>
					</button>
				</div>
			{:else}
				<button type="button" disabled={saving} onclick={enterEditMode} class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors disabled:opacity-50" aria-label="Edit workout">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
					</svg>
				</button>
			{/if}
		</div>
	</div>

	<div class="p-4 max-w-lg mx-auto">
		{#if workout.description}
			<p class="text-sm text-text-muted mb-3">{workout.description}</p>
		{/if}

		<!-- Tags -->
		{#if editing}
			<div class="mb-5">
				<span class="block text-sm font-medium mb-1.5">Tags</span>
				<div class="flex flex-wrap gap-1.5">
					{#each WORKOUT_TAGS as tag}
						<button type="button" onclick={() => toggleEditTag(tag.value)}
							class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors
								{editTags.includes(tag.value)
								? 'bg-primary text-text-on-primary border border-transparent'
								: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}">
							{tag.label}
						</button>
					{/each}
				</div>
			</div>
		{:else if workout.tags?.length}
			<div class="flex flex-wrap gap-1.5 mb-4">
				{#each workout.tags as tag}
					<span class="inline-block px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{getLabel(WORKOUT_TAGS, tag)}</span>
				{/each}
			</div>
		{/if}

		<div class="space-y-6">
			{#each displaySections as section}
				<div>
					<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
						{section.label}
					</h2>
					{#if editing}
						<div class="space-y-2"
							use:dragHandleZone={{ items: section.items, flipDurationMs, dropTargetStyle: {} }}
							onconsider={(e) => handleConsider(section.key, e)}
							onfinalize={(e) => handleFinalize(section.key, e)}>
							{#each section.items as item (item.id)}
								<div animate:flip={{ duration: flipDurationMs }}>
									{#if item.expand?.exercise}
										<ExerciseListItem
											exercise={item.expand.exercise}
											target={formatTarget(item)}
											editing
											ondelete={() => deleteExercise(section.key, item.id)}
											oneditTarget={() => openTargetEditor(item)}
										/>
										{#if editingTargetId === item.id}
											<div class="mt-1 p-3 rounded-xl border border-primary/30 bg-primary/5 space-y-2">
												<!-- Row 1: Sets + Reps + Value -->
												<div class="flex gap-2">
													<div class="flex-1 min-w-0">
														<span class="block text-xs font-medium text-text-muted mb-1">Sets</span>
														<NumberStepper value={editSets} onchange={(v) => editSets = v} min={1} />
													</div>
													<div class="flex-1 min-w-0">
														<span class="block text-xs font-medium text-text-muted mb-1">Reps</span>
														<NumberStepper value={editReps} onchange={(v) => editReps = v} min={1} />
													</div>
													<div class="flex-1 min-w-0">
														<span class="block text-xs font-medium text-text-muted mb-1">Value</span>
														<NumberStepper
															value={editValue ? Number(editValue) : null}
															onchange={(v) => editValue = v != null ? String(v) : ''}
															step={editUnit === 'lb' || editUnit === 'kg' ? 5 : 1}
															disabled={editUnit === 'bw' || editUnit === 'band'}
														/>
													</div>
												</div>
												<!-- Row 2: Unit selector -->
												<div>
													<span class="block text-xs font-medium text-text-muted mb-1">Unit</span>
													<SelectButton options={SET_UNITS} value={editUnit} onchange={(v) => editUnit = v as SetUnit} />
												</div>
												<!-- Row 3: Distance (collapsible) -->
												{#if showDistanceRow}
													<div class="flex gap-2 items-end">
														<div class="flex-1">
															<span class="block text-xs font-medium text-text-muted mb-1">Distance</span>
															<NumberStepper
																value={editDistance ? Number(editDistance) : null}
																onchange={(v) => editDistance = v != null ? String(v) : ''}
															/>
														</div>
														<div class="flex-1">
															<span class="block text-xs font-medium text-text-muted mb-1">Dist. Unit</span>
															<SelectButton options={DISTANCE_UNITS} value={editDistanceUnit || ''} onchange={(v) => editDistanceUnit = v as DistanceUnit} />
														</div>
														<button type="button" onclick={() => { showDistanceRow = false; editDistance = ''; editDistanceUnit = null; }} class="p-1.5 rounded-lg text-text-muted hover:text-red-500 hover:bg-red-500/10 transition-colors shrink-0 self-end" aria-label="Remove distance">
															<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
														</button>
													</div>
												{:else}
													<button type="button" onclick={() => { showDistanceRow = true; editDistanceUnit = 'yds'; }} class="text-xs text-primary hover:text-primary-dark transition-colors">+ Add distance</button>
												{/if}
												<!-- Row 4: Cancel / Save -->
												<div class="flex gap-2">
													<button type="button" onclick={() => editingTargetId = null} class="flex-1 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface-hover transition-colors">Cancel</button>
													<button type="button" onclick={saveTarget} disabled={saving} class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium text-text-on-primary bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50">Save</button>
												</div>
											</div>
										{/if}
									{/if}
								</div>
							{/each}
						</div>

						<!-- Add exercise button -->
						<button type="button" onclick={() => { addingToSection = section.key; drawerSearch = ''; }}
							class="mt-2 w-full p-2 rounded-lg border border-dashed border-border text-sm text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1">
							<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
								<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
							</svg>
							Add Exercise
						</button>
					{:else}
						<div class="space-y-2">
							{#each section.items as item (item.id)}
								{#if item.expand?.exercise}
									<ExerciseListItem exercise={item.expand.exercise} target={formatTarget(item)} />
								{/if}
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>

		<!-- Actions section (edit mode only) -->
		{#if editing}
			<div class="mt-8 pt-6 border-t border-border">
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Actions</h2>
				<button
					type="button"
					onclick={promptDeleteWorkout}
					class="w-full p-3 rounded-xl border border-red-300 text-red-600 text-sm font-medium
						hover:bg-red-50 transition-colors flex items-center justify-center gap-2"
				>
					<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
					</svg>
					Delete Workout
				</button>
			</div>
		{/if}
	</div>

	<!-- Add Exercise Drawer -->
	<Drawer open={addingToSection !== null} onclose={() => addingToSection = null}>
		<h2 class="text-lg font-bold mb-3">Add Exercise</h2>

		<!-- Search -->
		<div class="relative mb-3">
			<svg class="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
				<path stroke-linecap="round" stroke-linejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
			</svg>
			<input type="text" bind:value={drawerSearch} placeholder="Search exercises..."
				class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm
					placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
		</div>

		<!-- Exercise list -->
		<div class="space-y-2">
			{#each availableExercises() as exercise (exercise.id)}
				<ExerciseListItem
					{exercise}
					onselect={() => {
						if (addingToSection) addExercise(addingToSection, exercise.id);
					}}
				/>
			{/each}

			{#if availableExercises().length === 0}
				<div class="text-center py-8 text-text-muted">
					<p>No exercises found.</p>
				</div>
			{/if}
		</div>
	</Drawer>
{/if}
