<script lang="ts">
	import type { Component } from 'svelte';

	interface Props {
		icon: Component;
		label: string;
		/** Primary marks the confirming action, e.g. Done or Create. */
		primary?: boolean;
		disabled?: boolean;
		type?: 'button' | 'submit';
		form?: string;
		onclick?: () => void;
	}

	let { icon: Icon, label, primary = false, disabled = false, type = 'button', form, onclick }: Props = $props();
</script>

<button
	{type}
	{form}
	{disabled}
	{onclick}
	aria-label={label}
	class="p-2 rounded-lg transition-colors disabled:opacity-50
		{primary ? 'text-primary bg-primary/10' : 'text-text-muted hover:bg-surface-hover'}"
>
	<Icon class="w-5 h-5" />
</button>
