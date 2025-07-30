/**
 * AntiGoldfishMode License Service
 * Simple local license validation for CLI distribution
 * 
 * Note: License creation and delivery is automated via Stripe + Zapier workflow
 * This service only handles local license storage and validation
 */

import * as fs from 'fs-extra';
import * as path from 'path';
import { machineId } from 'node-machine-id';

export interface License {
    licenseKey: string;
    machineId: string;
    active: boolean;
    features: string[];
    activatedAt: string;
    validatedAt: number;
    gracePeriodDays: number;
    licenseType: 'trial' | 'early_adopter' | 'standard';
    expiresAt?: string; // For trial licenses
}

export interface LocalLicenseToken {
    validatedAt: number;
    gracePeriodDays: number;
    machineId: string;
    licenseKey: string;
    licenseType: string;
    expiresAt?: string;
}

export class LicenseService {
    private licenseTokenFile: string;
    private licenseFile: string;
    private currentLicense: License | null = null;
    private machineFingerprint: string | null = null;

    constructor(projectPath: string = process.cwd()) {
        this.licenseTokenFile = path.join(projectPath, '.antigoldfishmode', 'license-token.json');
        this.licenseFile = path.join(projectPath, '.antigoldfishmode', 'license.json');
        
        // Load license asynchronously
        this.loadCurrentLicense().catch(error => {
            console.warn('⚠️ Failed to load license on startup:', error instanceof Error ? error.message : 'Unknown error');
        });
    }

    /**
     * Activate license (simple local storage)
     * License validation happens via Stripe/Zapier backend
     */
    async activateLicense(licenseKey: string): Promise<License> {
        console.log('🔑 Activating AntiGoldfishMode license...');

        const machineFingerprint = await this.getMachineFingerprint();

        // Parse license key to determine type and features
        const licenseInfo = this.parseLicenseKey(licenseKey);

        const license: License = {
            licenseKey: licenseKey,
            machineId: machineFingerprint,
            active: true,
            features: licenseInfo.features,
            activatedAt: new Date().toISOString(),
            validatedAt: Date.now(),
            gracePeriodDays: 7, // 7 days offline grace period
            licenseType: licenseInfo.type,
            expiresAt: licenseInfo.expiresAt
        };

        // Save license locally
        await this.saveLicense(license);
        await this.saveLocalToken(license);
        this.currentLicense = license;

        console.log('✅ License activated and saved locally');
        return license;
    }

    /**
     * Parse license key to extract type and features
     * Format: AGM-{TYPE}-{HASH} (e.g., AGM-TRIAL-abc123, AGM-EARLY-def456, AGM-STD-ghi789)
     */
    private parseLicenseKey(licenseKey: string): {
        type: 'trial' | 'early_adopter' | 'standard';
        features: string[];
        expiresAt?: string;
    } {
        // Basic validation
        if (!licenseKey || !licenseKey.startsWith('AGM-')) {
            throw new Error('Invalid license key format');
        }

        const parts = licenseKey.split('-');
        if (parts.length < 3) {
            throw new Error('Invalid license key format');
        }

        const typeCode = parts[1];
        let type: 'trial' | 'early_adopter' | 'standard';
        let features: string[];
        let expiresAt: string | undefined;

        switch (typeCode) {
            case 'TRIAL':
                type = 'trial';
                features = ['unlimited-memory', 'conversation-recording'];
                // Trial expires in 7 days
                expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
                break;
            case 'EARLY':
                type = 'early_adopter';
                features = ['unlimited-memory', 'conversation-recording'];
                break;
            case 'STD':
                type = 'standard';
                features = ['unlimited-memory', 'conversation-recording'];
                break;
            default:
                throw new Error('Unknown license type');
        }

        return { type, features, expiresAt };
    }

    /**
     * Validate current license (local validation only)
     */
    async validateLicense(): Promise<boolean> {
        try {
            // Check if we have a local license
            if (!this.currentLicense) {
                await this.loadCurrentLicense();
            }

            if (!this.currentLicense) {
                console.log('❌ No license found locally');
                return false;
            }

            // Check if trial license has expired
            if (this.currentLicense.licenseType === 'trial' && this.currentLicense.expiresAt) {
                const expiryTime = new Date(this.currentLicense.expiresAt).getTime();
                if (Date.now() > expiryTime) {
                    console.log('❌ Trial license has expired');
                    return false;
                }
            }

            // Check grace period for offline validation
            const gracePeriodMs = this.currentLicense.gracePeriodDays * 24 * 60 * 60 * 1000;
            const isWithinGracePeriod = (Date.now() - this.currentLicense.validatedAt) < gracePeriodMs;

            if (isWithinGracePeriod) {
                console.log('✅ License valid (within grace period)');
                return true;
            }

            // For production: Here you would call your own API to validate the license
            // For now, we'll assume license is valid and update the validation timestamp
            this.currentLicense.validatedAt = Date.now();
            await this.saveLicense(this.currentLicense);
            await this.saveLocalToken(this.currentLicense);
            console.log('✅ License validated');
            return true;

        } catch (error) {
            console.warn('⚠️ License validation failed:', error instanceof Error ? error.message : 'Unknown error');
            
            // Fall back to grace period
            if (this.currentLicense) {
                const gracePeriodMs = this.currentLicense.gracePeriodDays * 24 * 60 * 60 * 1000;
                const isWithinGracePeriod = (Date.now() - this.currentLicense.validatedAt) < gracePeriodMs;
                
                if (isWithinGracePeriod) {
                    console.log('✅ License valid (offline grace period)');
                    return true;
                }
            }

            console.log('❌ License validation failed and grace period expired');
            return false;
        }
    }

