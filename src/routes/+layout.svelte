<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';

	let { children } = $props();

	const navItems = [
		{ href: '/log', label: 'Log', icon: 'edit' },
		{ href: '/exercises', label: 'Exercises', icon: 'list' },
		{ href: '/more', label: 'More', icon: 'menu' }
	];

	function isActive(href: string, pathname: string): boolean {
		return pathname.startsWith(href);
	}
</script>

<!-- Top nav (desktop) -->
<header class="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
	<a href="/log" class="text-xl font-bold text-primary">zFit</a>
	<nav class="flex gap-1">
		{#each navItems as item}
			<a
				href={item.href}
				class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
					{isActive(item.href, $page.url.pathname) ? 'bg-primary text-text-on-primary' : 'text-text-muted hover:bg-surface-hover'}"
			>
				{item.label}
			</a>
		{/each}
	</nav>
</header>

<!-- Main content -->
<main class="pb-20 md:pb-4 min-h-screen">
	{@render children()}
</main>

<!-- Bottom nav (mobile) -->
<nav class="md:hidden fixed bottom-0 left-0 right-0 bg-surface border-t border-border z-50 shrink-0"
	style="padding-bottom: env(safe-area-inset-bottom)">
	<div class="flex items-center h-14">
		{#each navItems as item}
			<a
				href={item.href}
				class="flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-xs font-medium transition-colors
					{isActive(item.href, $page.url.pathname) ? 'text-primary' : 'text-text-muted'}"
			>
				{#if item.icon === 'edit'}
					<svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
					</svg>
				{:else if item.icon === 'list'}
					<svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
					</svg>
				{:else}
					<svg class="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				{/if}
				<span>{item.label}</span>
			</a>
		{/each}
	</div>
</nav>
