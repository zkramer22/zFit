import { test } from 'node:test';
import assert from 'node:assert/strict';
import { emptySet, setsFromTarget, targetFromSets, targetOf } from './measure.ts';
import { formatTarget, formatSetData, formatSetsSummary, targetLoadTag, setsLoadTag } from './utils/format.ts';
import type { TargetFields } from './pocketbase/types.ts';

const target = (t: Partial<TargetFields>): TargetFields => ({
	target_sets: 0, target_reps: '', target_load: null, target_seconds: null,
	target_band: '', target_distance: '', target_distance_unit: null, ...t
});

test('emptySet only carries a load unit for measures that lift weight', () => {
	assert.equal(emptySet('weight', 'kg').load_unit, 'kg');
	assert.equal(emptySet('bodyweight', 'lb').load_unit, 'lb');
	assert.equal(emptySet('time', 'lb').load_unit, null);
	assert.equal(emptySet('band', 'lb').load_unit, null);
});

test('setsFromTarget fills only the fields the measure uses', () => {
	const t = target({ target_sets: 3, target_reps: '12', target_load: 125, target_seconds: 30, target_band: 'Red' });
	const weight = setsFromTarget(t, 'weight', 'lb');
	assert.equal(weight.length, 3);
	assert.deepEqual([weight[0].reps, weight[0].load, weight[0].seconds, weight[0].band], [12, 125, null, null]);
	const time = setsFromTarget(t, 'time', 'lb')[0];
	assert.deepEqual([time.reps, time.load, time.seconds], [12, null, 30]);
	const band = setsFromTarget(t, 'band', 'lb')[0];
	assert.deepEqual([band.reps, band.band, band.load], [12, 'Red', null]);
	assert.equal(setsFromTarget(target({}), 'weight', 'lb').length, 1);
});

test('targetFromSets round-trips through setsFromTarget', () => {
	const sets = setsFromTarget(target({ target_sets: 2, target_reps: '8', target_load: 40 }), 'weight', 'lb');
	const t = targetFromSets(sets);
	assert.deepEqual([t.target_sets, t.target_reps, t.target_load], [2, '8', 40]);
});

test('formatTarget per measure', () => {
	assert.equal(formatTarget(target({ target_sets: 3, target_reps: '12', target_load: 125 }), { measure: 'weight' }, 'lb'), '3x12 @ 125 lb');
	assert.equal(formatTarget(target({ target_sets: 3, target_reps: '12' }), { measure: 'bodyweight' }, 'lb'), '3x12 BW');
	assert.equal(formatTarget(target({ target_sets: 3, target_reps: '10', target_load: 25 }), { measure: 'bodyweight' }, 'kg'), '3x10 @ BW + 25 kg');
	assert.equal(formatTarget(target({ target_sets: 3, target_seconds: 45 }), { measure: 'time' }, 'lb'), '3x 45 sec');
	assert.equal(formatTarget(target({ target_sets: 2, target_reps: '2', target_seconds: 45 }), { measure: 'time' }, 'lb'), '2x2 @ 45 sec');
	// PocketBase returns 0 for an empty number field
	assert.equal(formatTarget(target({ target_sets: 3, target_reps: '10', target_load: 0 }), { measure: 'weight' }, 'lb'), '3x10');
	assert.equal(formatTarget(target({ target_sets: 2, target_reps: '15', target_band: 'Red' }), { measure: 'band' }, 'lb'), '2x15 Red band');
	assert.equal(formatTarget(target({}), { measure: 'weight' }, 'lb'), '');
});

test('formatSetData and summary per measure', () => {
	const s = { ...emptySet('weight', 'lb'), reps: 12, load: 125 };
	assert.equal(formatSetData(s, { measure: 'weight' }), '12 reps @ 125 lb');
	assert.equal(formatSetData({ ...emptySet('time', 'lb'), seconds: 45 }, { measure: 'time' }), '45 sec');
	assert.equal(formatSetData({ ...emptySet('time', 'lb'), reps: 2, seconds: 45 }, { measure: 'time' }), '2 reps @ 45 sec');
	assert.equal(formatSetData({ ...emptySet('band', 'lb'), reps: 10, band: 'Red' }, { measure: 'band' }), '10 reps @ Red band');
	assert.equal(formatSetsSummary([s, s, s], { measure: 'weight' }), '3x12 @ 125 lb');
	assert.equal(formatSetsSummary([{ ...s, reps: 12 }, { ...s, reps: 10 }], { measure: 'weight' }), '12/10 @ 125 lb');
});

test('targetOf reads stored 0 as no target', () => {
	const t = targetOf({ target_sets: 3, target_load: 0, target_seconds: 0 } as never);
	assert.deepEqual([t.target_load, t.target_seconds], [null, null]);
});

test('pair and each-side loads get a tag label, not text in the summary', () => {
	const pair = { measure: 'weight' as const, load_factor: 'pair' as const };
	const t = target({ target_sets: 3, target_reps: '10', target_load: 40 });
	assert.equal(formatTarget(t, pair, 'lb'), '3x10 @ 40 lb');
	assert.equal(targetLoadTag(t, pair), 'Pair');
	const s = { ...emptySet('weight', 'lb'), reps: 10, load: 40 };
	assert.equal(formatSetsSummary([s, s, s], pair), '3x10 @ 40 lb');
	assert.equal(setsLoadTag([s, s], { measure: 'weight', load_factor: 'each_side' }), 'Each side');
	assert.equal(targetLoadTag(t, { measure: 'weight', load_factor: 'single' }), '');
	// No load logged, nothing to tag
	assert.equal(targetLoadTag(target({ target_sets: 3, target_reps: '12' }), { measure: 'bodyweight', load_factor: 'pair' }), '');
	assert.equal(setsLoadTag([{ ...s, load: null }], pair), '');
	assert.equal(targetLoadTag(t, undefined), '');
});

test('each side tags band reps and timed holds too', () => {
	const bandSide = { measure: 'band' as const, load_factor: 'each_side' as const };
	assert.equal(targetLoadTag(target({ target_sets: 2, target_reps: '15' }), bandSide), 'Each side');
	assert.equal(setsLoadTag([{ ...emptySet('band', 'lb'), reps: 15 }], bandSide), 'Each side');
	assert.equal(setsLoadTag([emptySet('band', 'lb')], bandSide), '');
	const holdSide = { measure: 'time' as const, load_factor: 'each_side' as const };
	assert.equal(setsLoadTag([{ ...emptySet('time', 'lb'), seconds: 30 }], holdSide), 'Each side');
	assert.equal(targetLoadTag(target({ target_sets: 2 }), holdSide), '');
});