    /**
     * Get current license status
     */
    async getCurrentLicense(): Promise<License | null> {
        if (!this.currentLicense) {
            await this.loadCurrentLicense();
        }
        return this.currentLicense;
    }

    /**
     * Check if a feature is available
     */
    async hasFeature(feature: string): Promise<boolean> {
        const isValid = await this.validateLicense();
        if (!isValid || !this.currentLicense) {
            return false;
        }
        return this.currentLicense.features.includes(feature);
    }

    /**
     * Deactivate current license (remove local files)
     */
    async deactivateLicense(): Promise<void> {
        if (!this.currentLicense) {
            throw new Error('No active license to deactivate');
        }

        // Remove local license files
        if (await fs.pathExists(this.licenseFile)) {
            await fs.remove(this.licenseFile);
        }
        if (await fs.pathExists(this.licenseTokenFile)) {
            await fs.remove(this.licenseTokenFile);
        }

        this.currentLicense = null;
        console.log('✅ License deactivated successfully');
    }

    /**
     * Generate machine fingerprint with fallback
     */
    private async getMachineFingerprint(): Promise<string> {
        if (this.machineFingerprint) {
            return this.machineFingerprint;
        }

        try {
            this.machineFingerprint = await machineId();
            return this.machineFingerprint;
        } catch (error) {
            console.warn('⚠️ Primary machine ID failed, using fallback method');
            
            // Fallback: create a fingerprint from available system info
            const crypto = require('crypto');
            const os = require('os');
            
            const fallbackData = {
                hostname: os.hostname(),
                platform: os.platform(),
                arch: os.arch(),
                cpus: os.cpus().length,
                totalMemory: os.totalmem(),
                userInfo: os.userInfo().username || 'unknown',
                projectPath: this.licenseFile
            };
            
            const fallbackString = JSON.stringify(fallbackData);
            const fingerprint = crypto.createHash('sha256').update(fallbackString).digest('hex');
            this.machineFingerprint = fingerprint;
            
            console.log(`✅ Generated fallback machine fingerprint: ${fingerprint.substring(0, 16)}...`);
            return fingerprint;
        }
    }

    /**
     * Load license from local file
     */
    private async loadCurrentLicense(): Promise<void> {
        try {
            if (await fs.pathExists(this.licenseFile)) {
                const licenseData = await fs.readJson(this.licenseFile);
                this.currentLicense = licenseData;
            }
        } catch (error) {
            console.warn('⚠️ Failed to load license:', error instanceof Error ? error.message : 'Unknown error');
        }
    }

    /**
     * Save license to local file
     */
    private async saveLicense(license: License): Promise<void> {
        try {
            await fs.ensureDir(path.dirname(this.licenseFile));
            await fs.writeJson(this.licenseFile, license, { spaces: 2 });
        } catch (error) {
            throw new Error(`Failed to save license: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Save local validation token
     */
    private async saveLocalToken(license: License): Promise<void> {
        try {
            const token: LocalLicenseToken = {
                validatedAt: license.validatedAt,
                gracePeriodDays: license.gracePeriodDays,
                machineId: license.machineId,
                licenseKey: license.licenseKey,
                licenseType: license.licenseType,
                expiresAt: license.expiresAt
            };

            await fs.ensureDir(path.dirname(this.licenseTokenFile));
            await fs.writeJson(this.licenseTokenFile, token, { spaces: 2 });
        } catch (error) {
            throw new Error(`Failed to save license token: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }

    /**
     * Create development license for testing
     */
    async createDevelopmentLicense(): Promise<License> {
        const machineFingerprint = await this.getMachineFingerprint();

        const devLicense: License = {
            licenseKey: 'AGM-DEV-' + Date.now(),
            machineId: machineFingerprint,
            active: true,
            features: ['unlimited-memory', 'conversation-recording', 'development-mode'],
            activatedAt: new Date().toISOString(),
            validatedAt: Date.now(),
            gracePeriodDays: 365,
            licenseType: 'standard'
        };

        await this.saveLicense(devLicense);
        await this.saveLocalToken(devLicense);
        this.currentLicense = devLicense;

        console.log('🧪 Development license created with 365-day grace period');
        return devLicense;
    }
}