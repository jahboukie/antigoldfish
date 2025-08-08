/**
 * Enterprise Audit Logging System
 * Comprehensive security event logging with encryption and compliance features
 */
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
export declare enum AuditEventType {
    AUTHENTICATION = "authentication",
    AUTHORIZATION = "authorization",
    LICENSE_OPERATION = "license_operation",
    ADMIN_ACTION = "admin_action",
    SECURITY_EVENT = "security_event",
    DATA_ACCESS = "data_access",
    CONFIGURATION_CHANGE = "configuration_change",
    SYSTEM_EVENT = "system_event"
}
export interface EncryptedAuditLog {
    encrypted: string;
    iv: string;
    authTag: string;
    timestamp: string;
    checksum: string;
}
export declare class AuditLogger {
    private static instance;
    private configManager;
    private logBuffer;
    private logPath;
    private encryptionKey;
    private constructor();
    static getInstance(): AuditLogger;
    /**
     * Log security event
     */
    logEvent(eventType: AuditEventType, action: string, outcome: 'success' | 'failure' | 'warning', details: Record<string, any>, options?: {
        severity?: 'low' | 'medium' | 'high' | 'critical';
        userId?: string;
        sessionId?: string;
        ipAddress?: string;
        userAgent?: string;
        resource?: string;
        metadata?: Record<string, any>;
    }): Promise<void>;
    /**
     * Authentication events
     */
    logAuthentication(action: 'login_attempt' | 'login_success' | 'login_failure' | 'logout' | 'session_expired', outcome: 'success' | 'failure', details: Record<string, any>, ipAddress?: string, userAgent?: string): Promise<void>;
    /**
     * License operation events
     */
    logLicenseOperation(action: 'generate' | 'validate' | 'revoke' | 'renew', licenseKey: string, customerEmail: string, outcome: 'success' | 'failure', details?: Record<string, any>): Promise<void>;
    /**
     * Admin action events
     */
    logAdminAction(action: string, outcome: 'success' | 'failure' | 'warning', details: Record<string, any>, userId?: string, sessionId?: string): Promise<void>;
    /**
     * Security events (rate limiting, suspicious activity, etc.)
     */
    logSecurityEvent(action: string, severity: 'low' | 'medium' | 'high' | 'critical', details: Record<string, any>, ipAddress?: string): Promise<void>;
    /**
     * Configuration change events
     */
    logConfigurationChange(action: string, changes: Record<string, any>, userId?: string): Promise<void>;
    /**
     * Determine event severity automatically
     */
    private determineSeverity;
    /**
     * Sanitize sensitive data in details
     */
    private sanitizeDetails;
    /**
     * Mask license key for logging
     */
    private maskLicenseKey;
    /**
     * Mask email for logging
     */
    private maskEmail;
    /**
     * Sanitize configuration changes
     */
    private sanitizeConfigChanges;
    /**
     * Console logging for development
     */
    private logToConsole;
    /**
     * Derive encryption key for audit logs
     */
    private deriveEncryptionKey;
    /**
     * Ensure log directory exists
     */
    private ensureLogDirectory;
    /**
     * Encrypt audit log entry
     */
    private encryptLogEntry;
    /**
     * Flush log buffer to disk
     */
    private flushBuffer;
    /**
     * Start periodic log flushing
     */
    private startPeriodicFlush;
    /**
     * Get audit statistics for dashboard
     */
    getAuditStatistics(): {
        totalEvents: number;
        eventsByType: Record<string, number>;
        eventsBySeverity: Record<string, number>;
        recentCriticalEvents: number;
        logFileSize: number;
    };
    /**
     * Search audit logs (simplified version)
     */
    searchLogs(query: {
        eventType?: AuditEventType;
        severity?: string;
        outcome?: string;
        startDate?: Date;
        endDate?: Date;
        ipAddress?: string;
        userId?: string;
    }, limit?: number): Promise<AuditEvent[]>;
    /**
     * Generate compliance report
     */
    generateComplianceReport(startDate: Date, endDate: Date, format?: 'json' | 'csv'): Promise<string>;
}
