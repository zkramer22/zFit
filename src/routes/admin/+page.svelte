<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import { authStore } from '$lib/stores/auth.svelte';
	import { exerciseCache } from '$lib/stores/exerciseCache.svelte';
	import type { SubmissionExpanded, FeedbackExpanded, User, Exercise, UserExercise } from '$lib/pocketbase/types';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { ChevronLeft, Check, X, LoaderCircle, MessageSquare, GitPullRequest, Users, Bug, Lightbulb } from '@lucide/svelte';

	let tab = $state<'submissions' | 'feedback' | 'users'>('submissions');
	let submissions = $state<SubmissionExpanded[]>([]);
	let feedbackItems = $state<FeedbackExpanded[]>([]);
	let users = $state<User[]>([]);
	let loading = $state(true);
	let processing = $state<string | null>(null);

	// Guard: redirect non-admins
	$effect(() => {
		if (!authStore.loading && !authStore.isAdmin) {
			goto('/');
		}
	});

	async function loadSubmissions() {
		try {
			submissions = await pb.collection('submissions').getFullList<SubmissionExpanded>({
				sort: '-created',
				expand: 'user,exercise,user_exercise',
			});
		} catch (err) {
			console.error('Failed to load submissions:', err);
		}
	}

	async function loadFeedback() {
		try {
			feedbackItems = await pb.collection('feedback').getFullList<FeedbackExpanded>({
				sort: '-created',
				expand: 'user',
			});
		} catch (err) {
			console.error('Failed to load feedback:', err);
		}
	}

	async function loadUsers() {
		try {
			users = await pb.collection('users').getFullList<User>({ sort: '-created' });
		} catch (err) {
			console.error('Failed to load users:', err);
		}
	}

	async function loadAll() {
		loading = true;
		await Promise.all([loadSubmissions(), loadFeedback(), loadUsers()]);
		loading = false;
	}

	$effect(() => { loadAll(); });

	/** Determine if this is a fork submission (has user_exercise + diff) or new exercise proposal */
	function isForkSubmission(sub: SubmissionExpanded): boolean {
		return !!sub.user_exercise && Object.keys(sub.diff || {}).length > 0;
	}

	async function approveSubmission(sub: SubmissionExpanded) {
		processing = sub.id;
		try {
			let notifLink = '';

			if (isForkSubmission(sub)) {
				// Fork approval: apply diff fields to canonical exercise
				const updateData: Record<string, any> = {};
				for (const [field, change] of Object.entries(sub.diff || {})) {
					updateData[field] = change.new;
				}
				await pb.collection('exercises').update(sub.exercise, updateData);

				// Delete the user_exercise overlay
				try {
					await pb.collection('user_exercises').delete(sub.user_exercise);
				} catch { /* may already be gone */ }

				notifLink = `/exercises/${sub.exercise}`;
			} else {
				// New exercise promotion: set user="" on the exercise
				await pb.collection('exercises').update(sub.exercise, { user: '' });
				notifLink = `/exercises/${sub.exercise}`;
			}

			await pb.collection('submissions').update(sub.id, { status: 'approved' });
			await exerciseCache.invalidate();

			await pb.collection('notifications').create({
				user: sub.user,
				message: `Your proposed changes to "${sub.record_name}" were approved!`,
				type: 'submission_approved',
				link: notifLink,
				read: false,
			});

			await loadSubmissions();
		} catch (err) {
			console.error('Failed to approve:', err);
		} finally {
			processing = null;
		}
	}

	async function rejectSubmission(sub: SubmissionExpanded, notes?: string) {
		processing = sub.id;
		try {
			await pb.collection('submissions').update(sub.id, {
				status: 'rejected',
				reviewer_notes: notes || '',
			});

			await pb.collection('notifications').create({
				user: sub.user,
				message: `Your proposed changes to "${sub.record_name}" were not accepted.${notes ? ' Note: ' + notes : ''}`,
				type: 'submission_rejected',
				link: `/exercises/${sub.exercise}`,
				read: false,
			});

			await loadSubmissions();
		} catch (err) {
			console.error('Failed to reject:', err);
		} finally {
			processing = null;
		}
	}

	async function updateFeedbackStatus(item: FeedbackExpanded, status: string) {
		processing = item.id;
		try {
			await pb.collection('feedback').update(item.id, { status });
			await loadFeedback();
		} catch (err) {
			console.error('Failed to update feedback:', err);
		} finally {
			processing = null;
		}
	}

	// Track expanded submission diffs
	let expandedDiff = $state<string | null>(null);

	function toggleDiff(sub: SubmissionExpanded) {
		expandedDiff = expandedDiff === sub.id ? null : sub.id;
	}

	const pendingCount = $derived(submissions.filter(s => s.status === 'pending').length);
	const openFeedbackCount = $derived(feedbackItems.filter(f => f.status === 'open').length);

	const statusColors: Record<string, string> = {
		pending: 'bg-amber-100 text-amber-700',
		approved: 'bg-emerald-100 text-emerald-700',
		rejected: 'bg-red-100 text-red-700',
		open: 'bg-blue-100 text-blue-700',
		in_progress: 'bg-amber-100 text-amber-700',
		resolved: 'bg-emerald-100 text-emerald-700',
		wont_fix: 'bg-gray-100 text-gray-600',
	};
