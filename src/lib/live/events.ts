export interface LiveRecord {
	id: string;
}

export interface LiveEvent<T extends LiveRecord> {
	action: string;
	record: T;
}

export type Comparator<T> = (a: T, b: T) => number;

/** Builds a comparator from a PocketBase sort string such as "-date,name". */
export function compareBy<T>(sort: string): Comparator<T> {
	const keys = sort
		.split(',')
		.map((k) => k.trim())
		.filter(Boolean)
		.map((k) => (k.startsWith('-') ? { field: k.slice(1), dir: -1 } : { field: k.replace(/^\+/, ''), dir: 1 }));

	return (a, b) => {
		for (const { field, dir } of keys) {
			const result = compareValues((a as Record<string, unknown>)[field], (b as Record<string, unknown>)[field]);
			if (result !== 0) return result * dir;
		}
		return 0;
	};
}

function compareValues(a: unknown, b: unknown): number {
	const aEmpty = a === null || a === undefined || a === '';
	const bEmpty = b === null || b === undefined || b === '';
	if (aEmpty || bEmpty) return aEmpty === bEmpty ? 0 : aEmpty ? -1 : 1;
	if (typeof a === 'number' && typeof b === 'number') return a - b;
	if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
	return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

export function sortItems<T>(items: T[], compare?: Comparator<T>): T[] {
	return compare ? [...items].sort(compare) : [...items];
}

/**
 * Applies one realtime event to a list without mutating it. Creates and
 * updates are both upserts, so a replayed or out-of-order event can't
 * duplicate a row.
 */
export function applyEvent<T extends LiveRecord>(items: T[], event: LiveEvent<T>, compare?: Comparator<T>): T[] {
	const rest = items.filter((item) => item.id !== event.record.id);
	if (event.action === 'delete') return rest.length === items.length ? items : rest;

	const existingIndex = items.findIndex((item) => item.id === event.record.id);
	if (!compare) {
		if (existingIndex === -1) return [...items, event.record];
		const next = [...items];
		next[existingIndex] = event.record;
		return next;
	}

	const insertAt = rest.findIndex((item) => compare(event.record, item) < 0);
	if (insertAt === -1) return [...rest, event.record];
	return [...rest.slice(0, insertAt), event.record, ...rest.slice(insertAt)];
}

export function applyEvents<T extends LiveRecord>(items: T[], events: LiveEvent<T>[], compare?: Comparator<T>): T[] {
	return events.reduce((acc, event) => applyEvent(acc, event, compare), items);
}
