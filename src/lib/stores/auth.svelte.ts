import { pb } from '$lib/pocketbase/client';
import type { User } from '$lib/pocketbase/types';

// Users with admin access (can approve submissions, manage feedback)
const ADMIN_USER_IDS = ['lxd00dcz55rt9lh'];

function clearCaches() {
	const keysToRemove: string[] = [];
	for (let i = 0; i < localStorage.length; i++) {
		const key = localStorage.key(i);
		if (key?.startsWith('zfit_cache_')) {
			keysToRemove.push(key);
		}
	}
	keysToRemove.forEach(k => localStorage.removeItem(k));
}

function createAuthStore() {
	let user = $state<User | null>(pb.authStore.record as User | null);
	let loading = $state(true);
	let lastUserId: string | null = null;

	// Listen for auth state changes (login, logout, token refresh)
	pb.authStore.onChange(() => {
		user = pb.authStore.record as User | null;
	});

	return {
		get user() { return user; },
		get loading() { return loading; },
		get isAuthenticated() { return !!user; },
		get userId() { return user?.id ?? ''; },
		get isAdmin() { return !!user && ADMIN_USER_IDS.includes(user.id); },

		init() {
			// PocketBase SDK auto-loads token from localStorage
			user = pb.authStore.record as User | null;

			// Clear caches if a different user is stored from a previous session
			const storedUserId = localStorage.getItem('zfit_last_user');
			if (user && storedUserId && storedUserId !== user.id) {
				clearCaches();
			}
			if (user) {
				localStorage.setItem('zfit_last_user', user.id);
				lastUserId = user.id;
			}

			// If we have a token, refresh it to verify it's still valid
			if (pb.authStore.isValid) {
				pb.collection('users').authRefresh()
					.then(() => { user = pb.authStore.record as User | null; })
					.catch(() => { pb.authStore.clear(); user = null; })
					.finally(() => { loading = false; });
			} else {
				loading = false;
			}
		},

		async loginWithPassword(email: string, password: string) {
			const result = await pb.collection('users').authWithPassword(email, password);
			if (lastUserId && lastUserId !== result.record.id) clearCaches();
			lastUserId = result.record.id;
			user = result.record as User;
			return result;
		},

		async register(email: string, password: string, name?: string) {
			await pb.collection('users').create({
				email,
				password,
				passwordConfirm: password,
				name: name || '',
			});
			return this.loginWithPassword(email, password);
		},

		async loginWithGoogle() {
			const result = await pb.collection('users').authWithOAuth2({ provider: 'google' });
			if (lastUserId && lastUserId !== result.record.id) clearCaches();
			lastUserId = result.record.id;
			user = result.record as User;
			return result;
		},

		logout() {
			pb.authStore.clear();
			user = null;
			lastUserId = null;
			clearCaches();
		},
	};
}

export const authStore = createAuthStore();
