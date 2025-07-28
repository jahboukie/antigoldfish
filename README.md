# 🧠 AntiGoldfishMode

**AI Memory Engine - Built by AI, for AI**

> *Because AI assistants shouldn't have goldfish memory!*

AntiGoldfishMode is a revolutionary AI memory and code execution system designed to enhance developer experience when using AI coding assistants. Built by AI (Augment Agent), for AI assistants, it provides persistent memory and secure code execution capabilities that transform how AI helps with development.

## 🎯 **Why AntiGoldfishMode?**

**The Problem:** AI coding assistants forget everything between conversations. They can't learn from past interactions, remember project context, or build upon previous solutions.

**The Solution:** AntiGoldfishMode gives AI assistants persistent memory and safe code execution, enabling them to:
- 🧠 **Remember** every conversation and insight
- 🔍 **Recall** relevant information from past interactions  
- 🚀 **Execute** code safely in Docker sandboxes
- 📈 **Learn** from previous solutions and mistakes

## ⚡ **Quick Start**

### Installation
```bash
npm install -g antigoldfishmode
```

### Initialize in Your Project
```bash
antigoldfishmode init
```

### Core Commands
```bash
# Store memories for AI to remember
antigoldfishmode remember "Fixed the authentication bug by updating JWT validation"

# Search past memories and conversations
antigoldfishmode recall "authentication bug"

# Execute code safely in Docker sandbox
antigoldfishmode execute js "console.log('Hello, persistent AI memory!')"

# Check system status
antigoldfishmode status
```

## 🤖 **For AI Assistants**

AntiGoldfishMode is designed to be used by AI coding assistants with full autonomy. The system automatically records every interaction and provides rich context for future conversations.

### Automatic Conversation Recording
Every command automatically records the AI interaction:
- User requests and AI responses
- Code execution results and context
- Memory storage and retrieval operations
- Rich metadata for learning and improvement

### AI-Optimized Commands
```bash
# Memory Management
antigoldfishmode remember <content> [--context <context>] [--type <type>]
antigoldfishmode recall <query> [--limit <limit>]

# Code Execution  
antigoldfishmode execute <language> <code> [--timeout <seconds>] [--memory <limit>]

# System Information
antigoldfishmode status
antigoldfishmode init [--force]
```

## 🛠 **For Developers**

### Detailed Command Reference

#### `remember` - Store Persistent Memories
```bash
antigoldfishmode remember "Content to remember"
antigoldfishmode remember "API endpoint changed to /v2/users" --context "api-migration" --type "breaking-change"
```

**Options:**
- `--context <context>`: Categorize the memory (default: "general")
- `--type <type>`: Memory type (default: "general")

#### `recall` - Search Memories
```bash
antigoldfishmode recall "API changes"
antigoldfishmode recall "authentication" --limit 5
```

**Options:**
- `--limit <number>`: Maximum results to return (default: 10)

#### `execute` - Safe Code Execution
```bash
antigoldfishmode execute js "console.log('Hello World')"
antigoldfishmode execute python "print('Python in Docker')"
antigoldfishmode execute js "const fs = require('fs'); console.log('File operations')" --timeout 30
```

**Supported Languages:**
- `js` / `javascript` - Node.js environment
- `ts` / `typescript` - TypeScript with compilation
- `python` / `py` - Python 3.x
- `go` - Go language
- `rust` / `rs` - Rust language

**Options:**
- `--timeout <seconds>`: Execution timeout (default: 30)
- `--memory <limit>`: Memory limit (default: 512m)

#### `status` - System Information
```bash
antigoldfishmode status
```

Shows:
- Memory statistics (conversations, messages, memories)
- Execution engine status
- Database information
- License status

#### `init` - Project Initialization
```bash
antigoldfishmode init
antigoldfishmode init --force  # Reinitialize existing project
```

**Options:**
- `--force`: Reinitialize even if already initialized

## 🏗 **Architecture**

### Memory Engine
- **SQLite Database**: Encrypted local storage
- **Full-Text Search**: Fast memory retrieval
- **Conversation Recording**: Automatic AI interaction logging
- **Context Preservation**: Rich metadata for each interaction

### Execution Engine
- **Docker Sandboxes**: Secure, isolated code execution
- **Multi-Language Support**: JS, TS, Python, Go, Rust
- **Resource Limits**: Configurable timeout and memory limits
- **Result Capture**: Output, errors, and execution metrics

### Security
- **Local-Only**: No cloud dependencies, all data stays local
- **Encrypted Storage**: Database encryption with machine-specific keys
- **Sandboxed Execution**: Docker containers prevent system access
- **Resource Limits**: Protection against resource exhaustion

## 🎯 **Use Cases**

### For AI Assistants
- **Persistent Context**: Remember project details across sessions
- **Learning from Mistakes**: Avoid repeating failed solutions
- **Code Pattern Recognition**: Build upon successful implementations
- **Conversation Continuity**: Reference previous discussions

### For Developers
- **AI-Enhanced Development**: Supercharge your AI coding assistant
- **Knowledge Base**: Build a searchable repository of solutions
- **Safe Experimentation**: Test code snippets safely
- **Team Knowledge Sharing**: Share AI memories across team members

## 📊 **System Requirements**

- **Node.js**: 16.x or higher
- **Docker**: For code execution (optional but recommended)
- **Operating System**: Windows, macOS, Linux
- **Storage**: ~10MB for installation, variable for memories

## 🤝 **Contributing**

AntiGoldfishMode was built by AI for AI. We welcome contributions from both humans and AI assistants!

## 📄 **License**

MIT License - Built with ❤️ by AI, for the AI development community.

---

**Transform your AI coding assistant from goldfish to elephant memory!** 🐘✨
