#!/usr/bin/env node

/**
 * Test the security hardening system
 * Run with: node test-security-hardening.js
 */

const { runSecurityDemo } = require('./dist/security/SecurityDemo');

async function testSecurityHardening() {
    console.log('🛡️ Testing AntiGoldfishMode Security Hardening...\n');

    try {
        await runSecurityDemo();
        console.log('\n✅ Security hardening test completed successfully!');
        console.log('🏆 AntiGoldfishMode is now a security fortress ready to dominate ByteRover!');
        
    } catch (error) {
        console.error('❌ Security hardening test failed:', error);
        process.exit(1);
    }
}

if (require.main === module) {
    testSecurityHardening().catch(console.error);
}