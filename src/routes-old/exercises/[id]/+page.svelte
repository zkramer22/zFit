<script lang="ts">
	import { untrack } from 'svelte';
	import { page } from '$app/stores';
	import { pb, currentUserId } from '$lib/pocketbase/client';
	import { exerciseCache } from '$lib/stores/exerciseCache.svelte';
	import type { Exercise, UserExercise, SetData, SessionEntry, Session, Submission } from '$lib/pocketbase/types';
	import { CATEGORIES, CATEGORY_COLORS, MUSCLE_GROUPS, getLabel } from '$lib/constants';
	import { formatSets } from '$lib/utils/format';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { toastStore } from '$lib/stores/toast.svelte';

	let exercise = $state<Exercise | null>(null);
	let userExercise = $state<UserExercise | null>(null);
	let recentHistory = $state<Array<{
		date: string;
		sets: SetData[];
		rpe: number | null;
		painFlag: boolean;
		notes: string;
	}>>([]);
	let loading = $state(true);
	let pendingProposal = $state<Submission | null>(null);
	let proposing = $state(false);

	// Derived display values — overlay user_exercise fields on canonical
	let displayDescription = $derived(userExercise?.description ?? exercise?.description ?? '');
	let displayVideoUrls = $derived(userExercise?.video_urls ?? exercise?.video_urls ?? []);
	let isCanonical = $derived(exercise ? !exercise.user : false);
	let isCustomized = $derived(!!userExercise);

	async function loadData(id: string) {
		if (!exercise) loading = true;

		// Always fetch fresh from PB — cache may be stale (e.g. after admin approval changes user field)
		exercise = await pb.collection('exercises').getOne<Exercise>(id);

		// Load user_exercise overlay for canonical exercises
		if (!exercise.user) {
			try {
				const results = await pb.collection('user_exercises').getFullList<UserExercise>({
					filter: `exercise = "${id}" && user = "${currentUserId()}"`,
				});
				userExercise = results.length > 0 ? results[0] : null;
			} catch {
				userExercise = null;
			}
		} else {
			userExercise = null;
		}

		// Check for pending proposal
		try {
			const existing = await pb.collection('submissions').getFullList<Submission>({
				filter: `user = "${currentUserId()}" && exercise = "${id}" && status = "pending"`,
			});
			pendingProposal = existing.length > 0 ? existing[0] : null;
		} catch {
			pendingProposal = null;
		}

		// Load session history
		try {
			const all = await pb.collection('session_entries').getFullList();
			const entries = all.filter((e: any) => e.exercise === id && e.session) as SessionEntry[];

			const sessionIds = [...new Set(entries.map((e) => e.session))];
			const sessionResults = await Promise.all(
				sessionIds.map((sid) => pb.collection('sessions').getOne<Session>(sid).catch(() => null))
			);
			const sessions: Record<string, Session> = {};
			for (let i = 0; i < sessionIds.length; i++) {
				if (sessionResults[i]) sessions[sessionIds[i]] = sessionResults[i]!;
			}

			recentHistory = entries.map((entry) => ({
				date: sessions[entry.session]?.date || entry.created,
				sets: entry.sets,
				rpe: entry.rpe,
				painFlag: entry.pain_flag,
				notes: entry.notes
			}));
		} catch (err) {
			console.error('Failed to load exercise history:', err);
			recentHistory = [];
		}

		loading = false;
	}

	$effect(() => {
		const id = $page.params.id!;
		untrack(() => loadData(id));
	});

	function formatDate(d: string): string {
		return new Date(d).toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function getYoutubeId(url: string): string | null {
		const match = url.match(
			/(?:youtu\.be\/|youtube\.com\/(?:.*[?&]v=|.*\/))([\w-]+)/
		);
		return match ? match[1] : null;
	}

	function getYoutubeStart(url: string): string {
		const match = url.match(/[?&]t=(\d+)s?/);
		return match ? `&start=${match[1]}` : '';
	}

	/** Ensure a user_exercise record exists for this canonical exercise. Creates one if needed. */
	async function ensureUserExercise(): Promise<UserExercise> {
		if (userExercise) return userExercise;
		if (!exercise) throw new Error('No exercise loaded');

		const created = await pb.collection('user_exercises').create<UserExercise>({
			user: currentUserId(),
			exercise: exercise.id,
			description: exercise.description || '',
			video_urls: exercise.video_urls || [],
		});
		userExercise = created;
		return created;
	}

	/** Compute diff between user_exercise and canonical exercise */
	function computeDiff(): Record<string, { old: any; new: any }> {
		if (!exercise || !userExercise) return {};
		const diff: Record<string, { old: any; new: any }> = {};

		if (userExercise.description !== exercise.description) {
			diff.description = { old: exercise.description, new: userExercise.description };
		}
		if (JSON.stringify(userExercise.video_urls || []) !== JSON.stringify(exercise.video_urls || [])) {
			diff.video_urls = { old: exercise.video_urls || [], new: userExercise.video_urls || [] };
		}

		return diff;
	}

	async function proposeChanges() {
		if (!exercise || !userExercise) return;
		proposing = true;
		try {
			const diff = computeDiff();
			if (Object.keys(diff).length === 0) {
				toastStore.error('No changes to propose.');
				return;
			}
			await pb.collection('submissions').create({
				user: currentUserId(),
				exercise: exercise.id,
				user_exercise: userExercise.id,
				record_name: exercise.name,
				diff,
				status: 'pending',
				notes: '',
				reviewer_notes: '',
			});
			toastStore.success('Changes proposed to the global library!');
			// Refresh pending state
			const existing = await pb.collection('submissions').getFullList<Submission>({
				filter: `user = "${currentUserId()}" && exercise = "${exercise.id}" && status = "pending"`,
			});
			pendingProposal = existing.length > 0 ? existing[0] : null;
		} catch (err: any) {
			console.error('Failed to propose changes:', err);
			toastStore.error('Failed to submit proposal. Please try again.');
		} finally {
			proposing = false;
		}
	}

	/** Propose a user-created exercise for canonical promotion */
	async function proposeNewExercise() {
		if (!exercise || !exercise.user) return;
		proposing = true;
		try {
			await pb.collection('submissions').create({
				user: currentUserId(),
				exercise: exercise.id,
				user_exercise: '',
				record_name: exercise.name,
				diff: {},
				status: 'pending',
				notes: '',
				reviewer_notes: '',
			});
			toastStore.success('Exercise proposed for the global library!');
			const existing = await pb.collection('submissions').getFullList<Submission>({
				filter: `user = "${currentUserId()}" && exercise = "${exercise.id}" && status = "pending"`,
			});
			pendingProposal = existing.length > 0 ? existing[0] : null;
		} catch (err: any) {
			console.error('Failed to propose exercise:', err);
			toastStore.error('Failed to submit proposal. Please try again.');
		} finally {
			proposing = false;
		}
	}

	let videoUrl = $state('');
	let showAddVideo = $state(false);

	// Edit mode state
	let editing = $state(false);
	let editName = $state('');

	const youtubeSearchUrl = $derived(`https://www.youtube.com/results?search_query=${encodeURIComponent((editing ? editName : exercise?.name || '') + ' exercise form')}`);
	let editCategory = $state('');
	let editDescription = $state('');
	let editMuscleGroups = $state<string[]>([]);

	function enterEditMode() {
		if (!exercise) return;
		editName = exercise.name;
		editCategory = exercise.category;
		editDescription = isCanonical ? displayDescription : (exercise.description || '');
		editMuscleGroups = [...(exercise.muscle_groups || [])];
		editing = true;
	}

	function cancelEdit() {
		editing = false;
	}

	function toggleEditMuscleGroup(mg: string) {
		if (editMuscleGroups.includes(mg)) {
			editMuscleGroups = editMuscleGroups.filter(m => m !== mg);
		} else {
			editMuscleGroups = [...editMuscleGroups, mg];
		}
	}

	async function updateExercise(e: SubmitEvent) {
		e.preventDefault();
		if (!exercise) return;
		try {
			if (isCanonical) {
				// Editing a canonical exercise → update user_exercise overlay
				const ue = await ensureUserExercise();
				await pb.collection('user_exercises').update(ue.id, {
					description: editDescription,
				});
				// Name, category, muscle_groups aren't overridable — they stay on canonical
				// But we reload to reflect changes
				userExercise = await pb.collection('user_exercises').getOne<UserExercise>(ue.id);
			} else {
				// Editing a user-created exercise → update directly
				await pb.collection('exercises').update(exercise.id, {
					name: editName.trim(),
					category: editCategory,
					description: editDescription,
					muscle_groups: editMuscleGroups
				});
				await exerciseCache.invalidate();
			}
			editing = false;
			await loadData(exercise.id);
		} catch (err: any) {
			console.error('Failed to update exercise:', err);
			toastStore.error('Failed to update exercise. Please try again.');
		}
	}

	async function addVideo(e: SubmitEvent) {
		e.preventDefault();
		if (!exercise || !videoUrl.trim()) return;
		const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:.*[?&]v=|.*\/))([\w-]+)/);
		if (!ytMatch) { alert('Please paste a valid YouTube URL'); return; }

		try {
			if (isCanonical) {
				const ue = await ensureUserExercise();
				const videos = [...(ue.video_urls || []), { url: videoUrl, title: '', thumbnail_url: '' }];
				await pb.collection('user_exercises').update(ue.id, { video_urls: videos });
				userExercise = await pb.collection('user_exercises').getOne<UserExercise>(ue.id);
			} else {
				const videos = [...(exercise.video_urls || []), { url: videoUrl, title: '', thumbnail_url: '' }];
				await pb.collection('exercises').update(exercise.id, { video_urls: videos });
				await exerciseCache.invalidate();
			}
			videoUrl = '';
			showAddVideo = false;
			await loadData(exercise.id);
		} catch (err: any) {
			console.error('Failed to save video:', err);
			toastStore.error('Failed to save video. Please try again.');
		}
	}

	function removeVideo(index: number) {
		if (!exercise) return;
		dialogStore.confirm({
			title: 'Remove video?',
			description: 'This video will be removed from the exercise.',
			confirmLabel: 'Remove',
			pendingLabel: 'Removing...',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			async onConfirm() {
				try {
					if (isCanonical) {
						const ue = await ensureUserExercise();
						const videos = [...(ue.video_urls || [])];
						videos.splice(index, 1);
						await pb.collection('user_exercises').update(ue.id, { video_urls: videos });
						userExercise = await pb.collection('user_exercises').getOne<UserExercise>(ue.id);
					} else {
						const videos = [...(exercise!.video_urls || [])];
						videos.splice(index, 1);
						await pb.collection('exercises').update(exercise!.id, { video_urls: videos });
						await exerciseCache.invalidate();
					}
					await loadData(exercise!.id);
				} catch (err: any) {
					console.error('Failed to remove video:', err);
					toastStore.error('Failed to remove video. Please try again.');
				}
			}
		});
	}
