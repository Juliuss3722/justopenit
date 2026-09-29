import * as vscode from 'vscode';

export const COMMAND_ID = 'justopenit.openHere';

/** Makes `folder` the workspace root. Injectable so tests don't reload the window. */
export type FolderOpener = (folder: vscode.Uri) => Thenable<unknown>;

// `vscode.openFolder` turns the folder into a real single-folder workspace in the same window.
// `updateWorkspaceFolders` would instead create an "Untitled (Workspace)" or rewrite the user's
// saved .code-workspace file, which is not what "open this folder" means.
const openInThisWindow: FolderOpener = folder =>
	vscode.commands.executeCommand('vscode.openFolder', folder, { forceReuseWindow: true });

export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand(COMMAND_ID, (uri?: unknown) => openFolderHere(uri))
	);
}

export function deactivate() {}

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
