# Getting Started

## Requirements
- Node.js 18+ (22+ recommended)
- Windows/macOS/Linux

## Install
```powershell
npm install -g antigoldfishmode
```

## Initialize a project
```powershell
cd your-project
agm init
```
This creates `.antigoldfishmode/` with a local SQLite database and VS Code integration files.

## Quick commands
```powershell
agm remember "info" --context project --type note
agm recall "search term" --limit 10
agm status
```

## Next steps
- Index your repo: `agm index-code --symbols --path .`
- Search code: `agm search-code "symbolName" --hybrid --preview 3`
- Review receipts/journal: `agm receipt-show --last`, `agm journal --show`
