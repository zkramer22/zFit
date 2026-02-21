<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Log — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	{#if data.activeProgram}
		<h1 class="text-2xl font-bold mb-1">{data.activeProgram.name}</h1>
		<p class="text-text-muted text-sm mb-6">Pick your next workout day.</p>

		<div class="grid gap-3">
			{#each data.programWorkouts as pw}
				{@const isSuggested = pw.day_number === data.suggestedDayNumber}
				<form method="POST" action="?/start">
					<input type="hidden" name="workoutId" value={pw.workout} />
					<input type="hidden" name="programId" value={data.activeProgram?.id} />
					<button
						type="submit"
						class="w-full text-left p-4 rounded-xl border transition-colors active:scale-[0.98] touch-target
							{isSuggested
								? 'border-primary ring-2 ring-primary/20 bg-surface'
								: 'border-border bg-surface hover:bg-surface-hover'}"
					>
						{#if isSuggested}
							<span class="inline-block text-xs font-bold text-primary uppercase tracking-wide mb-1">Next Up</span>
						{/if}
						<div class="font-semibold text-lg">Day {pw.day_number}</div>
						<div class="text-sm text-text-muted mt-0.5">{pw.expand?.workout?.name || 'Workout'}</div>
						{#if pw.expand?.workout?.description}
							<div class="text-xs text-text-muted mt-1">{pw.expand.workout.description}</div>
						{/if}
					</button>
				</form>
			{/each}
		</div>

		<!-- All workouts section -->
		{#if data.allWorkouts.length > data.programWorkouts.length}
			<details class="mt-6">
				<summary class="text-sm text-text-muted cursor-pointer hover:text-text">
					Or pick any workout...
				</summary>
				<div class="grid gap-3 mt-3">
					{#each data.allWorkouts as workout}
						<form method="POST" action="?/start">
							<input type="hidden" name="workoutId" value={workout.id} />
							<button
								type="submit"
								class="w-full text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover
									transition-colors active:scale-[0.98] touch-target"
							>
								<div class="font-semibold text-lg">{workout.name}</div>
								{#if workout.description}
									<div class="text-sm text-text-muted mt-1">{workout.description}</div>
								{/if}
							</button>
						</form>
					{/each}
				</div>
			</details>
		{/if}
	{:else}
		<h1 class="text-2xl font-bold mb-1">Workouts</h1>
		<p class="text-text-muted text-sm mb-6">Choose a workout or go freeform.</p>

		<div class="grid gap-3">
			{#each data.allWorkouts as workout}
				<form method="POST" action="?/start">
					<input type="hidden" name="workoutId" value={workout.id} />
					<button
						type="submit"
						class="w-full text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover
							transition-colors active:scale-[0.98] touch-target"
					>
						<div class="font-semibold text-lg">{workout.name}</div>
						{#if workout.description}
							<div class="text-sm text-text-muted mt-1">{workout.description}</div>
						{/if}
					</button>
				</form>
			{/each}
		</div>
	{/if}

	<!-- Freeform option (always available) -->
	<form method="POST" action="?/start" class="mt-4">
		<button
			type="submit"
			class="w-full text-left p-4 rounded-xl border border-dashed border-border-strong bg-surface-dim
				hover:bg-surface-hover transition-colors active:scale-[0.98] touch-target"
		>
			<div class="font-semibold text-lg text-text-muted">Freeform Session</div>
			<div class="text-sm text-text-muted mt-1">Start without a template — add exercises as you go.</div>
		</button>
	</form>
</div>
