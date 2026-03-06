<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import type { SessionExpanded } from '$lib/pocketbase/types';
	import * as Calendar from '$lib/components/ui/calendar/index.js';
	import CalendarDayWithDots from '$lib/components/CalendarDayWithDots.svelte';
	import { today, getLocalTimeZone } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';

	let sessions = $state<SessionExpanded[]>([]);
	let selectedDate = $state<DateValue | undefined>(undefined);
	let placeholder = $state<DateValue>(today(getLocalTimeZone()));

	// Map of "YYYY-MM-DD" -> session count for dots
	let sessionsByDate = $derived.by(() => {
		const map = new Map<string, number>();
		for (const s of sessions) {
			const key = s.date.split(' ')[0]; // PB dates may include time
			map.set(key, (map.get(key) || 0) + 1);
		}
		return map;
	});

	// Sessions for the selected date
	let selectedSessions = $derived.by(() => {
		if (!selectedDate) return [];
		const key = `${selectedDate.year}-${String(selectedDate.month).padStart(2, '0')}-${String(selectedDate.day).padStart(2, '0')}`;
		return sessions.filter(s => s.date.startsWith(key));
	});

	function dateKey(d: DateValue): string {
		return `${d.year}-${String(d.month).padStart(2, '0')}-${String(d.day).padStart(2, '0')}`;
	}

	async function fetchSessions(month: DateValue) {
		try {
			// Fetch the full month range (with a few days buffer for display)
			const startDate = `${month.year}-${String(month.month).padStart(2, '0')}-01`;
			const endMonth = month.month === 12 ? 1 : month.month + 1;
			const endYear = month.month === 12 ? month.year + 1 : month.year;
			const endDate = `${endYear}-${String(endMonth).padStart(2, '0')}-01`;

			sessions = await pb.collection('sessions').getFullList<SessionExpanded>({
				filter: `completed = true && date >= "${startDate}" && date < "${endDate}"`,
				sort: '-date',
				expand: 'workout'
			});
		} catch (err) {
			console.error('Failed to load sessions:', err);
			sessions = [];
		}
	}

	// Fetch on mount + re-fetch when month changes
	$effect(() => {
		fetchSessions(placeholder);
	});

	function handleValueChange(val: DateValue | DateValue[] | undefined) {
		if (Array.isArray(val)) {
			selectedDate = val[0];
		} else {
			selectedDate = val;
		}
	}
</script>

<svelte:head>
	<title>zFit</title>
</svelte:head>

<div class="p-4 max-w-[500px] mx-auto">
	<h1 class="text-2xl font-bold mb-4">Calendar</h1>

	<Calendar.Calendar
		class="w-full rounded-xl border border-border bg-surface p-3 [--cell-size:--spacing(10)] *:w-full"
		weekdayFormat="short"
		type="single"
		onValueChange={(val) => handleValueChange(val)}
		bind:value={selectedDate}
		bind:placeholder
	>
		{#snippet day({ day: d, outsideMonth })}
			<CalendarDayWithDots
				sessionCount={outsideMonth ? 0 : (sessionsByDate.get(dateKey(d)) ?? 0)}
			/>
		{/snippet}
	</Calendar.Calendar>

	<!-- Selected date sessions -->
	{#if selectedDate}
		<section class="mt-6">
			<h2 class="text-sm font-bold text-text-muted uppercase tracking-wide mb-3">
				{new Date(selectedDate.year, selectedDate.month - 1, selectedDate.day).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}
			</h2>
			{#if selectedSessions.length === 0}
				<p class="text-text-muted text-sm">No completed sessions on this day.</p>
			{:else}
				<div class="grid gap-2">
					{#each selectedSessions as sess (sess.id)}
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
			{/if}
		</section>
	{/if}
</div>
