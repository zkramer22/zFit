import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL!;
const POCKETBASE_SUPERUSER_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const POCKETBASE_SUPERUSER_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

async function cleanup() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD);
	console.log('Authenticated.\n');

	// Delete orphan sessions and their entries
	console.log('── Deleting orphan sessions ──');
	const sessions = await pb.collection('sessions').getFullList();
	for (const s of sessions) {
		const entries = await pb.collection('session_entries').getFullList({
			filter: `session="${s.id}"`
		});
		for (const e of entries) {
			await pb.collection('session_entries').delete(e.id);
		}
		await pb.collection('sessions').delete(s.id);
		console.log(`  - Deleted session ${s.id} (${entries.length} entries)`);
	}
	console.log(`  Deleted ${sessions.length} sessions total.`);

	// Delete old collections
	console.log('\n── Deleting old collections ──');
	for (const name of ['program_exercises', 'programs_old']) {
		try {
			const col = await pb.collections.getOne(name);
			// Delete all records first
			const records = await pb.collection(name).getFullList();
			for (const r of records) {
				await pb.collection(name).delete(r.id);
			}
			await pb.collections.delete(col.id);
			console.log(`  - Deleted ${name} (${records.length} records)`);
		} catch {
			console.log(`  ✓ ${name} not found (already deleted)`);
		}
	}

	console.log('\nCleanup complete!');
}

cleanup().catch(err => {
	console.error('Cleanup failed:', err);
	process.exit(1);
});
