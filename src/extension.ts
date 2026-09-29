import * as path from 'path';
import * as vscode from 'vscode';

export const COMMAND_ID = 'justopenit.openHere';
export const PARENT_COMMAND_ID = 'justopenit.openParentHere';

/** Makes `folder` the workspace root. Injectable so tests don't reload the window. */
export type FolderOpener = (folder: vscode.Uri) => Thenable<unknown>;

// `vscode.openFolder` turns the folder into a real single-folder workspace in the same window.
// `updateWorkspaceFolders` would instead create an "Untitled (Workspace)" or rewrite the user's
// saved .code-workspace file, which is not what "open this folder" means.
const openInThisWindow: FolderOpener = folder =>
	vscode.commands.executeCommand('vscode.openFolder', folder, { forceReuseWindow: true });

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_ID, (uri?: unknown) => openFolderHere(uri)),
		vscode.commands.registerCommand(PARENT_COMMAND_ID, (uri?: unknown) => openParentFolderHere(uri))
	);
}

export function deactivate() {}

/** The folder containing `uri`, or undefined for a root such as `/`, `C:\` or `\\server\share`. */
export function parentOf(uri: vscode.Uri): vscode.Uri | undefined {
	const trimmed = uri.path.replace(/\/+$/, '') || '/';
	const isRoot = trimmed === '/'
		|| /^\/[a-zA-Z]:$/.test(trimmed)
		|| (uri.scheme === 'file' && uri.authority !== '' && /^\/[^/]+$/.test(trimmed));
	if (isRoot) {
		return undefined;
	}
	let parentPath = path.posix.dirname(trimmed);
	// "/c:" alone means "current directory on drive C" on Windows; the drive root is "/c:/".
	if (/^\/[a-zA-Z]:$/.test(parentPath)) {
		parentPath += '/';
	}
	return uri.with({ path: parentPath });
}

export async function openParentFolderHere(uri: unknown, open: FolderOpener = openInThisWindow): Promise<boolean> {
	if (!(uri instanceof vscode.Uri)) {
		vscode.window.showWarningMessage('JustOpenIt: Right-click a folder in the Explorer and choose "Open Parent Folder Here".');
		return false;
	}
	const parent = parentOf(uri);
	if (!parent) {
		vscode.window.showInformationMessage('JustOpenIt: This folder has no parent folder.');
		return false;
	}
	return openFolderHere(parent, open);
}

/** Returns true if VS Code was asked to switch to `uri`, false if nothing happened. */
export async function openFolderHere(uri: unknown, open: FolderOpener = openInThisWindow): Promise<boolean> {
	if (!(uri instanceof vscode.Uri)) {
		vscode.window.showWarningMessage('JustOpenIt: Right-click a folder in the Explorer and choose "Open Folder Here".');
		return false;
	}

	let stat: vscode.FileStat;
	try {
		stat = await vscode.workspace.fs.stat(uri);
	} catch {
		vscode.window.showErrorMessage(`JustOpenIt: Folder not found: ${uri.fsPath || uri.toString()}`);
		return false;
	}
	if ((stat.type & vscode.FileType.Directory) === 0) {
		vscode.window.showWarningMessage(`JustOpenIt: Not a folder: ${uri.fsPath || uri.toString()}`);
		return false;
	}

	const folders = vscode.workspace.workspaceFolders ?? [];
	const alreadyRoot = !vscode.workspace.workspaceFile
		&& folders.length === 1
		&& folders[0].uri.toString() === uri.toString();
	if (alreadyRoot) {
		vscode.window.showInformationMessage('JustOpenIt: This folder is already the workspace root.');
		return false;
	}

	try {
		await open(uri);
		return true;
	} catch (err) {
		const reason = err instanceof Error ? err.message : String(err);
		vscode.window.showErrorMessage(`JustOpenIt: Could not open folder: ${reason}`);
		return false;
	}
}
