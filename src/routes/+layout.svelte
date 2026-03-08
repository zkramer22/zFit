<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';
	import { goto, beforeNavigate, afterNavigate } from '$app/navigation';
	import { saveScrollPosition, getScrollPosition } from '$lib/stores/scrollPosition.svelte';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { exerciseCache } from '$lib/stores/exerciseCache.svelte';
	import { workoutCache } from '$lib/stores/workoutCache.svelte';
	import { workoutExerciseCache } from '$lib/stores/workoutExerciseCache.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { CalendarDays, List, Dumbbell, Settings, LoaderCircle } from 'lucide-svelte';
	let { children } = $props();

	// Initialize auth on mount
	$effect(() => {
		authStore.init();
	});

	// Auth guard: redirect to login if not authenticated, redirect away from login if authenticated
	$effect(() => {
		if (!authStore.loading && !authStore.isAuthenticated && page.url.pathname !== '/login') {
			goto('/login');
		}
		if (!authStore.loading && authStore.isAuthenticated && page.url.pathname === '/login') {
			goto('/');
		}
	});

	// Initialize caches only when authenticated
	$effect(() => {
		if (authStore.isAuthenticated) {
			exerciseCache.init();
			workoutCache.init();
			workoutExerciseCache.init();
		}
	});

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

	function getScrollContainer(): HTMLElement | Window {
		if (mainEl && getComputedStyle(mainEl).overflowY !== 'visible') {
			return mainEl;
		}
		return window;
	}

	function getScrollTop(): number {
		const container = getScrollContainer();
		return container instanceof Window ? container.scrollY : container.scrollTop;
	}

	function setScrollTop(value: number) {
		const container = getScrollContainer();
		if (container instanceof Window) {
			container.scrollTo(0, value);
		} else {
			container.scrollTop = value;
		}
	}

	let scrollRestoreRAF: number | null = null;

	beforeNavigate(({ from, type }) => {
		// Stop any active scroll-hold loop from a previous navigation
		if (scrollRestoreRAF !== null) {
			cancelAnimationFrame(scrollRestoreRAF);
			scrollRestoreRAF = null;
		}

		if (from?.url.pathname) {
			saveScrollPosition(from.url.pathname, getScrollTop());
		}

	});

	afterNavigate((nav) => {
		if (nav.type === 'popstate') {
			const saved = getScrollPosition(page.url.pathname);
			if (saved !== undefined) {
				const pos = saved;
				// Immediately set scroll position
				setScrollTop(pos);

				// Hold the scroll position across multiple frames to beat
				// SvelteKit's own scroll reset and any layout reflows
				let framesRemaining = 10;
				function holdScroll() {
					setScrollTop(pos);
					framesRemaining--;
					if (framesRemaining > 0) {
						scrollRestoreRAF = requestAnimationFrame(holdScroll);
					} else {
						scrollRestoreRAF = null;
					}
				}
				scrollRestoreRAF = requestAnimationFrame(holdScroll);
			}
		} else {
			setScrollTop(0);
		}
	});
</script>

<svelte:document
	oncontextmenu={(e) => { if ((e.target as HTMLElement)?.closest('a, button, nav')) e.preventDefault(); }}
	ondragstart={(e) => { if ((e.target as HTMLElement)?.closest('a')) e.preventDefault(); }}
/>

{#if authStore.loading && page.url.pathname !== '/login'}
	<!-- Auth loading state (skip on login page to avoid flash) -->
	<div class="min-h-dvh flex items-center justify-center">
		<LoaderCircle class="w-8 h-8 animate-spin text-primary" />
	</div>
{:else if authStore.loading && page.url.pathname === '/login'}
	{@render children()}
{:else if authStore.isAuthenticated}
	<!-- Top nav (desktop) -->
	<header class="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
		<a href="/" class="text-xl font-bold text-primary">zFit</a>
		<nav class="flex gap-1">
			{#each navItems as item}
				<a
					href={item.href}
					class="px-4 py-2 rounded-lg text-sm font-medium transition-colors
						{isActive(item.href, page.url.pathname) ? 'bg-primary text-text-on-primary' : 'text-text-muted hover:bg-surface-hover'}"
				>
					{item.label}
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
					{@const active = isActive(item.href, page.url.pathname)}
					<a
						href={item.href}
						class="group flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-xs font-medium transition-colors
							{active ? 'text-primary' : 'text-text-muted'}"
					>
						<div class="flex items-center justify-center w-14 h-8 rounded-full transition-colors duration-200
							{active ? 'bg-primary/12' : 'group-active:bg-primary/8'}">
							<item.icon class="w-5 h-5 shrink-0" />
						</div>
						<span>{item.label}</span>
					</a>
				{/each}
			</div>
		</nav>
	</div>
{:else}
	<!-- Unauthenticated: render login page only -->
	{@render children()}
{/if}

<AlertDialog.Root open={dialogStore.open} onOpenChange={(open) => { if (!open && !dialogStore.pending) dialogStore.close(); }}>
	<AlertDialog.Content class="max-w-xs">
		{#if dialogStore.pending}
			<AlertDialog.Header>
				<AlertDialog.Title class="flex items-center gap-2">
					<LoaderCircle class="w-5 h-5 animate-spin text-primary" />
					{dialogStore.options.pendingLabel || dialogStore.options.confirmLabel + '...'}
				</AlertDialog.Title>
			</AlertDialog.Header>
		{:else}
			<AlertDialog.Header>
				<AlertDialog.Title>{dialogStore.options.title}</AlertDialog.Title>
				<AlertDialog.Description>
					{@html dialogStore.options.description}
				</AlertDialog.Description>
			</AlertDialog.Header>
			<AlertDialog.Footer>
				<AlertDialog.Cancel>Cancel</AlertDialog.Cancel>
				<AlertDialog.Action onclick={() => dialogStore.handleConfirm()} class={dialogStore.options.confirmClass}>
					{dialogStore.options.confirmLabel}
				</AlertDialog.Action>
			</AlertDialog.Footer>
		{/if}
	</AlertDialog.Content>
</AlertDialog.Root>
