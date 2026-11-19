import { pb } from '$lib/pocketbase/client';
import type { UnsubscribeFunc } from 'pocketbase';
import type { ConnectionState } from './status';

// Phones pause an installed web app in the background and drop its realtime
// stream without always telling us, and PocketBase doesn't replay missed
// events. After this long hidden, a store catches up on return.
const RESUME_RESYNC_MS = 30_000;

type Listener = () => void;

function createConnection() {
	let state = $state<ConnectionState>('connecting');
	const listeners = new Set<Listener>();
	let started = false;
	let everConnected = false;
	let hiddenAt = 0;
	let unsubscribeConnect: UnsubscribeFunc | null = null;

	function resyncAll() {
		for (const listener of listeners) listener();
	}

	function onOnline() {
		state = pb.realtime.isConnected ? 'connected' : 'reconnecting';
		resyncAll();
	}

	function onOffline() {
		state = 'offline';
	}

	function onVisibility() {
		if (document.visibilityState === 'hidden') {
			hiddenAt = Date.now();
			return;
		}
		if (hiddenAt && Date.now() - hiddenAt > RESUME_RESYNC_MS) resyncAll();
		hiddenAt = 0;
	}

	return {
		get state() {
			return state;
		},

		/** Opens the realtime stream and starts watching the network and app visibility. */
		async start() {
			if (started) return;
			started = true;
			state = navigator.onLine ? 'connecting' : 'offline';

			pb.realtime.onDisconnect = (activeSubscriptions) => {
				// An empty list means we unsubscribed on purpose, not a dropped connection.
				if (activeSubscriptions.length === 0) return;
				state = navigator.onLine ? 'reconnecting' : 'offline';
			};
			window.addEventListener('online', onOnline);
			window.addEventListener('offline', onOffline);
			document.addEventListener('visibilitychange', onVisibility);

			try {
				unsubscribeConnect = await pb.realtime.subscribe('PB_CONNECT', () => {
					const isReconnect = everConnected;
					everConnected = true;
					state = 'connected';
					if (isReconnect) resyncAll();
				});
			} catch {
				state = navigator.onLine ? 'reconnecting' : 'offline';
			}
		},

		/** Closes the stream, e.g. on logout. Stores stop themselves separately. */
		async stop() {
			if (!started) return;
			started = false;
			everConnected = false;
			window.removeEventListener('online', onOnline);
			window.removeEventListener('offline', onOffline);
			document.removeEventListener('visibilitychange', onVisibility);
			pb.realtime.onDisconnect = undefined;
			await unsubscribeConnect?.().catch(() => {});
			unsubscribeConnect = null;
			state = 'connecting';
		},

		/** Registers a store to refetch whenever it may have missed events. Returns an unregister function. */
		onResync(listener: Listener): () => void {
			listeners.add(listener);
			return () => listeners.delete(listener);
		}
	};
}

export const connection = createConnection();
