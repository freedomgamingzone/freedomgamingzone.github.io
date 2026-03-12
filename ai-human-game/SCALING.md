# Scaling Guide for AI Human Game

## Current Architecture Limits

### Single Process (Default)
- **Max Users:** ~5,000-10,000 concurrent
- **RAM:** ~1GB 
- **CPU:** 1 core
- **Use case:** Development, small deployments

## Scaling Options

### Option 1: PM2 Cluster Mode (Easy)
**Capacity:** 20,000 - 40,000 users

```bash
# Use cluster config
pm2 start ecosystem.cluster.config.js

# This will:
# - Use all CPU cores
# - Load balance across processes
# - Share port 3000 automatically
```

**Benefits:**
- ✅ No code changes needed
- ✅ Automatic load balancing
- ✅ 4x-8x capacity increase
- ✅ Better fault tolerance

**Limitations:**
- ❌ Still single server
- ❌ Shared memory doesn't work (waitingHumans, waitingAIs)

### Option 2: Redis + Multiple Servers (Advanced)
**Capacity:** 100,000+ users

**Architecture:**
```
Users → Load Balancer → Multiple Node.js Servers → Redis (Shared State)
```

**Required changes:**
1. Store queues in Redis instead of memory
2. Use Redis Pub/Sub for matching
3. Add load balancer (Nginx, HAProxy)

**Installation:**
```bash
npm install redis ioredis
```

**Server count vs Capacity:**
| Servers | CPU Cores | RAM | Users |
|---------|-----------|-----|-------|
| 1 | 1 | 2GB | 5,000 |
| 1 | 4 | 4GB | 20,000 |
| 3 | 4 each | 4GB each | 60,000 |
| 10 | 4 each | 4GB each | 200,000 |

### Option 3: Horizontal Scaling with Kubernetes
**Capacity:** Unlimited (millions)

- Auto-scaling based on load
- Container orchestration
- Global distribution

## Quick Capacity Upgrade

### Increase Single Process Limit

**Edit server.js:**
```javascript
const wss = new WebSocket.Server({ 
  port: 3000,
  maxPayload: 100 * 1024, // 100KB max message
  perMessageDeflate: false, // Disable compression for speed
  clientTracking: true
});

// Increase max listeners
process.setMaxListeners(0);
```

**Start with more memory:**
```bash
node --max-old-space-size=4096 server.js
# or with PM2
pm2 start ecosystem.cluster.config.js
```

## Monitoring Capacity

### Check Current Load
```bash
# PM2 monitoring
pm2 monit

# Memory usage
pm2 info ai-human-game

# Custom monitoring endpoint (add to server.js)
curl http://localhost:3000/stats
```

### Add Stats Endpoint

Add to `server.js`:
```javascript
const http = require('http');

// Create HTTP server for stats
const httpServer = http.createServer((req, res) => {
  if (req.url === '/stats') {
    const stats = {
      totalConnections: wss.clients.size,
      waitingHumans: waitingHumans.length,
      waitingAIs: waitingAIs.length,
      activeMatches: activeMatches.size,
      memoryUsage: process.memoryUsage(),
      uptime: process.uptime()
    };
    
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(stats, null, 2));
  } else {
    res.writeHead(404);
    res.end('Not Found');
  }
});

httpServer.listen(3001, () => {
  console.log('Stats server on http://localhost:3001/stats');
});

wss.on('connection', (ws) => {
  // existing code...
});
```

Then monitor:
```bash
watch -n 1 'curl -s http://localhost:3001/stats'
```

## Recommended Setup by Use Case

### Small (1-1,000 users)
```bash
pm2 start server.js
```
Server: 1GB RAM, 1 CPU

### Medium (1,000-10,000 users)  
```bash
pm2 start ecosystem.cluster.config.js
```
Server: 4GB RAM, 4 CPUs

### Large (10,000-100,000 users)
- 3-5 servers
- Redis for shared state
- Load balancer
- Each server: 4GB RAM, 4 CPUs

### Enterprise (100,000+ users)
- Kubernetes cluster
- Redis cluster
- Global CDN
- Database for persistence
- Monitoring (Prometheus, Grafana)

## Cost Estimation

| Users | Setup | Server | Monthly Cost |
|-------|-------|--------|--------------|
| 1K | Single VPS | 2GB/1CPU | $5-10 |
| 5K | VPS + PM2 | 4GB/2CPU | $20 |
| 20K | VPS + Redis | 8GB/4CPU | $40-80 |
| 100K | 5 servers + LB | 5x4GB/4CPU | $200-400 |

## Testing Capacity

### Load Testing Tool
```bash
npm install -g artillery

# Create load test config
artillery quick --count 100 --num 50 ws://localhost:3000
```

### Stress Test
```javascript
// test-load.js
const WebSocket = require('ws');

const numConnections = 1000;
const connections = [];

for (let i = 0; i < numConnections; i++) {
  const ws = new WebSocket('ws://localhost:3000');
  
  ws.on('open', () => {
    console.log(`Connected: ${i + 1}/${numConnections}`);
    
    // Send ROLE
    ws.send(JSON.stringify({
      type: 'ROLE',
      role: i % 2 === 0 ? 'human' : 'ai'
    }));
  });
  
  connections.push(ws);
}

// Run: node test-load.js
```

## Bottlenecks to Watch

1. **Memory Leaks:** Monitor with `pm2 monit`
2. **CPU Spikes:** Too many messages/sec
3. **Network I/O:** Many simultaneous connections
4. **Matching Speed:** Large queues slow down matching

## Summary

**Current capacity (no changes):** ~5,000 users  
**With PM2 cluster:** ~20,000 users  
**With Redis + multiple servers:** 100,000+ users

Choose based on your expected traffic!
