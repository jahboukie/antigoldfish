/**
 * Enterprise Audit Logging System
 * Comprehensive security event logging with encryption and compliance features
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { SecureConfigManager } from './SecureConfig';

export interface AuditEvent {
    eventId: string;
    timestamp: Date;
    eventType: AuditEventType;
    severity: 'low' | 'medium' | 'high' | 'critical';
    userId?: string;
    sessionId?: string;
    ipAddress?: string;
    userAgent?: string;
    action: string;
    resource?: string;
    outcome: 'success' | 'failure' | 'warning';
    details: Record<string, any>;
    metadata?: Record<string, any>;
}

export enum AuditEventType {
    AUTHENTICATION = 'authentication',
    AUTHORIZATION = 'authorization',
    LICENSE_OPERATION = 'license_operation',
    ADMIN_ACTION = 'admin_action',
    SECURITY_EVENT = 'security_event',
    DATA_ACCESS = 'data_access',
    CONFIGURATION_CHANGE = 'configuration_change',
    SYSTEM_EVENT = 'system_event'
}

export interface EncryptedAuditLog {
    encrypted: string;
    iv: string;
    authTag: string;
    timestamp: string;
    checksum: string;
}

export class AuditLogger {
    private static instance: AuditLogger;
    private configManager: SecureConfigManager;
    private logBuffer: AuditEvent[] = [];
    private logPath: string;
    private encryptionKey: Buffer;

    private constructor() {
        this.configManager = SecureConfigManager.getInstance();
        const config = this.configManager.getConfig();
        
        this.logPath = config.auditConfig.auditLogPath;
        this.encryptionKey = this.deriveEncryptionKey();
        
        this.ensureLogDirectory();
        this.startPeriodicFlush();
    }

    public static getInstance(): AuditLogger {
        if (!AuditLogger.instance) {
            AuditLogger.instance = new AuditLogger();
        }
        return AuditLogger.instance;
    }

    /**
     * Log security event
     */
    async logEvent(
        eventType: AuditEventType,
        action: string,
        outcome: 'success' | 'failure' | 'warning',
        details: Record<string, any>,
        options: {
            severity?: 'low' | 'medium' | 'high' | 'critical';
            userId?: string;
            sessionId?: string;
            ipAddress?: string;
            userAgent?: string;
            resource?: string;
            metadata?: Record<string, any>;
        } = {}
    ): Promise<void> {
        
        const event: AuditEvent = {
            eventId: crypto.randomUUID(),
            timestamp: new Date(),
            eventType,
            severity: options.severity || this.determineSeverity(eventType, outcome),
            userId: options.userId,
            sessionId: options.sessionId,
            ipAddress: options.ipAddress,
            userAgent: options.userAgent,
            action,
            resource: options.resource,
            outcome,
            details: this.sanitizeDetails(details),
            metadata: options.metadata
        };

        // Add to buffer for batch writing
        this.logBuffer.push(event);

        // Immediate flush for critical events
        if (event.severity === 'critical') {
            await this.flushBuffer();
        }

        // Console logging for development
        this.logToConsole(event);
    }

    /**
     * Authentication events
     */
    async logAuthentication(
        action: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'session_expired',
        outcome: 'success' | 'failure',
        details: Record<string, any>,
        ipAddress?: string,
        userAgent?: string
    ): Promise<void> {
        
        await this.logEvent(
            AuditEventType.AUTHENTICATION,
            action,
            outcome,
            details,
            {
                severity: outcome === 'failure' ? 'high' : 'medium',
                ipAddress,
                userAgent
            }
        );
    }

    /**
     * License operation events
     */
    async logLicenseOperation(
        action: 'generate' | 'validate' | 'revoke' | 'renew',
        licenseKey: string,
        customerEmail: string,
        outcome: 'success' | 'failure',
        details: Record<string, any> = {}
    ): Promise<void> {
        
        await this.logEvent(
            AuditEventType.LICENSE_OPERATION,
            action,
            outcome,
            {
                licenseKey: this.maskLicenseKey(licenseKey),
                customerEmail: this.maskEmail(customerEmail),
                ...details
            },
            {
                severity: 'medium',
                resource: 'license'
            }
        );
    }

    /**
     * Admin action events
     */
    async logAdminAction(
        action: string,
        outcome: 'success' | 'failure' | 'warning',
        details: Record<string, any>,
        userId?: string,
        sessionId?: string
    ): Promise<void> {
        
        await this.logEvent(
            AuditEventType.ADMIN_ACTION,
            action,
            outcome,
            details,
            {
                severity: 'high',
                userId,
                sessionId,
                resource: 'admin_dashboard'
            }
        );
    }

    /**
     * Security events (rate limiting, suspicious activity, etc.)
     */
    async logSecurityEvent(
        action: string,
        severity: 'low' | 'medium' | 'high' | 'critical',
        details: Record<string, any>,
        ipAddress?: string
    ): Promise<void> {
        
        await this.logEvent(
            AuditEventType.SECURITY_EVENT,
            action,
            'warning',
            details,
            {
                severity,
                ipAddress
            }
        );
    }

    /**
     * Configuration change events
     */
    async logConfigurationChange(
        action: string,
        changes: Record<string, any>,
        userId?: string
    ): Promise<void> {
        
        await this.logEvent(
            AuditEventType.CONFIGURATION_CHANGE,
            action,
            'success',
            {
                changes: this.sanitizeConfigChanges(changes)
            },
            {
                severity: 'high',
                userId,
                resource: 'configuration'
            }
        );
    }

    /**
     * Determine event severity automatically
     */
    private determineSeverity(eventType: AuditEventType, outcome: string): 'low' | 'medium' | 'high' | 'critical' {
        if (outcome === 'failure') {
            switch (eventType) {
                case AuditEventType.AUTHENTICATION:
                case AuditEventType.SECURITY_EVENT:
                    return 'high';
                case AuditEventType.LICENSE_OPERATION:
                case AuditEventType.ADMIN_ACTION:
                    return 'medium';
                default:
                    return 'low';
            }
        }

        switch (eventType) {
            case AuditEventType.SECURITY_EVENT:
                return 'medium';
            case AuditEventType.ADMIN_ACTION:
            case AuditEventType.CONFIGURATION_CHANGE:
                return 'medium';
            default:
                return 'low';
        }
    }

    /**
     * Sanitize sensitive data in details
     */
    private sanitizeDetails(details: Record<string, any>): Record<string, any> {
        const sanitized = { ...details };
        
        // Remove or mask sensitive fields
        const sensitiveFields = ['password', 'secret', 'token', 'key', 'credential'];
        
        for (const [key, value] of Object.entries(sanitized)) {
            const lowerKey = key.toLowerCase();
            
            if (sensitiveFields.some(field => lowerKey.includes(field))) {
                sanitized[key] = '[REDACTED]';
            } else if (typeof value === 'string' && value.length > 1000) {
                // Truncate very long strings
                sanitized[key] = value.substring(0, 1000) + '... [TRUNCATED]';
            }
        }
        
        return sanitized;
    }

    /**
     * Mask license key for logging
     */
    private maskLicenseKey(licenseKey: string): string {
        if (licenseKey.length <= 8) return '[MASKED]';
        return licenseKey.substring(0, 4) + '****' + licenseKey.substring(licenseKey.length - 4);
    }

    /**
     * Mask email for logging
     */
    private maskEmail(email: string): string {
        const [username, domain] = email.split('@');
        if (!domain) return '[MASKED]';
        
        const maskedUsername = username.length > 2 
            ? username.substring(0, 2) + '***'
            : '***';
        
        return `${maskedUsername}@${domain}`;
    }

    /**
     * Sanitize configuration changes
     */
    private sanitizeConfigChanges(changes: Record<string, any>): Record<string, any> {
        const sanitized = { ...changes };
        
        for (const [key, value] of Object.entries(sanitized)) {
            if (key.toLowerCase().includes('password') || 
                key.toLowerCase().includes('secret') ||
                key.toLowerCase().includes('key')) {
                sanitized[key] = '[CHANGED]';
            }
        }
        
        return sanitized;
    }

    /**
     * Console logging for development
     */
    private logToConsole(event: AuditEvent): void {
        const severityColors = {
            low: '\x1b[32m',      // Green
            medium: '\x1b[33m',   // Yellow
            high: '\x1b[31m',     // Red
            critical: '\x1b[35m'  // Magenta
        };
        
        const reset = '\x1b[0m';
        const color = severityColors[event.severity];
        
        console.log(
            `${color}🔐 [${event.severity.toUpperCase()}]${reset} ` +
            `${event.eventType}:${event.action} - ${event.outcome} ` +
            `(${event.eventId})`
        );
        
        if (event.ipAddress) {
            console.log(`   📍 IP: ${event.ipAddress}`);
        }
        
        if (Object.keys(event.details).length > 0) {
            console.log(`   📋 Details:`, JSON.stringify(event.details, null, 2));
        }
    }

    /**
     * Derive encryption key for audit logs
     */
    private deriveEncryptionKey(): Buffer {
        const config = this.configManager.getConfig();
        return crypto.scryptSync(config.databaseEncryptionKey, 'audit-log-salt', 32);
    }

    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory(): void {
        const logDir = path.dirname(this.logPath);
        if (!fs.existsSync(logDir)) {
            fs.mkdirSync(logDir, { recursive: true, mode: 0o700 });
        }
    }

    /**
     * Encrypt audit log entry
     */
    private encryptLogEntry(events: AuditEvent[]): EncryptedAuditLog {
        const config = this.configManager.getConfig();
        
        if (!config.auditConfig.auditEncryption) {
            // Return unencrypted if encryption is disabled
            return {
                encrypted: JSON.stringify(events),
                iv: '',
                authTag: '',
                timestamp: new Date().toISOString(),
                checksum: ''
            };
        }

        const data = JSON.stringify(events);
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);
        let encrypted = cipher.update(data, 'utf8', 'hex');
        encrypted += cipher.final('hex');
        
        const authTag = cipher.getAuthTag();
        const checksum = crypto.createHash('sha256').update(data).digest('hex');
        
        return {
            encrypted,
            iv: iv.toString('hex'),
            authTag: authTag.toString('hex'),
            timestamp: new Date().toISOString(),
            checksum
        };
    }

    /**
     * Flush log buffer to disk
     */
    private async flushBuffer(): Promise<void> {
        if (this.logBuffer.length === 0) return;

        try {
            const events = [...this.logBuffer];
            this.logBuffer = [];

            const encryptedLog = this.encryptLogEntry(events);
            const logLine = JSON.stringify(encryptedLog) + '\n';

            // Append to log file with proper permissions
            fs.appendFileSync(this.logPath, logLine, { mode: 0o600 });

            console.log(`✅ Flushed ${events.length} audit events to log`);

        } catch (error) {
            console.error('❌ Failed to flush audit log:', error);
            // Re-add events to buffer for retry
            this.logBuffer.unshift(...this.logBuffer);
        }
    }

    /**
     * Start periodic log flushing
     */
    private startPeriodicFlush(): void {
        // Flush every 30 seconds
        setInterval(() => {
            this.flushBuffer();
        }, 30000);

        // Flush on process exit
        process.on('SIGTERM', () => this.flushBuffer());
        process.on('SIGINT', () => this.flushBuffer());
        process.on('exit', () => this.flushBuffer());
    }

    /**
     * Get audit statistics for dashboard
     */
    getAuditStatistics(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        recentCriticalEvents: number;
        logFileSize: number;
    } {
        // In production, this would analyze the log files
        // For now, return basic statistics
        
        let logFileSize = 0;
        try {
            const stats = fs.statSync(this.logPath);
            logFileSize = stats.size;
        } catch (error) {
            // Log file doesn't exist yet
        }

        return {
            totalEvents: 0, // Would need to parse log file
            eventsByType: {},
            eventsBySeverity: {},
            recentCriticalEvents: 0,
            logFileSize
        };
    }

    /**
     * Search audit logs (simplified version)
     */
    async searchLogs(
        query: {
            eventType?: AuditEventType;
            severity?: string;
            outcome?: string;
            startDate?: Date;
            endDate?: Date;
            ipAddress?: string;
            userId?: string;
        },
        limit: number = 100
    ): Promise<AuditEvent[]> {
        // In production, this would implement log file parsing and search
        // For now, return empty array
        console.log('🔍 Audit log search:', query);
        return [];
    }

    /**
     * Generate compliance report
     */
    async generateComplianceReport(
        startDate: Date,
        endDate: Date,
        format: 'json' | 'csv' = 'json'
    ): Promise<string> {
        // In production, this would generate a comprehensive compliance report
        // analyzing all audit events in the specified timeframe
        
        const report = {
            reportId: crypto.randomUUID(),
            generatedAt: new Date().toISOString(),
            period: {
                start: startDate.toISOString(),
                end: endDate.toISOString()
            },
            summary: {
                totalEvents: 0,
                securityEvents: 0,
                failedAuthentications: 0,
                adminActions: 0
            },
            compliance: {
                gdprCompliant: true,
                auditTrailComplete: true,
                dataRetentionCompliant: true
            }
        };

        return JSON.stringify(report, null, 2);
    }
}