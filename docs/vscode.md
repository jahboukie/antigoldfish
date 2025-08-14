# VS Code Integration

Running `smem init` creates `.vscode/` files with convenient tasks and settings.

Notable tasks:
- `smem-help` → `node dist/cli.js --help`
- `smem-status` → `node dist/cli.js status` (PowerShell-safe)
- `smem-watch-code` → `node dist/cli.js watch-code --path src --symbols --max-chunk 200` (runs in background; keeps memories in sync while you edit)

Keyboard shortcuts (from templates):
- Ctrl+Shift+M → remember selection
- Ctrl+Shift+R → quick recall

Workspace keybindings (added by this repo):
- Reindex all indexed areas
	- Windows/Linux: Ctrl+Alt+R
	- macOS: Cmd+Alt+R
	- Runs task: smem-reindex-all
- Search indexed code (prompts for query)
	- Windows/Linux: Ctrl+Alt+S
	- macOS: Cmd+Alt+S
	- Runs task: smem-search-code
- Show CLI help
	- Windows/Linux: Ctrl+Alt+H
	- macOS: Cmd+Alt+H
	- Runs task: smem-help

- Export code context (.smemctx)
	- Windows/Linux: Ctrl+Alt+E
	- macOS: Cmd+Alt+E
	- Runs task: smem-export-context

- Show status
	- Windows/Linux: Ctrl+Alt+T
	- macOS: Cmd+Alt+T
	- Runs task: smem-status

- Prove offline (no-egress proof)
	- Windows/Linux: Ctrl+Alt+O
	- macOS: Cmd+Alt+O
	- Runs task: smem-prove-offline

Customize: edit `.vscode/keybindings.json` to change or remove bindings. These only apply to this workspace and won’t affect your global VS Code keybindings.

Tips:
- Use the Command Palette → Tasks: Run Task → look for entries starting with “🛡️ SecuraMem”.
- If a task prints a one-time policy warning for `--help`, it’s safe to re-run; help/version are whitelisted.
 - If watch-code is blocked by policy, run: `smem policy allow-command watch-code` and optionally `smem policy allow-path "**/*"` for frictionless local indexing.
 - Quick check: run `smem health` to see DB size, vector backend/dim/count, and digest cache entries at a glance. Use `--json` to feed dashboards.
