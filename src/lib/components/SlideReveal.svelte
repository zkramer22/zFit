<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		duration?: number;
		children: Snippet;
	}

	let { open, duration = 300, children }: Props = $props();
</script>

<div
	class="grid"
	style="grid-template-rows: {open ? '1fr' : '0fr'}; transition: grid-template-rows {duration}ms ease;"
>
	<div class="overflow-hidden">
		{@render children()}
	</div>
</div>
