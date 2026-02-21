<script lang="ts">
	let { data } = $props();

	const sectionLabels: Record<string, string> = {
		warmup: 'Warm-Up',
		main: 'Main Block',
		core: 'Core',
		cooldown: 'Cooldown'
	};

	const sectionColors: Record<string, string> = {
		warmup: 'border-l-warmup',
		main: 'border-l-main',
		core: 'border-l-core',
		cooldown: 'border-l-cooldown'
	};

	const sectionOrder = ['warmup', 'main', 'core', 'cooldown'];

	const grouped = $derived(() => {
		const sections: Record<string, typeof data.exercises> = {};
		for (const we of data.exercises) {
			const s = we.section || 'main';
			if (!sections[s]) sections[s] = [];
			sections[s].push(we);
		}
		return sectionOrder
			.filter(s => sections[s]?.length)
			.map(s => ({ key: s, label: sectionLabels[s] || s, exercises: sections[s] }));
	});

	function formatTarget(we: typeof data.exercises[0]): string {
		const parts = [];
		if (we.target_sets) parts.push(`${we.target_sets}x`);
		if (we.target_reps) parts.push(we.target_reps);
		if (we.target_weight && we.target_weight !== 'bw') parts.push(`@ ${we.target_weight}`);
		return parts.join('') || '';
	}
</script>

<svelte:head>
	<title>{data.workout.name} — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<a
		href="/workouts"
		class="inline-flex items-center gap-1 text-sm text-text-muted hover:text-text mb-4"
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
		</svg>
		Workouts
	</a>

	<h1 class="text-2xl font-bold mb-1">{data.workout.name}</h1>
	{#if data.workout.description}
		<p class="text-sm text-text-muted mb-6">{data.workout.description}</p>
	{/if}

	<div class="space-y-6">
		{#each grouped() as section}
			<div>
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
					{section.label}
				</h2>
				<div class="space-y-2">
					{#each section.exercises as we}
						{@const exercise = we.expand?.exercise}
						{@const target = formatTarget(we)}
						<div class="p-3 rounded-xl border border-border border-l-4 {sectionColors[section.key] || 'border-l-main'} bg-surface">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1 min-w-0">
									<div class="font-medium">{exercise?.name || 'Unknown'}</div>
									{#if target}
										<span class="inline-block text-xs text-text-muted bg-surface-dim px-2 py-0.5 rounded mt-1">
											{target}
										</span>
									{/if}
									{#if we.notes}
										<p class="text-xs text-text-muted mt-1 italic">{we.notes}</p>
									{/if}
								</div>
								{#if exercise}
									<a
										href="/exercises/{exercise.id}"
										class="text-xs text-primary hover:underline shrink-0 mt-0.5"
									>
										View
									</a>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
