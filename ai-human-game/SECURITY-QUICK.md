# Quick Security Setup

## 🚀 Start Secure Server (5 minutes)

### Option 1: Use Secure Server (Recommended)
```bash
# Start secure server
node server-secure.js

# Or with PM2
pm2 start server-secure.js --name "ai-human-game"
```

**Security features included:**
- ✅ Rate limiting (60 messages/minute)
- ✅ Connection limits (10 per IP)
- ✅ IP blacklist
- ✅ Message validation
- ✅ XSS protection
- ✅ Content filtering
- ✅ Auto-ban abusers

### Option 2: Add Security to Existing Server

**1. Install security middleware:**
```bash
# Copy security-middleware.js to your project
# It's already created!
```

**2. Update your server.js:**
```javascript
const security = require('./security-middleware');

// Add verifyClient to WebSocket server
const wss = new WebSocket.Server({ 
    port: 3000,
    verifyClient: (info, callback) => {
        const ip = security.getClientIP(info.req);
        
        if (security.isIPBlacklisted(ip)) {
            callback(false, 403, 'Forbidden');
            return;
        }
        
        if (!security.checkConnectionLimit(info.req)) {
            callback(false, 429, 'Too Many Connections');
            return;
        }
        
        callback(true);
    }
});
```

## 🔒 Security Levels

### Level 1: Basic (5 min) ✅
- Use `server-secure.js`
- All protections enabled
- Good for production

### Level 2: SSL/TLS (30 min)
```bash
# Install certbot
sudo apt install certbot

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Update server to use HTTPS
# See SECURITY.md for details
```

### Level 3: Cloudflare (15 min)
1. Create Cloudflare account (free)
2. Add your domain
3. Change nameservers
4. Enable "Proxy" mode
5. Done! Auto DDoS protection

## 📊 Monitor Security

```bash
# Check stats
curl http://localhost:3001/stats

# View security info
curl http://localhost:3001/stats | grep security

# View blacklist
cat blacklist.log

# View reports
cat reports.log
```

## 🚨 Emergency: Block an IP

```javascript
// In Node.js console or add to server
security.addToBlacklist('123.45.67.89', 'Manual ban');
```

## ✅ Production Checklist

Before going live:
- [ ] Run `server-secure.js` instead of `server.js`
- [ ] Setup SSL certificate
- [ ] Enable Cloudflare (optional but recommended)
- [ ] Setup firewall (UFW)
- [ ] Test with `curl http://localhost:3001/stats`
- [ ] Monitor logs regularly

## 🎯 That's It!

Security is now active. Server will:
- Block too many connections from 1 IP
- Rate limit messages
- Filter XSS/injection attempts
- Auto-ban abusers
- Log all security events

For more details, see [SECURITY.md](SECURITY.md)
