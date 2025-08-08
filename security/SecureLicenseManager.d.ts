/**
 * Cryptographic License Management System
 * Enterprise-grade license generation, validation, and security
 */
export interface LicenseData {
    licenseKey: string;
    customerEmail: string;
    plan: 'monthly' | 'yearly' | 'trial';
    features: string[];
    issuedAt: Date;
    expiresAt: Date;
    maxDevices: number;
    customerId?: string;
    metadata?: Record<string, any>;
}
export interface SecureLicense {
    licenseKey: string;
    signature: string;
    publicKey: string;
    payload: LicensePayload;
}
export interface LicensePayload {
    sub: string;
    iss: string;
    aud: string;
    iat: number;
    exp: number;
    plan: string;
    features: string[];
    devices: number;
    version: string;
    custom?: Record<string, any>;
}
export interface LicenseValidationResult {
    valid: boolean;
    expired: boolean;
    features: string[];
    plan: string;
    devicesRemaining: number;
    expiresAt: Date;
    error?: string;
}
export interface DeviceBinding {
    deviceId: string;
    deviceFingerprint: string;
    activatedAt: Date;
    lastSeen: Date;
    deviceInfo: {
        platform: string;
        arch: string;
        hostname: string;
        cpuModel: string;
    };
}
export declare class SecureLicenseManager {
    private static instance;
    private configManager;
    private deviceBindings;
    private constructor();
    static getInstance(): SecureLicenseManager;
    /**
     * Generate cryptographically signed license
     */
    generateLicense(licenseData: LicenseData): Promise<SecureLicense>;
    /**
     * Generate human-readable license key
     */
    private generateLicenseKey;
    /**
     * Sign license payload with ECDSA
     */
    private signLicense;
    /**
     * Validate license signature and content
     */
    validateLicense(licenseKey: string, signature: string, payload: LicensePayload, deviceFingerprint?: string): Promise<LicenseValidationResult>;
    /**
     * Verify ECDSA signature
     */
    private verifySignature;
    /**
     * Generate device fingerprint
     */
    generateDeviceFingerprint(): string;
    /**
     * Check and manage device binding
     */
    private checkDeviceBinding;
    /**
     * Get license analytics for dashboard
     */
    getLicenseAnalytics(): {
        totalLicenses: number;
        activeLicenses: number;
        expiredLicenses: number;
        planDistribution: Record<string, number>;
        deviceUsage: {
            totalDevices: number;
            averageDevicesPerLicense: number;
        };
        recentActivations: DeviceBinding[];
    };
    /**
     * Revoke license (emergency use)
     */
    revokeLicense(licenseKey: string): Promise<void>;
    /**
     * Generate license renewal token
     */
    generateRenewalToken(licenseKey: string): Promise<string>;
}
/**
 * License feature flags for enterprise control
 */
export declare class LicenseFeatures {
    static readonly FEATURES: {
        readonly UNLIMITED_MEMORY: "unlimited-memory";
        readonly VECTOR_SEARCH: "vector-search";
        readonly TEAM_COLLABORATION: "team-collaboration";
        readonly ENTERPRISE_ANALYTICS: "enterprise-analytics";
        readonly PRIORITY_SUPPORT: "priority-support";
        readonly CUSTOM_INTEGRATIONS: "custom-integrations";
        readonly ADVANCED_SECURITY: "advanced-security";
        readonly COMPLIANCE_REPORTING: "compliance-reporting";
    };
    static getFeaturesByPlan(plan: string): string[];
    static hasFeature(features: string[], feature: string): boolean;
}
