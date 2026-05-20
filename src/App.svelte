<script lang="ts">
	import { Router } from 'sv-router';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { exerciseCache } from '$lib/stores/exerciseCache.svelte';
	import { workoutCache } from '$lib/stores/workoutCache.svelte';
	import { workoutExerciseCache } from '$lib/stores/workoutExerciseCache.svelte';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import LoginPage from '$lib/components/LoginPage.svelte';
	import { LoaderCircle } from '@lucide/svelte';

	// Initialize auth once
	$effect(() => {
		untrack(() => authStore.init());
	});

	// Reset and initialize caches when user changes
	let lastCacheUserId = '';
	$effect(() => {
		const userId = authStore.userId;
		const authenticated = authStore.isAuthenticated;
		if (authenticated) {
			if (lastCacheUserId && lastCacheUserId !== userId) {
				untrack(() => {
					exerciseCache.reset();
					workoutCache.reset();
					workoutExerciseCache.reset();
				});
			}
			lastCacheUserId = userId;
			untrack(() => {
				exerciseCache.init();
				workoutCache.init();
				workoutExerciseCache.init();
				notificationStore.refresh();
			});
		}
	});
</script>

<svelte:document
	oncontextmenu={(e) => { if ((e.target as HTMLElement)?.closest('a, button, nav')) e.preventDefault(); }}
	ondragstart={(e) => { if ((e.target as HTMLElement)?.closest('a')) e.preventDefault(); }}
/>

{#if authStore.loading}
	<div class="min-h-dvh flex items-center justify-center">
		<LoaderCircle class="w-8 h-8 animate-spin text-primary" />
	</div>
{:else if authStore.isAuthenticated}
	<Router />
{:else}
	<LoginPage />
{/if}

<!-- Toasts -->
{#if toastStore.toasts.length}
	<div class="fixed top-4 left-1/2 -translate-x-1/2 z-[100] flex flex-col gap-2 w-[calc(100%-2rem)] max-w-sm pointer-events-none">
		{#each toastStore.toasts as toast (toast.id)}
			<button
				type="button"
				onclick={() => toastStore.dismiss(toast.id)}
				class="pointer-events-auto w-full px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-left transition-all
					{toast.type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}"
			>
				{toast.message}
			</button>
		{/each}
	</div>
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
