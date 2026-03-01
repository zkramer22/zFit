<script lang="ts">
	import { cn } from '$lib/utils.js';
	import { Minus, Plus } from 'lucide-svelte';

	interface Props {
		value: number | null;
		onchange: (value: number | null) => void;
		step?: number;
		min?: number;
		class?: string;
		inputClass?: string;
		disabled?: boolean;
	}

	let {
		value,
		onchange,
		step = 1,
		min = 0,
		class: className,
		inputClass,
		disabled = false,
	}: Props = $props();

	let inputEl = $state<HTMLInputElement | null>(null);

	function incr() {
		onchange((value || 0) + step);
	}

	function decr() {
		const current = value || 0;
		if (current > min) onchange(Math.max(min, current - step));
	}

	function handleKeydown(e: KeyboardEvent) {
		// Allow: backspace, delete, tab, escape, enter, arrows
		if (['Backspace', 'Delete', 'Tab', 'Escape', 'Enter', 'ArrowLeft', 'ArrowRight'].includes(e.key)) return;
		// Allow one decimal point
		if (e.key === '.' && !(e.target as HTMLInputElement).value.includes('.')) return;
		// Block anything that isn't a digit
		if (e.key < '0' || e.key > '9') e.preventDefault();
	}

	function handleInput(e: Event) {
		const el = e.target as HTMLInputElement;
		// Strip any non-numeric chars that slipped through (e.g. paste)
		el.value = el.value.replace(/[^\d.]/g, '');
		const raw = el.value;
		if (raw === '') {
			onchange(null);
			return;
		}
		const parsed = parseFloat(raw);
		if (!isNaN(parsed) && parsed >= min) {
			onchange(parsed);
		}
	}

	function handleBlur(e: FocusEvent) {
		const raw = (e.target as HTMLInputElement).value;
		if (raw === '') {
			onchange(null);
		}
	}
</script>

<div class={cn('flex items-center h-[30px] min-w-0 rounded-lg border border-border bg-surface overflow-hidden', className)}>
	<button
		type="button"
		{disabled}
		onclick={decr}
		class="px-2 h-full text-text-muted hover:bg-surface-hover transition-colors disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
		aria-label="Decrease"
	>
		<Minus class="w-3 h-3" strokeWidth={2.5} />
	</button>
	<input
		bind:this={inputEl}
		type="text"
		inputmode="decimal"
		{disabled}
		value={value ?? ''}
		onkeydown={handleKeydown}
		oninput={handleInput}
		onblur={handleBlur}
		class={cn(
			'flex-1 min-w-0 h-full text-center text-sm font-medium tabular-nums bg-transparent outline-none border-none p-0',
			value != null ? 'text-text' : 'text-text-muted',
			disabled && 'cursor-not-allowed opacity-40',
			inputClass
		)}
	/>
	<button
		type="button"
		{disabled}
		onclick={incr}
		class="px-2 h-full text-text-muted hover:bg-surface-hover transition-colors disabled:cursor-not-allowed disabled:opacity-40 shrink-0"
		aria-label="Increase"
	>
		<Plus class="w-3 h-3" strokeWidth={2.5} />
	</button>
</div>
