import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeForm, mergeTracked, takeTheirs, type TrackedRow } from './merge.ts';

interface Row extends TrackedRow {
	v: string;
}

const row = (id: string, v: string, updated: string, extra: Partial<Row> = {}): Row => ({
	id,
	v,
	baseUpdated: updated,
	dirty: false,
	...extra
});

test('untouched rows take the server version', () => {
	const merged = mergeTracked([row('a', 'old', 't1')], [row('a', 'new', 't2')]);
	assert.deepEqual(merged, [row('a', 'new', 't2')]);
});

test('a row you changed keeps your version while the server has not moved', () => {
	const mine = row('a', 'mine', 't1', { dirty: true });
	assert.deepEqual(mergeTracked([mine], [row('a', 'old', 't1')]), [mine]);
});

test('a row you changed is flagged when the server changed it too', () => {
	const [merged] = mergeTracked([row('a', 'mine', 't1', { dirty: true })], [row('a', 'theirs', 't2')]);
	assert.equal(merged.v, 'mine');
	assert.equal(merged.conflict, 'changed');
});

test('a row mid-save ignores the server, so its own echo is never a conflict', () => {
	const saving = row('a', 'mine', 't1', { dirty: false, saving: true });
	assert.deepEqual(mergeTracked([saving], [row('a', 'mine', 't2')]), [saving]);
});

test('new server rows appear, untouched deleted rows disappear', () => {
	const merged = mergeTracked([row('a', '1', 't1'), row('gone', 'x', 't1')], [row('a', '1', 't1'), row('b', '2', 't1')]);
	assert.deepEqual(merged.map((r) => r.id), ['a', 'b']);
});

test('a row you changed that was deleted elsewhere stays, flagged, at the end', () => {
	const merged = mergeTracked([row('gone', 'mine', 't1', { dirty: true }), row('a', '1', 't1')], [row('a', '1', 't1')]);
	assert.deepEqual(merged.map((r) => [r.id, r.conflict ?? null]), [['a', null], ['gone', 'deleted']]);
});

test('server order wins', () => {
	const merged = mergeTracked(
		[row('a', '1', 't1'), row('b', '2', 't1', { dirty: true })],
		[row('b', '2', 't1'), row('a', '1', 't1')]
	);
	assert.deepEqual(merged.map((r) => r.id), ['b', 'a']);
});

test('an unchanged merge keeps the same row objects', () => {
	const mine = row('a', 'mine', 't1', { dirty: true, conflict: 'changed' });
	const [merged] = mergeTracked([mine], [row('a', 'theirs', 't2')]);
	assert.equal(merged, mine);
});

test('takeTheirs swaps in the server row, or drops a row the server deleted', () => {
	const local = [row('a', 'mine', 't1', { dirty: true, conflict: 'changed' }), row('b', 'mine', 't1', { dirty: true, conflict: 'deleted' })];
	const server = [row('a', 'theirs', 't2')];
	assert.deepEqual(takeTheirs(local, server, 'a')[0], row('a', 'theirs', 't2'));
	assert.deepEqual(takeTheirs(local, server, 'b').map((r) => r.id), ['a']);
});

interface Form {
	name: string;
	tags: string[];
}

test('an untouched form follows the server', () => {
	const base = { name: 'Gym', tags: [] };
	const next = mergeForm<Form>({ draft: base, base, conflict: false }, { name: 'Gym 2', tags: ['x'] });
	assert.deepEqual(next, { draft: { name: 'Gym 2', tags: ['x'] }, base: { name: 'Gym 2', tags: ['x'] }, conflict: false });
});

test('a touched form keeps your values and flags a server change', () => {
	const base = { name: 'Gym', tags: [] };
	const draft = { name: 'Mine', tags: [] };
	assert.deepEqual(mergeForm<Form>({ draft, base, conflict: false }, base), { draft, base, conflict: false });
	assert.deepEqual(mergeForm<Form>({ draft, base, conflict: false }, { name: 'Theirs', tags: [] }), {
		draft,
		base,
		conflict: true
	});
});

test('form comparison ignores key order', () => {
	const base = { name: 'Gym', tags: [] };
	const reordered = { tags: [], name: 'Gym' } as Form;
	assert.equal(mergeForm<Form>({ draft: reordered, base, conflict: false }, { name: 'Other', tags: [] }).conflict, false);
});