</script>

<svelte:head>
	<title>{exercise?.name || 'Exercise'} — zFit</title>
</svelte:head>

{#if loading || !exercise}
	<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
		<div class="flex items-center gap-3 max-w-lg mx-auto">
			<button type="button" onclick={() => history.back()} class="text-text-muted hover:text-text shrink-0" aria-label="Go back">
				<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" /></svg>
			</button>
			<div class="h-6 w-40 rounded bg-surface-dim animate-pulse"></div>
		</div>
	</div>
	<div class="p-4 max-w-lg mx-auto space-y-4">
		{#each Array(4) as _}
			<div class="h-12 rounded-xl bg-surface-dim animate-pulse"></div>
		{/each}
	</div>
{:else}
	<!-- Sticky header -->
	<div class="sticky top-0 z-40 bg-surface border-b border-border px-4 py-3">
		<div class="flex items-center justify-between max-w-lg mx-auto">
			<div class="flex items-center gap-3 min-w-0">
				<button
					type="button"
					onclick={() => history.back()}
					class="text-text-muted hover:text-text shrink-0"
					aria-label="Go back"
				>
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M15 19l-7-7 7-7" />
					</svg>
				</button>
				<div class="flex items-center gap-2 min-w-0">
					<h1 class="font-bold text-lg leading-tight truncate">{editing ? editName || 'Edit Exercise' : exercise.name}</h1>
					{#if isCustomized}
						<span class="w-2 h-2 rounded-full bg-primary shrink-0" title="Customized"></span>
					{/if}
				</div>
			</div>
			{#if editing}
				<div class="flex items-center gap-1">
					<button type="button" onclick={cancelEdit} class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors" aria-label="Cancel editing">
						<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
					</button>
				</div>
			{:else}
				<button type="button" onclick={enterEditMode} class="p-2 rounded-lg text-text-muted hover:bg-surface-hover transition-colors" aria-label="Edit exercise">
					<svg class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
				</button>
			{/if}
		</div>
	</div>

	<div class="p-4 max-w-lg mx-auto">
		{#if editing}
			<form onsubmit={updateExercise}>
				<div class="space-y-4 mb-6">
					{#if !isCanonical}
						<!-- Only user-created exercises can edit name/category/muscle_groups -->
						<div>
							<label for="edit-name" class="block text-sm font-medium mb-1">Name</label>
							<input id="edit-name" type="text" required bind:value={editName} class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary" />
						</div>
						<div>
							<label for="edit-category" class="block text-sm font-medium mb-1">Category</label>
							<select id="edit-category" bind:value={editCategory} class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary">
								{#each CATEGORIES as cat}
									<option value={cat.value}>{cat.label}</option>
								{/each}
							</select>
						</div>
						<div>
							<label class="block text-sm font-medium mb-1">Muscle Groups</label>
							<div class="flex flex-wrap gap-1.5">
								{#each MUSCLE_GROUPS as mg}
									<button
										type="button"
										onclick={() => toggleEditMuscleGroup(mg.value)}
										class="px-2.5 py-1 rounded-full text-xs font-medium transition-colors
											{editMuscleGroups.includes(mg.value)
											? 'bg-primary text-text-on-primary border border-transparent'
											: 'bg-surface-dim text-text-muted hover:bg-surface-hover border border-border'}"
									>
										{mg.label}
									</button>
								{/each}
							</div>
						</div>
					{/if}
					<div>
						<label for="edit-desc" class="block text-sm font-medium mb-1">Description</label>
						<textarea id="edit-desc" bind:value={editDescription} rows="3" class="w-full px-3 py-2 rounded-lg border border-border bg-surface text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary"></textarea>
					</div>
				</div>
				<button type="submit" class="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-text-on-primary hover:bg-primary/90 transition-colors">
					Save Changes
				</button>
			</form>
		{:else}
			<div class="flex flex-wrap gap-1.5 mb-4">
				<span class="inline-block px-2.5 py-1 rounded-full text-xs font-semibold {CATEGORY_COLORS[exercise.category] || 'bg-gray-100 text-gray-800'}">
					{getLabel(CATEGORIES, exercise.category)}
				</span>
				{#each exercise.muscle_groups as mg}
					<span class="inline-block px-2.5 py-1 rounded-full text-xs bg-gray-100 text-gray-600">
						{getLabel(MUSCLE_GROUPS, mg)}
					</span>
				{/each}
			</div>

			{#if displayDescription}
				<p class="text-sm text-text-muted leading-relaxed mb-6">{displayDescription}</p>
			{/if}
		{/if}

		<!-- Videos -->
		<div class="mb-8 {editing ? 'mt-6' : ''}">
			<div class="flex items-center justify-between mb-3">
				<h2 class="text-lg font-semibold">Videos</h2>
				<div class="flex gap-2">
					<button onclick={() => (showAddVideo = !showAddVideo)} class="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-surface-hover transition-colors">
						{showAddVideo ? 'Cancel' : '+ Add'}
					</button>
					<a href={youtubeSearchUrl} target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 transition-colors">
						<svg class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="currentColor"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" /></svg>
						Search
					</a>
				</div>
			</div>

			{#if showAddVideo}
				<form onsubmit={addVideo} class="flex gap-2 mb-4">
					<input type="url" bind:value={videoUrl} placeholder="Paste YouTube URL..." class="flex-1 px-3 py-2 text-sm rounded-lg border border-border bg-surface focus:outline-none focus:ring-2 focus:ring-primary/50" />
					<button type="submit" class="px-4 py-2 text-sm font-medium rounded-lg bg-primary text-text-on-primary hover:bg-primary/90 transition-colors">Save</button>
				</form>
			{/if}

			{#if displayVideoUrls?.length}
				<div class="flex items-start gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
					{#each displayVideoUrls as video, i}
						{@const ytId = getYoutubeId(video.url)}
						{@const isVertical = /\/shorts\//.test(video.url)}
						{#if ytId}
							<div class="relative rounded-lg overflow-hidden border border-border flex-none snap-start {isVertical ? 'w-[180px]' : 'w-[85%]'}">
								<iframe
									src="https://www.youtube.com/embed/{ytId}?rel=0&playsinline=1{getYoutubeStart(video.url)}"
									title={video.title || 'Exercise video'}
									class="w-full {isVertical ? 'aspect-[9/16]' : 'aspect-video'}"
									frameborder="0"
									allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
									allowfullscreen
								></iframe>
								<button type="button" onclick={() => removeVideo(i)} aria-label="Remove video" class="absolute top-2 right-2 p-1.5 rounded-full bg-black/60 text-white hover:bg-black/80 transition-colors">
									<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
								</button>
							</div>
						{/if}
					{/each}
				</div>
			{:else if !showAddVideo}
				<p class="text-sm text-text-muted">No videos yet. Add one or search YouTube.</p>
			{/if}
		</div>

		<!-- Propose changes / Submit for review -->
		{#if isCanonical && isCustomized && !pendingProposal}
			<div class="mb-8 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
				<p class="text-sm text-text-muted mb-3">You've customized this exercise. Want to propose your changes for the global library?</p>
				<button
					type="button"
					onclick={proposeChanges}
					disabled={proposing}
					class="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
				>
					{#if proposing}
						<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
					{/if}
					Propose to Global Library
				</button>
			</div>
		{:else if isCanonical && pendingProposal}
			<div class="mb-8 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
				<div class="flex items-center gap-2 text-sm text-primary">
					<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
					<span>Your changes are pending review.</span>
				</div>
			</div>
		{:else if !isCanonical && exercise.user === currentUserId()}
			<!-- User-created exercise — can propose for canonical promotion -->
			<div class="mb-8 p-4 rounded-xl border border-dashed border-primary/30 bg-primary/5">
				{#if pendingProposal}
					<div class="flex items-center gap-2 text-sm text-primary">
						<svg class="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2"><path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
						<span>Your exercise is pending review for the global library.</span>
					</div>
				{:else}
					<p class="text-sm text-text-muted mb-3">Want to propose this exercise for the global library?</p>
					<button
						type="button"
						onclick={proposeNewExercise}
						disabled={proposing}
						class="w-full py-2.5 rounded-lg text-sm font-medium bg-primary text-text-on-primary hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
					>
						{#if proposing}
							<svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
						{/if}
						Propose to Global Library
					</button>
				{/if}
			</div>
		{/if}

		<!-- Recent History -->
		<div>
			<h2 class="text-lg font-semibold mb-3">Recent History</h2>
			{#if recentHistory.length > 0}
				<div class="space-y-2">
					{#each recentHistory as entry}
						<div class="p-3 rounded-lg border border-border bg-surface-dim">
							<div class="flex items-center justify-between mb-1">
								<span class="text-sm font-medium">{formatDate(entry.date)}</span>
								<div class="flex items-center gap-2">
									{#if entry.rpe}
										<span class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">RPE {entry.rpe}</span>
									{/if}
									{#if entry.painFlag}
										<span class="text-xs bg-danger/10 text-danger px-1.5 py-0.5 rounded">Pain</span>
									{/if}
								</div>
							</div>
							<div class="text-sm text-text-muted">{formatSets(entry.sets)}</div>
							{#if entry.notes}
								<div class="text-xs text-text-muted mt-1 italic">{entry.notes}</div>
							{/if}
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-6 text-text-muted text-sm border border-dashed border-border rounded-lg">
					No history yet. Start logging to build your record.
				</div>
			{/if}
		</div>
	</div>
{/if}
