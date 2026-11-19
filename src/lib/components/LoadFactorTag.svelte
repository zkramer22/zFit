<script lang="ts">
	let { label }: { label: string } = $props();
</script>

{#if label}
	<span class="inline-block text-xs px-1.5 py-0.5 rounded bg-surface-dim text-text-muted font-medium">{label}</span>
{/if}
