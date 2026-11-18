import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backAction, routeHeader } from './routes.ts';

test('tab pages have a fixed title and no back arrow', () => {
	assert.deepEqual(routeHeader('/'), { title: 'Home' });
	assert.deepEqual(routeHeader('/workouts'), { title: 'Workouts' });
	assert.deepEqual(routeHeader('/settings'), { title: 'Settings' });
});

test('detail pages get their back target and leave the title to the page', () => {
	assert.deepEqual(routeHeader('/workouts/abc123'), { back: '/workouts' });
	assert.deepEqual(routeHeader('/exercises/xyz'), { back: '/exercises' });
	assert.deepEqual(routeHeader('/session/s1'), { back: '/' });
});

test('a list route does not match its detail route, or the reverse', () => {
	assert.equal(routeHeader('/session').title, 'New Session');
	assert.equal(routeHeader('/session/s1').title, undefined);
});

test('trailing slashes match, unknown paths get no defaults', () => {
	assert.deepEqual(routeHeader('/workouts/'), { title: 'Workouts' });
	assert.deepEqual(routeHeader('/nope'), {});
});

test('back uses history after navigating in the app, otherwise the parent page', () => {
	assert.deepEqual(backAction(3, '/workouts'), { kind: 'history' });
	assert.deepEqual(backAction(0, '/workouts'), { kind: 'navigate', href: '/workouts' });
});
