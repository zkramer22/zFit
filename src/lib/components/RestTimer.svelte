<script lang="ts">
	import { restTimerStore } from '$lib/stores/restTimer.svelte';
	import { countdownTimerStore } from '$lib/stores/countdownTimer.svelte';

	const formatTime = (seconds: number) => {
		const m = Math.floor(seconds / 60);
		const s = seconds % 60;
		return `${m}:${s.toString().padStart(2, '0')}`;
	};

	// Tick rest timer every second while running
	$effect(() => {
		if (!restTimerStore.running) return;
		const interval = setInterval(() => restTimerStore.tick(), 1000);
		return () => clearInterval(interval);
	});

	// Tick countdown timer every second while running
	$effect(() => {
		if (!countdownTimerStore.running) return;
		const interval = setInterval(() => countdownTimerStore.tick(), 250);
		return () => clearInterval(interval);
	});

	const progress = $derived(
		countdownTimerStore.total > 0
			? ((countdownTimerStore.total - countdownTimerStore.remaining) / countdownTimerStore.total) * 100
			: 0
	);
</script>

{#if countdownTimerStore.running}
	<!-- Work timer (countdown) -->
	<button
		type="button"
		onclick={() => countdownTimerStore.reset()}
		class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50
			px-5 py-3 rounded-full bg-surface/90 backdrop-blur border border-primary/40 shadow-lg
			flex items-center gap-3 transition-all active:scale-95
			md:bottom-8"
	>
		<!-- Circular progress -->
		<svg class="w-10 h-10 -rotate-90 shrink-0" viewBox="0 0 24 24">
			<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2" class="text-surface-dim" />
			<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2.5" class="text-primary transition-all"
				stroke-dasharray={2 * Math.PI * 10}
				stroke-dashoffset={2 * Math.PI * 10 * (1 - progress / 100)}
				stroke-linecap="round"
			/>
		</svg>
		<div class="flex flex-col items-start">
			<span class="text-[10px] font-semibold uppercase tracking-wide text-primary leading-none">Work</span>
			<span class="text-2xl font-semibold tabular-nums text-primary leading-tight">{formatTime(countdownTimerStore.remaining)}</span>
		</div>
		<svg class="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>
{:else if restTimerStore.running}
	<!-- Rest timer (count up) -->
	<button
		type="button"
		onclick={() => restTimerStore.reset()}
		class="fixed bottom-24 left-1/2 -translate-x-1/2 z-50
			px-5 py-3 rounded-full bg-surface/90 backdrop-blur border border-border shadow-lg
			flex items-center gap-3 transition-all active:scale-95
			md:bottom-8"
	>
		<div class="w-10 h-10 shrink-0 flex items-center justify-center">
			<span class="w-3 h-3 rounded-full bg-green-500 animate-pulse"></span>
		</div>
		<div class="flex flex-col items-start">
			<span class="text-[10px] font-semibold uppercase tracking-wide text-green-600 leading-none">Rest</span>
			<span class="text-2xl font-semibold tabular-nums leading-tight">{formatTime(restTimerStore.elapsed)}</span>
		</div>
		<svg class="w-5 h-5 text-text-muted shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>
{/if}
