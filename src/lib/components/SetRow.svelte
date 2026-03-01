<script lang="ts">
	import type { SetData } from '$lib/pocketbase/types';
	import { NumberStepper } from '$lib/components/ui/number-stepper';

	interface Props {
		index: number;
		set: SetData;
		readonly?: boolean;
		done?: boolean;
		timerRunning?: boolean;
		onupdate: (field: keyof SetData, value: unknown) => void;
		ondone: () => void;
		onstarttimer?: () => void;
	}

	let { index, set, readonly = false, done = false, timerRunning = false, onupdate, ondone, onstarttimer }: Props = $props();

	const isTimed = $derived(set.unit === 'sec');

	let editing = $state(false);

	const valueDisabled = $derived(set.unit === 'bw' || set.unit === 'band');
	const unitLabel = $derived(
		set.unit === 'bw' ? 'BW' : set.unit === 'band' ? 'Band' : set.unit
	);
	const valueStep = $derived(set.unit === 'lb' || set.unit === 'kg' ? 5 : 1);
</script>

<div class="py-2 {done ? 'opacity-60' : ''}">
	<div class="flex items-center gap-1.5">
		<!-- Set number -->
		<span class="w-5 text-xs text-text-muted font-medium text-center shrink-0">{index + 1}</span>

		{#if readonly}
			<!-- Readonly static display -->
			<span class="flex items-center gap-1.5 text-sm tabular-nums px-2 py-1 -mx-1">
				<span class="font-medium {set.reps ? 'text-text' : 'text-text-muted'}">{set.reps ?? 0}</span>
				<span class="text-xs text-text-muted">&times;</span>
				{#if !valueDisabled}
					<span class="font-medium {set.value ? 'text-text' : 'text-text-muted'}">{set.value ?? 0}</span>
				{/if}
				<span class="text-xs text-text-muted">{unitLabel}</span>
			</span>
			{#if done}
				<svg class="ml-auto w-3.5 h-3.5 text-green-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			{/if}
		{:else if editing}
			<!-- Reps stepper -->
			<NumberStepper
				class="flex-1 min-w-0"
				value={set.reps}
				onchange={(v) => onupdate('reps', v)}
			/>

			<span class="text-xs text-text-muted shrink-0">&times;</span>

			<!-- Value stepper -->
			{#if !valueDisabled}
				<NumberStepper
					class="flex-1 min-w-0"
					value={set.value}
					onchange={(v) => onupdate('value', v)}
					step={valueStep}
				/>
			{/if}

			<span class="text-xs text-text-muted shrink-0">{unitLabel}</span>

			<!-- Close edit -->
			<button type="button" onclick={() => editing = false} class="ml-auto p-1.5 rounded-md border border-border text-text-muted hover:border-primary hover:text-primary transition-colors shrink-0" aria-label="Done editing">
				<svg class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
					<path stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7" />
				</svg>
			</button>
		{:else}
			<!-- Static display — tap to edit -->
			<button type="button" onclick={() => editing = true} disabled={timerRunning} class="flex items-center gap-1.5 text-sm tabular-nums hover:bg-surface-hover rounded-lg px-2 py-1 -mx-1 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
				<span class="font-medium {set.reps ? 'text-text' : 'text-text-muted'}">{set.reps ?? 0}</span>
				<span class="text-xs text-text-muted">&times;</span>
				{#if !valueDisabled}
					<span class="font-medium {set.value ? 'text-text' : 'text-text-muted'}">{set.value ?? 0}</span>
				{/if}
				<span class="text-xs text-text-muted">{unitLabel}</span>
			</button>

			<div class="ml-auto flex items-center gap-1 shrink-0">
				<!-- Play timer (timed exercises only) -->
				{#if isTimed && set.value && onstarttimer}
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
