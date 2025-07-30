# 🧠 AntiGoldfishMode Codebase Index

## 📋 Project Overview
**AntiGoldfishMode** is an AI Memory Engine that provides persistent memory and secure code execution capabilities for AI coding assistants. Built with TypeScript/Node.js, it features encrypted SQLite storage, machine-bound licensing, and a comprehensive CLI interface.

**Version:** 1.4.2  
**License:** MIT (CLI) + Proprietary (Database Engine)  
**Node.js:** >=18.0.0  

## 🏗️ Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    AntiGoldfishMode Core                    │
├─────────────────────────────────────────────────────────────┤
│  Memory Engine  │  License Service  │  CLI Interface        │
│  ┌─────────────┐ │  ┌─────────────┐  │  ┌─────────────────┐ │
│  │ SQLite DB   │ │  │ Machine     │  │  │ Commander.js    │ │
│  │ Encryption  │ │  │ Fingerprint │  │  │ Chalk Output    │ │
│  │ FTS Search  │ │  │ Validation  │  │  │ Auto Recording  │ │
│  └─────────────┘ │  └─────────────┘  │  └─────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                    Integration Layer                        │
│  ┌─────────────┐ │  ┌─────────────┐  │  ┌─────────────────┐ │
│  │ Webhook     │ │  │ Admin Panel │  │  │ Email System    │ │
│  │ Server      │ │  │ (Vercel)    │  │  │ (Nodemailer)    │ │
│  └─────────────┘ │  └─────────────┘  │  └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## 📁 Directory Structure

### Core Source (`/src`)
- **`index.ts`** - Main CLI application and command handlers
- **`cli.ts`** - CLI entry point and environment setup
- **`MemoryEngine.ts`** - Core memory management and storage logic
- **`LicenseService.ts`** - License validation and machine fingerprinting
- **`database/MemoryDatabase.ts`** - SQLite database with encryption

### Build Output (`/dist`)
- Compiled TypeScript files with source maps
- Ready for npm distribution

### Admin Panel (`/admin-panel`)
- **`index.html`** - Mobile-friendly license management interface
- **`api/send-license.js`** - Vercel API for email delivery
- **`package.json`** - Nodemailer dependency for email system

### Documentation (`/original tech-specs-docs`)
- **`TECHNICAL_DEVELOPMENT_SPEC.md`** - Comprehensive architecture docs
- **`ARCHITECTURE_DIAGRAMS.md`** - System design diagrams
- **`IMPLEMENTATION_ROADMAP.md`** - Development phases and milestones

### Configuration Files
- **`package.json`** - Main project dependencies and scripts
- **`tsconfig.json`** - TypeScript compilation settings
- **`vercel.json`** - Deployment configuration

## 🔧 Core Components

### 1. CLI Interface (`src/index.ts`)
**Main Class:** `CodeContextCLI`

**Key Commands:**
- `remember <content>` - Store persistent memories
- `recall <query>` - Search stored memories  
- `status` - System information and statistics
- `init` - Project initialization
- `activate <key>` - License activation
- `deactivate` - License removal

**Features:**
- Automatic AI conversation recording
- Colored console output with Chalk
- Commander.js argument parsing
- License validation for all operations

### 2. Memory Engine (`src/MemoryEngine.ts`)
**Main Class:** `MemoryEngine`

**Core Methods:**
- `storeMemory(content, context, type)` - Store with validation
- `searchMemories(query, options)` - Full-text search
- `getStatistics()` - Memory usage stats
- `initialize()` - Database setup

**Security Features:**
- Content validation and sanitization
- Secret detection and prevention
- Input length limits (10,000 chars)
- SQL injection protection

### 3. Database Layer (`src/database/MemoryDatabase.ts`)
**Main Class:** `MemoryDatabase`

**Database Schema:**
```sql
-- Memories table with FTS
CREATE TABLE memories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    content TEXT NOT NULL,
    context TEXT DEFAULT 'general',
    type TEXT DEFAULT 'general',
    tags TEXT DEFAULT '[]',
    metadata TEXT DEFAULT '{}',
    content_hash TEXT UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Conversations table
CREATE TABLE conversations (
    id TEXT PRIMARY KEY,
    ai_assistant TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    context TEXT DEFAULT '{}',
    messages TEXT NOT NULL,
    outcomes TEXT DEFAULT '[]'
);

-- Full-text search virtual table
CREATE VIRTUAL TABLE memories_fts USING fts5(
    content, context, type, tags,
    content='memories',
    content_rowid='id'
);
```

