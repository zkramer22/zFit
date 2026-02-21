<script lang="ts">
	let { data } = $props();
</script>

<svelte:head>
	<title>Workouts — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<h1 class="text-2xl font-bold mb-4">Workouts</h1>

	<div class="space-y-2">
		{#each data.workouts as workout (workout.id)}
			<a
				href="/workouts/{workout.id}"
				class="block p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover
					transition-colors active:scale-[0.99]"
			>
				<div class="flex items-start justify-between gap-2">
					<div class="flex-1 min-w-0">
						<div class="font-medium">{workout.name}</div>
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

		{#if data.workouts.length === 0}
			<div class="text-center py-8 text-text-muted">
				<p>No workouts yet.</p>
			</div>
		{/if}
	</div>
</div>
