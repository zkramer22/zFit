<script lang="ts">
	import { navigate } from 'sv-router/generated';
</script>

<div class="p-8 max-w-md mx-auto">
	<h1 class="text-3xl font-bold mb-4">zFit</h1>
	<p class="text-text-muted mb-6">
		SPA migration shell — phase A. If you can read this, sv-router and Vite are wired up correctly.
	</p>
	<button
		type="button"
		onclick={() => navigate('/about')}
		class="px-4 py-2 rounded-lg bg-primary text-text-on-primary"
	>
		Test navigate → /about
	</button>
</div>
