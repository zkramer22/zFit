<script lang="ts">
	import type { PageData } from './$types';

	let { data } = $props();

	const sectionColors: Record<number, string> = {
		1: 'border-l-warmup',
		2: 'border-l-main',
		3: 'border-l-cooldown'
	};
</script>

<svelte:head>
	<title>Log — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<h1 class="text-2xl font-bold mb-1">Start a Workout</h1>
	<p class="text-text-muted text-sm mb-6">Choose a program day or go freeform.</p>

	<div class="grid gap-3">
		{#each data.programs as program}
			<form method="POST" action="?/start">
				<input type="hidden" name="programId" value={program.id} />
				<button
					type="submit"
					class="w-full text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover
						transition-colors active:scale-[0.98] touch-target"
				>
					<div class="font-semibold text-lg">{program.name}</div>
					{#if program.description}
						<div class="text-sm text-text-muted mt-1">{program.description}</div>
					{/if}
				</button>
			</form>
		{/each}

		<!-- Freeform option -->
		<form method="POST" action="?/start">
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
</div>
