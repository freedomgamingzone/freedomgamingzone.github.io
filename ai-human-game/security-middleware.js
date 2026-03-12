/**
 * Security Middleware for AI Human Game
 * Add these security layers to server.js
 */

// Configuration
const SECURITY_CONFIG = {
    MAX_CONNECTIONS_PER_IP: 10,
    MAX_MESSAGE_SIZE: 10 * 1024, // 10KB
    MAX_MESSAGES_PER_MINUTE: 60,
    CONNECTION_TIMEOUT: 5 * 60 * 1000, // 5 minutes idle
    BLACKLIST_THRESHOLD: 5, // Reports before auto-ban
};

// Store connection tracking
const connectionsByIP = new Map(); // IP -> count
const messageRateByConnection = new Map(); // ws -> {count, resetTime}
const ipBlacklist = new Set(); // Banned IPs
const abuseReports = new Map(); // IP -> reports count

/**
 * 1. Check IP Blacklist
 */
function isIPBlacklisted(ip) {
    return ipBlacklist.has(ip);
}

function addToBlacklist(ip, reason) {
    ipBlacklist.add(ip);
    console.log(`[SECURITY] 🚫 IP blacklisted: ${ip} - Reason: ${reason}`);
    
    // Optional: Save to file
    const fs = require('fs');
    fs.appendFileSync('blacklist.log', `${new Date().toISOString()} - ${ip} - ${reason}\n`);
}

/**
 * 2. Connection Limit per IP
 */
function checkConnectionLimit(req) {
    const ip = getClientIP(req);
    
    // Check blacklist first
    if (isIPBlacklisted(ip)) {
        console.log(`[SECURITY] ⛔ Blocked blacklisted IP: ${ip}`);
        return false;
    }
    
    const currentConnections = connectionsByIP.get(ip) || 0;
    
    if (currentConnections >= SECURITY_CONFIG.MAX_CONNECTIONS_PER_IP) {
        console.log(`[SECURITY] ⚠️  IP ${ip} exceeded connection limit: ${currentConnections}`);
        
        // Auto-blacklist if too many attempts
        if (currentConnections > SECURITY_CONFIG.MAX_CONNECTIONS_PER_IP * 2) {
            addToBlacklist(ip, 'Too many connection attempts');
        }
        
        return false;
    }
    
    connectionsByIP.set(ip, currentConnections + 1);
    return true;
}

function decrementConnectionCount(ip) {
    const current = connectionsByIP.get(ip) || 0;
    if (current > 0) {
        connectionsByIP.set(ip, current - 1);
    }
}

/**
 * 3. Rate Limiting per Connection
 */
function checkMessageRate(ws) {
    const now = Date.now();
    const rateData = messageRateByConnection.get(ws);
    
    if (!rateData || now > rateData.resetTime) {
        // New minute window
        messageRateByConnection.set(ws, {
            count: 1,
            resetTime: now + 60000 // 1 minute
        });
        return true;
    }
    
    if (rateData.count >= SECURITY_CONFIG.MAX_MESSAGES_PER_MINUTE) {
        console.log(`[SECURITY] ⚠️  Rate limit exceeded for connection`);
        return false;
    }
    
    rateData.count++;
    return true;
}

/**
 * 4. Message Validation
 */
function validateMessage(message) {
    // Check size
    const size = Buffer.byteLength(message.toString(), 'utf8');
    if (size > SECURITY_CONFIG.MAX_MESSAGE_SIZE) {
        console.log(`[SECURITY] ⚠️  Message too large: ${size} bytes`);
        return { valid: false, error: 'Message too large' };
    }
    
    // Check if valid UTF-8
    try {
        const str = message.toString('utf8');
        
        // Check for null bytes (potential injection)
        if (str.includes('\0')) {
            return { valid: false, error: 'Invalid characters' };
        }
        
        // Try parse JSON if looks like JSON
        if (str.trim().startsWith('{')) {
            JSON.parse(str);
        }
        
        return { valid: true, data: str };
    } catch (e) {
        return { valid: false, error: 'Invalid message format' };
    }
}

