<script lang="ts">
	let { label }: { label: string } = $props();
</script>

{#if label}
	<span class="inline-block text-xs px-1.5 py-0.5 rounded border border-border-strong text-text-muted font-medium">{label}</span>
{/if}
