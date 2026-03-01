import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;

if (!POCKETBASE_URL) {
	console.error('Missing PUBLIC_POCKETBASE_URL in .env');
	process.exit(1);
}

async function main() {
	const pb = new PocketBase(POCKETBASE_URL);

	const sessions = await pb.collection('sessions').getFullList();
	console.log(`Found ${sessions.length} session(s).`);

	for (const sess of sessions) {
		// Delete session entries first
		const entries = await pb.collection('session_entries').getFullList({
			filter: `session = "${sess.id}"`
		});
		for (const entry of entries) {
			await pb.collection('session_entries').delete(entry.id);
		}
		await pb.collection('sessions').delete(sess.id);
		console.log(`  Deleted session ${sess.id} (${sess.date}, workout: ${sess.workout || 'freeform'}, ${entries.length} entries)`);
	}

	console.log('Done — all sessions cleaned up.');
}

main().catch(console.error);
