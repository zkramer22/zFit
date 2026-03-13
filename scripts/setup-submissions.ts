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

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(email, password);
	console.log('Authenticated as superuser.\n');

	// Create submissions collection
	console.log('--- Creating submissions collection ---');
	try {
		const existing = await pb.collections.getOne('submissions');
		const hasGlobalExercise = existing.fields?.some((f: any) => f.name === 'global_exercise');
		if (hasGlobalExercise) {
			console.log('  ⏭ submissions already exists (with global_exercise field)');
		} else {
			// Add the global_exercise field to existing collection
			await pb.collections.update(existing.id, {
				fields: [
					...existing.fields,
					{
						name: 'global_exercise',
						type: 'text',
						required: false,
					},
				],
			});
			console.log('  ✓ submissions — added global_exercise field');
		}
	} catch {
		await pb.collections.create({
			name: 'submissions',
			type: 'base',
			fields: [
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: false,
						maxSelect: 1,
						minSelect: 1,
					},
				},
				{
					name: 'type',
					type: 'select',
					required: true,
					options: {
						values: ['exercise', 'workout'],
						maxSelect: 1,
					},
				},
				{
					name: 'record_id',
					type: 'text',
					required: true,
				},
				{
					name: 'record_name',
					type: 'text',
					required: false,
				},
				{
					name: 'global_exercise',
					type: 'text',
					required: false,
				},
				{
					name: 'status',
					type: 'select',
					required: true,
					options: {
						values: ['pending', 'approved', 'rejected'],
						maxSelect: 1,
					},
				},
				{
					name: 'notes',
					type: 'text',
					required: false,
				},
				{
					name: 'reviewer_notes',
					type: 'text',
					required: false,
				},
			],
			listRule: 'user = @request.auth.id || @request.auth.id = "lxd00dcz55rt9lh"',
			viewRule: 'user = @request.auth.id || @request.auth.id = "lxd00dcz55rt9lh"',
			createRule: '@request.auth.id != ""',
			updateRule: null, // only superusers can update (approve/reject)
			deleteRule: 'user = @request.auth.id',
		});
		console.log('  ✓ submissions created');
	}

	// Create feedback collection
	console.log('--- Creating feedback collection ---');
	try {
		await pb.collections.getOne('feedback');
		console.log('  ⏭ feedback already exists');
	} catch {
		await pb.collections.create({
			name: 'feedback',
			type: 'base',
			fields: [
				{
					name: 'user',
					type: 'relation',
					required: true,
					options: {
						collectionId: '_pb_users_auth_',
						cascadeDelete: false,
						maxSelect: 1,
						minSelect: 1,
					},
				},
				{
					name: 'type',
					type: 'select',
					required: true,
					options: {
						values: ['feature', 'bug'],
						maxSelect: 1,
					},
				},
				{
					name: 'title',
					type: 'text',
					required: true,
				},
				{
					name: 'description',
					type: 'text',
					required: false,
				},
				{
					name: 'status',
					type: 'select',
					required: true,
					options: {
						values: ['open', 'in_progress', 'resolved', 'wont_fix'],
						maxSelect: 1,
					},
				},
			],
			listRule: 'user = @request.auth.id || @request.auth.id = "lxd00dcz55rt9lh"',
			viewRule: 'user = @request.auth.id || @request.auth.id = "lxd00dcz55rt9lh"',
			createRule: '@request.auth.id != ""',
			updateRule: null, // only superusers can update status
			deleteRule: 'user = @request.auth.id',
		});
		console.log('  ✓ feedback created');
	}

	// Create notifications collection
	console.log('--- Creating notifications collection ---');
	let notifExists = false;
	try {
		await pb.collections.getOne('notifications');
		notifExists = true;
	} catch { /* doesn't exist yet */ }

	if (notifExists) {
		console.log('  ⏭ notifications already exists');
	} else {
		try {
			await pb.collections.create({
				name: 'notifications',
				type: 'base',
				fields: [
					{
						name: 'user',
						type: 'relation',
						required: true,
						collectionId: '_pb_users_auth_',
						cascadeDelete: false,
						maxSelect: 1,
						minSelect: 1,
					},
					{
						name: 'message',
						type: 'text',
						required: true,
					},
					{
						name: 'type',
						type: 'select',
						required: true,
						values: ['submission_approved', 'submission_rejected'],
						maxSelect: 1,
					},
					{
						name: 'link',
						type: 'text',
						required: false,
					},
					{
						name: 'read',
						type: 'bool',
						required: false,
					},
				],
				listRule: 'user = @request.auth.id',
				viewRule: 'user = @request.auth.id',
				createRule: null, // only superusers create notifications (from admin actions)
				updateRule: 'user = @request.auth.id', // users can mark their own as read
				deleteRule: 'user = @request.auth.id',
			});
			console.log('  ✓ notifications created');
		} catch (err: any) {
			console.error('  ✗ notifications —', JSON.stringify(err?.response?.data || err?.response || err?.message, null, 2));
		}
	}

	// Update API rules so admin can see all submissions and feedback
	const ADMIN_ID = 'lxd00dcz55rt9lh';
	const adminOnlyRule = `@request.auth.id = "${ADMIN_ID}"`;
	const adminListRule = `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`;

	// Add missing created/updated autodate fields
	console.log('\n--- Adding created/updated fields ---');
	for (const name of ['submissions', 'feedback', 'notifications']) {
		try {
			const col = await pb.collections.getOne(name);
			const hasCreated = col.fields?.some((f: any) => f.name === 'created');
			if (hasCreated) {
				console.log(`  ⏭ ${name} already has created/updated`);
				continue;
			}
			await pb.collections.update(col.id, {
				fields: [
					...col.fields,
					{
						name: 'created',
						type: 'autodate',
						onCreate: true,
						onUpdate: false,
					},
					{
						name: 'updated',
						type: 'autodate',
						onCreate: true,
						onUpdate: true,
					},
				],
			});
			console.log(`  ✓ ${name} — added created/updated fields`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err?.message || err}`);
		}
	}

	console.log('\n--- Updating collection rules ---');
	for (const name of ['submissions', 'feedback']) {
		try {
			const col = await pb.collections.getOne(name);
			await pb.collections.update(col.id, {
				listRule: adminListRule,
				viewRule: adminListRule,
				updateRule: adminOnlyRule,
			});
			console.log(`  ✓ ${name} — user sees own, admin sees all, admin can update`);
		} catch (err: any) {
			console.error(`  ✗ ${name} — ${err?.message || err}`);
		}
	}

	// Allow admin to create notifications for users
	try {
		const notifCol = await pb.collections.getOne('notifications');
		await pb.collections.update(notifCol.id, {
			createRule: adminOnlyRule,
		});
		console.log('  ✓ notifications — admin can create records');
	} catch (err: any) {
		console.error(`  ✗ notifications — ${err?.message || err}`);
	}

	// Allow admin to view all user records (needed for expand=user on submissions)
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

	// Allow admin to view all exercises (needed for diff view on submissions)
	try {
		const exCol = await pb.collections.getOne('exercises');
		await pb.collections.update(exCol.id, {
			viewRule: `user = "" || user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			listRule: `user = "" || user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			updateRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
			deleteRule: `user = @request.auth.id || @request.auth.id = "${ADMIN_ID}"`,
		});
		console.log('  ✓ exercises — admin can view/list all exercises');
	} catch (err: any) {
		console.error(`  ✗ exercises —`, JSON.stringify(err?.response || err?.message || err));
	}

	console.log('\nDone!');
}

run().catch(err => {
	console.error('Setup failed:', err?.response || err?.message || err);
	process.exit(1);
});
