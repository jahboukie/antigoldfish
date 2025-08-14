# Getting Started

## Requirements
- Node.js 18+ (22+ recommended)
- Windows/macOS/Linux

## Install
```powershell
npm install -g securamem
```

## Initialize a project
```powershell
cd your-project
smem init
```
This creates `.securamem/` with a local SQLite database and VS Code integration files (legacy `.antigoldfishmode/` remains read-compatible).

## Quick commands
```powershell
smem remember "info" --context project --type note
smem recall "search term" --limit 10
smem status
```

## Next steps
- Index your repo: `smem index-code --symbols --path .`
- Search code: `smem search-code "symbolName" --hybrid --preview 3`
- Review receipts/journal: `smem receipt-show --last`, `smem journal --show`
