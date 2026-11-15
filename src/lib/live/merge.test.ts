import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeByRecord } from './merge.ts';

interface Row {
	id: string;
	v: string;
	dirty?: boolean;
}

const dirty = (r: Row) => !!r.dirty;

test('untouched rows take the server version', () => {
	const merged = mergeByRecord<Row>([{ id: 'a', v: 'old' }], [{ id: 'a', v: 'new' }], dirty);
	assert.deepEqual(merged, [{ id: 'a', v: 'new' }]);
});

test('rows you changed keep your version', () => {
	const merged = mergeByRecord<Row>([{ id: 'a', v: 'mine', dirty: true }], [{ id: 'a', v: 'theirs' }], dirty);
	assert.deepEqual(merged, [{ id: 'a', v: 'mine', dirty: true }]);
});

test('new server rows appear and untouched deleted rows disappear', () => {
	const merged = mergeByRecord<Row>(
		[{ id: 'a', v: '1' }, { id: 'gone', v: 'x' }],
		[{ id: 'a', v: '1' }, { id: 'b', v: '2' }],
		dirty
	);
	assert.deepEqual(merged.map((r) => r.id), ['a', 'b']);
});

test('a row you changed survives being deleted elsewhere, at the end', () => {
	const merged = mergeByRecord<Row>(
		[{ id: 'gone', v: 'mine', dirty: true }, { id: 'a', v: '1' }],
		[{ id: 'a', v: '1' }],
		dirty
	);
	assert.deepEqual(merged.map((r) => r.id), ['a', 'gone']);
});

test('server order wins', () => {
	const merged = mergeByRecord<Row>(
		[{ id: 'a', v: '1' }, { id: 'b', v: '2', dirty: true }],
		[{ id: 'b', v: '2' }, { id: 'a', v: '1' }],
		dirty
	);
	assert.deepEqual(merged.map((r) => r.id), ['b', 'a']);
});
