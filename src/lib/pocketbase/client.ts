import PocketBase from 'pocketbase';
import { PUBLIC_POCKETBASE_URL } from '$env/static/public';

export const pb = new PocketBase(PUBLIC_POCKETBASE_URL);
pb.autoCancellation(false);

/** Get the current authenticated user's ID. Throws if not logged in. */
export function currentUserId(): string {
	const id = pb.authStore.record?.id;
	if (!id) throw new Error('Not authenticated');
	return id;
}
