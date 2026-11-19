import { test } from 'node:test';
import assert from 'node:assert/strict';
import { combineStatus, deriveStatus } from './status.ts';

test('connection problems override what the store knows', () => {
	assert.equal(deriveStatus('offline', 'live'), 'offline');
	assert.equal(deriveStatus('reconnecting', 'live'), 'reconnecting');
	assert.equal(deriveStatus('reconnecting', 'failed'), 'offline');
});

test('with a healthy connection the store state shows through', () => {
	assert.equal(deriveStatus('connected', 'live'), 'live');
	assert.equal(deriveStatus('connecting', 'syncing'), 'syncing');
	assert.equal(deriveStatus('connected', 'loading'), 'loading');
	assert.equal(deriveStatus('connected', 'failed'), 'offline');
});

test('combineStatus picks the worst status', () => {
	assert.equal(combineStatus([]), 'live');
	assert.equal(combineStatus(['live', 'syncing', 'live']), 'syncing');
	assert.equal(combineStatus(['loading', 'reconnecting', 'syncing']), 'reconnecting');
	assert.equal(combineStatus(['live', 'offline', 'reconnecting']), 'offline');
});
