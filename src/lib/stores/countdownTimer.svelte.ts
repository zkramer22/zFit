function createCountdownTimerStore() {
	let running = $state(false);
	let remaining = $state(0);
	let total = $state(0);
	let startedAt = $state(0);
	let finished = $state(false);

	return {
		get running() { return running; },
		get remaining() { return remaining; },
		get total() { return total; },
		get finished() { return finished; },

		start(seconds: number) {
			total = seconds;
			remaining = seconds;
			startedAt = Date.now();
			finished = false;
			running = true;
		},

		reset() {
			running = false;
			remaining = 0;
			total = 0;
			startedAt = 0;
			finished = false;
		},

		tick() {
			if (!running) return;
			const elapsed = Math.floor((Date.now() - startedAt) / 1000);
			remaining = Math.max(0, total - elapsed);
			if (remaining <= 0) {
				running = false;
				finished = true;
			}
		}
	};
}

export const countdownTimerStore = createCountdownTimerStore();
