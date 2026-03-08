<script lang="ts">
	interface Props {
		/** CSS selector for the scrollable container */
		containerSelector?: string;
		/** data attribute on items that holds the first letter */
		letterAttr?: string;
	}

	let { containerSelector = '[data-alphabet-list]', letterAttr = 'data-letter' }: Props = $props();

	const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

	let activeLetter = $state('');
	let showIndicator = $state(false);
	let fadeOut = $state(false);
	let touching = $state(false);
	let hideTimeout: ReturnType<typeof setTimeout> | undefined;
	let scrollerEl: HTMLDivElement | undefined = $state();

	function dismissIndicator() {
		clearTimeout(hideTimeout);
		hideTimeout = setTimeout(() => {
			fadeOut = true;
			setTimeout(() => {
				showIndicator = false;
				fadeOut = false;
			}, 300);
		}, 600);
	}

	function scrollToLetter(letter: string) {
		if (letter === activeLetter) return;
		activeLetter = letter;
		showIndicator = true;
		fadeOut = false;
		clearTimeout(hideTimeout);

		const container = document.querySelector(containerSelector);
		if (!container) return;
		const target = container.querySelector(`[${letterAttr}="${letter}"]`);
		if (target) {
			target.scrollIntoView({ block: 'start', behavior: 'auto' });
			window.scrollBy(0, -8);
		}
	}

	function getLetterFromTouch(clientY: number) {
		if (!scrollerEl) return '';
		const rect = scrollerEl.getBoundingClientRect();
		const y = clientY - rect.top;
		const idx = Math.floor((y / rect.height) * alphabet.length);
		return alphabet[Math.max(0, Math.min(idx, alphabet.length - 1))] || '';
	}

	function onTouchStart(e: TouchEvent) {
		e.preventDefault();
		touching = true;
		const letter = getLetterFromTouch(e.touches[0].clientY);
		if (letter) scrollToLetter(letter);
	}

	function onTouchMove(e: TouchEvent) {
		e.preventDefault();
		const letter = getLetterFromTouch(e.touches[0].clientY);
		if (letter) scrollToLetter(letter);
	}

	function onTouchEnd() {
		touching = false;
		dismissIndicator();
	}

	function onMouseDown(e: MouseEvent) {
		e.preventDefault();
		touching = true;
		const letter = getLetterFromTouch(e.clientY);
		if (letter) scrollToLetter(letter);

		function onMouseMove(ev: MouseEvent) {
			const l = getLetterFromTouch(ev.clientY);
			if (l) scrollToLetter(l);
		}
		function onMouseUp() {
			touching = false;
			dismissIndicator();
			window.removeEventListener('mousemove', onMouseMove);
			window.removeEventListener('mouseup', onMouseUp);
		}
		window.addEventListener('mousemove', onMouseMove);
		window.addEventListener('mouseup', onMouseUp);
	}
</script>

<!-- Center indicator -->
{#if showIndicator}
	<div
		class="fixed inset-0 flex items-center justify-center pointer-events-none z-50
			{fadeOut ? 'alphabet-fade-out' : 'alphabet-fade-in'}"
	>
		<div class="w-20 h-20 rounded-2xl bg-black/70 flex items-center justify-center">
			<span class="text-4xl font-bold text-white">{activeLetter || ''}</span>
		</div>
	</div>
{/if}

<!-- Alphabet rail -->
<div
	bind:this={scrollerEl}
	class="fixed right-0 bottom-16 z-40 flex flex-col items-center justify-end w-8 pb-1 select-none touch-none"
	style="padding-bottom: calc(env(safe-area-inset-bottom) + 0.25rem)"
	ontouchstart={onTouchStart}
	ontouchmove={onTouchMove}
	ontouchend={onTouchEnd}
	onmousedown={onMouseDown}
	role="navigation"
	aria-label="Alphabet scroller"
>
	{#each alphabet as letter}
		<div
			class="text-[9px] font-semibold leading-none py-[2.5px]
				{activeLetter === letter ? 'text-primary scale-125' : 'text-text-muted'}"
		>
			{letter}
		</div>
	{/each}
</div>

<style>
	.alphabet-fade-in {
		animation: alphabetIn 150ms ease-out forwards;
	}
	.alphabet-fade-out {
		animation: alphabetOut 300ms ease-in forwards;
	}
	@keyframes alphabetIn {
		from { opacity: 0; transform: scale(0.8); }
		to { opacity: 1; transform: scale(1); }
	}
	@keyframes alphabetOut {
		from { opacity: 1; transform: scale(1); }
		to { opacity: 0; transform: scale(0.8); }
	}
</style>
