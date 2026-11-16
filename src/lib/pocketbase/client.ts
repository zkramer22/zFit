import PocketBase from 'pocketbase';

// The app calls its own address: PocketBase serves it on live, and Vite forwards /api to this checkout's copy in dev.
export const pb = new PocketBase('/');
pb.autoCancellation(false);

/** Get the current authenticated user's ID. Throws if not logged in. */
export function currentUserId(): string {
	const id = pb.authStore.record?.id;
	if (!id) throw new Error('Not authenticated');
	return id;
}
