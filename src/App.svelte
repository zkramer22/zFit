<script lang="ts">
	import { Router } from 'sv-router';
	import { untrack } from 'svelte';
	import { authStore } from '$lib/stores/auth.svelte';
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import { liveStores } from '$lib/stores/liveStores';
	import { connection } from '$lib/live/connection.svelte';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import LoginPage from '$lib/components/LoginPage.svelte';
	import { LoaderCircle } from '@lucide/svelte';

	// Initialize auth once
	$effect(() => {
		untrack(() => authStore.init());
	});

	// Live data follows the signed-in user. Switching users or logging out
	// stops every listener and drops the previous user's data, because the
	// realtime stream is authorized as whoever subscribed.
	let liveUserId = '';
	async function switchLiveUser(userId: string) {
		if (userId === liveUserId) return;
		const previous = liveUserId;
		liveUserId = userId;
		if (previous) {
			await Promise.all(liveStores.map((store) => store.reset()));
			await connection.stop();
		}
		if (userId) {
			void connection.start();
			for (const store of liveStores) store.start();
			notificationStore.refresh();
		}
	}

	$effect(() => {
		const userId = authStore.isAuthenticated ? authStore.userId : '';
		untrack(() => void switchLiveUser(userId));
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
