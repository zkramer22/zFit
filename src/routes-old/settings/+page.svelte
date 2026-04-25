<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb, currentUserId } from '$lib/pocketbase/client';
	import { authStore } from '$lib/stores/auth.svelte';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { LogOut, Shield, MessageSquare, Bug, Lightbulb, Send, LoaderCircle, ChevronRight, Bell } from '@lucide/svelte';
	import type { Notification } from '$lib/pocketbase/types';
	import { notificationStore } from '$lib/stores/notifications.svelte';

	function handleLogout() {
		authStore.logout();
		goto('/login');
	}

	// Notifications
	let notifications = $state<Notification[]>([]);
	let showNotifications = $state(false);

	async function loadNotifications() {
		try {
			notifications = await pb.collection('notifications').getFullList<Notification>({
				sort: '-created',
			});
		} catch { /* ignore if collection doesn't exist yet */ }
	}

	async function markAsRead(notif: Notification) {
		if (notif.read) return;
		try {
			await pb.collection('notifications').update(notif.id, { read: true });
			notifications = notifications.map(n => n.id === notif.id ? { ...n, read: true } : n);
			notificationStore.refresh();
		} catch { /* ignore */ }
	}

	async function markAllRead() {
		const unread = notifications.filter(n => !n.read);
		await Promise.all(unread.map(n =>
			pb.collection('notifications').update(n.id, { read: true }).catch(() => {})
		));
		notifications = notifications.map(n => ({ ...n, read: true }));
		notificationStore.refresh();
	}

	$effect(() => { loadNotifications(); });

	const unreadCount = $derived(notifications.filter(n => !n.read).length);

	// Feedback form
	let showFeedback = $state(false);
	let feedbackType = $state<'feature' | 'bug'>('feature');
	let feedbackTitle = $state('');
	let feedbackDescription = $state('');
	let feedbackSubmitting = $state(false);
	let feedbackSent = $state(false);

	async function submitFeedback() {
		if (!feedbackTitle.trim()) return;
		feedbackSubmitting = true;
		try {
			await pb.collection('feedback').create({
				user: currentUserId(),
				type: feedbackType,
				title: feedbackTitle.trim(),
				description: feedbackDescription.trim(),
				status: 'open',
			});
			feedbackTitle = '';
			feedbackDescription = '';
			feedbackSent = true;
			setTimeout(() => { feedbackSent = false; showFeedback = false; }, 2000);
		} catch (err) {
			console.error('Failed to submit feedback:', err);
		} finally {
			feedbackSubmitting = false;
		}
	}
</script>

