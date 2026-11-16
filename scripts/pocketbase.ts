import { execFileSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

// The server's version, so a local copy behaves as live does. Bump it with the server's.
export const VERSION = '0.36.3';

export const checkout = resolve(import.meta.dirname, '..');
export const dataDir = join(checkout, '.pb', 'pb_data');

/** The main checkout, which keeps the one binary every worktree uses. */
export function mainCheckout(): string {
	const common = execFileSync('git', ['rev-parse', '--path-format=absolute', '--git-common-dir'], {
		cwd: checkout,
		encoding: 'utf8',
	}).trim();
	return dirname(common);
}

export const releaseName = (platform: string, arch: string) =>
	`pocketbase_${VERSION}_${platform === 'darwin' ? 'darwin' : 'linux'}_${arch === 'arm64' ? 'arm64' : 'amd64'}.zip`;

/** The pinned PocketBase for this Mac, downloaded from its GitHub release the first time. */
export async function binary(): Promise<string> {
	const folder = join(mainCheckout(), '.pb', 'bin');
	const path = join(folder, `pocketbase-${VERSION}`);
	if (existsSync(path)) return path;
	const name = releaseName(process.platform, process.arch);
	const url = `https://github.com/pocketbase/pocketbase/releases/download/v${VERSION}/${name}`;
	console.log(`Downloading PocketBase ${VERSION}: ${url}`);
	const answer = await fetch(url);
	if (!answer.ok) throw new Error(`The download answered ${answer.status}`);
	const work = join(folder, `download-${process.pid}`);
	mkdirSync(work, { recursive: true });
	try {
		writeFileSync(join(work, name), Buffer.from(await answer.arrayBuffer()));
		execFileSync('unzip', ['-q', join(work, name), 'pocketbase', '-d', work]);
		execFileSync('mv', [join(work, 'pocketbase'), path]);
	} finally {
		rmSync(work, { recursive: true, force: true });
	}
	return path;
}
