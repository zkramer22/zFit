<script lang="ts">
	import type { Measure, SetData } from '$lib/pocketbase/types';
	import { NumberStepper } from '$lib/components/ui/number-stepper';
	import { authStore } from '$lib/stores/auth.svelte';

	interface Props {
		index: number;
		set: SetData;
		measure: Measure;
		bandLevels: string[];
		readonly?: boolean;
		done?: boolean;
		timerRunning?: boolean;
		onupdate: (field: keyof SetData, value: unknown) => void;
		ondone: () => void;
		onstarttimer?: () => void;
	}

	let { index, set, measure, bandLevels, readonly = false, done = false, timerRunning = false, onupdate, ondone, onstarttimer }: Props = $props();

	let editing = $state(false);

	const isTimed = $derived(measure === 'time');
	const amount = $derived(
		measure === 'weight' ? set.load
		: measure === 'time' ? set.seconds
		: null
	);
	const amountLabel = $derived(
		measure === 'weight' ? (set.load_unit ?? 'lb')
		: measure === 'bodyweight' ? 'BW'
		: measure === 'time' ? 'sec'
		: (set.band ?? 'Band')
	);

	function setAmount(v: number | null) {
		if (measure === 'time') {
			onupdate('seconds', v);
			return;
		}
		onupdate('load', v);
		if (!set.load_unit) onupdate('load_unit', authStore.weightUnit);
	}

	function cycleBand() {
		if (!bandLevels.length) return;
		const idx = set.band ? bandLevels.indexOf(set.band) : -1;
		onupdate('band', bandLevels[(idx + 1) % bandLevels.length]);
	}
</script>

<div class="py-2 {done ? 'opacity-60' : ''}">
	<div class="flex items-center gap-1.5">
		<!-- Set number -->
		<span class="w-5 text-xs text-text-muted font-medium text-center shrink-0">{index + 1}</span>

		{#if readonly}
			<!-- Readonly static display -->
			<span class="flex items-center gap-1.5 text-sm tabular-nums px-2 py-1 -mx-1">
				<span class="font-medium {set.reps ? 'text-text' : 'text-text-muted'}">{set.reps ?? '–'}</span>
				<span class="text-xs text-text-muted">&times;</span>
				{#if measure === 'weight' || measure === 'time'}
					<span class="font-medium {amount ? 'text-text' : 'text-text-muted'}">{amount ?? '–'}</span>
				{/if}
				<span class="text-xs text-text-muted">{amountLabel}</span>
			</span>
			{#if done}
				<svg class="ml-auto w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			{/if}
		{:else if editing}
			<NumberStepper
				class="flex-1 min-w-0"
				value={set.reps}
				onchange={(v) => onupdate('reps', v)}
			/>
			<span class="text-xs text-text-muted shrink-0">&times;</span>

			{#if measure === 'band'}
				<button type="button" onclick={cycleBand} disabled={!bandLevels.length}
					class="text-xs font-medium shrink-0 px-1.5 py-0.5 rounded border border-border text-text-muted hover:border-primary hover:text-primary transition-colors disabled:hover:border-border disabled:hover:text-text-muted"
					aria-label="Change band"
				>{amountLabel}</button>
			{:else if measure === 'bodyweight'}
				<span class="text-xs text-text-muted shrink-0">BW</span>
			{:else}
				<NumberStepper
					class="flex-1 min-w-0"
					value={amount}
					onchange={setAmount}
					step={5}
				/>
				<span class="text-xs text-text-muted shrink-0">{amountLabel}</span>
			{/if}

			<!-- Close edit -->
			<button type="button" onclick={() => editing = false} class="ml-auto p-1.5 rounded-md border border-border text-text-muted hover:border-primary hover:text-primary transition-colors shrink-0" aria-label="Done editing">
				<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			</button>
		{:else}
			<!-- Static display — tap to edit -->
			<button type="button" onclick={() => editing = true} disabled={timerRunning} class="flex items-center gap-1.5 text-sm tabular-nums hover:bg-surface-hover rounded-lg px-2 py-1 -mx-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
				<span class="font-medium {set.reps ? 'text-text' : 'text-text-muted'}">{set.reps ?? '–'}</span>
				<span class="text-xs text-text-muted">&times;</span>
				{#if measure === 'weight' || measure === 'time'}
					<span class="font-medium {amount ? 'text-text' : 'text-text-muted'}">{amount ?? '–'}</span>
				{/if}
				<span class="text-xs text-text-muted">{amountLabel}</span>
			</button>

			<div class="ml-auto flex items-center gap-1 shrink-0">
				<!-- Play timer (timed exercises only) -->
				{#if isTimed && set.seconds && onstarttimer}
					<button
						type="button"
						onclick={onstarttimer}
						disabled={timerRunning}
						class="p-1.5 rounded-md border transition-colors
							{timerRunning ? 'border-primary/40 text-primary bg-primary/10' : 'border-border text-text-muted hover:border-primary hover:text-primary'}"
						aria-label="Start timer"
					>
						<svg class="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
							<path d="M8 5v14l11-7z" />
						</svg>
					</button>
				{/if}

				<!-- Done checkmark -->
				<button
					type="button"
					onclick={ondone}
					disabled={timerRunning}
					class="p-1.5 rounded-md border transition-colors
						{done ? 'border-green-400 text-green-600 bg-green-50' : timerRunning ? 'border-border text-text-muted opacity-40 cursor-not-allowed' : 'border-border text-text-muted hover:border-green-400 hover:text-green-600'}"
					aria-label="Mark set done"
				>
					<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
						<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
					</svg>
				</button>
			</div>
		{/if}
	</div>

	<!-- Distance row -->
	{#if set.distance != null && set.distance_unit}
		{#if readonly}
			<div class="flex items-center gap-1.5 mt-1 pl-5">
				<span class="text-sm tabular-nums font-medium">{set.distance}</span>
				<span class="text-xs text-text-muted">{set.distance_unit}</span>
			</div>
		{:else if editing}
			<div class="flex items-center gap-1.5 mt-1 pl-5">
				<NumberStepper
					value={set.distance}
					onchange={(v) => onupdate('distance', v)}
				/>
				<span class="text-xs text-text-muted">{set.distance_unit}</span>
			</div>
		{/if}
	{/if}
</div>
