<script lang="ts">
	import { pb } from '$lib/pocketbase/client';
	import type { Program, ProgramWorkoutExpanded, Workout } from '$lib/pocketbase/types';
	import SlideReveal from '$lib/components/SlideReveal.svelte';

	let programs = $state<(Program & { workouts: ProgramWorkoutExpanded[] })[]>([]);
	let allWorkouts = $state<Workout[]>([]);
	let loading = $state(true);
	let showCreateForm = $state(false);

	async function loadPrograms() {
		loading = true;
		try {
			const [progs, pws, ws] = await Promise.all([
				pb.collection('programs').getFullList<Program>({ sort: '-active,name' }),
				pb.collection('program_workouts').getFullList<ProgramWorkoutExpanded>({
					sort: 'day_number',
					expand: 'workout'
				}),
				pb.collection('workouts').getFullList<Workout>({ sort: 'name' })
			]);

			// Group program_workouts by program
			const pwsByProgram = new Map<string, ProgramWorkoutExpanded[]>();
			for (const pw of pws) {
				const list = pwsByProgram.get(pw.program) || [];
				list.push(pw);
				pwsByProgram.set(pw.program, list);
			}

			programs = progs.map(p => ({
				...p,
				workouts: pwsByProgram.get(p.id) || []
			}));
			allWorkouts = ws;
		} catch (err) {
			console.error('Failed to load programs:', err);
		} finally {
			loading = false;
		}
	}

	$effect(() => { loadPrograms(); });

	async function createProgram(e: SubmitEvent) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const name = (formData.get('name') as string)?.trim();
		if (!name) return;

		await pb.collection('programs').create({
			name,
			description: formData.get('description') || '',
			active: false
		});

		form.reset();
		showCreateForm = false;
		await loadPrograms();
	}

	async function deleteProgram(programId: string) {
		if (!confirm('Delete this program?')) return;
		await pb.collection('programs').delete(programId);
		await loadPrograms();
	}

	async function setActive(programId: string) {
		// Deactivate all first
		for (const p of programs) {
			if (p.active) {
				await pb.collection('programs').update(p.id, { active: false });
			}
		}
		await pb.collection('programs').update(programId, { active: true });
		await loadPrograms();
	}

	async function deactivate(programId: string) {
		await pb.collection('programs').update(programId, { active: false });
		await loadPrograms();
	}

	async function addWorkout(e: SubmitEvent, programId: string) {
		e.preventDefault();
		const form = e.target as HTMLFormElement;
		const formData = new FormData(form);
		const workoutId = formData.get('workoutId') as string;
		if (!workoutId) return;

		const program = programs.find(p => p.id === programId);
		const nextDay = (program?.workouts.length || 0) + 1;

		await pb.collection('program_workouts').create({
			program: programId,
			workout: workoutId,
			day_number: nextDay
		});

		form.reset();
		await loadPrograms();
	}

	async function removeWorkout(programWorkoutId: string) {
		await pb.collection('program_workouts').delete(programWorkoutId);
		await loadPrograms();
	}
</script>

<svelte:head>
	<title>Programs — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold">Programs</h1>
		</div>
		{#if showCreateForm}
			<div class="flex items-center gap-1">
				<button
					type="button"
					onclick={() => (showCreateForm = false)}
					class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
					aria-label="Cancel"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
				<button
					type="submit"
					form="create-program-form"
					class="p-2 rounded-lg text-primary bg-primary/10 transition-colors"
					aria-label="Create program"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</button>
			</div>
		{:else}
			<button
				type="button"
				onclick={() => (showCreateForm = true)}
				class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors"
				aria-label="New program"
			>
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
			</button>
		{/if}
	</div>

	<!-- Create program form -->
	<SlideReveal open={showCreateForm}>
		<form id="create-program-form" onsubmit={createProgram} class="mb-6 p-4 rounded-xl border border-border bg-surface">
			<div class="space-y-3">
				<div>
					<label for="program-name" class="block text-sm font-medium mb-1">Program Name</label>
					<input
						id="program-name"
						name="name"
						type="text"
						required
						placeholder="e.g., 4-Day Upper/Lower Split"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
					/>
				</div>
				<div>
					<label for="program-desc" class="block text-sm font-medium mb-1">Description</label>
					<input
						id="program-desc"
						name="description"
						type="text"
						placeholder="Optional description"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm"
					/>
				</div>
			</div>
		</form>
	</SlideReveal>

	<!-- Programs list -->
	{#if loading}
		<div class="space-y-4">
			{#each Array(3) as _}
				<div class="h-40 rounded-xl bg-surface-dim animate-pulse"></div>
			{/each}
		</div>
	{:else if programs.length === 0}
		<div class="text-center py-12 text-text-muted">
			<p class="text-lg font-medium">No programs yet</p>
			<p class="text-sm mt-1">Create a program to organize your workouts into a rotation.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each programs as program (program.id)}
				<div class="rounded-xl border overflow-hidden
					{program.active ? 'border-primary ring-2 ring-primary/20' : 'border-border'}">
					<!-- Program header -->
					<div class="p-4 bg-surface">
						<div class="flex items-start justify-between gap-2">
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2">
									<h2 class="font-bold text-lg">{program.name}</h2>
									{#if program.active}
										<span class="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">Active</span>
									{/if}
								</div>
								{#if program.description}
									<p class="text-sm text-text-muted mt-0.5">{program.description}</p>
								{/if}
							</div>
						</div>

						<!-- Program actions -->
						<div class="flex gap-2 mt-3">
							{#if program.active}
								<button
									type="button"
									onclick={() => deactivate(program.id)}
									class="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted
										hover:bg-surface-hover transition-colors"
								>
									Deactivate
								</button>
							{:else}
								<button
									type="button"
									onclick={() => setActive(program.id)}
									class="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium
										hover:bg-primary/20 transition-colors"
								>
									Set Active
								</button>
							{/if}
							<button
								type="button"
								onclick={() => deleteProgram(program.id)}
								class="text-xs px-3 py-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors"
							>
								Delete
							</button>
						</div>
					</div>

					<!-- Workout days -->
					<div class="border-t border-border">
						{#if program.workouts.length === 0}
							<div class="p-4 text-sm text-text-muted text-center">
								No workouts assigned yet.
							</div>
						{:else}
							{#each program.workouts as pw, i}
								<div class="flex items-center justify-between px-4 py-3
									{i > 0 ? 'border-t border-border' : ''} bg-surface-dim/30">
									<div class="flex items-center gap-3">
										<span class="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-dim text-sm font-bold text-text-muted">
											{pw.day_number}
										</span>
										<span class="text-sm font-medium">{pw.expand?.workout?.name || 'Unknown'}</span>
									</div>
									<button
										type="button"
										onclick={() => removeWorkout(pw.id)}
										class="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted
											hover:bg-surface-hover hover:text-danger transition-colors"
										title="Remove from program"
									>
										<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
											<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
										</svg>
									</button>
								</div>
							{/each}
						{/if}

						<!-- Add workout to program -->
						<div class="p-3 border-t border-border bg-surface-dim/30">
							<form onsubmit={(e) => addWorkout(e, program.id)} class="flex gap-2">
								<select name="workoutId" required
									class="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm">
									<option value="" disabled selected>Add a workout...</option>
									{#each allWorkouts as workout}
										<option value={workout.id}>{workout.name}</option>
									{/each}
								</select>
								<button type="submit"
									class="px-3 py-2 rounded-lg text-sm font-medium bg-surface border border-border
										hover:bg-surface-hover transition-colors">
									Add
								</button>
							</form>
						</div>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</div>
