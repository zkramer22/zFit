import PocketBase from 'pocketbase';
import { config } from 'dotenv';
import { resolve } from 'path';

config({ path: resolve(import.meta.dirname, '..', '.env') });

const POCKETBASE_URL = process.env.POCKETBASE_URL || process.env.PUBLIC_POCKETBASE_URL!;
const POCKETBASE_SUPERUSER_EMAIL = process.env.POCKETBASE_SUPERUSER_EMAIL!;
const POCKETBASE_SUPERUSER_PASSWORD = process.env.POCKETBASE_SUPERUSER_PASSWORD!;

if (!POCKETBASE_URL || !POCKETBASE_SUPERUSER_EMAIL || !POCKETBASE_SUPERUSER_PASSWORD) {
	console.error('Missing .env variables.');
	process.exit(1);
}

const pb = new PocketBase(POCKETBASE_URL);
pb.autoCancellation(false);

const ALL_MUSCLE_GROUPS = [
	'abductors', 'adductors', 'back', 'biceps', 'calves', 'chest',
	'core', 'forearms', 'glutes', 'hamstrings', 'hip_flexors',
	'lats', 'quads', 'shoulders', 'triceps'
];

async function run() {
	console.log(`Connecting to PocketBase at ${POCKETBASE_URL}...`);
	await pb.collection('_superusers').authWithPassword(POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD);
	console.log('Authenticated.\n');

	const col = await pb.collections.getOne('exercises');
	const schema = col.fields as any[];
	const mgField = schema.find((f: any) => f.name === 'muscle_groups');

	if (!mgField) {
		console.error('muscle_groups field not found in exercises collection!');
		process.exit(1);
	}

	console.log('Current muscle_groups values:', mgField.values);
	mgField.values = ALL_MUSCLE_GROUPS;

	await pb.collections.update(col.id, { fields: schema });
	console.log('Updated muscle_groups to:', ALL_MUSCLE_GROUPS);
	console.log('\nDone.');
}

run().catch(err => {
	console.error('Failed:', err);
	process.exit(1);
});
