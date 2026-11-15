import type { LiveRecord } from './events';

/**
 * Merges the server's rows into a local editing copy, one record at a time.
 * Rows you haven't touched take the server's version, so changes from
 * anywhere show up; rows you've changed keep your version, including ones
 * the server no longer has. Server order wins, with your unsaved-only rows
 * kept at the end.
 */
export function mergeByRecord<T extends LiveRecord>(local: T[], server: T[], isDirty: (row: T) => boolean): T[] {
	const localById = new Map(local.map((row) => [row.id, row]));
	const serverIds = new Set(server.map((row) => row.id));

	const merged = server.map((row) => {
		const mine = localById.get(row.id);
		return mine && isDirty(mine) ? mine : row;
	});
	const unsavedOnly = local.filter((row) => !serverIds.has(row.id) && isDirty(row));
	return [...merged, ...unsavedOnly];
}
