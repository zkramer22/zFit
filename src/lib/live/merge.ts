import type { LiveRecord } from './events';

/** Why a row you're editing no longer matches the server. */
export type Conflict = 'changed' | 'deleted' | null;

/**
 * A row in an editing copy. `baseUpdated` is the server's `updated` stamp
 * for the version your edits started from; `saving` is true while your own
 * write is in flight, so its echo is never mistaken for someone else's change.
 */
export interface TrackedRow extends LiveRecord {
	dirty: boolean;
	saving?: boolean;
	baseUpdated: string;
	conflict?: Conflict;
}

function withConflict<T extends TrackedRow>(row: T, conflict: Conflict): T {
	return (row.conflict ?? null) === conflict ? row : { ...row, conflict };
}

/**
 * Merges the server's rows into a local editing copy, one record at a time.
 * Rows you haven't touched take the server's version. Rows you've changed
 * keep yours, flagged when the server's copy moved on underneath you or was
 * deleted. Rows mid-save are left alone until the save returns. Server order
 * wins, with rows the server no longer has kept at the end.
 *
 * `server` rows must carry `baseUpdated` set to their own `updated` stamp.
 */
export function mergeTracked<T extends TrackedRow>(local: T[], server: T[]): T[] {
	const localById = new Map(local.map((row) => [row.id, row]));
	const serverIds = new Set(server.map((row) => row.id));

	const merged = server.map((theirs) => {
		const mine = localById.get(theirs.id);
		if (!mine) return theirs;
		if (mine.saving) return mine;
		if (!mine.dirty) return theirs;
		return withConflict(mine, theirs.baseUpdated !== mine.baseUpdated ? 'changed' : (mine.conflict ?? null));
	});
	const goneButKept = local
		.filter((mine) => !serverIds.has(mine.id) && (mine.dirty || mine.saving))
		.map((mine) => (mine.saving ? mine : withConflict(mine, 'deleted')));
	return [...merged, ...goneButKept];
}

/** "Use theirs": drops your version of one row in favour of the server's, or drops the row if the server deleted it. */
export function takeTheirs<T extends TrackedRow>(local: T[], server: T[], id: string): T[] {
	const theirs = server.find((row) => row.id === id);
	return theirs ? local.map((row) => (row.id === id ? theirs : row)) : local.filter((row) => row.id !== id);
}

function stableKey(value: unknown): string {
	return JSON.stringify(value, (_key, v) =>
		v && typeof v === 'object' && !Array.isArray(v)
			? Object.fromEntries(Object.entries(v).sort(([a], [b]) => a.localeCompare(b)))
			: v
	);
}

export interface FormState<F> {
	/** What's in the form fields. */
	draft: F;
	/** The server's version the form started from. */
	base: F;
	conflict: boolean;
}

/**
 * The same rule for a single-record form: an untouched form follows the
 * server; a form you've changed keeps your values and is flagged when the
 * server's record changed since you started.
 */
export function mergeForm<F>(state: FormState<F>, server: F): FormState<F> {
	const touched = stableKey(state.draft) !== stableKey(state.base);
	if (!touched) return { draft: server, base: server, conflict: false };
	return { ...state, conflict: state.conflict || stableKey(server) !== stableKey(state.base) };
}
