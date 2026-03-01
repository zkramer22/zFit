<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { beforeNavigate, afterNavigate } from '$app/navigation';
	import { saveScrollPosition, getScrollPosition } from '$lib/stores/scrollPosition.svelte';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { Play, List, Dumbbell, Layers } from 'lucide-svelte';
	let { children } = $props();

	const navItems = [
		{ href: '/session', label: 'Session', icon: Play },
		{ href: '/exercises', label: 'Exercises', icon: List },
		{ href: '/workouts', label: 'Workouts', icon: Dumbbell },
		{ href: '/programs', label: 'Programs', icon: Layers },
	];

	function isActive(href: string, pathname: string): boolean {
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

	afterNavigate(({ type }) => {
		if (type === 'popstate') {
			const saved = getScrollPosition($page.url.pathname);
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

<!-- Top nav (desktop) -->
<header class="hidden md:flex items-center justify-between px-6 py-3 border-b border-border bg-surface">
	<a href="/session" class="text-xl font-bold text-primary">zFit</a>
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
				<a
					href={item.href}
					class="flex-1 flex flex-col items-center justify-center gap-0.5 h-14 text-xs font-medium transition-colors
						{isActive(item.href, $page.url.pathname) ? 'text-primary' : 'text-text-muted'}"
				>
					<item.icon class="w-6 h-6 shrink-0" />
					<span>{item.label}</span>
				</a>
			{/each}
		</div>
	</nav>
</div>

<AlertDialog.Root open={dialogStore.open} onOpenChange={(open) => { if (!open) dialogStore.close(); }}>
	<AlertDialog.Content class="max-w-xs">
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
	</AlertDialog.Content>
</AlertDialog.Root>
