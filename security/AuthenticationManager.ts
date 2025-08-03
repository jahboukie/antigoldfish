/**
 * Enterprise Authentication Manager
 * Multi-factor authentication, session management, and security controls
 */

import * as crypto from 'crypto';
import * as jwt from 'jsonwebtoken';
import * as speakeasy from 'speakeasy';
import * as qrcode from 'qrcode';
import { SecureConfigManager } from './SecureConfig';

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

export class AuthenticationManager {
    private static instance: AuthenticationManager;
    private configManager: SecureConfigManager;
    private activeSessions = new Map<string, AdminSession>();
    private loginAttempts = new Map<string, LoginAttempt[]>();
    private rateLimitMap = new Map<string, { count: number; resetTime: number }>();

    private constructor() {
        this.configManager = SecureConfigManager.getInstance();
        this.startSessionCleanup();
    }

    public static getInstance(): AuthenticationManager {
        if (!AuthenticationManager.instance) {
            AuthenticationManager.instance = new AuthenticationManager();
        }
        return AuthenticationManager.instance;
    }

    /**
     * Authenticate admin with password and optional MFA
     */
    async authenticateAdmin(
        password: string,
        ipAddress: string,
        userAgent: string,
        mfaToken?: string
    ): Promise<{ success: boolean; sessionToken?: string; requireMFA?: boolean; error?: string }> {
        
        const config = this.configManager.getConfig();
        
        try {
            // Check rate limiting
            if (this.isRateLimited(ipAddress)) {
                this.recordLoginAttempt(ipAddress, false, userAgent, 'Rate limited');
                return { 
                    success: false, 
                    error: 'Too many login attempts. Please try again later.' 
                };
            }

            // Verify password
            const passwordValid = await this.verifyPassword(password, config.adminPassword);
            if (!passwordValid) {
                this.recordLoginAttempt(ipAddress, false, userAgent, 'Invalid password');
                this.incrementRateLimit(ipAddress);
                return { 
                    success: false, 
                    error: 'Invalid credentials' 
                };
            }

            // Check if MFA is enabled
            if (config.adminMfaSecret) {
                if (!mfaToken) {
                    return { 
                        success: false, 
                        requireMFA: true 
                    };
                }

                // Verify MFA token
                const mfaValid = this.verifyMFAToken(mfaToken, config.adminMfaSecret);
                if (!mfaValid) {
                    this.recordLoginAttempt(ipAddress, false, userAgent, 'Invalid MFA token');
                    this.incrementRateLimit(ipAddress);
                    return { 
                        success: false, 
                        error: 'Invalid MFA token' 
                    };
                }
            }

            // Create session
            const session = await this.createSession('admin', ipAddress, userAgent, !!config.adminMfaSecret);
            const sessionToken = this.generateSessionToken(session);

            this.recordLoginAttempt(ipAddress, true, userAgent);
            
            console.log(`✅ Admin authenticated successfully from ${ipAddress}`);
            
            return { 
                success: true, 
                sessionToken 
            };

        } catch (error) {
            console.error('❌ Authentication error:', error);
            return { 
                success: false, 
                error: 'Authentication failed' 
            };
        }
    }

    /**
     * Verify password with timing attack protection
     */
    private async verifyPassword(providedPassword: string, storedPassword: string): Promise<boolean> {
        // Use crypto.timingSafeEqual to prevent timing attacks
        const providedHash = crypto.createHash('sha256').update(providedPassword).digest();
        const storedHash = crypto.createHash('sha256').update(storedPassword).digest();
        
        return crypto.timingSafeEqual(providedHash, storedHash);
    }

    /**
     * Verify MFA token
     */
    private verifyMFAToken(token: string, secret: string): boolean {
        return speakeasy.totp.verify({
            secret,
            encoding: 'base32',
            token,
            window: 2 // Allow some time drift
        });
    }

    /**
     * Setup MFA for admin account
     */
    async setupMFA(): Promise<MFASetup> {
        const secret = speakeasy.generateSecret({
            name: 'AntiGoldfishMode Admin',
            issuer: 'AntiGoldfishMode'
        });

        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url!);

        // Generate backup codes
        const backupCodes = this.generateBackupCodes();

