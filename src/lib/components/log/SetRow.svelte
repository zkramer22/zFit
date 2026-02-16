<script lang="ts">
	import NumberStepper from '$lib/components/ui/NumberStepper.svelte';
	import type { SetData } from '$lib/pocketbase/types';

	interface Props {
		setIndex: number;
		set: SetData;
		onupdate: (field: keyof SetData, value: unknown) => void;
		onremove: () => void;
	}

	let { setIndex, set, onupdate, onremove }: Props = $props();

	let confirmed = $state(false);
</script>

<div class="flex items-center gap-2 py-2 px-3 rounded-lg {confirmed ? 'bg-green-50 border border-green-200' : 'bg-surface-dim'}">
	<!-- Set number -->
	<span class="text-xs font-bold text-text-muted w-6 shrink-0">S{setIndex + 1}</span>

	<!-- Weight stepper -->
	<NumberStepper
		value={set.weight}
		step={5}
		label="Weight"
		unit="lb"
		onchange={(v) => onupdate('weight', v)}
	/>

	<!-- Reps stepper -->
	<NumberStepper
		value={set.reps}
		step={1}
		label="Reps"
		onchange={(v) => onupdate('reps', v)}
	/>

	<!-- Confirm checkmark -->
	<button
		type="button"
		onclick={() => confirmed = !confirmed}
		class="w-10 h-10 flex items-center justify-center rounded-lg border transition-colors touch-target
			{confirmed ? 'bg-success text-white border-success' : 'border-border text-text-muted hover:bg-surface-hover'}"
		aria-label={confirmed ? 'Unconfirm set' : 'Confirm set'}
	>
		<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="3">
			<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
		</svg>
	</button>

	<!-- Remove set -->
	<button
		type="button"
		onclick={onremove}
		class="w-8 h-8 flex items-center justify-center rounded text-text-muted hover:text-danger transition-colors"
		aria-label="Remove set"
	>
		<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
			<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
		</svg>
	</button>
</div>
