# JustOpenIt

> Because `cd` is apparently too much work.

JustOpenIt adds one thing to VS Code: an **Open Folder Here** entry in the Explorer's right-click menu. Click it, and that folder becomes your workspace root, in the same window.

That's the whole extension.

## Why

You opened `my-app`, but you actually want to work in `my-app/packages/api`. Normally that means *File → Open Folder…*, clicking through a file dialog to find a folder that was already in front of you, and confirming. Now it's a single right-click.

## Usage

1. Right-click any folder in the Explorer.
2. Choose **Open Folder Here**.

```
C:\Projects\my-app              C:\Projects\my-app\src
├── src          ── right-click ──▶   ├── components
├── components      "Open Folder       ├── pages
└── package.json     Here"             └── ...
```

<!-- TODO: add a screenshot or GIF here, e.g. ![Open Folder Here](images/demo.gif) -->

Details:

- The entry only appears on folders, never on files.
- The folder opens in the **current window**, as a normal single-folder workspace. VS Code handles unsaved files the way it does for *File → Open Folder…*.
- In a multi-root workspace, the window switches to just the chosen folder. Your `.code-workspace` file is never modified.
- Use *File → Open Recent* (or <kbd>Ctrl</kbd>+<kbd>R</kbd>) to jump back.

No settings. No dependencies. No telemetry.

## Development

Requirements: Node.js 20+ and VS Code 1.138+.

```sh
npm install        # install dev dependencies
npm run compile    # build to out/
npm run watch      # rebuild on change
npm run lint       # eslint
npm test           # compile + lint + run tests in a VS Code instance
```

### Run it locally

Open this folder in VS Code and press <kbd>F5</kbd>. An Extension Development Host window starts with JustOpenIt loaded. Open any folder there and right-click a subfolder.

### Package

```sh
npm run package    # creates justopenitalready-<version>.vsix
```

Install the result with *Extensions → … → Install from VSIX…*, or:

```sh
code --install-extension justopenitalready-0.0.2.vsix
```

Publishing to the Marketplace (`npx vsce publish`) is deliberately left as a manual step.

## License

<!-- TODO: choose a license, add a LICENSE file, and set "license" in package.json. -->
TBD
