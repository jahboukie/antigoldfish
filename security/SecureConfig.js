"use strict";
/**
 * Enterprise-Grade Security Configuration
 * Secure secrets management and environment handling
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureConfigManager = void 0;
const crypto = __importStar(require("crypto"));
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
class SecureConfigManager {
    constructor() {
        this.configPath = process.env.SECURITY_CONFIG_PATH || './security/.env.secure';
        this.loadConfig();
    }
    static getInstance() {
        if (!SecureConfigManager.instance) {
            SecureConfigManager.instance = new SecureConfigManager();
        }
        return SecureConfigManager.instance;
    }
    /**
     * Load security configuration with validation
     */
    loadConfig() {
        try {
            // Check for environment variables first (production)
            if (process.env.NODE_ENV === 'production') {
                this.config = this.loadFromEnvironment();
            }
            else {
                // Development: Load from secure file
                this.config = this.loadFromSecureFile();
            }
            this.validateConfig();
            console.log('✅ Security configuration loaded and validated');
        }
        catch (error) {
            console.error('❌ Failed to load security configuration:', error);
            throw new Error('Security configuration initialization failed');
        }
    }
    /**
     * Load configuration from environment variables (production)
     */
    loadFromEnvironment() {
        const requiredEnvVars = [
            'ADMIN_PASSWORD',
            'ADMIN_SESSION_SECRET',
            'LICENSE_SIGNING_KEY',
            'DATABASE_ENCRYPTION_KEY'
        ];
        // Validate all required environment variables exist
        for (const envVar of requiredEnvVars) {
            if (!process.env[envVar]) {
                throw new Error(`Missing required environment variable: ${envVar}`);
            }
        }
        return {
            adminPassword: process.env.ADMIN_PASSWORD,
            adminSessionSecret: process.env.ADMIN_SESSION_SECRET,
            adminMfaSecret: process.env.ADMIN_MFA_SECRET,
            licenseSigningKey: process.env.LICENSE_SIGNING_KEY,
            licenseValidationKey: process.env.LICENSE_VALIDATION_KEY || process.env.LICENSE_SIGNING_KEY,
            databaseEncryptionKey: process.env.DATABASE_ENCRYPTION_KEY,
            rateLimitConfig: {
                adminLoginAttempts: parseInt(process.env.RATE_LIMIT_LOGIN_ATTEMPTS || '5'),
                adminLoginWindow: parseInt(process.env.RATE_LIMIT_LOGIN_WINDOW || '900000'), // 15 minutes
                licenseValidationRpm: parseInt(process.env.RATE_LIMIT_VALIDATION_RPM || '100'),
                licenseGenerationRpm: parseInt(process.env.RATE_LIMIT_GENERATION_RPM || '10')
            },
            auditConfig: {
                enableAuditLog: process.env.ENABLE_AUDIT_LOG === 'true',
                auditLogPath: process.env.AUDIT_LOG_PATH || './logs/audit.log',
                auditRetentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '90'),
                auditEncryption: process.env.AUDIT_ENCRYPTION === 'true'
            }
        };
    }
    /**
     * Load configuration from encrypted file (development)
     */
    loadFromSecureFile() {
        if (!fs.existsSync(this.configPath)) {
            console.log('🔧 Security config not found, generating...');
            return this.generateAndSaveConfig();
        }
        const encryptedConfig = fs.readFileSync(this.configPath, 'utf8');
        const config = this.decryptConfig(encryptedConfig);
        return JSON.parse(config);
    }
    /**
     * Generate secure configuration with cryptographically strong keys
     */
    generateAndSaveConfig() {
        const config = {
            // Generate secure admin password (can be overridden)
            adminPassword: process.env.ADMIN_PASSWORD || this.generateSecurePassword(),
            // Generate cryptographically secure session secret
            adminSessionSecret: crypto.randomBytes(64).toString('hex'),
            // Generate ECDSA key pair for license signing
            licenseSigningKey: this.generateECDSAPrivateKey(),
            licenseValidationKey: '', // Will be derived from signing key
            // Generate database encryption key
            databaseEncryptionKey: crypto.randomBytes(32).toString('hex'),
            rateLimitConfig: {
                adminLoginAttempts: 5,
                adminLoginWindow: 900000, // 15 minutes
                licenseValidationRpm: 100,
                licenseGenerationRpm: 10
            },
            auditConfig: {
                enableAuditLog: true,
                auditLogPath: './logs/audit.log',
                auditRetentionDays: 90,
                auditEncryption: true
            }
        };
        // Derive public key for validation
        config.licenseValidationKey = this.derivePublicKey(config.licenseSigningKey);
        // Save encrypted configuration
        this.saveEncryptedConfig(config);
        console.log('✅ Generated new security configuration');
        console.log('🔑 IMPORTANT: Save your admin password:', config.adminPassword);
        return config;
    }
    /**
     * Generate cryptographically secure password
     */
    generateSecurePassword() {
        const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$%^&*';
        let password = '';
        for (let i = 0; i < 24; i++) {
            password += charset.charAt(crypto.randomInt(charset.length));
        }
        return password;
    }
    /**
     * Generate ECDSA private key for license signing
     */
    generateECDSAPrivateKey() {
        const keyPair = crypto.generateKeyPairSync('ec', {
            namedCurve: 'prime256v1',
            privateKeyEncoding: {
                type: 'pkcs8',
                format: 'pem'
            },
            publicKeyEncoding: {
                type: 'spki',
                format: 'pem'
            }
        });
        return keyPair.privateKey;
    }
    /**
     * Derive public key from private key
     */
    derivePublicKey(privateKeyPem) {
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        const publicKey = crypto.createPublicKey(privateKey);
        return publicKey.export({
            type: 'spki',
            format: 'pem'
        });
    }
    /**
     * Encrypt configuration before saving
     */
    saveEncryptedConfig(config) {
        const configJson = JSON.stringify(config, null, 2);
        const encryptedConfig = this.encryptConfig(configJson);
        // Ensure directory exists
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
            fs.mkdirSync(configDir, { recursive: true });
        }
        fs.writeFileSync(this.configPath, encryptedConfig, { mode: 0o600 });
    }
    /**
     * Encrypt configuration data
     */
    encryptConfig(data) {
        const key = this.getConfigEncryptionKey();
        const iv = crypto.randomBytes(16);
        const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        const authTag = cipher.getAuthTag();
        return JSON.stringify({
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex')
        });
    }
    /**
     * Decrypt configuration data
     */
    decryptConfig(encryptedData) {
        const { encrypted, iv, authTag } = JSON.parse(encryptedData);
        const key = this.getConfigEncryptionKey();
        const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
        decipher.setAuthTag(Buffer.from(authTag, 'hex'));
        let decrypted = decipher.update(encrypted, 'hex', 'utf8');
        decrypted += decipher.final('utf8');
        return decrypted;
    }
    /**
     * Get configuration encryption key from machine-specific data
     */
    getConfigEncryptionKey() {
        const machineData = [
            process.platform,
            process.arch,
            require('os').hostname(),
            __dirname
        ].join(':');
        return crypto.createHash('sha256').update(machineData).digest();
    }
    /**
     * Validate configuration completeness and security
     */
    validateConfig() {
        const requiredFields = [
            'adminPassword',
            'adminSessionSecret',
            'licenseSigningKey',
            'licenseValidationKey',
            'databaseEncryptionKey'
        ];
        for (const field of requiredFields) {
            if (!this.config[field]) {
                throw new Error(`Missing required security configuration: ${field}`);
            }
        }
        // Validate password strength
        if (this.config.adminPassword.length < 12) {
            throw new Error('Admin password must be at least 12 characters');
        }
        // Validate key lengths
        if (this.config.adminSessionSecret.length < 64) {
            throw new Error('Session secret must be at least 64 characters');
        }
        // Validate ECDSA keys
        try {
            crypto.createPrivateKey(this.config.licenseSigningKey);
            crypto.createPublicKey(this.config.licenseValidationKey);
        }
        catch (error) {
            throw new Error('Invalid ECDSA key pair for license signing');
        }
    }
    /**
     * Get configuration (read-only)
     */
    getConfig() {
        return Object.freeze({ ...this.config });
    }
    /**
     * Update admin password with validation
     */
    updateAdminPassword(newPassword) {
        if (newPassword.length < 12) {
            throw new Error('Password must be at least 12 characters');
        }
        this.config.adminPassword = newPassword;
        this.saveEncryptedConfig(this.config);
        console.log('✅ Admin password updated successfully');
    }
    /**
     * Rotate license signing keys
     */
    rotateLicenseKeys() {
        const newPrivateKey = this.generateECDSAPrivateKey();
        const newPublicKey = this.derivePublicKey(newPrivateKey);
        this.config.licenseSigningKey = newPrivateKey;
        this.config.licenseValidationKey = newPublicKey;
        this.saveEncryptedConfig(this.config);
        console.log('✅ License signing keys rotated successfully');
        console.log('⚠️  IMPORTANT: Existing licenses will need re-validation');
    }
    /**
     * Get security status for admin dashboard
     */
    getSecurityStatus() {
        return {
            configurationValid: true,
            lastKeyRotation: null, // TODO: Track key rotation dates
            auditLogEnabled: this.config.auditConfig.enableAuditLog,
            rateLimitingEnabled: true,
            mfaEnabled: !!this.config.adminMfaSecret
        };
    }
}
exports.SecureConfigManager = SecureConfigManager;
//# sourceMappingURL=SecureConfig.js.map