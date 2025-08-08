"use strict";
/**
 * Cryptographic License Management System
 * Enterprise-grade license generation, validation, and security
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
exports.LicenseFeatures = exports.SecureLicenseManager = void 0;
const crypto = __importStar(require("crypto"));
const SecureConfig_1 = require("./SecureConfig");
class SecureLicenseManager {
    constructor() {
        this.deviceBindings = new Map();
        this.configManager = SecureConfig_1.SecureConfigManager.getInstance();
    }
    static getInstance() {
        if (!SecureLicenseManager.instance) {
            SecureLicenseManager.instance = new SecureLicenseManager();
        }
        return SecureLicenseManager.instance;
    }
    /**
     * Generate cryptographically signed license
     */
    async generateLicense(licenseData) {
        try {
            const config = this.configManager.getConfig();
            // Create license payload
            const payload = {
                sub: licenseData.customerEmail,
                iss: 'AntiGoldfishMode',
                aud: 'AntiGoldfishMode-Client',
                iat: Math.floor(licenseData.issuedAt.getTime() / 1000),
                exp: Math.floor(licenseData.expiresAt.getTime() / 1000),
                plan: licenseData.plan,
                features: licenseData.features,
                devices: licenseData.maxDevices,
                version: '2.0',
                custom: licenseData.metadata
            };
            // Generate license key
            const licenseKey = this.generateLicenseKey(payload);
            // Create signature
            const signature = this.signLicense(payload, config.licenseSigningKey);
            // Get public key for client validation
            const publicKey = config.licenseValidationKey;
            const secureLicense = {
                licenseKey,
                signature,
                publicKey,
                payload
            };
            console.log(`✅ Generated secure license for ${licenseData.customerEmail} (${licenseData.plan})`);
            return secureLicense;
        }
        catch (error) {
            console.error('❌ License generation failed:', error);
            throw new Error('Failed to generate secure license');
        }
    }
    /**
     * Generate human-readable license key
     */
    generateLicenseKey(payload) {
        // Create deterministic key based on payload
        const keyData = `${payload.sub}:${payload.plan}:${payload.iat}`;
        const hash = crypto.createHash('sha256').update(keyData).digest();
        // Convert to readable format (AGM-XXXX-XXXX-XXXX-XXXX)
        const keyBytes = hash.slice(0, 16);
        const keyParts = [];
        for (let i = 0; i < 4; i++) {
            const part = keyBytes.slice(i * 4, (i + 1) * 4);
            const partString = part.toString('hex').toUpperCase().slice(0, 4);
            keyParts.push(partString);
        }
        return `AGM-${keyParts.join('-')}`;
    }
    /**
     * Sign license payload with ECDSA
     */
    signLicense(payload, privateKeyPem) {
        const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
        const privateKey = crypto.createPrivateKey(privateKeyPem);
        const signature = crypto.sign('sha256', Buffer.from(payloadJson), privateKey);
        return signature.toString('base64');
    }
    /**
     * Validate license signature and content
     */
    async validateLicense(licenseKey, signature, payload, deviceFingerprint) {
        try {
            const config = this.configManager.getConfig();
            // Verify signature
            const signatureValid = this.verifySignature(payload, signature, config.licenseValidationKey);
            if (!signatureValid) {
                return {
                    valid: false,
                    expired: false,
                    features: [],
                    plan: '',
                    devicesRemaining: 0,
                    expiresAt: new Date(),
                    error: 'Invalid license signature'
                };
            }
            // Check expiration
            const now = Math.floor(Date.now() / 1000);
            const expired = now > payload.exp;
            if (expired) {
                return {
                    valid: false,
                    expired: true,
                    features: payload.features,
                    plan: payload.plan,
                    devicesRemaining: 0,
                    expiresAt: new Date(payload.exp * 1000),
                    error: 'License expired'
                };
            }
            // Check device binding
            let devicesRemaining = payload.devices;
            if (deviceFingerprint) {
                const bindingResult = await this.checkDeviceBinding(licenseKey, deviceFingerprint, payload.devices);
                if (!bindingResult.allowed) {
                    return {
                        valid: false,
                        expired: false,
                        features: payload.features,
                        plan: payload.plan,
                        devicesRemaining: bindingResult.remaining,
                        expiresAt: new Date(payload.exp * 1000),
                        error: 'Device limit exceeded'
                    };
                }
                devicesRemaining = bindingResult.remaining;
            }
            console.log(`✅ License validated for ${payload.sub} (${payload.plan})`);
            return {
                valid: true,
                expired: false,
                features: payload.features,
                plan: payload.plan,
                devicesRemaining,
                expiresAt: new Date(payload.exp * 1000)
            };
        }
        catch (error) {
            console.error('❌ License validation failed:', error);
            return {
                valid: false,
                expired: false,
                features: [],
                plan: '',
                devicesRemaining: 0,
                expiresAt: new Date(),
                error: 'Validation error'
            };
        }
    }
    /**
     * Verify ECDSA signature
     */
    verifySignature(payload, signature, publicKeyPem) {
        try {
            const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
            const publicKey = crypto.createPublicKey(publicKeyPem);
            const signatureBuffer = Buffer.from(signature, 'base64');
            return crypto.verify('sha256', Buffer.from(payloadJson), publicKey, signatureBuffer);
        }
        catch (error) {
            console.error('❌ Signature verification failed:', error);
            return false;
        }
    }
    /**
     * Generate device fingerprint
     */
    generateDeviceFingerprint() {
        const os = require('os');
        const deviceData = [
            os.platform(),
            os.arch(),
            os.hostname(),
            os.cpus()[0]?.model || 'unknown',
            os.totalmem().toString(),
            process.env.USERNAME || process.env.USER || 'unknown'
        ].join(':');
        return crypto.createHash('sha256').update(deviceData).digest('hex');
    }
    /**
     * Check and manage device binding
     */
    async checkDeviceBinding(licenseKey, deviceFingerprint, maxDevices) {
        const bindings = this.deviceBindings.get(licenseKey) || [];
        // Check if device is already bound
        const existingBinding = bindings.find(binding => binding.deviceFingerprint === deviceFingerprint);
        if (existingBinding) {
            // Update last seen
            existingBinding.lastSeen = new Date();
            return { allowed: true, remaining: maxDevices - bindings.length };
        }
        // Check if we can add new device
        if (bindings.length >= maxDevices) {
            return { allowed: false, remaining: 0 };
        }
        // Add new device binding
        const os = require('os');
        const newBinding = {
            deviceId: crypto.randomBytes(16).toString('hex'),
            deviceFingerprint,
            activatedAt: new Date(),
            lastSeen: new Date(),
            deviceInfo: {
                platform: os.platform(),
                arch: os.arch(),
                hostname: os.hostname(),
                cpuModel: os.cpus()[0]?.model || 'unknown'
            }
        };
        bindings.push(newBinding);
        this.deviceBindings.set(licenseKey, bindings);
        console.log(`✅ Device bound to license ${licenseKey}: ${deviceFingerprint}`);
        return { allowed: true, remaining: maxDevices - bindings.length };
    }
    /**
     * Get license analytics for dashboard
     */
    getLicenseAnalytics() {
        // In production, this would query a database
        // For now, we'll return mock data based on in-memory state
        const totalDevices = Array.from(this.deviceBindings.values())
            .reduce((total, bindings) => total + bindings.length, 0);
        const recentActivations = Array.from(this.deviceBindings.values())
            .flat()
            .sort((a, b) => b.activatedAt.getTime() - a.activatedAt.getTime())
            .slice(0, 10);
        return {
            totalLicenses: this.deviceBindings.size,
            activeLicenses: this.deviceBindings.size, // Simplified
            expiredLicenses: 0, // Would need database to track
            planDistribution: {
                'monthly': 0,
                'yearly': 0,
                'trial': 0
            },
            deviceUsage: {
                totalDevices,
                averageDevicesPerLicense: totalDevices / Math.max(1, this.deviceBindings.size)
            },
            recentActivations
        };
    }
    /**
     * Revoke license (emergency use)
     */
    async revokeLicense(licenseKey) {
        this.deviceBindings.delete(licenseKey);
        console.log(`🚨 License revoked: ${licenseKey}`);
        // In production, this would also update a revocation list
        // that clients would check periodically
    }
    /**
     * Generate license renewal token
     */
    async generateRenewalToken(licenseKey) {
        const renewalData = {
            licenseKey,
            timestamp: Date.now(),
            type: 'renewal'
        };
        const config = this.configManager.getConfig();
        const privateKey = crypto.createPrivateKey(config.licenseSigningKey);
        const token = crypto.sign('sha256', Buffer.from(JSON.stringify(renewalData)), privateKey);
        return token.toString('base64');
    }
}
exports.SecureLicenseManager = SecureLicenseManager;
/**
 * License feature flags for enterprise control
 */
