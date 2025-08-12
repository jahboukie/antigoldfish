# Changelog

All notable changes to AntiGoldfishMode will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.7.0] - 2025-08-11

### Added
- 📊 Health metrics rollups and improved `health`/`vector-status` observability.
- 🧪 Portable test runner (`scripts/run-tests.js`) to reliably discover and run `tests/*.mjs` across OS/Node.

### Fixed
- 🧱 CI stability across Node 18/20/22 and all OS runners.
- 🔌 Avoid ESM/CommonJS mismatch by pinning `chalk` to 4.1.2.
- 🧩 Skip flaky native rebuilds for `better-sqlite3` in CI; guarded with `scripts/ensure-sqlite.js`.

### Security/Chore
- 🚫 Ignore local `.antigoldfishmode/` and backup `.antigoldfishmode.bak-*/` directories; removed accidental backups from repo.

## [1.1.0] - 2025-07-29

### Added
- 🤔 **Comprehensive FAQ Section** - Added detailed FAQ to landing page covering all major user questions
- 📋 **6 FAQ Categories** - Getting Started, Core Features, Technical Details, Usage & Best Practices, Licensing & Support, Advanced Usage
- 🎯 **Conversion-Optimized** - Strategic CTAs and trust-building content throughout FAQ
- 📱 **Responsive Design** - Clean, professional styling that works on all devices

### Enhanced
- 🌐 **Landing Page Experience** - Complete user journey from awareness to purchase with comprehensive information
- 💬 **User Support** - Proactive answers to common questions reducing support burden
- 🔍 **SEO Optimization** - Proper heading structure and comprehensive content for better search visibility

## [1.0.1] - 2025-07-29

### Fixed
- 🏷️ **Branding Consistency** - Fixed all user-facing messages to consistently use "AntiGoldfishMode" instead of "CodeContext Pro"
- 📝 **Command Suggestions** - Fixed initialization success message to suggest correct `antigoldfishmode` commands instead of `codecontextpro`
- ✅ **Terminal Flow** - Resolved command name mismatch that caused confusion when following CLI suggestions

### Changed
- All status messages now consistently display "AntiGoldfishMode" branding
- Initialization messages updated to reflect correct product name
- Error messages updated for consistency

## [1.0.0] - 2025-07-26

### Added
- 🧠 **Persistent AI Memory System** - SQLite-based memory storage with full-text search
 
- 💬 **Automatic Conversation Recording** - Every AI interaction is automatically captured
- 🔍 **Memory Search & Recall** - Intelligent search through past conversations and memories
- 🛡️ **Local-Only Operation** - No cloud dependencies, all data stays on your machine
- 🔐 **Database Encryption** - Machine-specific encryption for data security

### Core Commands
- `antigoldfishmode remember <content>` - Store persistent memories
- `antigoldfishmode recall <query>` - Search and retrieve memories
 
- `antigoldfishmode status` - Show system status and statistics
- `antigoldfishmode init` - Initialize project

### Supported Languages
- JavaScript/Node.js
- TypeScript (with compilation)
- Python 3.x
- Go
- Rust

### Features
- **AI-First Design** - Built by AI, optimized for AI assistants
- **Conversation Context** - Rich metadata for each interaction
- **Developer-Friendly** - Clear documentation for human developers
- **Zero Configuration** - Works out of the box
- **Cross-Platform** - Windows, macOS, Linux support

### Technical Details
- Node.js 18+ required
- TypeScript 5.7+ for development
- SQLite for local data storage
 
- Modern ES modules and latest dependencies

---

**"Transform your AI coding assistant from goldfish to elephant memory!"** 🐘✨
