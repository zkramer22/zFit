<script lang="ts">
	import { page } from '$app/stores';
	import { pb } from '$lib/pocketbase/client';
	import type { Exercise, SetData, SessionEntry, Session } from '$lib/pocketbase/types';
	import { CATEGORIES, CATEGORY_COLORS, MUSCLE_GROUPS, getLabel } from '$lib/constants';
	import { formatSets } from '$lib/utils/format';

	let exercise = $state<Exercise | null>(null);
	let recentHistory = $state<Array<{
		date: string;
		sets: SetData[];
		rpe: number | null;
		painFlag: boolean;
		notes: string;
	}>>([]);
	let loading = $state(true);

	async function loadData(id: string) {
		loading = true;
		const [ex, entries] = await Promise.all([
			pb.collection('exercises').getOne<Exercise>(id),
			pb.collection('session_entries').getList<SessionEntry>(1, 10, {
				filter: `exercise="${id}"`,
				sort: '-created'
			}).catch(() => ({ items: [] as SessionEntry[] }))
		]);

		exercise = ex;

		// Fetch session dates in parallel
		const sessionIds = [...new Set(entries.items.map((e) => e.session))];
		const sessionResults = await Promise.all(
			sessionIds.map((sid) => pb.collection('sessions').getOne<Session>(sid).catch(() => null))
		);
		const sessions: Record<string, Session> = {};
		for (let i = 0; i < sessionIds.length; i++) {
			if (sessionResults[i]) sessions[sessionIds[i]] = sessionResults[i]!;
		}

		recentHistory = entries.items.map((entry) => ({
			date: sessions[entry.session]?.date || entry.created,
			sets: entry.sets,
			rpe: entry.rpe,
			painFlag: entry.pain_flag,
			notes: entry.notes
		}));

		loading = false;
	}

	$effect(() => { loadData($page.params.id!); });

	function formatDate(d: string): string {
		return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
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
		editDescription = exercise.description || '';
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
		await pb.collection('exercises').update(exercise.id, {
			name: editName.trim(),
			category: editCategory,
			description: editDescription,
			muscle_groups: editMuscleGroups
		});
		editing = false;
		await loadData($page.params.id!);
	}

	async function addVideo(e: SubmitEvent) {
		e.preventDefault();
		if (!exercise || !videoUrl.trim()) return;
		const ytMatch = videoUrl.match(/(?:youtu\.be\/|youtube\.com\/(?:.*[?&]v=|.*\/))([\w-]+)/);
		if (!ytMatch) { alert('Please paste a valid YouTube URL'); return; }

		const videos = [...(exercise.video_urls || []), { url: videoUrl, title: '', thumbnail_url: '' }];
		await pb.collection('exercises').update(exercise.id, { video_urls: videos });
		videoUrl = '';
		showAddVideo = false;
		await loadData($page.params.id!);
	}

	async function removeVideo(index: number) {
		if (!exercise) return;
		const videos = [...(exercise.video_urls || [])];
		videos.splice(index, 1);
		await pb.collection('exercises').update(exercise.id, { video_urls: videos });
		await loadData($page.params.id!);
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
				<h1 class="font-bold text-lg leading-tight truncate">{editing ? editName || 'Edit Exercise' : exercise.name}</h1>
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

			{#if exercise.description}
				<p class="text-sm text-text-muted leading-relaxed mb-6">{exercise.description}</p>
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

			{#if exercise.video_urls?.length}
				<div class="flex items-start gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
					{#each exercise.video_urls as video, i}
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
