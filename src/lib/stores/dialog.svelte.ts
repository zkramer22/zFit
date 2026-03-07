interface DialogOptions {
	title: string;
	description: string;
	confirmLabel?: string;
	confirmClass?: string;
	pendingLabel?: string;
	onConfirm: () => void | Promise<void>;
}

function createDialogStore() {
	let open = $state(false);
	let pending = $state(false);
	let options = $state<DialogOptions>({
		title: '',
		description: '',
		confirmLabel: 'Confirm',
		confirmClass: '',
		pendingLabel: '',
		onConfirm: () => {}
	});

	return {
		get open() { return open; },
		get pending() { return pending; },
		get options() { return options; },

		confirm(opts: DialogOptions) {
			options = {
				confirmLabel: 'Confirm',
				confirmClass: '',
				pendingLabel: '',
				...opts
			};
			pending = false;
			open = true;
		},

		close() {
			open = false;
			pending = false;
		},

		async handleConfirm() {
			pending = true;
			try {
				await options.onConfirm();
			} finally {
				open = false;
				// delay resetting pending so the confirm UI doesn't flash before the dialog animates out
				setTimeout(() => { pending = false; }, 300);
			}
		}
	};
}

export const dialogStore = createDialogStore();
