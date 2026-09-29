import * as assert from 'assert';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { COMMAND_ID, openFolderHere } from '../extension';

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

	test('command is registered', async () => {
		const ext = vscode.extensions.all.find(e => e.packageJSON.name === 'justopenitalready');
		assert.ok(ext, 'extension not found');
		await ext.activate();
		const commands = await vscode.commands.getCommands(true);
		assert.ok(commands.includes(COMMAND_ID));
	});

	test('menu entry is folder-only and hidden from the Command Palette', () => {
		const ext = vscode.extensions.all.find(e => e.packageJSON.name === 'justopenitalready')!;
		const menus = ext.packageJSON.contributes.menus;
		assert.deepStrictEqual(
			menus['explorer/context'].find((m: { command: string }) => m.command === COMMAND_ID)?.when,
			'explorerResourceIsFolder'
		);
		assert.strictEqual(
			menus.commandPalette.find((m: { command: string }) => m.command === COMMAND_ID)?.when,
			'false'
		);
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

	test('command runs without a URI and does not throw', async () => {
		await vscode.commands.executeCommand(COMMAND_ID);
	});
});
