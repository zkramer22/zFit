import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL!;
const POCKETBASE_SUPERUSER_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const POCKETBASE_SUPERUSER_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;

if (!POCKETBASE_URL || !POCKETBASE_SUPERUSER_EMAIL || !POCKETBASE_SUPERUSER_PASSWORD) {
	console.error('Missing .env variables. Set POCKETBASE_URL, POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

// Schema migrations — add fields that the app expects but PB might not have yet.
// Uses JSON type for array fields since PB select doesn't support spaces in values.
const migrations: {
	collection: string;
	field: string;
	definition: Record<string, unknown>;
}[] = [
	{
		collection: 'workouts',
		field: 'tags',
		definition: {
			type: 'json',
			name: 'tags',
			required: false,
			maxSize: 0
		}
	},
	{
		collection: 'workouts',
		field: 'created',
		definition: {
			type: 'autodate',
			name: 'created',
			onCreate: true,
			onUpdate: false,
			hidden: false,
			system: false
		}
	},
	{
		collection: 'workouts',
		field: 'updated',
		definition: {
			type: 'autodate',
			name: 'updated',
			onCreate: true,
			onUpdate: true,
			hidden: false,
			system: false
		}
	}
];

async function run() {
	// 1. Health check
	console.log(`Checking PocketBase at ${POCKETBASE_URL}...`);
	try {
		const res = await fetch(`${POCKETBASE_URL}/api/health`);
		if (!res.ok) throw new Error(`HTTP ${res.status}`);
		console.log('  PocketBase is healthy.');
	} catch {
		console.error(`  PocketBase is not reachable at ${POCKETBASE_URL}`);
		console.error('  Make sure PocketBase is running before starting dev.');
		process.exit(1);
	}

	// 2. Auth
	try {
		await pb.collection('_superusers').authWithPassword(POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD);
		console.log('  Authenticated as superuser.');
	} catch {
		console.error('  Failed to authenticate with PocketBase. Check your .env credentials.');
		process.exit(1);
	}

	// 3. Schema migrations — append missing fields
	let migrated = 0;
	for (const m of migrations) {
		try {
			const col = await pb.collections.getOne(m.collection);
			const fields = col.fields as any[];
			const hasField = fields.some((f: any) => f.name === m.field);
			if (!hasField) {
				console.log(`  Adding field "${m.field}" to "${m.collection}"...`);
				const updatedFields = [...fields, m.definition];
				await pb.collections.update(col.id, { fields: updatedFields });
				console.log(`    Done.`);
				migrated++;
			}
		} catch (err) {
			console.error(`  Failed to migrate ${m.collection}.${m.field}:`, err);
			process.exit(1);
		}
	}

	if (migrated > 0) {
		console.log(`  Applied ${migrated} schema migration(s).`);
	} else {
		console.log('  Schema is up to date.');
	}

	console.log('Ready to dev!\n');
}

run().catch(err => {
	console.error('Dev check failed:', err);
	process.exit(1);
});
