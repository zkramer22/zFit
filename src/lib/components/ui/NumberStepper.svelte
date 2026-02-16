<script lang="ts">
	interface Props {
		value: number | null;
		step?: number;
		min?: number;
		max?: number;
		label?: string;
		unit?: string;
		onchange: (value: number | null) => void;
	}

	let { value, step = 1, min = 0, max = 9999, label = '', unit = '', onchange }: Props = $props();

	function increment() {
		const current = value ?? 0;
		const next = Math.min(current + step, max);
		onchange(next);
	}

	function decrement() {
		const current = value ?? 0;
		const next = Math.max(current - step, min);
		onchange(next);
	}

	function handleInput(e: Event) {
		const target = e.target as HTMLInputElement;
		const parsed = parseFloat(target.value);
		onchange(isNaN(parsed) ? null : parsed);
	}
</script>

<div class="flex flex-col items-center gap-1">
	{#if label}
		<span class="text-xs text-text-muted font-medium">{label}</span>
	{/if}
	<div class="flex items-center gap-0">
		<button
			type="button"
			onclick={decrement}
			class="w-10 h-10 flex items-center justify-center rounded-l-lg bg-surface-dim border border-border
				text-lg font-bold text-text-muted active:bg-surface-hover touch-target"
		>
			&minus;
		</button>
		<input
			type="number"
			{value}
			oninput={handleInput}
			class="w-14 h-10 text-center border-y border-border bg-surface text-sm font-semibold
				[appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
		/>
		<button
			type="button"
			onclick={increment}
			class="w-10 h-10 flex items-center justify-center rounded-r-lg bg-surface-dim border border-border
				text-lg font-bold text-text-muted active:bg-surface-hover touch-target"
		>
			+
		</button>
	</div>
	{#if unit}
		<span class="text-xs text-text-muted">{unit}</span>
	{/if}
</div>
