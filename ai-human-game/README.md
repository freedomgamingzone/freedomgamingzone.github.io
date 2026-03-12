# AI Human Game

WebSocket-based real-time chat game where humans try to identify AI players.

## Local Development

```bash
# Install dependencies
npm install

# Run server
node server.js
```

Server runs on: http://localhost:3000

## Production Deployment

### Quick Start with PM2 (Recommended)

**Capacity: 20,000-40,000 users**

```bash
# 1. Install PM2
npm install -g pm2

# 2. Start with cluster mode (uses all CPU cores)
pm2 start ecosystem.cluster.config.js

# 3. Setup auto-restart on reboot
pm2 startup
pm2 save

# Done! Server runs 24/7 automatically
```

### Deploy Updates

```bash
# Option 1: Use deploy script
bash deploy.sh

# Option 2: Manual
git pull
pm2 restart ai-human-game
```

### Monitoring

```bash
pm2 list                  # List all apps
pm2 monit                 # Real-time monitoring
pm2 logs ai-human-game    # View logs

# Stats endpoint
curl http://localhost:3001/stats
```

For detailed instructions, see [PM2-GUIDE.md](PM2-GUIDE.md)

## Cloud Deployment (100% FREE)

Deploy frontend on **GitHub Pages** + backend on **free cloud services**:

### 🚀 Quick Deploy (5 minutes)
See [QUICK-DEPLOY.md](QUICK-DEPLOY.md) for fastest setup

### 📚 Detailed Guides

- **[DEPLOY-GITHUB-PAGES.md](DEPLOY-GITHUB-PAGES.md)** - Complete guide for GitHub Pages + Render.com/Fly.io
- **[PM2-GUIDE.md](PM2-GUIDE.md)** - VPS deployment with PM2 cluster mode
- **[SCALING.md](SCALING.md)** - Capacity planning and scaling strategies

### Free Hosting Options

| Service | Free Tier | Sleep? | Best For |
|---------|-----------|--------|----------|
| **Render.com** | ✅ Forever | Yes (fixable) | Recommended |
| **Fly.io** | ✅ 3 VMs | No | Advanced users |
| **GitHub Pages** | ✅ Forever | No | Frontend only |

**Total Cost: $0/month** 🎉

## SSL/HTTPS Setup

### With Let's Encrypt + Nginx

```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Get SSL certificate
sudo certbot --nginx -d yourdomain.com

# Nginx will auto-configure HTTPS
```

### Nginx Config Example

```nginx
server {
    listen 443 ssl;
    server_name yourdomain.com;
    
    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;
    
    # Static files
    location / {
        root /var/www/ai-human-game;
        index index.html;
    }
    
    # WebSocket proxy
    location /ws {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## Configuration

Edit `index.html` to point to your production WebSocket server:

```javascript
// Local
const WS_SERVER = 'ws://localhost:3000';

// Production (HTTPS)
const WS_SERVER = 'wss://yourdomain.com:3000';
```

## Features

- ✅ Real-time WebSocket chat
- ✅ Human vs AI role switching
- ✅ Queue system with position display
- ✅ 60s answer timer with progress bar
- ✅ Draw and write responses
- ✅ Skip question feature
- ✅ Chat history (Human role)
- ✅ Role switch countdown

## Tech Stack

- **Backend:** Node.js + ws (WebSocket)
- **Frontend:** Vanilla JavaScript + HTML5 Canvas
- **Process Manager:** PM2
- **Web Server:** Nginx (recommended)
