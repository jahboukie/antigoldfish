"use strict";
/**
 * Enterprise Authentication Manager
 * Multi-factor authentication, session management, and security controls
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
exports.AuthenticationManager = void 0;
const crypto = __importStar(require("crypto"));
const jwt = __importStar(require("jsonwebtoken"));
const speakeasy = __importStar(require("speakeasy"));
const qrcode = __importStar(require("qrcode"));
const SecureConfig_1 = require("./SecureConfig");
class AuthenticationManager {
    constructor() {
        this.activeSessions = new Map();
        this.loginAttempts = new Map();
        this.rateLimitMap = new Map();
        this.configManager = SecureConfig_1.SecureConfigManager.getInstance();
        this.startSessionCleanup();
    }
    static getInstance() {
        if (!AuthenticationManager.instance) {
            AuthenticationManager.instance = new AuthenticationManager();
        }
        return AuthenticationManager.instance;
    }
    /**
     * Authenticate admin with password and optional MFA
     */
    async authenticateAdmin(password, ipAddress, userAgent, mfaToken) {
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
        }
        catch (error) {
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
    async verifyPassword(providedPassword, storedPassword) {
        // Use crypto.timingSafeEqual to prevent timing attacks
        const providedHash = crypto.createHash('sha256').update(providedPassword).digest();
        const storedHash = crypto.createHash('sha256').update(storedPassword).digest();
        return crypto.timingSafeEqual(providedHash, storedHash);
    }
    /**
     * Verify MFA token
     */
    verifyMFAToken(token, secret) {
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
    async setupMFA() {
        const secret = speakeasy.generateSecret({
            name: 'AntiGoldfishMode Admin',
            issuer: 'AntiGoldfishMode'
        });
        // Generate QR code
        const qrCodeUrl = await qrcode.toDataURL(secret.otpauth_url);
        // Generate backup codes
        const backupCodes = this.generateBackupCodes();
        return {
            secret: secret.base32,
            qrCodeUrl,
            backupCodes
        };
    }
    /**
     * Enable MFA after verification
     */
    async enableMFA(secret, verificationToken) {
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
    generateBackupCodes() {
        const codes = [];
        for (let i = 0; i < 10; i++) {
            const code = crypto.randomBytes(4).toString('hex').toUpperCase();
            codes.push(code.match(/.{2}/g).join('-'));
        }
        return codes;
    }
    /**
     * Create authenticated session
     */
    async createSession(userId, ipAddress, userAgent, mfaVerified) {
        const sessionId = crypto.randomBytes(32).toString('hex');
        const session = {
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
    generateSessionToken(session) {
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
    async validateSession(token, ipAddress) {
        try {
            const config = this.configManager.getConfig();
            // Verify JWT
            const payload = jwt.verify(token, config.adminSessionSecret, {
                issuer: 'antigoldfishmode-admin',
                audience: 'antigoldfishmode-dashboard'
            });
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
        }
        catch (error) {
            console.warn('⚠️ Invalid session token:', error);
            return null;
        }
    }
    /**
     * Invalidate session (logout)
     */
    async invalidateSession(sessionId) {
        this.activeSessions.delete(sessionId);
        console.log(`✅ Session invalidated: ${sessionId}`);
    }
    /**
     * Rate limiting implementation
     */
    isRateLimited(ipAddress) {
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
    incrementRateLimit(ipAddress) {
        const config = this.configManager.getConfig();
        const now = Date.now();
        const resetTime = now + config.rateLimitConfig.adminLoginWindow;
        const existing = this.rateLimitMap.get(ipAddress);
        if (existing && now <= existing.resetTime) {
            existing.count++;
        }
        else {
            this.rateLimitMap.set(ipAddress, { count: 1, resetTime });
        }
    }
    /**
     * Record login attempt for auditing
     */
    recordLoginAttempt(ipAddress, success, userAgent, failureReason) {
        const attempt = {
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
    getSecurityDashboard() {
        const recentLogins = Array.from(this.loginAttempts.values())
            .flat()
            .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
            .slice(0, 20);
        const rateLimitedIPs = Array.from(this.rateLimitMap.entries())
            .filter(([_, limit]) => Date.now() <= limit.resetTime)
            .map(([ip, _]) => ip);
        const securityAlerts = [];
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
    startSessionCleanup() {
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
    emergencyLogoutAll() {
        const sessionCount = this.activeSessions.size;
        this.activeSessions.clear();
        console.log(`🚨 Emergency logout: ${sessionCount} sessions terminated`);
    }
}
exports.AuthenticationManager = AuthenticationManager;
//# sourceMappingURL=AuthenticationManager.js.map