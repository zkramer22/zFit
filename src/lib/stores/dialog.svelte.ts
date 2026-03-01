interface DialogOptions {
	title: string;
	description: string;
	confirmLabel?: string;
	confirmClass?: string;
	onConfirm: () => void | Promise<void>;
}

function createDialogStore() {
	let open = $state(false);
	let options = $state<DialogOptions>({
		title: '',
		description: '',
		confirmLabel: 'Confirm',
		confirmClass: '',
		onConfirm: () => {}
	});

	return {
		get open() { return open; },
		get options() { return options; },

		confirm(opts: DialogOptions) {
			options = {
				confirmLabel: 'Confirm',
				confirmClass: '',
				...opts
			};
			open = true;
		},

		close() {
			open = false;
		},

		async handleConfirm() {
			await options.onConfirm();
			open = false;
		}
	};
}

export const dialogStore = createDialogStore();
