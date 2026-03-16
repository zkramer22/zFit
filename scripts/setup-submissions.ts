import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.PUBLIC_POCKETBASE_URL!;
const email = process.argv[2];
const password = process.argv[3];

if (!POCKETBASE_URL || !email || !password) {
	console.error('Usage: tsx scripts/setup-submissions.ts <superuser-email> <superuser-password>');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

const ADMIN_ID = 'lxd00dcz55rt9lh';

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	const exercisesCol = await pb.collections.getOne('exercises');

	// ── Create user_exercises collection ──
	console.log('--- Creating user_exercises collection ---');
	let userExColId: string;
	try {
		const existing = await pb.collections.getOne('user_exercises');
		userExColId = existing.id;
		console.log('  ⏭ user_exercises already exists');
		await pb.collections.update(existing.id, {
			fields: [
				{ name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'exercise', type: 'relation', required: true, collectionId: exercisesCol.id, cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'description', type: 'text', required: false },
				{ name: 'video_urls', type: 'json', required: false },
				{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
				{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
			],
			listRule: `user = @request.auth.id`,
			viewRule: `user = @request.auth.id`,
			createRule: `@request.auth.id != ""`,
			updateRule: `user = @request.auth.id`,
			deleteRule: `user = @request.auth.id`,
		});
		console.log('  ✓ user_exercises — updated fields and rules');
	} catch {
		const created = await pb.collections.create({
			name: 'user_exercises',
			type: 'base',
			fields: [
				{ name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'exercise', type: 'relation', required: true, collectionId: exercisesCol.id, cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'description', type: 'text', required: false },
				{ name: 'video_urls', type: 'json', required: false },
				{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
				{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
			],
			listRule: `user = @request.auth.id`,
			viewRule: `user = @request.auth.id`,
			createRule: `@request.auth.id != ""`,
			updateRule: `user = @request.auth.id`,
			deleteRule: `user = @request.auth.id`,
		});
		userExColId = created.id;
		console.log('  ✓ user_exercises created');
	}

	// ── Update submissions collection ──
	console.log('\n--- Updating submissions collection ---');
	try {
		const existing = await pb.collections.getOne('submissions');
		await pb.collections.update(existing.id, {
			fields: [
				{ name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'exercise', type: 'relation', required: true, collectionId: exercisesCol.id, cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'user_exercise', type: 'relation', required: false, collectionId: userExColId, cascadeDelete: false, maxSelect: 1 },
				{ name: 'record_name', type: 'text', required: false },
				{ name: 'diff', type: 'json', required: false },
				{ name: 'status', type: 'select', required: true, values: ['pending', 'approved', 'rejected'], maxSelect: 1 },
				{ name: 'notes', type: 'text', required: false },
				{ name: 'reviewer_notes', type: 'text', required: false },
				{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
				{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
			],
			listRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			viewRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			createRule: `@request.auth.id != ""`,
			updateRule: `@request.auth.id = "${ADMIN_ID}"`,
			deleteRule: `user = @request.auth.id`,
		});
		console.log('  ✓ submissions — updated (removed type, record_id, global_exercise; added exercise, user_exercise, diff)');
	} catch (err: any) {
		console.error('  ✗ submissions —', JSON.stringify(err?.response?.data || err?.response || err?.message, null, 2));
	}

	// ── Create feedback collection (unchanged) ──
	console.log('\n--- Creating feedback collection ---');
	try {
		await pb.collections.getOne('feedback');
		console.log('  ⏭ feedback already exists');
	} catch {
		await pb.collections.create({
			name: 'feedback',
			type: 'base',
			fields: [
				{ name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1, minSelect: 1 },
				{ name: 'type', type: 'select', required: true, values: ['feature', 'bug'], maxSelect: 1 },
				{ name: 'title', type: 'text', required: true },
				{ name: 'description', type: 'text', required: false },
				{ name: 'status', type: 'select', required: true, values: ['open', 'in_progress', 'resolved', 'wont_fix'], maxSelect: 1 },
				{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
				{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
			],
			listRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			viewRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			createRule: `@request.auth.id != ""`,
			updateRule: `@request.auth.id = "${ADMIN_ID}"`,
			deleteRule: `user = @request.auth.id`,
		});
		console.log('  ✓ feedback created');
	}

	// ── Create notifications collection (unchanged) ──
	console.log('\n--- Creating notifications collection ---');
	try {
		await pb.collections.getOne('notifications');
		console.log('  ⏭ notifications already exists');
	} catch {
		try {
			await pb.collections.create({
				name: 'notifications',
				type: 'base',
				fields: [
					{ name: 'user', type: 'relation', required: true, collectionId: '_pb_users_auth_', cascadeDelete: false, maxSelect: 1, minSelect: 1 },
					{ name: 'message', type: 'text', required: true },
					{ name: 'type', type: 'select', required: true, values: ['submission_approved', 'submission_rejected'], maxSelect: 1 },
					{ name: 'link', type: 'text', required: false },
					{ name: 'read', type: 'bool', required: false },
					{ name: 'created', type: 'autodate', onCreate: true, onUpdate: false },
					{ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true },
				],
				listRule: 'user = @request.auth.id',
				viewRule: 'user = @request.auth.id',
				createRule: `@request.auth.id = "${ADMIN_ID}"`,
				updateRule: 'user = @request.auth.id',
				deleteRule: 'user = @request.auth.id',
			});
			console.log('  ✓ notifications created');
		} catch (err: any) {
			console.error('  ✗ notifications —', JSON.stringify(err?.response?.data || err?.response || err?.message, null, 2));
		}
	}

	// ── Update exercises API rules ──
	console.log('\n--- Updating exercises API rules ---');
	try {
		await pb.collections.update(exercisesCol.id, {
			listRule: `user = "" || user = @request.auth.id`,
			viewRule: `user = "" || user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			createRule: `@request.auth.id != ""`,
			updateRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			deleteRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
		});
		console.log('  ✓ exercises — API rules updated');
	} catch (err: any) {
		console.error('  ✗ exercises —', JSON.stringify(err?.response || err?.message || err));
	}

	// ── Update users API rules (admin can view all) ──
	console.log('\n--- Updating users API rules ---');
	try {
		const usersCol = await pb.collections.getOne('users');
		await pb.collections.update(usersCol.id, {
			viewRule: `id = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			listRule: `id = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
		});
		console.log('  ✓ users — admin can view/list all user records');
	} catch (err: any) {
		console.error(`  ✗ users — ${err?.message || err}`);
	}

	console.log('\nDone!');
}

run().catch(err => {
	console.error('Setup failed:', err?.response || err?.message || err);
	process.exit(1);
});
