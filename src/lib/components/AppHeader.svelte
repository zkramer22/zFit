<script lang="ts">
	import { navigate, route } from 'sv-router/generated';
	import { untrack } from 'svelte';
	import { ChevronLeft } from '@lucide/svelte';
	import { routeHeader, backAction } from '$lib/header/routes';
	import { pageHeader } from '$lib/header/header.svelte';
	import { liveStores } from '$lib/stores/liveStores';
	import { combineStatus, type LiveStatus } from '$lib/live/status';

	const defaults = $derived(routeHeader(route.pathname));
	const page = $derived(pageHeader.current);
	const title = $derived(page.title ?? defaults.title);

	// Counts navigations inside the app, so back knows whether there's history to return to.
	let inAppNavigations = 0;
	let lastPath = '';
	$effect(() => {
		const path = route.pathname;
		untrack(() => {
			if (lastPath && path !== lastPath) inAppNavigations++;
			lastPath = path;
		});
	});

	function goBack() {
		if (!defaults.back) return;
		const action = backAction(inAppNavigations, defaults.back);
		if (action.kind === 'history') history.back();
		else navigate(action.href);
	}

	const status = $derived(combineStatus(liveStores.map((s) => s.status)));
	const statusLook: Record<LiveStatus, { color: string; label: string }> = {
		live: { color: 'bg-green-500', label: 'Live' },
		syncing: { color: 'bg-amber-400', label: 'Syncing' },
		loading: { color: 'bg-amber-400', label: 'Loading' },
		reconnecting: { color: 'bg-amber-400', label: 'Reconnecting' },
		offline: { color: 'bg-gray-400', label: 'Offline, showing saved data' }
	};
</script>

<svelte:head>
	<title>{title ? `${title} — zFit` : 'zFit'}</title>
</svelte:head>

<header
	class="sticky top-0 z-40 shrink-0 bg-surface border-b border-border px-4 py-3"
	style="padding-top: max(0.75rem, env(safe-area-inset-top))"
>
	<div class="flex items-center justify-between gap-3 max-w-lg mx-auto">
		<div class="flex items-center gap-3 min-w-0 flex-1">
			{#if defaults.back}
				<button type="button" onclick={goBack} class="text-text-muted hover:text-text shrink-0" aria-label="Go back">
					<ChevronLeft class="w-5 h-5" />
				</button>
			{/if}
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2 min-w-0">
					{#if page.titleEditor}
						{@render page.titleEditor()}
					{:else if title}
						<h1 class="font-bold text-lg leading-tight truncate">{title}</h1>
					{:else}
						<div class="h-5 w-40 rounded bg-surface-dim animate-pulse"></div>
					{/if}
					<span
						class="w-2 h-2 rounded-full shrink-0 {statusLook[status].color}"
						role="status"
						aria-label={statusLook[status].label}
						title={statusLook[status].label}
					></span>
				</div>
				{#if page.subtitle}
					{@render page.subtitle()}
				{/if}
			</div>
		</div>
		{#if page.actions}
			<div class="flex items-center gap-1 shrink-0">
				{@render page.actions()}
			</div>
		{/if}
	</div>
	{#if page.below}
		<div class="max-w-lg mx-auto">
			{@render page.below()}
		</div>
	{/if}
</header>
