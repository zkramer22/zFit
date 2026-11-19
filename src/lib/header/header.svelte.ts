import type { Snippet } from 'svelte';

/** What a page adds to the app header beyond its route's defaults. */
export interface PageHeader {
	title?: string;
	/** Replaces the title, e.g. an input while editing a name. */
	titleEditor?: Snippet;
	subtitle?: Snippet;
	actions?: Snippet;
	/** A row under the bar, e.g. guided-mode controls. */
	below?: Snippet;
}

let current = $state<PageHeader>({});
let owner: symbol | null = null;

export const pageHeader = {
	get current() {
		return current;
	}
};

/**
 * Fills the app header for as long as the calling component is mounted.
 * Call during component setup; the getter reruns whenever the state it
 * reads changes.
 */
export function useHeader(get: () => PageHeader) {
	const me = Symbol();
	$effect(() => {
		const next = get();
		owner = me;
		current = next;
	});
	$effect(() => () => {
		// The next page may already have claimed the header.
		if (owner === me) {
			owner = null;
			current = {};
		}
	});
}
