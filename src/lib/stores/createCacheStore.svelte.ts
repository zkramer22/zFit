import { pb } from '$lib/pocketbase/client';
import type { RecordModel } from 'pocketbase';

interface CacheConfig {
	collection: string;
	sort?: string;
	expand?: string;
}

interface CacheEnvelope<T> {
	data: T[];
	fetchedAt: number;
}

const STALE_MS = 5 * 60 * 1000; // 5 minutes

export function createCacheStore<T extends RecordModel>(config: CacheConfig) {
	const storageKey = `zfit_cache_${config.collection}`;

	let items = $state<T[]>([]);
	let loading = $state(false);
	let initialized = $state(false);
	let fetchedAt = $state(0);

	function hydrate(): boolean {
		try {
			const raw = localStorage.getItem(storageKey);
			if (!raw) return false;
			const envelope: CacheEnvelope<T> = JSON.parse(raw);
			if (!envelope.data?.length) return false;
			items = envelope.data;
			fetchedAt = envelope.fetchedAt;
			return true;
		} catch {
			return false;
		}
	}

	function persist() {
		try {
			const envelope: CacheEnvelope<T> = { data: items, fetchedAt };
			localStorage.setItem(storageKey, JSON.stringify(envelope));
		} catch {
			// localStorage full or unavailable — silently ignore
		}
	}

	async function fetchFromServer() {
		loading = true;
		try {
			const opts: Record<string, string> = {};
			if (config.sort) opts.sort = config.sort;
			if (config.expand) opts.expand = config.expand;
			items = await pb.collection(config.collection).getFullList<T>(opts);
			fetchedAt = Date.now();
			persist();
		} catch (err) {
			console.error(`[cache:${config.collection}] fetch failed:`, err);
			// Keep stale data if available
		} finally {
			loading = false;
		}
	}

	function isStale(): boolean {
		return !fetchedAt || Date.now() - fetchedAt > STALE_MS;
	}

	return {
		get items() { return items; },
		get loading() { return loading; },
		get initialized() { return initialized; },

		async init() {
			if (!initialized) {
				hydrate();
				initialized = true;
			}
			if (!isStale()) return;
			// Revalidate in background — stale data renders immediately
			fetchFromServer();
		},

		reset() {
			items = [];
			initialized = false;
			fetchedAt = 0;
			try { localStorage.removeItem(storageKey); } catch {}
		},

		async invalidate() {
			await fetchFromServer();
		},

		getById(id: string): T | undefined {
			return items.find(item => item.id === id);
		}
	};
}
