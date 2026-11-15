export type ConnectionState = 'connecting' | 'connected' | 'reconnecting' | 'offline';

/** What a single store knows about its own data, apart from the connection. */
export type SourceState = 'loading' | 'syncing' | 'live' | 'failed';

export type LiveStatus = 'loading' | 'syncing' | 'live' | 'reconnecting' | 'offline';

export function deriveStatus(connection: ConnectionState, source: SourceState): LiveStatus {
	if (connection === 'offline' || source === 'failed') return 'offline';
	if (connection === 'reconnecting') return 'reconnecting';
	return source;
}

const severity: Record<LiveStatus, number> = {
	live: 0,
	syncing: 1,
	loading: 2,
	reconnecting: 3,
	offline: 4
};

/** The worst status wins, so one lagging store is enough to show it. */
export function combineStatus(statuses: LiveStatus[]): LiveStatus {
	return statuses.reduce<LiveStatus>((worst, s) => (severity[s] > severity[worst] ? s : worst), 'live');
}
