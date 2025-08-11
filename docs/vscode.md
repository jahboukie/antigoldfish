# VS Code Integration

Running `agm init` creates `.vscode/` files with convenient tasks and settings.

Notable tasks:
- `agm-help` → `node dist/cli.js --help`
- `agm-status` → `node dist/cli.js status` (PowerShell-safe)
- `agm-watch-code` → `node dist/cli.js watch-code --path src --symbols --max-chunk 200` (runs in background; keeps memories in sync while you edit)

Keyboard shortcuts (from templates):
- Ctrl+Shift+M → remember selection
- Ctrl+Shift+R → quick recall

Workspace keybindings (added by this repo):
- Reindex all indexed areas
	- Windows/Linux: Ctrl+Alt+R
	- macOS: Cmd+Alt+R
	- Runs task: agm-reindex-all
- Search indexed code (prompts for query)
	- Windows/Linux: Ctrl+Alt+S
	- macOS: Cmd+Alt+S
	- Runs task: agm-search-code
- Show CLI help
	- Windows/Linux: Ctrl+Alt+H
	- macOS: Cmd+Alt+H
	- Runs task: agm-help

- Export code context (.agmctx)
	- Windows/Linux: Ctrl+Alt+E
	- macOS: Cmd+Alt+E
	- Runs task: agm-export-context

- Show status
	- Windows/Linux: Ctrl+Alt+T
	- macOS: Cmd+Alt+T
	- Runs task: agm-status

- Prove offline (no-egress proof)
	- Windows/Linux: Ctrl+Alt+O
	- macOS: Cmd+Alt+O
	- Runs task: agm-prove-offline

Customize: edit `.vscode/keybindings.json` to change or remove bindings. These only apply to this workspace and won’t affect your global VS Code keybindings.

Tips:
- Use the Command Palette → Tasks: Run Task → look for entries starting with “🧠 AGM”.
- If a task prints a one-time policy warning for `--help`, it’s safe to re-run; help/version are whitelisted.
 - If watch-code is blocked by policy, run: `agm policy allow-command watch-code` and optionally `agm policy allow-path "**/*"` for frictionless local indexing.
 - Quick check: run `agm health` to see DB size, vector backend/dim/count, and digest cache entries at a glance. Use `--json` to feed dashboards.
