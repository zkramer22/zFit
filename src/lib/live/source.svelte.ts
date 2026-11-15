import { pb } from '$lib/pocketbase/client';
import type { RecordModel, UnsubscribeFunc } from 'pocketbase';
import { connection } from './connection.svelte';
import { applyEvent, applyEvents, compareBy, sortItems, type LiveEvent } from './events';
import { deriveStatus, type LiveStatus, type SourceState } from './status';

export interface LiveSourceOptions {
	collection: string;
	sort?: string;
	expand?: string;
	filter?: string;
}

/**
 * The shared engine behind live collections and live queries: fetch the
 * matching records, listen for changes, and catch up after missed events.
 */
export function createLiveSource<T extends RecordModel>(options: LiveSourceOptions) {
	const compare = options.sort ? compareBy<T>(options.sort) : undefined;

	let items = $state<T[]>([]);
	let sourceState = $state<SourceState>('loading');
	let running = false;
	let unsubscribe: UnsubscribeFunc | null = null;
	let offResync: (() => void) | null = null;
	// Events that arrive while a fetch is in flight are held and replayed on
	// top of its result, so nothing that happens mid-fetch gets lost.
	let buffer: LiveEvent<T>[] | null = null;
	let fetching: Promise<void> | null = null;
	let fetchAgain = false;
	let onChange: ((items: T[]) => void) | null = null;

	function setItems(next: T[]) {
		items = next;
		onChange?.(next);
	}

	function handleEvent(event: LiveEvent<T>) {
		if (!running) return;
		if (buffer) buffer.push(event);
		else setItems(applyEvent(items, event, compare));
	}

	async function subscribe() {
		if (unsubscribe) return;
		try {
			unsubscribe = await pb.collection(options.collection).subscribe<T>('*', handleEvent, {
				filter: options.filter,
				expand: options.expand
			});
		} catch {
			// Retried on the next resync.
		}
	}

	async function fetchAll() {
		buffer = [];
		if (sourceState !== 'loading') sourceState = 'syncing';
		try {
			const fresh = await pb.collection(options.collection).getFullList<T>({
				sort: options.sort,
				expand: options.expand,
				filter: options.filter
			});
			if (!running) return;
			setItems(applyEvents(sortItems(fresh, compare), buffer, compare));
			sourceState = 'live';
		} catch (err) {
			if (running) {
				console.error(`[live:${options.collection}] fetch failed:`, err);
				sourceState = 'failed';
			}
		} finally {
			buffer = null;
		}
	}

	async function refresh() {
		if (!running) return;
		if (fetching) {
			fetchAgain = true;
			return fetching;
		}
		fetching = (async () => {
			do {
				fetchAgain = false;
				await subscribe();
				await fetchAll();
			} while (fetchAgain && running);
		})();
		try {
			await fetching;
		} finally {
			fetching = null;
		}
	}

	return {
		get items() {
			return items;
		},
		get status(): LiveStatus {
			return deriveStatus(connection.state, sourceState);
		},

		/** Shows saved records immediately, before the first fetch returns. */
		seed(saved: T[]) {
			if (items.length || !saved.length) return;
			items = sortItems(saved, compare);
			sourceState = 'syncing';
		},

		/** Called with every new list, e.g. to save a copy on the device. */
		onChange(callback: (items: T[]) => void) {
			onChange = callback;
		},

		start() {
			if (running) return;
			running = true;
			offResync = connection.onResync(() => void refresh());
			void refresh();
		},

		async stop() {
			running = false;
			offResync?.();
			offResync = null;
			const unsub = unsubscribe;
			unsubscribe = null;
			await unsub?.().catch(() => {});
		},

		/** Drops everything held in memory, e.g. on logout. */
		clear() {
			items = [];
			sourceState = 'loading';
		},

		refresh
	};
}
