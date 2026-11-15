<script lang="ts">
	import { navigate, route } from 'sv-router/generated';
	import { pb, currentUserId } from '$lib/pocketbase/client';
	import { workoutCache } from '$lib/stores/workoutCache.svelte';
	import { setsFromTarget, targetOf } from '$lib/measure';
	import { authStore } from '$lib/stores/auth.svelte';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import { LoaderCircle, ChevronLeft } from '@lucide/svelte';

	let creating = $state(false);

	async function startSession(workoutId?: string, programId?: string) {
		creating = true;
		const dateParam = route.search.date;
		const sessionDate = (typeof dateParam === 'string' ? dateParam : '') || new Date().toISOString().split('T')[0];
		const session = await pb.collection('sessions').create({
			user: currentUserId(),
			workout: workoutId || '',
			program: programId || '',
			date: sessionDate,
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
				const sets = setsFromTarget(targetOf(we), we.expand?.exercise?.measure || 'weight', authStore.weightUnit);

				await pb.collection('session_entries').create({
					user: currentUserId(),
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

		await navigate('/session/:sessionId', { params: { sessionId: session.id } });
	}
</script>

<svelte:head>
	<title>New Session — zFit</title>
</svelte:head>

<div class="p-4 max-w-lg mx-auto">
	<button type="button" onclick={() => history.back()}
		class="flex items-center gap-1 text-sm text-text-muted hover:text-text transition-colors mb-4">
		<ChevronLeft class="w-4 h-4" />
		Back
	</button>

	<h1 class="text-2xl font-bold mb-2">New Session</h1>
	<p class="text-text-muted text-sm mb-6">Choose a workout or go freeform.</p>

	<div class="grid gap-3">
		{#each workoutCache.items as workout}
			<button
				type="button"
				onclick={() => startSession(workout.id)}
				class="w-full text-left p-4 rounded-xl border border-border bg-surface hover:bg-surface-hover
					transition-colors touch-target"
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
			hover:bg-surface-hover transition-colors touch-target"
	>
		<div class="font-semibold text-lg text-text-muted">Freeform Session</div>
		<div class="text-sm text-text-muted mt-1">Start without a template — add exercises as you go.</div>
	</button>
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
