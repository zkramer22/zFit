<script lang="ts">
	import { route } from 'sv-router/generated';
	import { untrack } from 'svelte';
	import { saveScrollPosition, getScrollPosition } from '$lib/stores/scrollPosition.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { CalendarDays, List, Dumbbell, Settings } from '@lucide/svelte';

	let { children } = $props();

	const navItems = [
		{ href: '/', label: 'Home', icon: CalendarDays },
		{ href: '/workouts', label: 'Workouts', icon: Dumbbell },
		{ href: '/exercises', label: 'Exercises', icon: List },
		{ href: '/settings', label: 'Settings', icon: Settings },
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}

	let mainEl = $state<HTMLElement>();
	let pendingPopstate = false;

	function getScrollContainer(): HTMLElement | Window {
		if (mainEl && getComputedStyle(mainEl).overflowY !== 'visible') return mainEl;
		return window;
	}

	function getScrollTop(): number {
		const c = getScrollContainer();
		return c instanceof Window ? c.scrollY : c.scrollTop;
	}

	function setScrollTop(v: number): void {
		const c = getScrollContainer();
		if (c instanceof Window) c.scrollTo(0, v);
		else c.scrollTop = v;
	}

	// Continuously save scroll for the current pathname
	$effect(() => {
		const target: HTMLElement | Window =
			mainEl && getComputedStyle(mainEl).overflowY !== 'visible' ? mainEl : window;
		const handler = () => {
			saveScrollPosition(route.pathname, getScrollTop());
		};
		target.addEventListener('scroll', handler, { passive: true });
		return () => target.removeEventListener('scroll', handler);
	});

	// Detect popstate (back/forward) so the next pathname change can restore scroll
	$effect(() => {
		const handler = () => { pendingPopstate = true; };
		window.addEventListener('popstate', handler, { capture: true });
		return () => window.removeEventListener('popstate', handler, { capture: true });
	});

	// On route change, restore scroll if popstate
	$effect(() => {
		const current = route.pathname;
		untrack(() => {
			if (pendingPopstate) {
				const saved = getScrollPosition(current);
				if (saved !== undefined) {
					requestAnimationFrame(() => setScrollTop(saved));
				}
				pendingPopstate = false;
			}
		});
	});
</script>

<!-- Top nav (desktop) -->
<header class="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
	<a href="/" class="text-xl font-bold text-primary">zFit</a>
	<nav class="flex gap-1">
		{#each navItems as item}
			<a
				href={item.href}
				class="relative px-4 py-2 rounded-lg text-sm font-medium transition-colors
					{isActive(item.href, route.pathname) ? 'bg-primary text-text-on-primary' : 'text-text-muted hover:bg-surface-hover'}"
			>
				{item.label}
				{#if item.href === '/settings' && notificationStore.unreadCount > 0}
					<span class="absolute top-1 right-1 w-2 h-2 rounded-full bg-danger"></span>
				{/if}
			</a>
		{/each}
	</nav>
</header>

<div class="md:contents flex flex-col h-dvh">
	<!-- Main content -->
	<main bind:this={mainEl} class="flex-1 overflow-y-auto md:overflow-visible md:pb-4">
		{@render children()}
	</main>

	<!-- Bottom nav (mobile) -->
	<nav class="md:hidden bg-surface border-t border-border shrink-0"
		style="padding-bottom: env(safe-area-inset-bottom)">
		<div class="flex items-center h-14">
			{#each navItems as item}
				{@const active = isActive(item.href, route.pathname)}
				<a
					href={item.href}
					class="group flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-xs font-medium transition-colors
						{active ? 'text-primary' : 'text-text-muted'}"
				>
					<div class="relative flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-200
						{active ? 'bg-primary/12' : 'group-active:bg-primary/8'}">
						<item.icon class="w-5 h-5 shrink-0" />
						{#if item.href === '/settings' && notificationStore.unreadCount > 0}
							<span class="absolute top-0 right-2 w-2 h-2 rounded-full bg-primary"></span>
						{/if}
					</div>
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>
