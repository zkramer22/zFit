<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		children: Snippet;
	}

	let { open, onclose, children }: Props = $props();

	let visible = $state(false);
	let animating = $state(false);

	// Drag state
	let dragging = $state(false);
	let dragOffsetY = $state(0);
	let startY = 0;
	let panelEl: HTMLDivElement | undefined = $state();

	const CLOSE_THRESHOLD = 0.4; // close if dragged past 40% of panel height

	function onDragStart(clientY: number) {
		dragging = true;
		startY = clientY;
		dragOffsetY = 0;
	}

	function onDragMove(clientY: number) {
		if (!dragging) return;
		const delta = clientY - startY;
		// Only allow dragging downward (positive delta)
		dragOffsetY = Math.max(0, delta);
	}

	function onDragEnd() {
		if (!dragging) return;
		dragging = false;

		const panelHeight = panelEl?.offsetHeight ?? 0;
		if (panelHeight > 0 && dragOffsetY / panelHeight > CLOSE_THRESHOLD) {
			// Past threshold — close
			onclose();
		}
		// Snap back
		dragOffsetY = 0;
	}

	// Touch handlers
	function handleTouchStart(e: TouchEvent) {
		onDragStart(e.touches[0].clientY);
	}
	function handleTouchMove(e: TouchEvent) {
		onDragMove(e.touches[0].clientY);
	}
	function handleTouchEnd() {
		onDragEnd();
	}

	// Mouse handlers
	function handleMouseDown(e: MouseEvent) {
		onDragStart(e.clientY);
		// Listen on window so drag continues outside the handle
		window.addEventListener('mousemove', handleMouseMove);
		window.addEventListener('mouseup', handleMouseUp);
	}
	function handleMouseMove(e: MouseEvent) {
		onDragMove(e.clientY);
	}
	function handleMouseUp() {
		onDragEnd();
		window.removeEventListener('mousemove', handleMouseMove);
		window.removeEventListener('mouseup', handleMouseUp);
	}

	$effect(() => {
		if (open) {
			visible = true;
			document.body.style.overflow = 'hidden';
			requestAnimationFrame(() => {
				animating = true;
			});
		} else if (visible) {
			animating = false;
			setTimeout(() => {
				visible = false;
				document.body.style.overflow = '';
			}, 300);
		}
	});
</script>

{#if visible}
	<!-- Backdrop -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="fixed inset-0 z-50 bg-black/40 transition-opacity duration-300"
		class:opacity-0={!animating}
		class:opacity-100={animating}
		onclick={onclose}
		onkeydown={(e) => e.key === 'Escape' && onclose()}
	></div>

	<!-- Panel -->
	<div
		bind:this={panelEl}
		class="fixed bottom-0 left-0 right-0 z-50 bg-surface rounded-t-2xl shadow-xl
			max-h-[85vh] flex flex-col"
		class:translate-y-full={!animating && !dragging}
		class:translate-y-0={animating && !dragging}
		style:transform={dragging ? `translateY(${dragOffsetY}px)` : undefined}
		style:transition={dragging ? 'none' : 'transform 300ms ease-out'}
	>
		<!-- Drag handle -->
		<!-- svelte-ignore a11y_no_static_element_interactions -->
		<div
			class="flex justify-center pt-4 pb-4 shrink-0 cursor-grab active:cursor-grabbing touch-none select-none"
			onmousedown={handleMouseDown}
			ontouchstart={handleTouchStart}
			ontouchmove={handleTouchMove}
			ontouchend={handleTouchEnd}
		>
			<div class="w-10 h-1 rounded-full bg-border-strong"></div>
		</div>

		<!-- Content -->
		<div class="flex-1 overflow-y-auto overscroll-contain px-4 pb-6">
			{@render children()}
		</div>
	</div>
{/if}
