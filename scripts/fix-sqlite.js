#!/usr/bin/env node

/**
 * Cross-platform fix for better-sqlite3 compatibility issues
 * Automatically rebuilds better-sqlite3 for the current environment
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔧 AntiGoldfishMode SQLite Compatibility Fix');
console.log('═══════════════════════════════════════════');

async function fixSqlite() {
    try {
        // Check if we're in a development environment
        const packageJsonPath = path.join(process.cwd(), 'package.json');
        const isDevEnv = fs.existsSync(packageJsonPath);
        
        if (isDevEnv) {
            console.log('📦 Development environment detected');
        } else {
            console.log('🌐 Global installation detected');
        }

        console.log('🔄 Rebuilding better-sqlite3 for current environment...');
        
        const rebuild = spawn('npm', ['rebuild', 'better-sqlite3'], {
            stdio: 'inherit',
            shell: true,
            cwd: isDevEnv ? process.cwd() : __dirname
        });

        await new Promise((resolve, reject) => {
            rebuild.on('close', (code) => {
                if (code === 0) {
                    console.log('✅ better-sqlite3 rebuilt successfully');
                    console.log('🎉 SQLite compatibility issue resolved!');
                    resolve(true);
                } else {
                    console.log(`❌ Rebuild failed with exit code: ${code}`);
                    console.log('');
                    console.log('🔧 Manual fix options:');
                    console.log('   1. Run: npm rebuild better-sqlite3');
                    console.log('   2. Run: npm install --rebuild');
                    console.log('   3. Reinstall: npm uninstall better-sqlite3 && npm install better-sqlite3');
                    reject(new Error(`Rebuild failed with code ${code}`));
                }
            });
            rebuild.on('error', (error) => {
                console.log('❌ Rebuild process failed:', error.message);
                reject(error);
            });
        });

        // Test the fix
        console.log('🧪 Testing SQLite functionality...');
        try {
            const Database = require('better-sqlite3');
            const testPath = path.join(require('os').tmpdir(), `agm-test-${Date.now()}.db`);
            const testDb = new Database(testPath);
            testDb.close();
            fs.unlinkSync(testPath);
            console.log('✅ SQLite test successful - fix confirmed!');
        } catch (testError) {
            console.log('❌ SQLite test failed - manual intervention required');
            throw testError;
        }

    } catch (error) {
        console.log('');
        console.log('💡 Environment Information:');
        console.log(`   Platform: ${process.platform}`);
        console.log(`   Architecture: ${process.arch}`);
        console.log(`   Node.js: ${process.version}`);
        console.log('');
        console.log('🔗 For more help, visit: https://github.com/WiseLibs/better-sqlite3/blob/master/docs/troubleshooting.md');
        process.exit(1);
    }
}

if (require.main === module) {
    fixSqlite();
}

module.exports = fixSqlite;