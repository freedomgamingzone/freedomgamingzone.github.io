const WebSocket = require("ws");
const http = require("http");
const security = require("./security-middleware");

// Port configuration: Use Railway/Render PORT or default to 3000 for local
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ 
    port: PORT,
    // Verify client before accepting connection
    verifyClient: (info, callback) => {
        const ip = security.getClientIP(info.req);
        
        // Check blacklist
        if (security.isIPBlacklisted(ip)) {
            console.log(`[SECURITY] ⛔ Rejected blacklisted IP: ${ip}`);
            callback(false, 403, 'Forbidden');
            return;
        }
        
        // Check connection limit
        if (!security.checkConnectionLimit(info.req)) {
            console.log(`[SECURITY] ⚠️  Rejected IP ${ip}: Too many connections`);
            callback(false, 429, 'Too Many Connections');
            return;
        }
        
        callback(true);
    }
});

// Store waiting users by role
let waitingHumans = [];
let waitingAIs = [];

// Active matches
let activeMatches = new Map();

// Stats HTTP server
const statsServer = http.createServer((req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/stats' || req.url === '/') {
        const stats = {
            timestamp: new Date().toISOString(),
            connections: {
                total: wss.clients.size,
                waitingHumans: waitingHumans.length,
                waitingAIs: waitingAIs.length,
                activeMatches: activeMatches.size,
                activePairs: activeMatches.size / 2
            },
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB'
            },
            security: security.getSecurityStats(),
            uptime: Math.round(process.uptime()) + ' seconds'
        };
        
        res.writeHead(200);
        res.end(JSON.stringify(stats, null, 2));
    } else {
        res.writeHead(404);
        res.end(JSON.stringify({ error: 'Not Found' }));
    }
});

statsServer.listen(3001, () => {
    console.log('📊 Stats server running on http://localhost:3001/stats');
    console.log('🔒 Security features enabled');
});

wss.on("connection", (ws, req) => {
    const ip = security.getClientIP(req);
    console.log(`[Connection] User connected from ${ip}`);
    
    ws.role = null;
    ws.isAlive = true;
    ws.ip = ip;
    
    // Setup connection timeout
    security.setupConnectionTimeout(ws);
    
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message", (message) => {
        // 1. Check rate limiting
        if (!security.checkMessageRate(ws)) {
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Too many messages. Please slow down.'
            }));
            return;
        }
        
        // 2. Validate message
        const validation = security.validateMessage(message);
        if (!validation.valid) {
            console.log(`[SECURITY] Invalid message: ${validation.error}`);
            ws.send(JSON.stringify({
                type: 'ERROR',
                message: 'Invalid message format'
            }));
            return;
        }
        
        try {
            const data = JSON.parse(validation.data);
            
            // 3. Check for forbidden content
            if (data.message && security.containsForbiddenContent(data.message)) {
                console.log(`[SECURITY] ⚠️  Forbidden content detected from ${ip}`);
                ws.send(JSON.stringify({
                    type: 'ERROR',
                    message: 'Message contains forbidden content'
                }));
                return;
            }
            
            // 4. Sanitize text messages
            if (data.message && typeof data.message === 'string') {
                data.message = security.sanitizeInput(data.message);
            }
            
            if (data.reason && typeof data.reason === 'string') {
                data.reason = security.sanitizeInput(data.reason);
            }
            
            switch(data.type) {
                case 'ROLE':
                    handleRoleSelection(ws, data.role);
                    break;
                    
                case 'MESSAGE':
                    handleMessage(ws, data.message);
                    break;
                    
                case 'TYPING':
                    if(ws.partner){
                        ws.partner.send('__TYPING__');
                    }
                    break;
                    
                case 'TIMEOUT':
                    handleTimeout(ws);
                    break;
                    
                case 'SKIP':
                    handleSkip(ws);
                    break;
                    
                case 'DRAWING':
                    handleDrawing(ws, data.data);
                    break;
                    
                case 'REPORT':
                    handleReport(ws, data.reason);
                    break;
            }
            
        } catch (e) {
            // Plain text message (backward compatibility)
            const text = validation.data;
            
            if (security.containsForbiddenContent(text)) {
                console.log(`[SECURITY] ⚠️  Forbidden content in plain text from ${ip}`);
                return;
            }
            
            if(ws.partner){
                const sanitized = security.sanitizeInput(text);
                ws.partner.send(sanitized);
            }
        }
    });

    ws.on("close", () => {
        handleDisconnect(ws);
        // Decrement IP connection count
        security.decrementConnectionCount(ip);
    });
});

