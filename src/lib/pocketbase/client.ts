import PocketBase from 'pocketbase';

export const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL);
pb.autoCancellation(false);

/** Get the current authenticated user's ID. Throws if not logged in. */
export function currentUserId(): string {
	const id = pb.authStore.record?.id;
	if (!id) throw new Error('Not authenticated');
	return id;
}
