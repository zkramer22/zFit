import { test } from 'node:test';
import assert from 'node:assert/strict';
import { applyEvent, applyEvents, compareBy, sortItems } from './events.ts';

interface Row {
	id: string;
	name?: string;
	order?: number;
	date?: string;
}

const ids = (rows: Row[]) => rows.map((r) => r.id);

test('compareBy sorts ascending, descending and by several keys', () => {
	const rows: Row[] = [
		{ id: 'a', date: '2026-03-01', order: 2 },
		{ id: 'b', date: '2026-04-01', order: 1 },
		{ id: 'c', date: '2026-03-01', order: 1 }
	];
	assert.deepEqual(ids(sortItems(rows, compareBy('-date,order'))), ['b', 'c', 'a']);
	assert.deepEqual(ids(sortItems(rows, compareBy('order,date'))), ['c', 'b', 'a']);
});

test('compareBy ignores case and orders numbers inside names naturally', () => {
	const rows: Row[] = [
		{ id: '1', name: 'squat' },
		{ id: '2', name: 'Bench' },
		{ id: '3', name: 'Gym 10' },
		{ id: '4', name: 'Gym 2' }
	];
	assert.deepEqual(ids(sortItems(rows, compareBy('name'))), ['2', '4', '3', '1']);
});

test('compareBy puts empty values first', () => {
	const rows: Row[] = [{ id: 'x', order: 3 }, { id: 'y' }];
	assert.deepEqual(ids(sortItems(rows, compareBy('order'))), ['y', 'x']);
});

test('sortItems does not mutate its input', () => {
	const rows: Row[] = [{ id: 'b', order: 2 }, { id: 'a', order: 1 }];
	sortItems(rows, compareBy('order'));
	assert.deepEqual(ids(rows), ['b', 'a']);
});

test('create inserts in sorted position', () => {
	const compare = compareBy<Row>('order');
	const rows: Row[] = [{ id: 'a', order: 1 }, { id: 'c', order: 3 }];
	const next = applyEvent(rows, { action: 'create', record: { id: 'b', order: 2 } }, compare);
	assert.deepEqual(ids(next), ['a', 'b', 'c']);
	assert.deepEqual(ids(rows), ['a', 'c']);
});

test('update replaces the row and moves it when its sort key changes', () => {
	const compare = compareBy<Row>('order');
	const rows: Row[] = [{ id: 'a', order: 1 }, { id: 'b', order: 2 }, { id: 'c', order: 3 }];
	const next = applyEvent(rows, { action: 'update', record: { id: 'a', order: 9 } }, compare);
	assert.deepEqual(ids(next), ['b', 'c', 'a']);
	assert.equal(next.find((r) => r.id === 'a')?.order, 9);
});

test('create for an existing id acts as an update, never a duplicate', () => {
	const rows: Row[] = [{ id: 'a', name: 'old' }];
	const next = applyEvent(rows, { action: 'create', record: { id: 'a', name: 'new' } });
	assert.equal(next.length, 1);
	assert.equal(next[0].name, 'new');
});

test('without a comparator, updates keep position and creates append', () => {
	const rows: Row[] = [{ id: 'a' }, { id: 'b' }];
	assert.deepEqual(ids(applyEvent(rows, { action: 'update', record: { id: 'a', name: 'x' } })), ['a', 'b']);
	assert.deepEqual(ids(applyEvent(rows, { action: 'create', record: { id: 'c' } })), ['a', 'b', 'c']);
});

test('delete removes the row, and deleting a missing row returns the same list', () => {
	const rows: Row[] = [{ id: 'a' }, { id: 'b' }];
	assert.deepEqual(ids(applyEvent(rows, { action: 'delete', record: { id: 'a' } })), ['b']);
	assert.equal(applyEvent(rows, { action: 'delete', record: { id: 'zzz' } }), rows);
});

test('applyEvents replays a buffer in order', () => {
	const compare = compareBy<Row>('order');
	const next = applyEvents<Row>(
		[{ id: 'a', order: 1 }],
		[
			{ action: 'create', record: { id: 'b', order: 0 } },
			{ action: 'update', record: { id: 'a', order: -1 } },
			{ action: 'delete', record: { id: 'b' } }
		],
		compare
	);
	assert.deepEqual(next, [{ id: 'a', order: -1 }]);
});
