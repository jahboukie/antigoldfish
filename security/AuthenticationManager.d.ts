/**
 * Enterprise Authentication Manager
 * Multi-factor authentication, session management, and security controls
 */
export interface AdminSession {
    sessionId: string;
    userId: string;
    ipAddress: string;
    userAgent: string;
    createdAt: Date;
    lastActivity: Date;
    mfaVerified: boolean;
    permissions: string[];
}
export interface LoginAttempt {
    ipAddress: string;
    timestamp: Date;
    success: boolean;
    userAgent: string;
    failureReason?: string;
}
export interface MFASetup {
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
}
export declare class AuthenticationManager {
    private static instance;
    private configManager;
    private activeSessions;
    private loginAttempts;
    private rateLimitMap;
    private constructor();
    static getInstance(): AuthenticationManager;
    /**
     * Authenticate admin with password and optional MFA
     */
    authenticateAdmin(password: string, ipAddress: string, userAgent: string, mfaToken?: string): Promise<{
        success: boolean;
        sessionToken?: string;
        requireMFA?: boolean;
        error?: string;
    }>;
    /**
     * Verify password with timing attack protection
     */
    private verifyPassword;
    /**
     * Verify MFA token
     */
    private verifyMFAToken;
    /**
     * Setup MFA for admin account
     */
    setupMFA(): Promise<MFASetup>;
    /**
     * Enable MFA after verification
     */
    enableMFA(secret: string, verificationToken: string): Promise<boolean>;
    /**
     * Generate cryptographically secure backup codes
     */
    private generateBackupCodes;
    /**
     * Create authenticated session
     */
    private createSession;
    /**
     * Generate JWT session token
     */
    private generateSessionToken;
    /**
     * Validate session token
     */
    validateSession(token: string, ipAddress: string): Promise<AdminSession | null>;
    /**
     * Invalidate session (logout)
     */
    invalidateSession(sessionId: string): Promise<void>;
    /**
     * Rate limiting implementation
     */
    private isRateLimited;
    /**
     * Increment rate limit counter
     */
    private incrementRateLimit;
    /**
     * Record login attempt for auditing
     */
    private recordLoginAttempt;
    /**
     * Get security dashboard data
     */
    getSecurityDashboard(): {
        activeSessions: number;
        recentLogins: LoginAttempt[];
        rateLimitedIPs: string[];
        securityAlerts: string[];
    };
    /**
     * Periodic session cleanup
     */
    private startSessionCleanup;
    /**
     * Force logout all sessions (emergency)
     */
    emergencyLogoutAll(): void;
}