**Encryption Features:**
- AES-256-GCM encryption
- Machine-specific key derivation
- PBKDF2 with 200,000 iterations
- Integrity hash verification
- Background encryption scheduling

### 4. License Service (`src/LicenseService.ts`)
**Main Class:** `LicenseService`

**License Types:**
- `trial` - 14-day trial with basic features
- `early_adopter` - $69/year with full features
- `standard` - $149/year with full features

**Machine Fingerprinting:**
- Hostname, platform, architecture
- CPU model and memory info
- Network MAC addresses
- Username and process info
- Directory path binding

**Validation Features:**
- 7-day offline grace period
- Local license storage
- Automatic expiration checking
- Feature flag management

## 🌐 Web Components

### Webhook Server (`webhook-server.js`)
**Purpose:** Handle Stripe payment webhooks and license delivery

**Key Functions:**
- `generateLicenseKey(type)` - Create license keys
- `sendLicenseEmail(email, license)` - Email delivery
- `verifyStripeSignature(payload, sig)` - Webhook security

**Supported Events:**
- `checkout.session.completed` - Payment success
- `customer.subscription.created` - Subscription start
- `invoice.payment_succeeded` - Recurring payments

### Admin Panel (`admin-panel/index.html`)
**Features:**
- Mobile-responsive design
- Manual license generation
- Email delivery interface
- Customer support tools

## 📦 Dependencies

### Production Dependencies
```json
{
  "axios": "^1.11.0",           // HTTP client
  "better-sqlite3": "^11.10.0", // SQLite database
  "chalk": "^5.3.0",            // Terminal colors
  "commander": "^14.0.0",       // CLI framework
  "dotenv": "^17.2.1",          // Environment variables
  "express": "^5.1.0",          // Web server
  "fs-extra": "^11.3.0",        // File system utilities
  "node-machine-id": "^1.1.12", // Machine fingerprinting
  "nodemailer": "^7.0.5"        // Email delivery
}
```

### Development Dependencies
```json
{
  "@types/better-sqlite3": "^7.6.13",
  "@types/express": "^5.0.3",
  "@types/fs-extra": "^11.0.4",
  "@types/node": "^24.1.0",
  "@types/nodemailer": "^6.4.17",
  "typescript": "^5.7.2"
}
```

## 🚀 Build & Deployment

### Build Process
```bash
npm run build      # Compile TypeScript to /dist
npm run clean      # Remove dist directory
npm run start      # Run compiled CLI
```

### Distribution
- **NPM Package:** `antigoldfishmode`
- **Binary:** `dist/cli.js`
- **Global Install:** `npm install -g antigoldfishmode`

### Deployment Targets
- **CLI:** NPM registry for global installation
- **Webhook:** Vercel/Railway for webhook handling
- **Admin Panel:** Vercel static hosting

## 🔒 Security Features

### Data Protection
- AES-256-GCM encryption for database files
- Machine-specific key derivation
- No cloud dependencies for core operations
- Local-only data storage

### Input Validation
- Content sanitization and length limits
- Secret detection patterns
- SQL injection prevention
- Type checking and validation

### License Security
- Machine fingerprinting for binding
- Offline grace period (7 days)
- Tamper-resistant local storage
- Automatic validation on operations

## 🧪 Testing Infrastructure

### Test Files
- **`test-hybrid-system.js`** - License system integration
- **`test-stripe-webhook.js`** - Payment webhook testing
- **`test-trial-webhook.js`** - Trial license testing
- **`admin-panel/test-email.js`** - Email delivery testing

### Testing Approach
- Manual integration testing
- License validation scenarios
- Database encryption/decryption
- Webhook signature verification

## 📈 Future Roadmap (v2.0)

### Planned Features
- **Secure Code Execution:** Docker sandbox environments
- **Multi-language Support:** JS, TS, Python, Go, Rust
- **Enhanced AI Integration:** Better conversation context
- **Team Collaboration:** Shared memory spaces
- **Advanced Analytics:** Usage patterns and insights

### Technical Improvements
- **Performance:** Faster search and retrieval
- **Scalability:** Support for larger datasets
- **Security:** Enhanced encryption and validation
- **Integration:** IDE extensions and plugins

---

*This index provides a comprehensive overview of the AntiGoldfishMode codebase structure, components, and architecture. For detailed implementation specifics, refer to the individual source files and documentation.*
