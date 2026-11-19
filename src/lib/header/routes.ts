/** Pages the back arrow can fall back to; all take no params. */
export type BackTarget = '/' | '/workouts' | '/exercises' | '/settings';

export interface RouteHeader {
	/** Fixed title, or undefined when the page supplies it from its data. */
	title?: string;
	/** Where the back arrow goes when there's no in-app history; undefined means no back arrow. */
	back?: BackTarget;
}

const ROUTES: [pattern: string, header: RouteHeader][] = [
	['/', { title: 'Home' }],
	['/workouts', { title: 'Workouts' }],
	['/workouts/:id', { back: '/workouts' }],
	['/exercises', { title: 'Exercises' }],
	['/exercises/:id', { back: '/exercises' }],
	['/programs', { title: 'Programs' }],
	['/settings', { title: 'Settings' }],
	['/admin', { title: 'Admin', back: '/settings' }],
	['/session', { title: 'New Session', back: '/' }],
	['/session/:sessionId', { back: '/' }]
];

function matches(pattern: string, pathname: string): boolean {
	const a = pattern.split('/').filter(Boolean);
	const b = pathname.split('/').filter(Boolean);
	return a.length === b.length && a.every((seg, i) => seg.startsWith(':') || seg === b[i]);
}

/** The header defaults for a path, known before the page loads any data. */
export function routeHeader(pathname: string): RouteHeader {
	return ROUTES.find(([pattern]) => matches(pattern, pathname))?.[1] ?? {};
}

/**
 * Back goes through history when you navigated here inside the app;
 * opened straight from a link, there's nothing to go back to, so it goes
 * to the route's parent page instead.
 */
export function backAction(inAppNavigations: number, fallback: BackTarget): { kind: 'history' } | { kind: 'navigate'; href: BackTarget } {
	return inAppNavigations > 0 ? { kind: 'history' } : { kind: 'navigate', href: fallback };
}
