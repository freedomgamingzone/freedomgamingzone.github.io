# Quick Start with PM2 Cluster

## Capacity với PM2 Cluster
- **Max users:** 20,000 - 40,000 concurrent
- **Server requirements:** 4GB RAM, 4 CPU cores (VPS ~$20/month)
- **Setup time:** 5 phút

## Deployment Instructions

### 1. First Time Setup (One-time)

```bash
# SSH vào server
ssh user@yourserver.com

# Clone code
git clone <your-repo-url>
cd ai-human-game

# Install dependencies
npm install

# Install PM2 globally
npm install -g pm2

# Start with cluster mode (sử dụng tất cả CPU cores)
pm2 start ecosystem.cluster.config.js

# Setup auto-restart on server reboot
pm2 startup
pm2 save

# Done! Server chạy 24/7
```

### 2. Monitor

```bash
# Xem status
pm2 status

# Real-time monitoring
pm2 monit

# View logs
pm2 logs ai-human-game

# Stats endpoint
curl http://localhost:3001/stats
```

### 3. Deploy Updates

```bash
# Pull latest code
git pull

# Restart (zero-downtime)
pm2 restart ai-human-game

# Or use deploy script
bash deploy.sh
```

## How PM2 Cluster Works

```
User Requests
     ↓
  Port 3000
     ↓
 PM2 Load Balancer
     ↓
  ┌──┴──┬──┬──┬──┐
  │  1  │ 2│ 3│ 4│  ← 4 Node.js processes (4 CPU cores)
  └─────┴──┴──┴──┘
     ↓
 Shared Port 3000
```

**Benefits:**
- ✅ Tự động load balance
- ✅ Dùng hết CPU cores
- ✅ 1 process crash → 3 còn chạy
- ✅ Zero-downtime restart
- ✅ Auto-restart on crash/reboot

## Performance Metrics

### Single Process (default)
- Users: 5,000-10,000
- CPU: 1 core (~100%)
- RAM: ~500MB-1GB

### PM2 Cluster (4 cores)
- Users: 20,000-40,000
- CPU: 4 cores (~80% each)
- RAM: ~2-3GB total

## Common Commands

```bash
# Start
pm2 start ecosystem.cluster.config.js

# Restart all instances
pm2 restart ai-human-game

# Reload (zero-downtime)
pm2 reload ai-human-game

# Stop
pm2 stop ai-human-game

# Delete from PM2
pm2 delete ai-human-game

# Scale manually (add/remove instances)
pm2 scale ai-human-game 8  # Use 8 processes

# View detailed info
pm2 show ai-human-game
```

## Troubleshooting

### High Memory Usage
```bash
# Increase max memory restart threshold
pm2 start ecosystem.cluster.config.js --max-memory-restart 3G
```

### Too Many Restarts
```bash
# View logs
pm2 logs ai-human-game --lines 100

# Check errors
pm2 logs ai-human-game --err
```

### Check if PM2 is using cluster mode
```bash
pm2 list
# Look for "cluster" in mode column
```

## Nginx Config (Optional but Recommended)

```nginx
# /etc/nginx/sites-available/ai-human-game
upstream websocket_backend {
    # PM2 will load balance to all processes
    server localhost:3000;
}

server {
    listen 80;
    server_name yourdomain.com;
    
    # Static files
    location / {
        root /var/www/ai-human-game;
        index index.html;
    }
    
    # WebSocket
    location /ws {
        proxy_pass http://websocket_backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_connect_timeout 7d;
        proxy_send_timeout 7d;
        proxy_read_timeout 7d;
    }
}
```

## Cost Estimate

| Users | VPS Size | Monthly Cost | Provider |
|-------|----------|--------------|----------|
| 10K | 2GB/2CPU | $12 | DigitalOcean |
| 20K | 4GB/4CPU | $24 | DigitalOcean |
| 40K | 8GB/4CPU | $48 | Linode |

## That's It!

PM2 cluster mode là giải pháp hoàn hảo cho 99% use cases.

**Không cần:**
- ❌ Redis
- ❌ Multiple servers
- ❌ Kubernetes
- ❌ Complex infrastructure

**Chỉ cần:**
- ✅ PM2 cluster config
- ✅ 1 lệnh: `pm2 start ecosystem.cluster.config.js`
- ✅ Done!
