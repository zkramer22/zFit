const positions = new Map<string, number>();

export function saveScrollPosition(pathname: string, scrollTop: number) {
	positions.set(pathname, scrollTop);
}

export function getScrollPosition(pathname: string): number | undefined {
	return positions.get(pathname);
}