/**
 * 5. Abuse Report Handler
 */
function handleAbuseReport(reporterIP, targetIP, reason) {
    const reports = abuseReports.get(targetIP) || 0;
    abuseReports.set(targetIP, reports + 1);
    
    console.log(`[SECURITY] 📢 Abuse report: ${targetIP} (${reports + 1} reports) - ${reason}`);
    
    // Auto-blacklist after threshold
    if (reports + 1 >= SECURITY_CONFIG.BLACKLIST_THRESHOLD) {
        addToBlacklist(targetIP, `${reports + 1} abuse reports`);
        return true; // Banned
    }
    
    // Optional: Save to database
    saveReportToLog(reporterIP, targetIP, reason);
    
    return false;
}

function saveReportToLog(reporterIP, targetIP, reason) {
    const fs = require('fs');
    const logEntry = {
        timestamp: new Date().toISOString(),
        reporter: reporterIP,
        target: targetIP,
        reason: reason
    };
    
    fs.appendFileSync('reports.log', JSON.stringify(logEntry) + '\n');
}

/**
 * 6. Get Client IP
 */
function getClientIP(req) {
    // Check X-Forwarded-For (if behind proxy/Cloudflare)
    const forwarded = req.headers['x-forwarded-for'];
    if (forwarded) {
        return forwarded.split(',')[0].trim();
    }
    
    // Check X-Real-IP
    if (req.headers['x-real-ip']) {
        return req.headers['x-real-ip'];
    }
    
    // Direct connection
    return req.socket.remoteAddress || 'unknown';
}

/**
 * 7. Connection Timeout (Idle connections)
 */
function setupConnectionTimeout(ws) {
    let lastActivity = Date.now();
    
    // Update activity on any message
    const originalOn = ws.on.bind(ws);
    ws.on = function(event, handler) {
        if (event === 'message') {
            return originalOn(event, function(data) {
                lastActivity = Date.now();
                handler(data);
            });
        }
        return originalOn(event, handler);
    };
    
    // Check for idle timeout
    const timeoutCheck = setInterval(() => {
        if (Date.now() - lastActivity > SECURITY_CONFIG.CONNECTION_TIMEOUT) {
            console.log(`[SECURITY] ⏱️  Connection timeout (idle)`);
            ws.close(1000, 'Timeout due to inactivity');
            clearInterval(timeoutCheck);
        }
    }, 60000); // Check every minute
    
    ws.on('close', () => clearInterval(timeoutCheck));
}

/**
 * 8. Sanitize Input (XSS Protection)
 */
function sanitizeInput(text) {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
}

/**
 * 9. Content Filter (Enhanced)
 */
const FORBIDDEN_PATTERNS = [
    /script/gi,
    /javascript:/gi,
    /onerror/gi,
    /onclick/gi,
    /onload/gi,
    /<iframe/gi,
    /eval\(/gi,
    /expression\(/gi,
];

function containsForbiddenContent(text) {
    return FORBIDDEN_PATTERNS.some(pattern => pattern.test(text));
}

/**
 * 10. Security Stats
 */
function getSecurityStats() {
    return {
        activeConnections: Array.from(connectionsByIP.values()).reduce((a, b) => a + b, 0),
        uniqueIPs: connectionsByIP.size,
        blacklistedIPs: ipBlacklist.size,
        totalReports: Array.from(abuseReports.values()).reduce((a, b) => a + b, 0),
        topOffenders: Array.from(abuseReports.entries())
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
    };
}

// Export all functions
module.exports = {
    SECURITY_CONFIG,
    isIPBlacklisted,
    addToBlacklist,
    checkConnectionLimit,
    decrementConnectionCount,
    checkMessageRate,
    validateMessage,
    handleAbuseReport,
    getClientIP,
    setupConnectionTimeout,
    sanitizeInput,
    containsForbiddenContent,
    getSecurityStats
};
