<script lang="ts">
	import Button from '$lib/components/Button.svelte';

	interface Props {
		workoutName: string;
		date: string;
		sessionId: string;
		saving: boolean;
	}

	let { workoutName, date, sessionId, saving }: Props = $props();

	let elapsed = $state(0);

	// Update elapsed timer every 30s
	$effect(() => {
		const interval = setInterval(() => {
			elapsed++;
		}, 30000);
		return () => clearInterval(interval);
	});

	const formatDate = (d: string) => {
		return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
			weekday: 'short',
			month: 'short',
			day: 'numeric'
		});
	};
</script>

<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
	<div class="flex items-center justify-between max-w-lg mx-auto">
		<div>
			<h1 class="font-bold text-lg leading-tight">{workoutName || 'Freeform Session'}</h1>
			<div class="flex items-center gap-2 text-sm text-text-muted">
				<span>{formatDate(date)}</span>
				{#if saving}
					<span class="text-xs text-primary animate-pulse">Saving...</span>
				{/if}
			</div>
		</div>
		<form method="POST" action="/log/{sessionId}?/finish">
			<Button type="submit" variant="primary" size="md">
				Finish
			</Button>
		</form>
	</div>
</div>