class LicenseFeatures {
    static getFeaturesByPlan(plan) {
        switch (plan) {
            case 'trial':
                return [
                    LicenseFeatures.FEATURES.UNLIMITED_MEMORY,
                    LicenseFeatures.FEATURES.VECTOR_SEARCH
                ];
            case 'monthly':
            case 'yearly':
                return [
                    LicenseFeatures.FEATURES.UNLIMITED_MEMORY,
                    LicenseFeatures.FEATURES.VECTOR_SEARCH,
                    LicenseFeatures.FEATURES.TEAM_COLLABORATION,
                    LicenseFeatures.FEATURES.ENTERPRISE_ANALYTICS,
                    LicenseFeatures.FEATURES.PRIORITY_SUPPORT,
                    LicenseFeatures.FEATURES.ADVANCED_SECURITY
                ];
            case 'enterprise':
                return Object.values(LicenseFeatures.FEATURES);
            default:
                return [];
        }
    }
    static hasFeature(features, feature) {
        return features.includes(feature);
    }
}
exports.LicenseFeatures = LicenseFeatures;
LicenseFeatures.FEATURES = {
    UNLIMITED_MEMORY: 'unlimited-memory',
    VECTOR_SEARCH: 'vector-search',
    TEAM_COLLABORATION: 'team-collaboration',
    ENTERPRISE_ANALYTICS: 'enterprise-analytics',
    PRIORITY_SUPPORT: 'priority-support',
    CUSTOM_INTEGRATIONS: 'custom-integrations',
    ADVANCED_SECURITY: 'advanced-security',
    COMPLIANCE_REPORTING: 'compliance-reporting'
};
//# sourceMappingURL=SecureLicenseManager.js.map