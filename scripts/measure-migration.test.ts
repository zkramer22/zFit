import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isLegacySet, migrateSet, inferMeasure, migrateTarget, halveLoads } from './measure-migration.ts';

const legacy = { reps: 10, value: 50, unit: 'lb' as const, distance: null, distance_unit: null, notes: 'x', completed: true };

test('migrateSet maps each legacy unit to its own field', () => {
	assert.deepEqual(
		[migrateSet(legacy).load, migrateSet(legacy).load_unit, migrateSet(legacy).seconds],
		[50, 'lb', null]
	);
	const kg = migrateSet({ ...legacy, unit: 'kg' });
	assert.deepEqual([kg.load, kg.load_unit], [50, 'kg']);
	const sec = migrateSet({ ...legacy, unit: 'sec', value: 45 });
	assert.deepEqual([sec.seconds, sec.load, sec.load_unit], [45, null, null]);
	const bw = migrateSet({ ...legacy, unit: 'bw', value: null });
	assert.deepEqual([bw.reps, bw.load, bw.band], [10, null, null]);
	assert.deepEqual([migrateSet(legacy).notes, migrateSet(legacy).completed], ['x', true]);
});

test('isLegacySet skips sets that were already migrated', () => {
	assert.equal(isLegacySet(legacy), true);
	assert.equal(isLegacySet(migrateSet(legacy)), false);
});

test('inferMeasure ignores default lb on sets with no value', () => {
	assert.equal(inferMeasure([{ unit: 'lb', hasValue: false }, { unit: 'bw', hasValue: false }], 'strength'), 'bodyweight');
	assert.equal(inferMeasure([{ unit: 'lb', hasValue: true }, { unit: 'lb', hasValue: true }, { unit: 'bw', hasValue: false }], 'core'), 'weight');
	assert.equal(inferMeasure([{ unit: 'sec', hasValue: true }], 'strength'), 'time');
	assert.equal(inferMeasure([], 'pt'), 'bodyweight');
	assert.equal(inferMeasure([{ unit: 'lb', hasValue: false }], 'strength'), 'weight');
});

test('migrateTarget', () => {
	assert.deepEqual(migrateTarget('125', 'lb'), { target_load: 125, target_seconds: null });
	assert.deepEqual(migrateTarget('30', 'sec'), { target_load: null, target_seconds: 30 });
	assert.deepEqual(migrateTarget('', 'bw'), { target_load: null, target_seconds: null });
	assert.deepEqual(migrateTarget('abc', 'lb'), { target_load: null, target_seconds: null });
});

test('halveLoads halves logged loads and leaves empty ones alone', () => {
	const sets = [migrateSet(legacy), migrateSet({ ...legacy, value: 25 }), migrateSet({ ...legacy, unit: 'bw', value: null })];
	assert.deepEqual(halveLoads(sets).map((s) => s.load), [25, 12.5, null]);
	assert.equal(halveLoads(sets)[0].load_unit, 'lb');
});
