<script lang="ts">
	import { goto } from '$app/navigation';
	import { pb } from '$lib/pocketbase/client';
	import type { SessionExpanded, SessionEntryExpanded, SetData } from '$lib/pocketbase/types';
	import * as Calendar from '$lib/components/ui/calendar/index.js';
	import CalendarDayWithDots from '$lib/components/CalendarDayWithDots.svelte';
	import SlideReveal from '$lib/components/SlideReveal.svelte';
	import { formatSets } from '$lib/utils/format';
	import { today, getLocalTimeZone } from '@internationalized/date';
	import type { DateValue } from '@internationalized/date';
	import { ChevronDown, LoaderCircle } from 'lucide-svelte';
	import { Button } from '$lib/components/ui/button';

	let sessions = $state<SessionExpanded[]>([]);
	let selectedDate = $state<DateValue | undefined>(today(getLocalTimeZone()));
	let placeholder = $state<DateValue>(today(getLocalTimeZone()));
	let expandedSession = $state<string | null>(null);
	let sessionEntries = $state<Record<string, SessionEntryExpanded[]>>({});

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

	async function toggleSession(sessionId: string) {
		if (expandedSession === sessionId) {
			expandedSession = null;
			return;
		}
		expandedSession = sessionId;
		if (!sessionEntries[sessionId]) {
			try {
				const entries = await pb.collection('session_entries').getFullList<SessionEntryExpanded>({
					filter: `session = "${sessionId}"`,
					sort: 'order',
					expand: 'exercise'
				});
				sessionEntries = { ...sessionEntries, [sessionId]: entries };
			} catch {
				// Fallback: fetch all and filter client-side
				const all = await pb.collection('session_entries').getFullList<SessionEntryExpanded>({
					sort: 'order',
					expand: 'exercise'
				});
				sessionEntries = { ...sessionEntries, [sessionId]: all.filter(e => e.session === sessionId) };
			}
		}
	}

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
			{#if selectedSessions.length > 0}
				<div class="grid gap-2">
					{#each selectedSessions as sess (sess.id)}
						{@const isOpen = expandedSession === sess.id}
						<div class="rounded-xl border border-border bg-surface overflow-hidden">
							<button
								type="button"
								onclick={() => toggleSession(sess.id)}
								class="w-full text-left p-3 hover:bg-surface-hover transition-colors"
							>
								<div class="flex items-center justify-between gap-2">
									<div class="min-w-0">
										<div class="font-medium leading-tight">{sess.expand?.workout?.name || 'Freeform Session'}</div>
										<div class="text-xs text-text-muted mt-0.5">
											{new Date(sess.date.split(' ')[0] + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}
										</div>
									</div>
									<ChevronDown
										class="w-4 h-4 text-text-muted shrink-0 transition-transform duration-200 {isOpen ? 'rotate-180' : ''}"
									/>
								</div>
							</button>
							<SlideReveal open={isOpen}>
								<div class="px-3 pb-3 space-y-2">
									{#if sessionEntries[sess.id]?.length}
										{#each sessionEntries[sess.id] as entry}
											<div class="p-2.5 rounded-lg bg-surface-dim">
												<div class="flex items-center justify-between mb-1">
													<Button variant="link" size="sm" href="/exercises/{entry.exercise}" class="h-auto p-0 text-sm font-medium text-text no-underline hover:underline">{entry.expand?.exercise?.name || 'Unknown'}</Button>
													<div class="flex items-center gap-2">
														{#if entry.rpe}
															<span class="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded">RPE {entry.rpe}</span>
														{/if}
														{#if entry.pain_flag}
															<span class="text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Pain</span>
														{/if}
													</div>
												</div>
												<div class="text-xs text-text-muted">{formatSets(entry.sets)}</div>
												{#if entry.notes}
													<div class="text-xs text-text-muted mt-1 italic">{entry.notes}</div>
												{/if}
											</div>
										{/each}
									{:else}
										<div class="flex justify-center py-3">
											<LoaderCircle class="w-5 h-5 animate-spin text-primary" />
										</div>
									{/if}
								</div>
							</SlideReveal>
						</div>
					{/each}
				</div>
			{/if}

			<button
				type="button"
				onclick={() => goto(`/session?date=${dateKey(selectedDate!)}`)}
				class="mt-2 w-full p-2 rounded-lg border border-dashed border-border text-sm text-text-muted hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-1"
			>
				<svg class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
				</svg>
				Log Session
			</button>
		</section>
	{/if}
</div>
