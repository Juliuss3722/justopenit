import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { COMMAND_ID, PARENT_COMMAND_ID, openFolderHere, openParentFolderHere, parentOf } from '../extension';

suite('JustOpenIt', () => {
	let tmp: string;
	let opened: vscode.Uri[];
	const fakeOpen = async (uri: vscode.Uri) => { opened.push(uri); };

	suiteSetup(() => {
		tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'justopenit-'));
		fs.mkdirSync(path.join(tmp, 'src'));
		fs.writeFileSync(path.join(tmp, 'package.json'), '{}');
	});

	suiteTeardown(() => fs.rmSync(tmp, { recursive: true, force: true }));

	setup(() => { opened = []; });

	test('commands are registered', async () => {
		const ext = vscode.extensions.all.find(e => e.packageJSON.name === 'justopenitalready');
		assert.ok(ext, 'extension not found');
		await ext.activate();
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes(COMMAND_ID));
		assert.ok(commands.includes(PARENT_COMMAND_ID));
	});

	test('menu entries are folder-only and hidden from the Command Palette', () => {
		const ext = vscode.extensions.all.find(e => e.packageJSON.name === 'justopenitalready')!;
		const menus = ext.packageJSON.contributes.menus;
		for (const id of [COMMAND_ID, PARENT_COMMAND_ID]) {
			assert.strictEqual(
				menus['explorer/context'].find((m: { command: string }) => m.command === id)?.when,
				'explorerResourceIsFolder'
			);
			assert.strictEqual(
				menus.commandPalette.find((m: { command: string }) => m.command === id)?.when,
				'false'
			);
		}
	});

	test('opens the selected folder', async () => {
		const folder = vscode.Uri.file(path.join(tmp, 'src'));
		assert.strictEqual(await openFolderHere(folder, fakeOpen), true);
		assert.strictEqual(opened.length, 1);
		assert.strictEqual(opened[0].toString(), folder.toString());
	});

	test('ignores a missing URI', async () => {
		assert.strictEqual(await openFolderHere(undefined, fakeOpen), false);
		assert.strictEqual(await openFolderHere('not a uri', fakeOpen), false);
		assert.strictEqual(opened.length, 0);
	});

	test('ignores files', async () => {
		const file = vscode.Uri.file(path.join(tmp, 'package.json'));
		assert.strictEqual(await openFolderHere(file, fakeOpen), false);
		assert.strictEqual(opened.length, 0);
	});

	test('ignores folders that do not exist', async () => {
		const missing = vscode.Uri.file(path.join(tmp, 'nope'));
		assert.strictEqual(await openFolderHere(missing, fakeOpen), false);
		assert.strictEqual(opened.length, 0);
	});

	test('handles failure to open the folder', async () => {
		const folder = vscode.Uri.file(path.join(tmp, 'src'));
		const failing = async () => { throw new Error('boom'); };
		assert.strictEqual(await openFolderHere(folder, failing), false);
	});

	test('commands run without a URI and do not throw', async () => {
		await vscode.commands.executeCommand(COMMAND_ID);
		await vscode.commands.executeCommand(PARENT_COMMAND_ID);
	});

	test('opens the parent of the selected folder', async () => {
		const folder = vscode.Uri.file(path.join(tmp, 'src'));
		assert.strictEqual(await openParentFolderHere(folder, fakeOpen), true);
		assert.strictEqual(opened.length, 1);
		assert.strictEqual(opened[0].fsPath, vscode.Uri.file(tmp).fsPath);
	});

	test('parent: ignores a missing URI', async () => {
		assert.strictEqual(await openParentFolderHere(undefined, fakeOpen), false);
		assert.strictEqual(opened.length, 0);
	});

	test('parentOf computes parents and stops at roots', () => {
		const posix = (p: string) => parentOf(vscode.Uri.from({ scheme: 'file', path: p }))?.path;
		assert.strictEqual(posix('/home/me/project'), '/home/me');
		assert.strictEqual(posix('/home/me/project/'), '/home/me');
		assert.strictEqual(posix('/home'), '/');
		assert.strictEqual(posix('/'), undefined);

		assert.strictEqual(posix('/c:/Projects/my-app'), '/c:/Projects');
		assert.strictEqual(posix('/c:/Projects'), '/c:/');
		assert.strictEqual(posix('/c:/'), undefined);

		const unc = vscode.Uri.from({ scheme: 'file', authority: 'server', path: '/share' });
		assert.strictEqual(parentOf(unc), undefined);

		const remote = vscode.Uri.from({ scheme: 'vscode-remote', authority: 'ssh-remote+box', path: '/home' });
		assert.strictEqual(parentOf(remote)?.path, '/');
	});

	test('parent: does nothing at a drive or filesystem root', async () => {
		const root = vscode.Uri.file(path.parse(tmp).root);
		assert.strictEqual(await openParentFolderHere(root, fakeOpen), false);
		assert.strictEqual(opened.length, 0);
	});
});
