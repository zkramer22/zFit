<script lang="ts">
	import { dragHandleZone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import ExerciseListItem from '$lib/components/ExerciseListItem.svelte';
	import Drawer from '$lib/components/Drawer.svelte';
	import { WORKOUT_TAGS, getLabel } from '$lib/constants';

	let { data } = $props();

	// Tag editing
	let editTags = $state<string[]>([...(data.workout.tags || [])]);
	let tagsSnapshot: string[] | null = $state(null);

	function toggleEditTag(tag: string) {
		if (editTags.includes(tag)) {
			editTags = editTags.filter(t => t !== tag);
		} else {
			editTags = [...editTags, tag];
		}
	}

	async function saveTags() {
		saving = true;
		try {
			await fetch(`/workouts/${data.workout.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ tags: editTags })
			});
			data.workout.tags = [...editTags];
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
	let sections = $state(buildSections());

	function buildSections() {
		const groups: Record<string, any[]> = {};
		for (const we of data.exercises) {
			const s = we.section || 'main';
			if (!groups[s]) groups[s] = [];
			groups[s].push({ ...we });
		}
		return sectionOrder
			.filter(s => groups[s]?.length)
			.map(s => ({ key: s, label: sectionLabels[s] || s, items: groups[s] }));
	}

	function enterEditMode() {
		// Deep-clone sections for undo snapshot
		snapshot = sections.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) }));
		tagsSnapshot = [...editTags];
		addedIds = [];
		deletedItems = [];
		editing = true;
	}

	function exitEditMode() {
		// Persist tags if they changed
		if (JSON.stringify(editTags) !== JSON.stringify(data.workout.tags || [])) {
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
		if (!snapshot) return;
		saving = true;
		try {
			// Delete any exercises that were added during this edit session
			for (const id of addedIds) {
				await fetch(`/workouts/${data.workout.id}`, {
					method: 'DELETE',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ workoutExerciseId: id })
				});
			}
			// Re-create any exercises that were deleted during this edit session
			for (const { sectionKey, item } of deletedItems) {
				await fetch(`/workouts/${data.workout.id}`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ exercise: item.exercise || item.expand?.exercise?.id, section: sectionKey })
				});
			}
			// Restore sections from snapshot
			sections = snapshot.map(s => ({ ...s, items: s.items.map(i => ({ ...i })) }));
			// Re-persist the original order to the server
			await persistOrder();
			// Restore tags from snapshot
			if (tagsSnapshot) {
				editTags = [...tagsSnapshot];
				if (JSON.stringify(editTags) !== JSON.stringify(data.workout.tags || [])) {
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
			const updates: { id: string; order: number }[] = [];
			let orderCounter = 1;
			for (const section of sections) {
				for (const item of section.items) {
					updates.push({ id: item.id, order: orderCounter });
					orderCounter++;
				}
			}

			await fetch(`/workouts/${data.workout.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(updates)
			});
		} catch (err) {
			console.error('Failed to save order:', err);
		} finally {
			saving = false;
		}
	}

	async function deleteExercise(sectionKey: string, itemId: string) {
		// Track for undo (capture before deleting from state)
		const section = sections.find(s => s.key === sectionKey);
		const item = section?.items.find(i => i.id === itemId);
		if (item) deletedItems = [...deletedItems, { sectionKey, item: { ...item } }];

		saving = true;
		try {
			await fetch(`/workouts/${data.workout.id}`, {
				method: 'DELETE',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ workoutExerciseId: itemId })
			});

			const section = sections.find(s => s.key === sectionKey);
			if (section) {
				section.items = section.items.filter(i => i.id !== itemId);
				// Remove empty sections
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

	// Add exercise state per section
	let addingToSection = $state<string | null>(null);

	async function addExercise(sectionKey: string, exerciseId: string) {
		saving = true;
		addingToSection = null;
		try {
			const res = await fetch(`/workouts/${data.workout.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ exercise: exerciseId, section: sectionKey })
			});
			const record = await res.json();
			addedIds = [...addedIds, record.id];
			// Auto-open target editor for the new exercise
			openTargetEditor(record);

			let section = sections.find(s => s.key === sectionKey);
			if (section) {
				section.items = [...section.items, record];
			} else {
				// Section didn't exist yet, create it
				const insertIdx = sectionOrder.indexOf(sectionKey);
				const newSection = { key: sectionKey, label: sectionLabels[sectionKey] || sectionKey, items: [record] };
				// Find proper position
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

	function formatTarget(we: any): string {
		const parts = [];
		if (we.target_sets) parts.push(`${we.target_sets}x`);
		if (we.target_reps) parts.push(we.target_reps);
		if (we.target_weight && we.target_weight !== 'bw') parts.push(`@ ${we.target_weight}`);
		return parts.join('') || '';
	}

	// Inline target editing
	let editingTargetId = $state<string | null>(null);
	let editSets = $state<number | null>(null);
	let editReps = $state<number | null>(null);
	let editWeight = $state('');

	function openTargetEditor(item: any) {
		editingTargetId = item.id;
		editSets = item.target_sets || null;
		editReps = item.target_reps ? Number(item.target_reps) || null : null;
		editWeight = item.target_weight || '';
	}

	async function saveTarget() {
		if (!editingTargetId) return;
		saving = true;
		try {
			await fetch(`/workouts/${data.workout.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					id: editingTargetId,
					target_sets: editSets || 0,
					target_reps: editReps ? String(editReps) : '',
					target_weight: editWeight
				})
			});
			// Update local state
			for (const section of sections) {
				const item = section.items.find(i => i.id === editingTargetId);
				if (item) {
					item.target_sets = editSets || 0;
					item.target_reps = editReps ? String(editReps) : '';
					item.target_weight = editWeight;
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

	// Drawer search state
	let drawerSearch = $state('');

	// Filter out exercises already in the workout, then apply search
	function availableExercises() {
		const usedIds = new Set(sections.flatMap(s => s.items.map(i => i.exercise || i.expand?.exercise?.id)));
		let list = data.allExercises.filter(e => !usedIds.has(e.id));
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
	<title>{data.workout.name} — zFit</title>
</svelte:head>

<!-- Sticky header -->
<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
	<div class="flex items-center justify-between max-w-lg mx-auto">
		<div class="flex items-center gap-3 min-w-0">
			<a
				href="/workouts"
				class="text-text-muted hover:text-text shrink-0"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
				</svg>
			</a>
			<h1 class="font-bold text-lg leading-tight truncate">{data.workout.name}</h1>
			{#if saving}
				<span class="text-xs text-primary animate-pulse shrink-0">Saving...</span>
			{/if}
		</div>
		{#if editing}
			<div class="flex items-center gap-1">
				<!-- Undo button -->
				<button
					type="button"
					disabled={saving}
					onclick={undoEdits}
					class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors disabled:opacity-50"
					aria-label="Undo all changes"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />
					</svg>
				</button>
				<!-- Done (checkmark) button -->
				<button
					type="button"
					disabled={saving}
					onclick={exitEditMode}
					class="p-2 rounded-lg text-primary bg-primary/10 transition-colors disabled:opacity-50"
					aria-label="Done editing"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</button>
			</div>
		{:else}
			<!-- Pencil button -->
			<button
				type="button"
				disabled={saving}
				onclick={enterEditMode}
				class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors disabled:opacity-50"
				aria-label="Edit workout"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
				</svg>
			</button>
		{/if}
	</div>
</div>

<div class="p-4 max-w-lg mx-auto">
	{#if data.workout.description}
		<p class="text-sm text-text-muted mb-3">{data.workout.description}</p>
	{/if}

	<!-- Tags -->
	{#if editing}
		<div class="mb-5">
			<label class="block text-sm font-medium mb-1.5">Tags</label>
			<div class="flex flex-wrap gap-1.5">
				{#each WORKOUT_TAGS as tag}
					<button
						type="button"
						onclick={() => toggleEditTag(tag.value)}
						class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors
							{editTags.includes(tag.value)
							? 'bg-primary text-text-on-primary'
							: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
					>
						{tag.label}
					</button>
				{/each}
			</div>
		</div>
	{:else if data.workout.tags?.length}
		<div class="flex flex-wrap gap-1.5 mb-4">
			{#each data.workout.tags as tag}
				<span class="inline-block px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">{getLabel(WORKOUT_TAGS, tag)}</span>
			{/each}
		</div>
	{/if}

	<div class="space-y-6">
		{#each sections as section}
			<div>
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
					{section.label}
				</h2>
				{#if editing}
					<div
						class="space-y-2"
						use:dragHandleZone={{ items: section.items, flipDurationMs, dropTargetStyle: {} }}
						onconsider={(e) => handleConsider(section.key, e)}
						onfinalize={(e) => handleFinalize(section.key, e)}
					>
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
										<div class="mt-1 p-3 rounded-xl border border-primary/30 bg-primary/5">
											<div class="flex gap-3">
												<!-- Sets stepper -->
												<div class="flex-1">
													<span class="block text-xs font-medium text-text-muted mb-1">Sets</span>
													<div class="flex items-center gap-0 rounded-lg border border-border bg-surface overflow-hidden">
														<button
															type="button"
															onclick={() => { if (editSets && editSets > 1) editSets--; }}
															class="px-2.5 py-1.5 text-text-muted hover:bg-surface-hover transition-colors"
															aria-label="Decrease sets"
														>
															<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M5 12h14" /></svg>
														</button>
														<span class="flex-1 text-center text-sm font-medium tabular-nums {editSets ? 'text-text' : 'text-text-muted'}">{editSets ?? '—'}</span>
														<button
															type="button"
															onclick={() => editSets = (editSets || 0) + 1}
															class="px-2.5 py-1.5 text-text-muted hover:bg-surface-hover transition-colors"
															aria-label="Increase sets"
														>
															<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M12 5v14m7-7H5" /></svg>
														</button>
													</div>
												</div>
												<!-- Reps stepper -->
												<div class="flex-1">
													<span class="block text-xs font-medium text-text-muted mb-1">Reps</span>
													<div class="flex items-center gap-0 rounded-lg border border-border bg-surface overflow-hidden">
														<button
															type="button"
															onclick={() => { if (editReps && editReps > 1) editReps--; }}
															class="px-2.5 py-1.5 text-text-muted hover:bg-surface-hover transition-colors"
															aria-label="Decrease reps"
														>
															<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M5 12h14" /></svg>
														</button>
														<span class="flex-1 text-center text-sm font-medium tabular-nums {editReps ? 'text-text' : 'text-text-muted'}">{editReps ?? '—'}</span>
														<button
															type="button"
															onclick={() => editReps = (editReps || 0) + 1}
															class="px-2.5 py-1.5 text-text-muted hover:bg-surface-hover transition-colors"
															aria-label="Increase reps"
														>
															<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5"><path stroke-linecap="round" d="M12 5v14m7-7H5" /></svg>
														</button>
													</div>
												</div>
												<!-- Weight text input -->
												<div class="flex-1">
													<label for="edit-weight-{item.id}" class="block text-xs font-medium text-text-muted mb-1">Weight</label>
													<input
														id="edit-weight-{item.id}"
														type="text"
														placeholder="135lb"
														bind:value={editWeight}
														class="w-full px-2 py-1.5 rounded-lg border border-border bg-surface text-sm text-center
															focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
													/>
												</div>
											</div>
											<div class="flex gap-2 mt-2">
												<button
													type="button"
													onclick={() => editingTargetId = null}
													class="flex-1 px-3 py-1.5 rounded-lg text-sm text-text-muted hover:bg-surface-hover transition-colors"
												>
													Cancel
												</button>
												<button
													type="button"
													onclick={saveTarget}
													disabled={saving}
													class="flex-1 px-3 py-1.5 rounded-lg text-sm font-medium text-text-on-primary bg-primary hover:bg-primary-dark transition-colors disabled:opacity-50"
												>
													Save
												</button>
											</div>
										</div>
									{/if}
								{/if}
							</div>
						{/each}
					</div>

					<!-- Add exercise button -->
					<button
						type="button"
						onclick={() => { addingToSection = section.key; drawerSearch = ''; }}
						class="mt-2 w-full p-2 rounded-lg border border-dashed border-border text-sm text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
					>
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
</div>

<!-- Add Exercise Drawer -->
<Drawer open={addingToSection !== null} onclose={() => addingToSection = null}>
	<h2 class="text-lg font-bold mb-3">Add Exercise</h2>

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
			bind:value={drawerSearch}
			placeholder="Search exercises..."
			class="w-full pl-10 pr-4 py-2.5 rounded-lg border border-border bg-surface text-sm
				placeholder:text-text-muted focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"
		/>
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