</script>

<svelte:head>
	<title>Admin — zFit</title>
</svelte:head>

{#if !authStore.isAdmin}
	<div class="p-4 text-center text-text-muted">Redirecting...</div>
{:else}
	<div class="p-4 max-w-2xl mx-auto">
		<button type="button" onclick={() => history.back()}
			class="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors mb-4">
			<ChevronLeft class="w-4 h-4" />
			Back
		</button>

		<h1 class="text-2xl font-bold mb-4">Admin</h1>

		<!-- Tabs -->
		<div class="flex gap-1 rounded-lg bg-surface-dim p-1 mb-6">
			<button
				class="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5
					{tab === 'submissions' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
				onclick={() => { tab = 'submissions'; }}
			>
				<GitPullRequest class="w-4 h-4" />
				Submissions
				{#if pendingCount > 0}
					<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-amber-500 text-white">{pendingCount}</span>
				{/if}
			</button>
			<button
				class="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5
					{tab === 'feedback' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
				onclick={() => { tab = 'feedback'; }}
			>
				<MessageSquare class="w-4 h-4" />
				Feedback
				{#if openFeedbackCount > 0}
					<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-blue-500 text-white">{openFeedbackCount}</span>
				{/if}
			</button>
			<button
				class="flex-1 py-2 px-3 text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5
					{tab === 'users' ? 'bg-surface text-text shadow-sm' : 'text-text-muted'}"
				onclick={() => { tab = 'users'; }}
			>
				<Users class="w-4 h-4" />
				Users
				<span class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-gray-200 text-gray-600">{users.length}</span>
			</button>
		</div>

		{#if loading}
			<div class="flex justify-center py-12">
				<LoaderCircle class="w-6 h-6 animate-spin text-primary" />
			</div>
		{:else if tab === 'submissions'}
			<!-- Submissions -->
			{#if submissions.length === 0}
				<p class="text-text-muted text-sm text-center py-8">No submissions yet.</p>
			{:else}
				<div class="space-y-3">
					{#each submissions as sub}
						<div class="rounded-xl border border-border bg-surface p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="flex items-center gap-2 min-w-0">
									<UserAvatar
										name={sub.expand?.user?.name || sub.expand?.user?.email || ''}
										avatar={sub.expand?.user?.avatar || ''}
										userId={sub.user}
										size="sm"
									/>
									<div class="min-w-0">
										<p class="font-medium truncate">{sub.record_name || 'Unknown'}</p>
										<p class="text-xs text-text-muted">
											{isForkSubmission(sub) ? 'fork' : 'new exercise'} by {sub.expand?.user?.name || sub.expand?.user?.email || 'Unknown'}
										</p>
									</div>
								</div>
								<span class="px-2 py-0.5 text-xs font-medium rounded-full shrink-0 {statusColors[sub.status] || ''}">
									{sub.status}
								</span>
							</div>

							{#if sub.notes}
								<p class="text-sm text-text-muted mt-2">{sub.notes}</p>
							{/if}

							<!-- Diff display for fork submissions -->
							{#if isForkSubmission(sub) && sub.status === 'pending'}
								<button
									type="button"
									onclick={() => toggleDiff(sub)}
									class="mt-2 text-xs text-primary hover:text-primary/80 transition-colors"
								>
									{expandedDiff === sub.id ? 'Hide Changes' : 'View Changes'}
								</button>

								{#if expandedDiff === sub.id}
									<div class="mt-3 rounded-lg border border-border bg-surface-dim p-3 text-xs space-y-2">
										{#each Object.entries(sub.diff || {}) as [field, change]}
											<div>
												<span class="font-medium capitalize">{field.replace('_', ' ')}:</span>
												{#if field === 'video_urls'}
													{@const oldCount = Array.isArray(change.old) ? change.old.length : 0}
													{@const newCount = Array.isArray(change.new) ? change.new.length : 0}
													<span class="text-text-muted">{oldCount}</span>
													<span class="mx-1">&rarr;</span>
													<span class="text-emerald-600 font-medium">{newCount}</span>
													{@const newVideos = Array.isArray(change.new) ? change.new.filter(
														(v: any) => !Array.isArray(change.old) || !change.old.some((g: any) => g.url === v.url)
													) : []}
													{#if newVideos.length > 0}
														<div class="mt-1">
															<span class="font-medium">New videos:</span>
															{#each newVideos as v}
																<a href={v.url} target="_blank" rel="noopener noreferrer" class="block text-primary hover:underline truncate mt-0.5">{v.url}</a>
															{/each}
														</div>
													{/if}
												{:else if field === 'description'}
													<span class="text-text-muted"> changed</span>
													{#if change.new}
														<p class="mt-1 text-text-muted italic">"{change.new}"</p>
													{/if}
												{:else}
													<span class="text-text-muted line-through">{JSON.stringify(change.old)}</span>
													<span class="mx-1">&rarr;</span>
													<span class="text-emerald-600">{JSON.stringify(change.new)}</span>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							{:else if !isForkSubmission(sub) && sub.status === 'pending'}
								<!-- New exercise proposal — show exercise details -->
								{#if sub.expand?.exercise}
									<div class="mt-3 rounded-lg border border-border bg-surface-dim p-3 text-xs space-y-1">
										<p><span class="font-medium">Category:</span> {sub.expand.exercise.category}</p>
										<p><span class="font-medium">Muscle groups:</span> {(sub.expand.exercise.muscle_groups || []).join(', ') || 'none'}</p>
										{#if sub.expand.exercise.description}
											<p><span class="font-medium">Description:</span> {sub.expand.exercise.description}</p>
										{/if}
										<p><span class="font-medium">Videos:</span> {sub.expand.exercise.video_urls?.length || 0}</p>
									</div>
								{/if}
							{/if}

							{#if sub.status === 'pending'}
								<div class="flex gap-2 mt-3">
									<button
										onclick={() => approveSubmission(sub)}
										disabled={processing === sub.id}
										class="flex-1 py-2 rounded-lg bg-emerald-500 text-white text-sm font-medium
											flex items-center justify-center gap-1.5 disabled:opacity-50"
									>
										{#if processing === sub.id}
											<LoaderCircle class="w-4 h-4 animate-spin" />
										{:else}
											<Check class="w-4 h-4" />
										{/if}
										Approve
									</button>
									<button
										onclick={() => rejectSubmission(sub)}
										disabled={processing === sub.id}
										class="flex-1 py-2 rounded-lg border border-border text-sm font-medium
											flex items-center justify-center gap-1.5 disabled:opacity-50 text-text-muted"
									>
										<X class="w-4 h-4" />
										Reject
									</button>
								</div>
							{/if}

							{#if sub.reviewer_notes}
								<p class="text-xs text-text-muted mt-2 italic">Admin: {sub.reviewer_notes}</p>
							{/if}
						</div>
					{/each}
				</div>
			{/if}

		{:else if tab === 'feedback'}
			<!-- Feedback -->
			{#if feedbackItems.length === 0}
				<p class="text-text-muted text-sm text-center py-8">No feedback yet.</p>
			{:else}
				<div class="space-y-3">
					{#each feedbackItems as item}
						<div class="rounded-xl border border-border bg-surface p-4">
							<div class="flex items-start justify-between gap-3">
								<div class="flex items-center gap-2 min-w-0">
									{#if item.type === 'bug'}
										<Bug class="w-4 h-4 text-danger shrink-0" />
									{:else}
										<Lightbulb class="w-4 h-4 text-amber-500 shrink-0" />
									{/if}
									<div class="min-w-0">
										<p class="font-medium">{item.title}</p>
										<p class="text-xs text-text-muted">
											{item.expand?.user?.name || item.expand?.user?.email || 'Unknown'}
										</p>
									</div>
								</div>
								<span class="px-2 py-0.5 text-xs font-medium rounded-full shrink-0 {statusColors[item.status] || ''}">
									{item.status.replace('_', ' ')}
								</span>
							</div>

							{#if item.description}
								<p class="text-sm text-text-muted mt-2">{item.description}</p>
							{/if}

							<div class="flex gap-2 mt-3 flex-wrap">
								{#each ['open', 'in_progress', 'resolved', 'wont_fix'] as status}
									{#if status !== item.status}
										<button
											onclick={() => updateFeedbackStatus(item, status)}
											disabled={processing === item.id}
											class="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-surface-hover
												disabled:opacity-50 transition-colors"
										>
											{status.replace('_', ' ')}
										</button>
									{/if}
								{/each}
							</div>
						</div>
					{/each}
				</div>
			{/if}

		{:else if tab === 'users'}
			<!-- Users -->
			<div class="space-y-2">
				{#each users as u}
					<div class="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
						<UserAvatar
							name={u.name || u.email || ''}
							avatar={u.avatar || ''}
							userId={u.id}
							size="sm"
						/>
						<div class="min-w-0 flex-1">
							<p class="font-medium text-sm truncate">{u.name || 'No name'}</p>
							<p class="text-xs text-text-muted truncate">{u.email}</p>
						</div>
						<p class="text-xs text-text-muted shrink-0">
							{new Date(u.created).toLocaleDateString()}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</div>
{/if}
