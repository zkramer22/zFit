<script lang="ts">
	import { navigate, route } from 'sv-router/generated';
</script>

<div class="p-8 max-w-md mx-auto">
	<h1 class="text-3xl font-bold mb-4">About</h1>
	<p class="text-text-muted mb-2">Current pathname: <code>{route.pathname}</code></p>
	<button
		type="button"
		onclick={() => navigate('/')}
		class="px-4 py-2 rounded-lg bg-primary text-text-on-primary"
	>
		Back to /
	</button>
</div>
