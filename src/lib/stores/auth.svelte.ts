import { pb } from '$lib/pocketbase/client';
import type { User } from '$lib/pocketbase/types';

// Users with admin access (can approve submissions, manage feedback)
const ADMIN_USER_IDS = ['lxd00dcz55rt9lh'];

function createAuthStore() {
	let user = $state<User | null>(pb.authStore.record as User | null);
	let loading = $state(true);

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
			// Auto-login after registration
			return this.loginWithPassword(email, password);
		},

		async loginWithGoogle() {
			const result = await pb.collection('users').authWithOAuth2({ provider: 'google' });
			user = result.record as User;
			return result;
		},

		logout() {
			pb.authStore.clear();
			user = null;
			// Clear user-scoped caches
			const keysToRemove: string[] = [];
			for (let i = 0; i < localStorage.length; i++) {
				const key = localStorage.key(i);
				if (key?.startsWith('zfit_cache_')) {
					keysToRemove.push(key);
				}
			}
			keysToRemove.forEach(k => localStorage.removeItem(k));
		},
	};
}

export const authStore = createAuthStore();
