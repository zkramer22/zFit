import PocketBase from 'pocketbase';
import { POCKETBASE_URL, POCKETBASE_SUPERUSER_EMAIL, POCKETBASE_SUPERUSER_PASSWORD } from '$env/static/private';

let pb: PocketBase | null = null;

export async function getPb(): Promise<PocketBase> {
	if (!pb) {
		pb = new PocketBase(POCKETBASE_URL);
		pb.autoCancellation(false);
	}

	if (!pb.authStore.isValid) {
		await pb.collection('_superusers').authWithPassword(
			POCKETBASE_SUPERUSER_EMAIL,
			POCKETBASE_SUPERUSER_PASSWORD
		);
	}

	return pb;
}
