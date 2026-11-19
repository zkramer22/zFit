import type { RecordModel } from 'pocketbase';
import { createLiveSource, type LiveSourceOptions } from './source.svelte';
import type { LiveStatus } from './status';

/**
 * A filtered slice of a collection that stays current while the calling
 * component is mounted. Call it during component setup. Return null from
 * `getOptions` while the filter isn't known yet; when the options change,
 * the old listener is dropped and a new one starts.
 *
 * Build filters with `pb.filter('session = {:id}', { id })` so values are escaped.
 */
export function createLiveQuery<T extends RecordModel>(getOptions: () => LiveSourceOptions | null) {
	let source = $state.raw<ReturnType<typeof createLiveSource<T>> | null>(null);
	const key = $derived.by(() => {
		const options = getOptions();
		return options ? JSON.stringify(options) : null;
	});

	$effect(() => {
		if (!key) {
			source = null;
			return;
		}
		const next = createLiveSource<T>(JSON.parse(key) as LiveSourceOptions);
		source = next;
		next.start();
		return () => void next.stop();
	});

	return {
		get items(): T[] {
			return source?.items ?? [];
		},
		get status(): LiveStatus {
			return source?.status ?? 'loading';
		}
	};
}
