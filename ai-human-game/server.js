const WebSocket = require("ws");
const http = require("http");

// Port configuration: Use Railway/Render PORT or default to 3000 for local
const PORT = process.env.PORT || 3000;

const wss = new WebSocket.Server({ port: PORT });

// Store waiting users by role
let waitingHumans = []; // Queue of humans waiting to ask questions
let waitingAIs = [];    // Pool of AIs ready to answer

// Active matches
let activeMatches = new Map(); // ws -> {partner, role, timeout}

// Stats HTTP server (for monitoring)
const statsServer = http.createServer((req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Content-Type', 'application/json');
    
    if (req.url === '/stats' || req.url === '/') {
        const stats = {
            timestamp: new Date().toISOString(),
            totalConnections: wss.clients.size,
            waiting: {
                humans: waitingHumans.length,
                ais: waitingAIs.length,
                total: waitingHumans.length + waitingAIs.length
            },
            activeMatches: activeMatches.size,
            activePairs: activeMatches.size / 2,
            memory: {
                rss: Math.round(process.memoryUsage().rss / 1024 / 1024) + ' MB',
                heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + ' MB',
                heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + ' MB'
            },
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
});

wss.on("connection", (ws) => {
    console.log("User connected");
    
    ws.role = null;
    ws.isAlive = true;
    
    // Pong handler
    ws.on('pong', () => {
        ws.isAlive = true;
    });

    ws.on("message",(message)=>{
        try {
            const data = JSON.parse(message.toString());
            
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
            if(ws.partner){
                ws.partner.send(message.toString());
            }
        }
    });

    ws.on("close",()=>{
        handleDisconnect(ws);
    });
});

function handleRoleSelection(ws, role) {
    ws.role = role;
    console.log(`[Role] User set role: ${role}`);
    
    // Check if already in queue (prevent duplicates)
    const alreadyInHumanQueue = waitingHumans.includes(ws);
    const alreadyInAIQueue = waitingAIs.includes(ws);
    
    if (alreadyInHumanQueue || alreadyInAIQueue) {
        console.log(`[Role] User already in queue, skipping...`);
        return;
    }
    
    if (role === 'human') {
        // Human joins waiting queue
        waitingHumans.push(ws);
        console.log(`[Role] Added to human queue. Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
        
        // Send queue position to all waiting humans
        sendQueueUpdates();
        
        // Try to match with available AI
        tryMatch();
    } else if (role === 'ai') {
        // AI joins available pool
        waitingAIs.push(ws);
        console.log(`[Role] Added to AI pool. Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
        
        // Send queue position to all waiting AIs
        sendQueueUpdates();
        
        // Try to match immediately
        tryMatch();
    }
}

function tryMatch() {
    console.log(`[tryMatch] Starting... Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
    
    // Match humans with random AI from pool
    while (waitingHumans.length > 0 && waitingAIs.length > 0) {
        const human = waitingHumans.shift();
        
        // Pick random AI
        const randomIndex = Math.floor(Math.random() * waitingAIs.length);
        const ai = waitingAIs.splice(randomIndex, 1)[0];
        
        console.log(`[tryMatch] Picked AI at index ${randomIndex}`);
        
        // Check if both are still connected
        if (human.readyState !== WebSocket.OPEN || ai.readyState !== WebSocket.OPEN) {
            console.log('[tryMatch] One connection is closed, skipping...');
            continue;
        }
        
        // Create match
        human.partner = ai;
        ai.partner = human;
        
        activeMatches.set(human, {partner: ai, role: 'human'});
        activeMatches.set(ai, {partner: human, role: 'ai'});
        
        human.send("Matched! You can chat.");
        ai.send("Matched! You can chat.");
        
        console.log(`[tryMatch] ✓ Match created! Remaining - Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
    }
    
    console.log(`[tryMatch] Done. Final - Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
    
    // Update queue positions for remaining players
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
        // Notify partner
        ws.partner.send("User disconnected");
        
        // Put partner back in waiting queue
        if (ws.partner.role === 'human') {
            if (!waitingHumans.includes(ws.partner)) {
                waitingHumans.push(ws.partner);
                console.log(`[Timeout] Partner (human) returned to queue`);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        } else if (ws.partner.role === 'ai') {
            if (!waitingAIs.includes(ws.partner)) {
                waitingAIs.push(ws.partner);
                console.log(`[Timeout] Partner (ai) returned to pool`);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        }
    }
    
    // Put timed-out user back in queue (NO AUTO REMATCH)
    if (ws.role === 'ai') {
        if (!waitingAIs.includes(ws)) {
            waitingAIs.push(ws);
            console.log(`[Timeout] Timed-out AI returned to pool`);
        }
        ws.partner = null;
        activeMatches.delete(ws);
    } else if (ws.role === 'human') {
        if (!waitingHumans.includes(ws)) {
            waitingHumans.push(ws);
            console.log(`[Timeout] Timed-out human returned to queue`);
        }
        ws.partner = null;
        activeMatches.delete(ws);
    }
    
    // Send queue updates (but DO NOT call tryMatch)
    sendQueueUpdates();
    console.log(`[Timeout] Queue status - Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
}

function handleDisconnect(ws) {
    console.log(`[Disconnect] User disconnected (role: ${ws.role})`);
    
    // Remove from waiting queues
    const humansBefore = waitingHumans.length;
    const aisBefore = waitingAIs.length;
    
    waitingHumans = waitingHumans.filter(u => u !== ws);
    waitingAIs = waitingAIs.filter(u => u !== ws);
    
    console.log(`[Disconnect] Removed from queues. Humans: ${humansBefore} → ${waitingHumans.length}, AIs: ${aisBefore} → ${waitingAIs.length}`);
    
    // Notify partner and put them back in queue
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        console.log(`[Disconnect] Notifying partner (role: ${ws.partner.role})`);
        ws.partner.send("User disconnected");
        
        // Put partner back in appropriate queue
        if (ws.partner.role === 'human') {
            if (!waitingHumans.includes(ws.partner)) {
                waitingHumans.push(ws.partner);
                console.log(`[Disconnect] Partner (human) added back to queue`);
            }
        } else if (ws.partner.role === 'ai') {
            if (!waitingAIs.includes(ws.partner)) {
                waitingAIs.push(ws.partner);
                console.log(`[Disconnect] Partner (ai) added back to pool`);
            }
        }
        
        ws.partner.partner = null;
        activeMatches.delete(ws.partner);
        
        console.log(`[Disconnect] Calling tryMatch to rematch...`);
        tryMatch();
    } else {
        // No partner, just update queue
        sendQueueUpdates();
    }
    
    activeMatches.delete(ws);
    console.log(`[Disconnect] Cleanup complete. Active matches: ${activeMatches.size}`);
}

function handleSkip(ws) {
    console.log(`[Skip] User skipped question (role: ${ws.role})`);
    
    if (ws.partner) {
        // Notify partner
        ws.partner.send("User disconnected");
        
        // Put partner back in waiting queue
        if (ws.partner.role === 'human') {
            if (!waitingHumans.includes(ws.partner)) {
                waitingHumans.push(ws.partner);
                console.log(`[Skip] Partner (human) returned to queue`);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        } else if (ws.partner.role === 'ai') {
            if (!waitingAIs.includes(ws.partner)) {
                waitingAIs.push(ws.partner);
                console.log(`[Skip] Partner (ai) returned to pool`);
            }
            ws.partner.partner = null;
            activeMatches.delete(ws.partner);
        }
    }
    
    // Put skipper back in queue (NO AUTO REMATCH)
    if (ws.role === 'ai') {
        if (!waitingAIs.includes(ws)) {
            waitingAIs.push(ws);
            console.log(`[Skip] AI returned to pool after skip`);
        }
        ws.partner = null;
        activeMatches.delete(ws);
    } else if (ws.role === 'human') {
        if (!waitingHumans.includes(ws)) {
            waitingHumans.push(ws);
            console.log(`[Skip] Human returned to queue after skip`);
        }
        ws.partner = null;
        activeMatches.delete(ws);
    }
    
    // Send queue updates (but DO NOT call tryMatch)
    sendQueueUpdates();
    console.log(`[Skip] Queue status - Humans: ${waitingHumans.length}, AIs: ${waitingAIs.length}`);
}

function handleDrawing(ws, dataURL) {
    console.log(`[Drawing] User sent drawing (role: ${ws.role})`);
    
    if (ws.partner && ws.partner.readyState === WebSocket.OPEN) {
        // Send drawing to partner
        ws.partner.send(JSON.stringify({
            type: 'DRAWING',
            data: dataURL
        }));
    }
}

function handleReport(ws, reason) {
    console.log(`[Report] User reported (role: ${ws.role}). Reason: ${reason}`);
    // In production, save to database
    // For now, just log it
}

// Send queue position updates to all waiting players
function sendQueueUpdates() {
    // Update humans queue
    waitingHumans.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
            const position = index + 1;
            const total = waitingHumans.length;
            ws.send(JSON.stringify({
                type: 'QUEUE_UPDATE',
                position: position,
                total: total
            }));
        }
    });
    
    // Update AIs pool
    waitingAIs.forEach((ws, index) => {
        if (ws.readyState === WebSocket.OPEN) {
            const position = index + 1;
            const total = waitingAIs.length;
            ws.send(JSON.stringify({
                type: 'QUEUE_UPDATE',
                position: position,
                total: total
            }));
        }
    });
}

// Heartbeat to detect disconnected clients
const heartbeatInterval = setInterval(() => {
    wss.clients.forEach(ws => {
        if (ws.isAlive === false) {
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
console.log('📊 Stats: http://localhost:3001/stats');
console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);