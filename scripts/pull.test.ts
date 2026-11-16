import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupName } from './pull.ts';

test('a pull names its backup in the lowercase letters, digits, _ and - PocketBase accepts', () => {
	const name = backupName(new Date('2026-11-16T19:00:41.364Z'));
	assert.equal(name, 'pull-2026-11-16t19-00-41-364z.zip');
	assert.match(name, /^[a-z0-9_-]+\.zip$/);
});
