import { createLiveCollection } from '$lib/live/collection.svelte';
import type { Notification } from '$lib/pocketbase/types';

export const notificationCache = createLiveCollection<Notification>({
	collection: 'notifications',
	sort: '-created'
});

export function unreadNotificationCount(): number {
	return notificationCache.items.filter((n) => !n.read).length;
}
