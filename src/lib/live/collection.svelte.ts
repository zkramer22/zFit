import type { RecordModel } from 'pocketbase';
import { createLiveSource } from './source.svelte';

export interface LiveCollectionOptions {
	collection: string;
	sort?: string;
	expand?: string;
	/** Keep a copy on the device so pages draw instantly at launch. Default true. */
	persist?: boolean;
}

interface SavedCopy<T> {
	data: T[];
}

/** A whole collection, kept current for as long as the app runs. */
export function createLiveCollection<T extends RecordModel>(options: LiveCollectionOptions) {
	const storageKey = `zfit_cache_${options.collection}`;
	const persist = options.persist ?? true;
	const source = createLiveSource<T>(options);

	function readSaved(): T[] {
		try {
			const raw = localStorage.getItem(storageKey);
			return raw ? ((JSON.parse(raw) as SavedCopy<T>).data ?? []) : [];
		} catch {
			return [];
		}
	}

	if (persist) {
		source.onChange((items) => {
			try {
				localStorage.setItem(storageKey, JSON.stringify({ data: items } satisfies SavedCopy<T>));
			} catch {
				// Storage full or unavailable; the live copy still works.
			}
		});
	}

	return {
		get items() {
			return source.items;
		},
		get status() {
			return source.status;
		},

		getById(id: string): T | undefined {
			return source.items.find((item) => item.id === id);
		},

		start() {
			if (persist) source.seed(readSaved());
			source.start();
		},

		/** Stops listening and forgets everything, including the saved copy. */
		async reset() {
			await source.stop();
			source.clear();
			try {
				localStorage.removeItem(storageKey);
			} catch {
				// Nothing to remove.
			}
		},

		refresh: source.refresh
	};
}
