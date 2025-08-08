# 🧠 AntiGoldfishMode VSCode Integration

This directory contains VSCode integration templates that are automatically installed when you run `agm init` in a project.

## 🚀 What Gets Installed

When you run `agm init`, these files are automatically created in your project's `.vscode/` directory:

### 📋 `tasks.json` - AGM Commands as VSCode Tasks
- **🧠 AGM: Remember Selection** - Remember selected text with context
- **🔍 AGM: Quick Recall** - Search memories instantly
- **📊 AGM: Show Status** - Display AGM system status
- **🚀 AGM: Initialize Project** - Set up AGM in new projects
- **🧠 AGM: Remember Current File Context** - Remember file purpose
- **🔍 AGM: Search Project Memories** - Deep search with dedicated panel

### ⚙️ `settings.json` - VSCode Configuration
- File associations for AGM files (`.agm` files as JSON)
- Search exclusions for `.antigoldfishmode/` directory
- Terminal integration with AGM environment variables
- Custom colors and themes for AGM-related files
- Recommended extensions that work well with AGM

### ⌨️ `keybindings.json` - Keyboard Shortcuts
- `Ctrl+Shift+M` - Remember selected text
- `Ctrl+Shift+R` - Quick recall memories
- `Ctrl+Shift+Alt+M` - Remember current file context
- `Ctrl+Shift+Alt+R` - Search project memories
- `Ctrl+Shift+Alt+S` - Show AGM status
- `Alt+M` - Quick remember (alternative)
- `Alt+R` - Quick recall (alternative)

### 📝 `agm.code-snippets` - Code Snippets
Type these prefixes and press Tab for instant AGM commands:
- `agm-remember` - AGM remember command with context
- `agm-recall` - AGM recall command with limit
- `agm-status` - AGM status command
- `agm-init` - AGM initialize project command
- `agm-script` - AGM bash script template
- `agm-package-scripts` - AGM npm scripts for package.json
- `agm-comment` - AGM comment block for documentation
- `agm-readme` - AGM README section template
- `agm-env` - AGM environment variables
- `agm-docker` - AGM Docker integration

## 🎯 How to Use

### 1. Initialize AGM in Your Project
```bash
cd your-project
agm init
```

This automatically creates all the VSCode integration files.

### 2. Use Keyboard Shortcuts
- Select some code and press `Ctrl+Shift+M` to remember it
- Press `Ctrl+Shift+R` to search your memories
- Press `F1` and type "AGM" to see all available commands

### 3. Use Command Palette
- Press `F1` or `Ctrl+Shift+P`
- Type "Tasks: Run Task"
- Look for tasks starting with 🧠 AGM

### 4. Use Code Snippets
- In any file, type `agm-` and press `Ctrl+Space` for autocomplete
- Select the snippet you want and press Tab

## 🔧 Customization

You can modify any of the generated `.vscode/` files to suit your preferences:

- **Add more shortcuts**: Edit `.vscode/keybindings.json`
- **Modify tasks**: Edit `.vscode/tasks.json`
- **Change settings**: Edit `.vscode/settings.json`
- **Create custom snippets**: Edit `.vscode/agm.code-snippets`

## 🤝 File Merging

AGM intelligently merges with existing VSCode configurations:
- **New project**: Creates all files from scratch
- **Existing `.vscode/`**: Merges AGM tasks/settings without overwriting your existing configuration
- **Conflicts**: Creates `.backup` files and logs warnings

## 🎨 VSCode Features

### Task Integration
- All AGM commands available via `Ctrl+Shift+P` → "Tasks: Run Task"
- Input prompts for search queries and memory content
- Dedicated terminal panels for AGM output
- Uses VSCode variables like `${selectedText}` and `${workspaceFolderBasename}`

### Settings Integration
- AGM files excluded from search by default (configurable)
- Terminal environment variables for AGM
- Custom file associations for AGM-related files
- Recommended extensions that enhance AGM workflow

### Snippet Integration
- Intelligent autocomplete for AGM commands
- Context-aware snippets for different file types
- Templates for common AGM patterns (scripts, documentation, etc.)

## 🚀 Getting Started

1. **Install AGM**: `npm install -g antigoldfishmode`
2. **Initialize project**: `agm init`
3. **Open in VSCode**: Your project now has full AGM integration!
4. **Try it out**: Select some code and press `Ctrl+Shift+M`

The integration works immediately - no extensions to install, no additional setup required!

## 💡 Pro Tips

- Use `Ctrl+Shift+Alt+M` to remember the purpose of entire files
- Create AGM npm scripts with the `agm-package-scripts` snippet
- Use `agm-comment` snippet to document complex code sections
- Set up AGM in your dotfiles with the `agm-env` snippet

## 🐛 Troubleshooting

If VSCode integration isn't working:
1. Make sure AGM is installed globally: `npm list -g antigoldfishmode`
2. Run `agm init --force` to recreate VSCode files
3. Restart VSCode to reload configuration
4. Check that `.vscode/tasks.json` contains AGM tasks

## 📚 Learn More

- **CLI Reference**: Run `agm --help`
- **Website**: https://antigoldfish.dev
- **Documentation**: Run `agm ai-guide` for AI assistant instructions

---

*This integration makes AGM a first-class citizen in your VSCode workflow! 🎉*