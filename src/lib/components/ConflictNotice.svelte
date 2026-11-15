<script lang="ts">
	import type { Conflict } from '$lib/live/merge';

	interface Props {
		conflict: Conflict;
		onusetheirs: () => void;
	}

	let { conflict, onusetheirs }: Props = $props();
</script>

{#if conflict}
	<div class="flex items-center justify-between gap-2 px-3 py-1.5 rounded-lg bg-amber-50 border border-amber-200 text-xs text-amber-800">
		<span>{conflict === 'deleted' ? 'Deleted elsewhere' : 'Changed elsewhere'}</span>
		<button type="button" onclick={onusetheirs} class="font-medium underline underline-offset-2 hover:text-amber-950">
			{conflict === 'deleted' ? 'Remove' : 'Use theirs'}
		</button>
	</div>
{/if}
