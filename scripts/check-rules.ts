import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const pb = new PocketBase(process.env.PUBLIC_POCKETBASE_URL!);
pb.autoCancellation(false);

const email = process.argv[2];
const password = process.argv[3];

async function run() {
	await pb.collection('_superusers').authWithPassword(email, password);
	for (const name of ['exercises', 'users', 'submissions', 'feedback', 'notifications']) {
		try {
			const col = await pb.collections.getOne(name);
			console.log(`\n=== ${name} ===`);
			console.log('  listRule:', col.listRule);
			console.log('  viewRule:', col.viewRule);
			console.log('  createRule:', col.createRule);
			console.log('  updateRule:', col.updateRule);
			console.log('  fields:', JSON.stringify(col.fields, null, 2));
		} catch (err: any) {
			console.log(`\n=== ${name} === NOT FOUND`);
		}
	}

	// Test: try fetching submissions with sort=-created (what the frontend does)
	console.log('\n=== Testing API calls ===');
	for (const name of ['submissions', 'feedback']) {
		try {
			const result = await pb.collection(name).getList(1, 1, { sort: '-created' });
			console.log(`  ${name} sort=-created: OK (${result.totalItems} items)`);
		} catch (err: any) {
			console.log(`  ${name} sort=-created: FAILED — ${err?.status} ${err?.message}`);
		}
		try {
			const result = await pb.collection(name).getList(1, 1, {});
			console.log(`  ${name} no sort: OK (${result.totalItems} items)`);
		} catch (err: any) {
			console.log(`  ${name} no sort: FAILED — ${err?.status} ${err?.message}`);
		}
		try {
			const result = await pb.collection(name).getList(1, 1, { expand: 'user' });
			console.log(`  ${name} expand=user: OK (${result.totalItems} items)`);
		} catch (err: any) {
			console.log(`  ${name} expand=user: FAILED — ${err?.status} ${err?.message}`);
		}
	}

	// List all submission records (as superuser, bypasses rules)
	console.log('\n=== submission records (superuser) ===');
	const subs = await pb.collection('submissions').getFullList();
	for (const s of subs) {
		console.log(`  id=${s.id} user=${s.user} type=${s.type} status=${s.status} record_name=${s.record_name} global_exercise=${s.global_exercise}`);
	}
	if (subs.length === 0) console.log('  (none)');

	// List all users to check IDs
	console.log('\n=== users ===');
	const allUsers = await pb.collection('users').getFullList();
	for (const u of allUsers) {
		console.log(`  id=${u.id} email=${u.email} name=${u.name}`);
	}
}

run().catch(err => console.error(err?.response || err));
