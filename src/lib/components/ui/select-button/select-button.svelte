<script lang="ts">
	import { cn } from '$lib/utils.js';

	interface Option {
		label: string;
		value: string;
	}

	interface Props {
		options: Option[];
		value: string;
		onchange: (value: string) => void;
		class?: string;
	}

	let { options, value, onchange, class: className }: Props = $props();

	let containerEl = $state<HTMLDivElement | null>(null);
	let indicatorStyle = $state('');

	$effect(() => {
		if (!containerEl) return;
		// Read `value` to create a reactive dependency
		const _v = value;
		// Wait a tick so the DOM is settled
		requestAnimationFrame(() => {
			if (!containerEl) return;
			const buttons = containerEl.querySelectorAll<HTMLButtonElement>('[data-select-btn]');
			const activeIdx = options.findIndex(o => o.value === _v);
			const btn = buttons[activeIdx];
			if (!btn) {
				indicatorStyle = 'opacity: 0';
				return;
			}
			const containerRect = containerEl.getBoundingClientRect();
			const btnRect = btn.getBoundingClientRect();
			indicatorStyle = `left: ${btnRect.left - containerRect.left}px; width: ${btnRect.width}px; opacity: 1`;
		});
	});
</script>

<div
	bind:this={containerEl}
	class={cn('relative flex items-center h-[30px] rounded-lg bg-surface-dim p-0.5', className)}
>
	<!-- Sliding indicator -->
	<div
		class="absolute top-0.5 bottom-0.5 rounded-md bg-primary/10 shadow-sm transition-all duration-200 ease-out"
		style={indicatorStyle}
	></div>

	{#each options as option}
		<button
			data-select-btn
			type="button"
			onclick={() => onchange(option.value)}
			class={cn(
				'relative z-10 flex-1 h-full rounded-md text-xs font-medium transition-colors duration-200',
				value === option.value
					? 'text-primary'
					: 'text-text-muted hover:text-text'
			)}
		>
			{option.label}
		</button>
	{/each}
</div>
