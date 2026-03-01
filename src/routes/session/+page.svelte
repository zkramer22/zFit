<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import type { Workout, SessionExpanded, SetData, SetUnit, DistanceUnit } from '$lib/pocketbase/types';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { dialogStore } from '$lib/stores/dialog.svelte';
	import { LoaderCircle, Trash2 } from 'lucide-svelte';

	let allWorkouts = $state<Workout[]>([]);
	let activeSessions = $state<SessionExpanded[]>([]);
	let completedSessions = $state<SessionExpanded[]>([]);
	let loading = $state(true);
	let creating = $state(false);

	async function loadData() {
		loading = true;
		try {
			allWorkouts = await pb.collection('workouts').getFullList<Workout>({ sort: 'name' });
		} catch (err) {
			console.error('Failed to load workouts:', err);
		}
		try {
			activeSessions = await pb.collection('sessions').getFullList<SessionExpanded>({
				filter: 'completed != true',
				sort: '-date',
				expand: 'workout'
			});
		} catch (err) {
			console.error('Failed to load active sessions:', err);
			activeSessions = [];
		}
		try {
			const result = await pb.collection('sessions').getList<SessionExpanded>(1, 10, {
				filter: 'completed = true',
				sort: '-date',
				expand: 'workout'
			});
			completedSessions = result.items;
		} catch (err) {
			console.error('Failed to load completed sessions:', err);
			completedSessions = [];
		} finally {
			loading = false;
		}
	}

	// Re-run when navigating to this page (page.url changes trigger reactivity)
	$effect(() => {
		$page.url;
		loadData();
	});

	function promptDeleteSession(sess: SessionExpanded) {
		dialogStore.confirm({
			title: 'Delete session?',
			description: `This will permanently delete your <strong>${sess.expand?.workout?.name || 'freeform'}</strong> session and all its logged data.`,
			confirmLabel: 'Delete',
			confirmClass: 'bg-red-600 hover:bg-red-700 text-white',
			async onConfirm() {
				const entries = await pb.collection('session_entries').getFullList({
					filter: `session = "${sess.id}"`
				});
				for (const entry of entries) {
					await pb.collection('session_entries').delete(entry.id);
				}
				await pb.collection('sessions').delete(sess.id);
				activeSessions = activeSessions.filter(s => s.id !== sess.id);
			}
		});
	}

	async function startSession(workoutId?: string, programId?: string) {
		creating = true;
		const today = new Date().toISOString().split('T')[0];
		const session = await pb.collection('sessions').create({
			workout: workoutId || '',
			program: programId || '',
			date: today,
			notes: '',
			completed: false
		});

		// If a workout is selected, create session entries from workout exercises
		if (workoutId) {
			const wes = await pb.collection('workout_exercises').getFullList({
				filter: `workout = "${workoutId}"`,
				sort: 'order',
				expand: 'exercise'
			});
			for (const we of wes) {
				const numSets = we.target_sets || 1;
				const reps = we.target_reps ? parseInt(we.target_reps, 10) || null : null;
				const value = we.target_value ? parseFloat(we.target_value) || null : null;
				const unit: SetUnit = we.target_unit || 'lb';
				const distance = we.target_distance ? parseFloat(we.target_distance) || null : null;
				const distanceUnit: DistanceUnit | null = we.target_distance_unit || null;

				const sets: SetData[] = Array.from({ length: numSets }, () => ({
					reps,
					value: unit === 'bw' || unit === 'band' ? null : value,
					unit,
					distance,
					distance_unit: distanceUnit,
					notes: '',
					completed: false
				}));

				await pb.collection('session_entries').create({
					session: session.id,
					exercise: we.exercise,
					order: we.order,
					sets,
					rpe: null,
					pain_flag: false,
					notes: ''
				});
			}
		}

		await goto(`/session/${session.id}`);
	}
</script>

