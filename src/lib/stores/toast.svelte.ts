interface Toast {
	id: number;
	message: string;
	type: 'error' | 'success';
}

let nextId = 0;

function createToastStore() {
	let toasts = $state<Toast[]>([]);

	return {
		get toasts() { return toasts; },

		show(message: string, type: 'error' | 'success' = 'error', duration = 4000) {
			const id = nextId++;
			toasts = [...toasts, { id, message, type }];
			setTimeout(() => {
				toasts = toasts.filter(t => t.id !== id);
			}, duration);
		},

		error(message: string) {
			this.show(message, 'error');
		},

		success(message: string) {
			this.show(message, 'success', 2500);
		},

		dismiss(id: number) {
			toasts = toasts.filter(t => t.id !== id);
		}
	};
}

export const toastStore = createToastStore();
