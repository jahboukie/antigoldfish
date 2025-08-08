/**
 * Enterprise-Grade Security Configuration
 * Secure secrets management and environment handling
 */
export interface SecurityConfig {
    adminPassword: string;
    adminSessionSecret: string;
    adminMfaSecret?: string;
    licenseSigningKey: string;
    licenseValidationKey: string;
    databaseEncryptionKey: string;
    rateLimitConfig: RateLimitConfig;
    auditConfig: AuditConfig;
}
export interface RateLimitConfig {
    adminLoginAttempts: number;
    adminLoginWindow: number;
    licenseValidationRpm: number;
    licenseGenerationRpm: number;
}
export interface AuditConfig {
    enableAuditLog: boolean;
    auditLogPath: string;
    auditRetentionDays: number;
    auditEncryption: boolean;
}
export declare class SecureConfigManager {
    private static instance;
    private config;
    private configPath;
    private constructor();
    static getInstance(): SecureConfigManager;
    /**
     * Load security configuration with validation
     */
    private loadConfig;
    /**
     * Load configuration from environment variables (production)
     */
    private loadFromEnvironment;
    /**
     * Load configuration from encrypted file (development)
     */
    private loadFromSecureFile;
    /**
     * Generate secure configuration with cryptographically strong keys
     */
    private generateAndSaveConfig;
    /**
     * Generate cryptographically secure password
     */
    private generateSecurePassword;
    /**
     * Generate ECDSA private key for license signing
     */
    private generateECDSAPrivateKey;
    /**
     * Derive public key from private key
     */
    private derivePublicKey;
    /**
     * Encrypt configuration before saving
     */
    private saveEncryptedConfig;
    /**
     * Encrypt configuration data
     */
    private encryptConfig;
    /**
     * Decrypt configuration data
     */
    private decryptConfig;
    /**
     * Get configuration encryption key from machine-specific data
     */
    private getConfigEncryptionKey;
    /**
     * Validate configuration completeness and security
     */
    private validateConfig;
    /**
     * Get configuration (read-only)
     */
    getConfig(): Readonly<SecurityConfig>;
    /**
     * Update admin password with validation
     */
    updateAdminPassword(newPassword: string): void;
    /**
     * Rotate license signing keys
     */
    rotateLicenseKeys(): void;
    /**
     * Get security status for admin dashboard
     */
    getSecurityStatus(): {
        configurationValid: boolean;
        lastKeyRotation: Date | null;
        auditLogEnabled: boolean;
        rateLimitingEnabled: boolean;
        mfaEnabled: boolean;
    };
}