<svelte:head>
	<title>Sessions — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	{#if loading}
		<div class="h-6 w-48 rounded bg-surface-dim animate-pulse mb-2"></div>
		<div class="h-4 w-64 rounded bg-surface-dim animate-pulse mb-6"></div>
		<div class="grid gap-3">
			{#each Array(4) as _}
				<div class="h-24 rounded-xl bg-surface-dim animate-pulse"></div>
			{/each}
		</div>
	{:else}
		<h1 class="text-2xl font-bold mb-6">Sessions</h1>

		<!-- Active sessions -->
		{#if activeSessions.length > 0}
			<section class="mb-8">
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
					Active Session{activeSessions.length > 1 ? 's' : ''}
				</h2>
				<div class="grid gap-3">
					{#each activeSessions as sess (sess.id)}
						<div class="flex items-center gap-2 p-4 rounded-xl border border-primary/40 ring-2 ring-primary/20 bg-surface">
							<button
								type="button"
								onclick={() => goto(`/session/${sess.id}`)}
								class="flex-1 text-left min-w-0"
							>
								<div class="font-semibold leading-tight">
									{sess.expand?.workout?.name || 'Freeform Session'}
								</div>
								<div class="text-xs text-text-muted mt-0.5">
									{new Date(sess.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
								</div>
							</button>
							<button
								type="button"
								onclick={() => promptDeleteSession(sess)}
								class="p-2 rounded-lg border border-border text-text-muted hover:border-red-400 hover:text-red-500 transition-colors shrink-0"
								aria-label="Delete session"
							>
								<Trash2 class="w-4 h-4" />
							</button>
						</div>
					{/each}
				</div>
			</section>
		{/if}

		<!-- Start new session -->
		<section>
			<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Start New Session</h2>
			<p class="text-text-muted text-sm mb-4">Choose a workout or go freeform.</p>

			<div class="grid gap-3">
				{#each allWorkouts as workout}
					<button
						type="button"
						onclick={() => startSession(workout.id)}
						class="w-full text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover
							transition-colors active:scale-[0.98] touch-target"
					>
						<div class="font-semibold text-lg">{workout.name}</div>
						{#if workout.description}
							<div class="text-sm text-text-muted mt-1">{workout.description}</div>
						{/if}
					</button>
				{/each}
			</div>

			<!-- Freeform option -->
			<button
				type="button"
				onclick={() => startSession()}
				class="w-full text-left p-4 mt-3 rounded-xl border border-dashed border-border-strong bg-surface-dim
					hover:bg-surface-hover transition-colors active:scale-[0.98] touch-target"
			>
				<div class="font-semibold text-lg text-text-muted">Freeform Session</div>
				<div class="text-sm text-text-muted mt-1">Start without a template — add exercises as you go.</div>
			</button>
		</section>

		<!-- Recently Completed -->
		{#if completedSessions.length > 0}
			<section class="mt-8">
				<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">Recently Completed</h2>
				<div class="grid gap-2">
					{#each completedSessions as sess (sess.id)}
						<button
							type="button"
							onclick={() => goto(`/session/${sess.id}`)}
							class="w-full text-left p-3 rounded-xl border border-border bg-surface hover:bg-surface-hover transition-colors"
						>
							<div class="flex items-center justify-between gap-2">
								<div class="min-w-0">
									<div class="font-medium leading-tight">{sess.expand?.workout?.name || 'Freeform Session'}</div>
									<div class="text-xs text-text-muted mt-0.5">
										{new Date(sess.date).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
									</div>
								</div>
								<svg class="w-4 h-4 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
									<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
								</svg>
							</div>
						</button>
					{/each}
				</div>
			</section>
		{/if}
	{/if}
</div>

<AlertDialog.Root open={creating}>
	<AlertDialog.Content class="max-w-xs">
		<AlertDialog.Header>
			<AlertDialog.Title class="flex items-center gap-2">
				<LoaderCircle class="w-5 h-5 animate-spin text-primary" />
				Creating session...
			</AlertDialog.Title>
			<AlertDialog.Description>Setting up your workout exercises.</AlertDialog.Description>
		</AlertDialog.Header>
	</AlertDialog.Content>
</AlertDialog.Root>

