#!/usr/bin/env node

/**
 * AntiGoldfishMode Security CLI
 * Quick access to security management without web dashboard
 */

const { SecureConfigManager } = require('./security/SecureConfig');
const { AuthenticationManager } = require('./security/AuthenticationManager');
const { SecureLicenseManager } = require('./security/SecureLicenseManager');
const { AuditLogger } = require('./security/AuditLogger');

function showSecurityDashboard() {
    console.log('🛡️ AntiGoldfishMode Security Dashboard');
    console.log('═══════════════════════════════════════');
    
    try {
        const configManager = SecureConfigManager.getInstance();
        const authManager = AuthenticationManager.getInstance();
        const licenseManager = SecureLicenseManager.getInstance();
        const auditLogger = AuditLogger.getInstance();
        
        // Get security status
        const securityStatus = configManager.getSecurityStatus();
        const authDashboard = authManager.getSecurityDashboard();
        const licenseAnalytics = licenseManager.getLicenseAnalytics();
        const auditStats = auditLogger.getAuditStatistics();
        
        console.log('\n📊 Security Overview:');
        console.log(`   Configuration: ${securityStatus.configurationValid ? '✅ Valid' : '❌ Invalid'}`);
        console.log(`   MFA Enabled: ${securityStatus.mfaEnabled ? '✅ Yes' : '❌ No'}`);
        console.log(`   Audit Logging: ${securityStatus.auditLogEnabled ? '✅ Active' : '❌ Inactive'}`);
        console.log(`   Rate Limiting: ${securityStatus.rateLimitingEnabled ? '✅ Active' : '❌ Inactive'}`);
        
        console.log('\n🔐 Authentication:');
        console.log(`   Active Sessions: ${authDashboard.activeSessions}`);
        console.log(`   Recent Logins: ${authDashboard.recentLogins.length}`);
        console.log(`   Rate Limited IPs: ${authDashboard.rateLimitedIPs.length}`);
        console.log(`   Security Alerts: ${authDashboard.securityAlerts.length}`);
        
        console.log('\n🎫 License Management:');
        console.log(`   Total Licenses: ${licenseAnalytics.totalLicenses}`);
        console.log(`   Active Licenses: ${licenseAnalytics.activeLicenses}`);
        console.log(`   Device Usage: ${licenseAnalytics.deviceUsage.totalDevices}`);
        console.log(`   Recent Activations: ${licenseAnalytics.recentActivations.length}`);
        
        console.log('\n📝 Audit Logging:');
        console.log(`   Log File Size: ${(auditStats.logFileSize / 1024).toFixed(1)} KB`);
        console.log(`   Critical Events: ${auditStats.recentCriticalEvents}`);
        
        if (authDashboard.securityAlerts.length > 0) {
            console.log('\n🚨 Security Alerts:');
            authDashboard.securityAlerts.forEach((alert, i) => {
                console.log(`   ${i + 1}. ${alert}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error accessing security dashboard:', error.message);
    }
}

function showCommands() {
    console.log('🛡️ AntiGoldfishMode Security CLI Commands');
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('Commands:');
    console.log('  dashboard     Show security dashboard');
    console.log('  config        Show configuration status');
    console.log('  mfa           Setup MFA for admin');
    console.log('  rotate-keys   Rotate license signing keys');
    console.log('  audit         Show audit statistics');
    console.log('  licenses      Show license analytics');
    console.log('  help          Show this help');
    console.log('');
    console.log('Examples:');
    console.log('  node security-cli.js dashboard');
    console.log('  node security-cli.js mfa');
    console.log('  node security-cli.js audit');
}

async function setupMFA() {
    try {
        const authManager = AuthenticationManager.getInstance();
        const mfaSetup = await authManager.setupMFA();
        
        console.log('📱 MFA Setup Complete!');
        console.log('═══════════════════════');
        console.log(`Secret: ${mfaSetup.secret}`);
        console.log(`QR Code Data: ${mfaSetup.qrCodeUrl}`);
        console.log('');
        console.log('Backup Codes:');
        mfaSetup.backupCodes.forEach((code, i) => {
            console.log(`  ${i + 1}. ${code}`);
        });
        console.log('');
        console.log('⚠️  IMPORTANT: Save the secret and backup codes securely!');
        
    } catch (error) {
        console.error('❌ MFA setup failed:', error.message);
    }
}

function showConfig() {
    try {
        const configManager = SecureConfigManager.getInstance();
        const config = configManager.getConfig();
        const status = configManager.getSecurityStatus();
        
        console.log('⚙️ Security Configuration');
        console.log('═══════════════════════');
        console.log(`Configuration Valid: ${status.configurationValid ? '✅' : '❌'}`);
        console.log(`MFA Enabled: ${status.mfaEnabled ? '✅' : '❌'}`);
        console.log(`Audit Logging: ${status.auditLogEnabled ? '✅' : '❌'}`);
        console.log(`Rate Limiting: ${status.rateLimitingEnabled ? '✅' : '❌'}`);
        console.log('');
        console.log('🔐 Keys (masked):');
        console.log(`Admin Session Secret: ${config.adminSessionSecret.substring(0, 8)}...`);
        console.log(`Database Encryption: ${config.databaseEncryptionKey.substring(0, 8)}...`);
        console.log('');
        console.log('📊 Rate Limits:');
        console.log(`Login Attempts: ${config.rateLimitConfig.adminLoginAttempts}`);
        console.log(`Login Window: ${config.rateLimitConfig.adminLoginWindow}ms`);
        console.log(`License Validation: ${config.rateLimitConfig.licenseValidationRpm}/min`);
        
    } catch (error) {
        console.error('❌ Error reading configuration:', error.message);
    }
}

async function rotateKeys() {
    try {
        const configManager = SecureConfigManager.getInstance();
        configManager.rotateLicenseKeys();
        console.log('🔄 License signing keys rotated successfully!');
        console.log('⚠️  Existing licenses will need re-validation.');
        
    } catch (error) {
        console.error('❌ Key rotation failed:', error.message);
    }
}

function showAuditStats() {
    try {
        const auditLogger = AuditLogger.getInstance();
        const stats = auditLogger.getAuditStatistics();
        
        console.log('📝 Audit Statistics');
        console.log('═══════════════════');
        console.log(`Total Events: ${stats.totalEvents}`);
        console.log(`Log File Size: ${(stats.logFileSize / 1024).toFixed(1)} KB`);
        console.log(`Critical Events: ${stats.recentCriticalEvents}`);
        console.log('');
        console.log('Events by Type:');
        Object.entries(stats.eventsByType).forEach(([type, count]) => {
            console.log(`  ${type}: ${count}`);
        });
        console.log('');
        console.log('Events by Severity:');
        Object.entries(stats.eventsBySeverity).forEach(([severity, count]) => {
            console.log(`  ${severity}: ${count}`);
        });
        
    } catch (error) {
        console.error('❌ Error reading audit statistics:', error.message);
    }
}

function showLicenses() {
    try {
        const licenseManager = SecureLicenseManager.getInstance();
        const analytics = licenseManager.getLicenseAnalytics();
        
        console.log('🎫 License Analytics');
        console.log('═══════════════════');
        console.log(`Total Licenses: ${analytics.totalLicenses}`);
        console.log(`Active Licenses: ${analytics.activeLicenses}`);
        console.log(`Expired Licenses: ${analytics.expiredLicenses}`);
        console.log('');
        console.log('Device Usage:');
        console.log(`  Total Devices: ${analytics.deviceUsage.totalDevices}`);
        console.log(`  Active Devices: ${analytics.deviceUsage.activeDevices}`);
        console.log(`  Device Limit Usage: ${analytics.deviceUsage.deviceLimitUsage}%`);
        console.log('');
        console.log('Plans:');
        Object.entries(analytics.planDistribution).forEach(([plan, count]) => {
            console.log(`  ${plan}: ${count}`);
        });
        
        if (analytics.recentActivations.length > 0) {
            console.log('');
            console.log('Recent Activations:');
            analytics.recentActivations.slice(0, 5).forEach((activation, i) => {
                console.log(`  ${i + 1}. ${activation}`);
            });
        }
        
    } catch (error) {
        console.error('❌ Error reading license analytics:', error.message);
    }
}

// Main CLI handler
const command = process.argv[2];

switch (command) {
    case 'dashboard':
        showSecurityDashboard();
        break;
    case 'config':
        showConfig();
        break;
    case 'mfa':
        setupMFA();
        break;
    case 'rotate-keys':
        rotateKeys();
        break;
    case 'audit':
        showAuditStats();
        break;
    case 'licenses':
        showLicenses();
        break;
    case 'help':
    case undefined:
        showCommands();
        break;
    default:
        console.log(`❌ Unknown command: ${command}`);
        console.log('Run "node security-cli.js help" for available commands');
}