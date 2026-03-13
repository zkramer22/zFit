import { pb } from '$lib/pocketbase/client';

function createNotificationStore() {
	let unreadCount = $state(0);

	return {
		get unreadCount() { return unreadCount; },

		async refresh() {
			try {
				const items = await pb.collection('notifications').getFullList({
					filter: 'read = false',
					fields: 'id',
				});
				unreadCount = items.length;
			} catch {
				unreadCount = 0;
			}
		},

		clear() {
			unreadCount = 0;
		}
	};
}

export const notificationStore = createNotificationStore();
