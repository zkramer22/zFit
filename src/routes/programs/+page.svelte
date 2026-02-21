<script lang="ts">
	let { data } = $props();

	let showCreateForm = $state(false);
</script>

<svelte:head>
	<title>Programs — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<div class="flex items-center justify-between mb-6">
		<div>
			<h1 class="text-2xl font-bold">Programs</h1>
			<p class="text-text-muted text-sm">Multi-day workout sequences.</p>
		</div>
		<button
			type="button"
			onclick={() => showCreateForm = !showCreateForm}
			class="px-3 py-2 rounded-lg text-sm font-medium bg-primary text-text-on-primary
				hover:bg-primary/90 transition-colors active:scale-[0.98]"
		>
			{showCreateForm ? 'Cancel' : 'New'}
		</button>
	</div>

	<!-- Create program form -->
	{#if showCreateForm}
		<form method="POST" action="?/createProgram" class="mb-6 p-4 rounded-xl border border-border bg-surface">
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
				<button
					type="submit"
					class="w-full py-2 rounded-lg text-sm font-medium bg-primary text-text-on-primary
						hover:bg-primary/90 transition-colors"
				>
					Create Program
				</button>
			</div>
		</form>
	{/if}

	<!-- Programs list -->
	{#if data.programs.length === 0}
		<div class="text-center py-12 text-text-muted">
			<p class="text-lg font-medium">No programs yet</p>
			<p class="text-sm mt-1">Create a program to organize your workouts into a rotation.</p>
		</div>
	{:else}
		<div class="space-y-4">
			{#each data.programs as program}
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
								<form method="POST" action="?/deactivate">
									<input type="hidden" name="programId" value={program.id} />
									<button type="submit" class="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted
										hover:bg-surface-hover transition-colors">
										Deactivate
									</button>
								</form>
							{:else}
								<form method="POST" action="?/setActive">
									<input type="hidden" name="programId" value={program.id} />
									<button type="submit" class="text-xs px-3 py-1.5 rounded-lg bg-primary/10 text-primary font-medium
										hover:bg-primary/20 transition-colors">
										Set Active
									</button>
								</form>
							{/if}
							<form method="POST" action="?/deleteProgram"
								onsubmit={(e) => { if (!confirm('Delete this program?')) e.preventDefault(); }}>
								<input type="hidden" name="programId" value={program.id} />
								<button type="submit" class="text-xs px-3 py-1.5 rounded-lg text-danger hover:bg-danger/10 transition-colors">
									Delete
								</button>
							</form>
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
									<form method="POST" action="?/removeWorkout">
										<input type="hidden" name="programWorkoutId" value={pw.id} />
										<button type="submit" class="w-8 h-8 flex items-center justify-center rounded-lg text-text-muted
											hover:bg-surface-hover hover:text-danger transition-colors" title="Remove from program">
											<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</form>
								</div>
							{/each}
						{/if}

						<!-- Add workout to program -->
						<div class="p-3 border-t border-border bg-surface-dim/30">
							<form method="POST" action="?/addWorkout" class="flex gap-2">
								<input type="hidden" name="programId" value={program.id} />
								<select name="workoutId" required
									class="flex-1 px-3 py-2 rounded-lg border border-border bg-surface text-sm">
									<option value="" disabled selected>Add a workout...</option>
									{#each data.allWorkouts as workout}
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