// ... (Copy all other functions from original server.js: handleRoleSelection, tryMatch, etc.)
function handleRoleSelection(ws, role) {
    ws.role = role;
    console.log(`[Role] User set role: ${role}`);
    
    const alreadyInHumanQueue = waitingHumans.includes(ws);
    const alreadyInAIQueue = waitingAIs.includes(ws);
    
    if (alreadyInHumanQueue || alreadyInAIQueue) {
        console.log(`[Role] User already in queue, skipping...`);
        return;
    }
    
    if (role === 'human') {
        waitingHumans.push(ws);
        console.log(`[Role] Added to human queue. Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
        sendQueueUpdates();
        tryMatch();
    } else if (role === 'ai') {
        waitingAIs.push(ws);
        console.log(`[Role] Added to AI pool. Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
        sendQueueUpdates();
        tryMatch();
    }
}

function tryMatch() {
    console.log(`[tryMatch] Starting... Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
    
    while (waitingHumans.length > 0 && waitingAIs.length > 0) {
        const human = waitingHumans.shift();
        const randomIndex = Math.floor(Math.random() * waitingAIs.length);
        const ai = waitingAIs.splice(randomIndex, 1)[0];
        
        if (human.readyState !== WebSocket.OPEN || ai.readyState !== WebSocket.OPEN) {
            continue;
        }
        
        human.partner = ai;
        ai.partner = human;
        
        activeMatches.set(human, {partner: ai, role: 'human'});
        activeMatches.set(ai, {partner: human, role: 'ai'});
        
        human.send("Matched! You can chat.");
        ai.send("Matched! You can chat.");
        
        console.log(`[tryMatch] ✓ Match created! Remaining - Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
    }
    
    sendQueueUpdates();
}

function handleMessage(ws, message) {
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        ws.partner.send(message);
    }
}

function handleTimeout(ws) {
    console.log(`[Timeout] User timeout (role: ${ws.role})`);
    
    if (ws.partner) {
        ws.partner.send("User disconnected");
        
        if (ws.partner.role === 'human') {
            if (!waitingHumans.includes(ws.partner)) {
                waitingHumans.push(ws.partner);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        } else if (ws.partner.role === 'ai') {
            if (!waitingAIs.includes(ws.partner)) {
                waitingAIs.push(ws.partner);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        }
    }
    
    if (ws.role === 'ai') {
        if (!waitingAIs.includes(ws)) waitingAIs.push(ws);
        ws.partner = null;
        activeMatches.delete(ws);
    } else if (ws.role === 'human') {
        if (!waitingHumans.includes(ws)) waitingHumans.push(ws);
        ws.partner = null;
        activeMatches.delete(ws);
    }
    
    sendQueueUpdates();
}

function handleDisconnect(ws) {
    console.log(`[Disconnect] User disconnected (role: ${ws.role})`);
    
    waitingHumans = waitingHumans.filter(u => u !== ws);
    waitingAIs = waitingAIs.filter(u => u !== ws);
    
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        ws.partner.send("User disconnected");
        
        if (ws.partner.role === 'human') {
            if (!waitingHumans.includes(ws.partner)) {
                waitingHumans.push(ws.partner);
            }
        } else if (ws.partner.role === 'ai') {
            if (!waitingAIs.includes(ws.partner)) {
                waitingAIs.push(ws.partner);
            }
        }
        
        ws.partner.partner = null;
        activeMatches.delete(ws.partner);
        tryMatch();
    } else {
        sendQueueUpdates();
    }
    
    activeMatches.delete(ws);
}

function handleSkip(ws) {
    console.log(`[Skip] User skipped question (role: ${ws.role})`);
    
    if (ws.partner) {
        ws.partner.send("User disconnected");
        
        if (ws.partner.role === 'human') {
            if (!waitingHumans.includes(ws.partner)) {
                waitingHumans.push(ws.partner);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        } else if (ws.partner.role === 'ai') {
            if (!waitingAIs.includes(ws.partner)) {
                waitingAIs.push(ws.partner);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        }
    }
    
    if (ws.role === 'ai') {
        if (!waitingAIs.includes(ws)) {
            waitingAIs.push(ws);
        }
        ws.partner = null;
        activeMatches.delete(ws);
    } else if (ws.role === 'human') {
        if (!waitingHumans.includes(ws)) {
            waitingHumans.push(ws);
        }
        ws.partner = null;
        activeMatches.delete(ws);
    }
    
    sendQueueUpdates();
}

function handleDrawing(ws, dataURL) {
    console.log(`[Drawing] User sent drawing (role: ${ws.role})`);
    
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        ws.partner.send(JSON.stringify({
            type: 'DRAWING',
            data: dataURL
        }));
    }
}

function handleReport(ws, reason) {
    const reporterIP = ws.ip;
    const targetIP = ws.partner ? ws.partner.ip : 'unknown';
    
    console.log(`[Report] User reported (role: ${ws.role}). Reason: ${reason}`);
    
    // Use security middleware to handle abuse report
    const banned = security.handleAbuseReport(reporterIP, targetIP, reason);
    
    if (banned) {
        // Close all connections from banned IP
        wss.clients.forEach(client => {
            if (client.ip === targetIP) {
                client.close(1008, 'Banned for abuse');
            }
        });
    }
}

function sendQueueUpdates() {
    waitingHumans.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'QUEUE_UPDATE',
                position: index + 1,
                total: waitingHumans.length
            }));
        }
    });
    
    waitingAIs.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({
                type: 'QUEUE_UPDATE',
                position: index + 1,
                total: waitingAIs.length
            }));
        }
    });
}

// Heartbeat
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
            console.log('[Heartbeat] Terminating dead connection');
            return ws.terminate();
        }
        ws.isAlive = false;
        ws.ping();
    });
}, 30000);

wss.on('close', () => {
    clearInterval(heartbeatInterval);
});

console.log(`🚀 WebSocket server running on port ${PORT}`);
console.log('🔒 Security: Rate limiting, IP limits, content filtering enabled');
console.log('📊 Stats: http://localhost:3001/stats');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
