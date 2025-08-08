/**
 * Security Hardening Demo
 * Showcase enterprise-grade security features vs ByteRover
 */
export declare class SecurityDemo {
    private configManager;
    private authManager;
    private licenseManager;
    private auditLogger;
    constructor();
    /**
     * Demonstrate complete security hardening
     */
    demonstrateSecurityHardening(): Promise<void>;
    /**
     * Demo 1: Configuration Security
     */
    private demoConfigurationSecurity;
    /**
     * Demo 2: Authentication & MFA
     */
    private demoAuthentication;
    /**
     * Demo 3: License Security
     */
    private demoLicenseSecurity;
    /**
     * Demo 4: Audit Logging
     */
    private demoAuditLogging;
    /**
     * Demo 5: Security Dashboard
     */
    private demoSecurityDashboard;
    /**
     * Compare with ByteRover security
     */
    compareWithByteRover(): void;
}
declare function runSecurityDemo(): Promise<void>;
export { runSecurityDemo };
