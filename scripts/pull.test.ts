import { test } from 'node:test';
import assert from 'node:assert/strict';
import { backupName, strayBackups } from './pull.ts';

test('a pull names its backup in the lowercase letters, digits, _ and - PocketBase accepts', () => {
	const name = backupName(new Date('2026-11-16T19:00:41.364Z'));
	assert.equal(name, 'pull-2026-11-16t19-00-41-364z.zip');
	assert.match(name, /^[a-z0-9_-]+\.zip$/);
});

test("a pull clears only its own kind of backup, and only once it's too old to be another pull under way", () => {
	const now = new Date('2026-11-16T12:00:00Z');
	const backups = [
		{ key: 'pull-2026-11-16t11-00-00-000z.zip', modified: '2026-11-16 11:00:05.000Z' },
		{ key: 'pull-2026-11-16t11-58-00-000z.zip', modified: '2026-11-16 11:58:05.000Z' },
		{ key: '@auto_pb_backup_zfit_20261116020000.zip', modified: '2026-11-16 02:00:03.000Z' },
	];
	assert.deepEqual(strayBackups(backups, now), ['pull-2026-11-16t11-00-00-000z.zip']);
});
