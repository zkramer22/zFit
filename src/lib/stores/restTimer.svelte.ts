function createRestTimerStore() {
	let running = $state(false);
	let startedAt = $state(0);
	let elapsed = $state(0);

	return {
		get running() { return running; },
		get elapsed() { return elapsed; },

		start() {
			startedAt = Date.now();
			elapsed = 0;
			running = true;
		},

		reset() {
			running = false;
			elapsed = 0;
			startedAt = 0;
		},

		tick() {
			if (!running) return;
			elapsed = Math.floor((Date.now() - startedAt) / 1000);
		}
	};
}

export const restTimerStore = createRestTimerStore();
