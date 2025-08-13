/**
 * Deprecated: Licensing system removed in v1.6+. This stub remains to avoid breaking legacy imports.
 * AGM is free, local-only, and zero‑egress by default.
 */

export interface License {
  licenseKey: string;
  machineId: string;
  active: boolean;
  features: string[];
  activatedAt: string;
  validatedAt: number;
  gracePeriodDays: number;
  licenseType: 'trial' | 'early_adopter' | 'standard' | 'deprecated';
  expiresAt?: string;
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
  // ...existing code...
  private currentLicense: License | null = null;
  constructor(projectPath: string = process.cwd()) {
    // no-op: licensing removed
  }
  async activateLicense(_licenseKey: string): Promise<License> {
    throw new Error('Licensing has been removed. AGM is free and local-only.');
  }
  async validateLicense(): Promise<boolean> {
    // always return true to avoid gating any feature paths in legacy callers
    return true;
  }
  async getCurrentLicense(): Promise<License | null> {
    return this.currentLicense;
  }
  async hasFeature(_feature: string): Promise<boolean> {
    return true;
  }
  async deactivateLicense(): Promise<void> {
    this.currentLicense = null;
  }
  async createDevelopmentLicense(): Promise<License> {
    throw new Error('Development license stubs are removed. Not required.');
  }
}