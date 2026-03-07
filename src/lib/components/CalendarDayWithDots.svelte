<script lang="ts">
	import { buttonVariants } from "$lib/components/ui/button/index.js";
	import { cn } from "$lib/utils.js";
	import { Calendar as CalendarPrimitive } from "bits-ui";

	let {
		ref = $bindable(null),
		class: className,
		sessionCount = 0,
		...restProps
	}: CalendarPrimitive.DayProps & { sessionCount?: number } = $props();

	const dots = $derived(Math.min(sessionCount, 3));
</script>

<CalendarPrimitive.Day
	bind:ref
	class={cn(
		buttonVariants({ variant: "ghost" }),
		"relative flex w-full h-(--cell-size) flex-col items-center justify-center gap-0.5 p-0 leading-none font-normal whitespace-nowrap select-none",
		"[&[data-today]:not([data-selected])]:bg-accent [&[data-today]:not([data-selected])]:text-accent-foreground [&[data-today][data-disabled]]:text-muted-foreground",
		"data-[selected]:bg-primary/15 data-[selected]:border data-[selected]:border-primary/30 dark:data-[selected]:hover:bg-accent/50 data-[selected]:text-primary",
		"[&[data-outside-month]:not([data-selected])]:text-muted-foreground [&[data-outside-month]:not([data-selected])]:hover:text-accent-foreground",
		"data-[disabled]:text-muted-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
		"data-[unavailable]:text-muted-foreground data-[unavailable]:line-through",
		"dark:hover:text-accent-foreground",
		"focus:border-ring focus:ring-ring/50 focus:relative",
		"[&>span]:text-xs [&>span]:opacity-70",
		className
	)}
	{...restProps}
>
	{#snippet children(props)}
		<span>{props.day}</span>
		<div class="flex gap-0.5 h-1">
			{#each Array(dots) as _}
				<span class="w-1 h-1 rounded-full bg-success"></span>
			{/each}
		</div>
	{/snippet}
</CalendarPrimitive.Day>
