import { execFileSync, spawn } from 'child_process';
import { existsSync, mkdirSync, renameSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { pathToFileURL } from 'url';
import PocketBase from 'pocketbase';
import { binary, checkout, dataDir } from './pocketbase.ts';
import { LIVE_URL } from './target.ts';

/**
 * Replaces this checkout's copy of the data with a fresh one from live. Live makes a backup, this downloads it and
 * deletes it from the server, so the nightly backups are left as they were. The copy is swapped in only once it has
 * unpacked whole; a pull that fails leaves the last copy as it was. Then the account in LOCAL_USER_EMAIL gets the
 * LOCAL_USER_PASSWORD, in this copy only, since Google sign-in can't come back to a local address.
 *
 *   npm run pull                  a fresh copy
 *   npm run pull -- --if-missing  only when this checkout has none, as a zDev Start runs it
 */

const env = process.env;
const pbFolder = join(checkout, '.pb');

async function answers(url: string): Promise<boolean> {
	try {
		return (await fetch(`${url}/api/health`, { signal: AbortSignal.timeout(1000) })).ok;
	} catch {
		return false;
	}
}

/** PocketBase takes backup names in lowercase letters, digits, _ and - only. */
export const backupName = (at: Date) => `pull-${at.toISOString().replace(/[:.]/g, '-').toLowerCase()}.zip`;

async function download(): Promise<string> {
	const live = new PocketBase(LIVE_URL);
	live.autoCancellation(false);
	await live.collection('_superusers').authWithPassword(env.POCKETBASE_SUPERUSER_EMAIL!, env.POCKETBASE_SUPERUSER_PASSWORD!);
	const name = backupName(new Date());
	console.log(`Making ${name} on live`);
	await live.backups.create(name);
	const zip = join(pbFolder, name);
	try {
		const token = await live.files.getToken();
		const answer = await fetch(live.backups.getDownloadURL(token, name));
		if (!answer.ok) throw new Error(`Downloading ${name} answered ${answer.status}`);
		mkdirSync(pbFolder, { recursive: true });
		writeFileSync(zip, Buffer.from(await answer.arrayBuffer()));
		console.log(`Downloaded ${name}`);
	} finally {
		try {
			await live.backups.delete(name);
			console.log(`Deleted ${name} from live`);
		} catch (error) {
			console.error(`Couldn't delete ${name} from live; delete it in live's admin under Backups. (${error})`);
		}
	}
	return zip;
}

/** Unpacks a PocketBase backup beside the copy, then swaps it in. */
export function install(zip: string) {
	const incoming = join(pbFolder, `incoming-${process.pid}`);
	rmSync(incoming, { recursive: true, force: true });
	mkdirSync(incoming, { recursive: true });
	try {
		execFileSync('unzip', ['-q', zip, '-d', incoming]);
		if (!existsSync(join(incoming, 'data.db'))) throw new Error(`${zip} has no data.db`);
		rmSync(dataDir, { recursive: true, force: true });
		renameSync(incoming, dataDir);
	} finally {
		rmSync(incoming, { recursive: true, force: true });
	}
}

/** Sets the local-only password on the copy, through a PocketBase started for the purpose and stopped after. */
export async function setLocalPassword(port: string) {
	const email = env.LOCAL_USER_EMAIL;
	const password = env.LOCAL_USER_PASSWORD;
	if (!email || !password) {
		console.log('No LOCAL_USER_EMAIL and LOCAL_USER_PASSWORD in .env, so no local password was set.');
		return;
	}
	const url = `http://127.0.0.1:${port}`;
	const server = spawn(await binary(), ['serve', '--dir', dataDir, '--http', `127.0.0.1:${port}`], { stdio: 'ignore' });
	try {
		for (const deadline = Date.now() + 20_000; !(await answers(url)); await new Promise((r) => setTimeout(r, 250)))
			if (Date.now() > deadline) throw new Error("The copy's PocketBase didn't answer within 20 seconds");
		const local = new PocketBase(url);
		local.autoCancellation(false);
		await local.collection('_superusers').authWithPassword(env.POCKETBASE_SUPERUSER_EMAIL!, env.POCKETBASE_SUPERUSER_PASSWORD!);
		const user = await local.collection('users').getFirstListItem(local.filter('email = {:email}', { email }));
		await local.collection('users').update(user.id, { password, passwordConfirm: password });
		console.log(`${email} signs in to this copy with LOCAL_USER_PASSWORD`);
	} finally {
		server.kill('SIGTERM');
	}
}

async function pull() {
	const port = env.PB_PORT;
	if (!port) throw new Error("PB_PORT isn't set in .env. Start this checkout from zDev, or run zdev setup.");
	if (process.argv.includes('--if-missing') && existsSync(join(dataDir, 'data.db'))) {
		console.log('This checkout has its copy; npm run pull replaces it with a fresh one.');
		return;
	}
	if (await answers(`http://127.0.0.1:${port}`))
		throw new Error(`This checkout's PocketBase is running on ${port}. Stop it, then pull.`);
	const zip = await download();
	try {
		install(zip);
	} finally {
		rmSync(zip, { force: true });
	}
	console.log(`The copy is in ${dataDir}`);
	await setLocalPassword(port);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
	pull().catch((error) => {
		console.error(`The pull failed: ${error.message ?? error}`);
		process.exit(1);
	});
}