<div class="p-4 max-w-[500px] mx-auto">
	<h1 class="text-2xl font-bold mb-6">Settings</h1>

	<!-- Profile -->
	<section class="rounded-xl border border-border bg-surface p-4 mb-4">
		<h2 class="text-sm font-medium text-text-muted mb-3">Profile</h2>
		<div class="flex items-center gap-3">
			<UserAvatar
				name={authStore.user?.name || authStore.user?.email || ''}
				avatar={authStore.user?.avatar || ''}
				userId={authStore.userId}
			/>
			<div>
				{#if authStore.user?.name}
					<p class="font-medium">{authStore.user.name}</p>
				{/if}
				<p class="text-sm text-text-muted">{authStore.user?.email}</p>
			</div>
		</div>
	</section>

	<!-- Notifications -->
	<section class="rounded-xl border border-border bg-surface mb-4">
		<button
			onclick={() => { showNotifications = !showNotifications; }}
			class="w-full p-4 flex items-center justify-between"
		>
			<div class="flex items-center gap-2">
				<Bell class="w-4 h-4 text-text-muted" />
				<span class="text-sm font-medium">Notifications</span>
				{#if unreadCount > 0}
					<span class="px-1.5 py-0.5 text-xs rounded-full bg-primary text-text-on-primary">{unreadCount}</span>
				{/if}
			</div>
			<ChevronRight class="w-4 h-4 text-text-muted transition-transform {showNotifications ? 'rotate-90' : ''}" />
		</button>

		{#if showNotifications}
			<div class="px-4 pb-4 border-t border-border pt-3">
				{#if notifications.length === 0}
					<p class="text-sm text-text-muted text-center py-2">No notifications yet.</p>
				{:else}
					{#if unreadCount > 0}
						<button
							onclick={markAllRead}
							class="text-xs text-primary hover:text-primary/80 mb-2"
						>
							Mark all as read
						</button>
					{/if}
					<div class="space-y-2">
						{#each notifications as notif}
							<a
								href={notif.link || '#'}
								onclick={() => markAsRead(notif)}
								class="block p-3 rounded-lg border transition-colors
									{notif.read ? 'border-border bg-surface-dim text-text-muted' : 'border-primary/30 bg-primary/5 text-text'}"
							>
								<p class="text-sm">{notif.message}</p>
								<p class="text-xs text-text-muted mt-1">
									{new Date(notif.created).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
								</p>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Feedback -->
	<section class="rounded-xl border border-border bg-surface mb-4">
		<button
			onclick={() => { showFeedback = !showFeedback; feedbackSent = false; }}
			class="w-full p-4 flex items-center justify-between"
		>
			<div class="flex items-center gap-2">
				<MessageSquare class="w-4 h-4 text-text-muted" />
				<span class="text-sm font-medium">Send Feedback</span>
			</div>
			<ChevronRight class="w-4 h-4 text-text-muted transition-transform {showFeedback ? 'rotate-90' : ''}" />
		</button>

		{#if showFeedback}
			<div class="px-4 pb-4 border-t border-border pt-3">
				{#if feedbackSent}
					<p class="text-sm text-success text-center py-2">Thanks for your feedback!</p>
				{:else}
					<!-- Type toggle -->
					<div class="flex rounded-lg bg-surface-dim p-1 mb-3">
						<button
							class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1
								{feedbackType === 'feature' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
							onclick={() => { feedbackType = 'feature'; }}
						>
							<Lightbulb class="w-3.5 h-3.5" />
							Feature Request
						</button>
						<button
							class="flex-1 py-1.5 text-xs font-medium rounded-md transition-colors flex items-center justify-center gap-1
								{feedbackType === 'bug' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
							onclick={() => { feedbackType = 'bug'; }}
						>
							<Bug class="w-3.5 h-3.5" />
							Bug Report
						</button>
					</div>

					<input
						type="text"
						bind:value={feedbackTitle}
						placeholder="Title"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm
							placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-2"
					/>
					<textarea
						bind:value={feedbackDescription}
						placeholder="Details (optional)"
						rows="3"
						class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none
							placeholder:text-text-muted/50 focus:outline-none focus:ring-2 focus:ring-primary/30 mb-3"
					></textarea>
					<button
						onclick={submitFeedback}
						disabled={!feedbackTitle.trim() || feedbackSubmitting}
						class="w-full py-2 rounded-lg bg-primary text-text-on-primary text-sm font-medium
							flex items-center justify-center gap-1.5 disabled:opacity-50"
					>
						{#if feedbackSubmitting}
							<LoaderCircle class="w-4 h-4 animate-spin" />
						{:else}
							<Send class="w-3.5 h-3.5" />
						{/if}
						Submit
					</button>
				{/if}
			</div>
		{/if}
	</section>

	<!-- Admin link (admins only) -->
	{#if authStore.isAdmin}
		<a
			href="/admin"
			class="flex items-center justify-between rounded-xl border border-border bg-surface p-4 mb-4
				hover:bg-surface-hover transition-colors"
		>
			<div class="flex items-center gap-2">
				<Shield class="w-4 h-4 text-primary" />
				<span class="text-sm font-medium">Admin Dashboard</span>
			</div>
			<ChevronRight class="w-4 h-4 text-text-muted" />
		</a>
	{/if}

	<!-- About -->
	<section class="rounded-xl border border-border bg-surface p-4 mb-6">
		<h2 class="text-sm font-medium text-text-muted mb-2">About</h2>
		<p class="text-sm text-text-muted">
			zFit — Personal training tracker
		</p>
	</section>

	<!-- Logout -->
	<button
		onclick={handleLogout}
		class="w-full p-3 rounded-xl border border-danger/30 text-danger font-medium
			flex items-center justify-center gap-2 hover:bg-danger/5 active:bg-danger/10"
	>
		<LogOut class="w-4 h-4" />
		Sign Out
	</button>
</div>