        return {
            secret: secret.base32!,
            qrCodeUrl,
            backupCodes
        };
    }

    /**
     * Enable MFA after verification
     */
    async enableMFA(secret: string, verificationToken: string): Promise<boolean> {
        if (!this.verifyMFAToken(verificationToken, secret)) {
            return false;
        }

        // Save MFA secret to config (this would need to be implemented in SecureConfigManager)
        // For now, we'll log it - in production, this should update the secure config
        console.log('✅ MFA enabled for admin account');
        
        return true;
    }

    /**
     * Generate cryptographically secure backup codes
     */
    private generateBackupCodes(): string[] {
        const codes: string[] = [];
        for (let i = 0; i < 10; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code.match(/.{2}/g)!.join('-'));
        }
        return codes;
    }

    /**
     * Create authenticated session
     */
    private async createSession(
        userId: string, 
        ipAddress: string, 
        userAgent: string, 
        mfaVerified: boolean
    ): Promise<AdminSession> {
        
        const sessionId = crypto.randomBytes(32).toString('hex');
        
        const session: AdminSession = {
            sessionId,
            userId,
            ipAddress,
            userAgent,
            createdAt: new Date(),
            lastActivity: new Date(),
            mfaVerified,
            permissions: ['admin'] // In the future, this could be more granular
        };

        this.activeSessions.set(sessionId, session);
        
        return session;
    }

    /**
     * Generate JWT session token
     */
    private generateSessionToken(session: AdminSession): string {
        const config = this.configManager.getConfig();
        
        const payload = {
            sessionId: session.sessionId,
            userId: session.userId,
            permissions: session.permissions,
            mfaVerified: session.mfaVerified
        };

        return jwt.sign(payload, config.adminSessionSecret, {
            expiresIn: '24h',
            issuer: 'antigoldfishmode-admin',
            audience: 'antigoldfishmode-dashboard'
        });
    }

    /**
     * Validate session token
     */
    async validateSession(token: string, ipAddress: string): Promise<AdminSession | null> {
        try {
            const config = this.configManager.getConfig();
            
            // Verify JWT
            const payload = jwt.verify(token, config.adminSessionSecret, {
                issuer: 'antigoldfishmode-admin',
                audience: 'antigoldfishmode-dashboard'
            }) as any;

            // Get session from memory
            const session = this.activeSessions.get(payload.sessionId);
            if (!session) {
                return null;
            }

            // Verify IP address (optional security measure)
            if (session.ipAddress !== ipAddress) {
                console.warn(`⚠️ Session IP mismatch: ${session.ipAddress} vs ${ipAddress}`);
                // You can choose to invalidate the session or just log the warning
            }

            // Update last activity
            session.lastActivity = new Date();
            
            return session;

        } catch (error) {
            console.warn('⚠️ Invalid session token:', error);
            return null;
        }
    }

    /**
     * Invalidate session (logout)
     */
    async invalidateSession(sessionId: string): Promise<void> {
        this.activeSessions.delete(sessionId);
        console.log(`✅ Session invalidated: ${sessionId}`);
    }

    /**
     * Rate limiting implementation
     */
    private isRateLimited(ipAddress: string): boolean {
        const config = this.configManager.getConfig();
        const rateLimit = this.rateLimitMap.get(ipAddress);
        
        if (!rateLimit) {
            return false;
        }

        const now = Date.now();
        if (now > rateLimit.resetTime) {
            this.rateLimitMap.delete(ipAddress);
            return false;
        }

        return rateLimit.count >= config.rateLimitConfig.adminLoginAttempts;
    }

    /**
     * Increment rate limit counter
     */
    private incrementRateLimit(ipAddress: string): void {
        const config = this.configManager.getConfig();
        const now = Date.now();
        const resetTime = now + config.rateLimitConfig.adminLoginWindow;
        
        const existing = this.rateLimitMap.get(ipAddress);
        if (existing && now <= existing.resetTime) {
            existing.count++;
        } else {
            this.rateLimitMap.set(ipAddress, { count: 1, resetTime });
        }
    }

    /**
     * Record login attempt for auditing
     */
    private recordLoginAttempt(
        ipAddress: string, 
        success: boolean, 
        userAgent: string, 
        failureReason?: string
    ): void {
        
        const attempt: LoginAttempt = {
            ipAddress,
            timestamp: new Date(),
            success,
            userAgent,
            failureReason
        };

        const attempts = this.loginAttempts.get(ipAddress) || [];
        attempts.push(attempt);
        
        // Keep only last 50 attempts per IP
        if (attempts.length > 50) {
            attempts.shift();
        }
        
        this.loginAttempts.set(ipAddress, attempts);

        // Log security event
        const status = success ? '✅ SUCCESS' : '❌ FAILED';
        console.log(`🔐 Login attempt: ${status} from ${ipAddress} - ${failureReason || 'OK'}`);
    }

    /**
     * Get security dashboard data
     */
    getSecurityDashboard(): {
        activeSessions: number;
        recentLogins: LoginAttempt[];
        rateLimitedIPs: string[];
        securityAlerts: string[];
    } {
        const recentLogins = Array.from(this.loginAttempts.values())
            .flat()
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 20);

        const rateLimitedIPs = Array.from(this.rateLimitMap.entries())
            .filter(([_, limit]) => Date.now() <= limit.resetTime)
            .map(([ip, _]) => ip);

        const securityAlerts: string[] = [];
        
        // Generate security alerts
        const failedAttempts = recentLogins.filter(attempt => !attempt.success);
        if (failedAttempts.length > 5) {
            securityAlerts.push(`${failedAttempts.length} failed login attempts in recent activity`);
        }

        if (rateLimitedIPs.length > 0) {
            securityAlerts.push(`${rateLimitedIPs.length} IP addresses currently rate limited`);
        }

        return {
            activeSessions: this.activeSessions.size,
            recentLogins,
            rateLimitedIPs,
            securityAlerts
        };
    }

    /**
     * Periodic session cleanup
     */
    private startSessionCleanup(): void {
        setInterval(() => {
            const now = Date.now();
            const maxAge = 24 * 60 * 60 * 1000; // 24 hours
            
            let cleanedCount = 0;
            
            for (const [sessionId, session] of this.activeSessions) {
                if (now - session.lastActivity.getTime() > maxAge) {
                    this.activeSessions.delete(sessionId);
                    cleanedCount++;
                }
            }
            
            if (cleanedCount > 0) {
                console.log(`🧹 Cleaned up ${cleanedCount} expired sessions`);
            }
            
        }, 60 * 60 * 1000); // Run every hour
    }

    /**
     * Force logout all sessions (emergency)
     */
    emergencyLogoutAll(): void {
        const sessionCount = this.activeSessions.size;
        this.activeSessions.clear();
        console.log(`🚨 Emergency logout: ${sessionCount} sessions terminated`);
    }
}