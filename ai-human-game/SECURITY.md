# Security Guide - AI Human Game

## Current Security Issues ⚠️

### 1. **No Rate Limiting**
- ❌ Users có thể spam messages
- ❌ Có thể gửi hàng ngàn connections
- ❌ DDoS vulnerability

### 2. **No Authentication**
- ❌ Không verify user identity
- ❌ Có thể fake multiple connections
- ❌ Không track abuse

### 3. **No Input Validation**
- ❌ Max message length chỉ check ở client
- ❌ Có thể gửi payload lớn từ server
- ❌ XSS potential (đã có escapeHtml nhưng cần cẩn thận)

### 4. **No Connection Limits**
- ❌ 1 IP có thể tạo unlimited connections
- ❌ Flood attack dễ dàng

### 5. **Report System**
- ❌ Reports chỉ log, không lưu DB
- ❌ Không track abusers
- ❌ Không có moderation

## Security Implementations

### 1. Rate Limiting (Essential)

**Install:**
```bash
npm install express-rate-limit
```

**Implementation:**
See `server-secure.js` for full code.

### 2. Connection Limits per IP

Prevent single IP from opening too many connections.

### 3. Message Validation

- Max message size
- Content filtering
- Type checking

### 4. IP Blacklist

Block known abusers.

### 5. CORS Protection

Only allow specific origins.

### 6. SSL/TLS (Production)

Always use `wss://` on production.

## Security Levels

### Level 1: Basic (Current + Essentials)
- ✅ Rate limiting
- ✅ Connection limits per IP
- ✅ Input validation
- ✅ Message size limits
- ✅ XSS protection

**Time to implement:** 1 hour  
**Security improvement:** 70%

### Level 2: Advanced
- ✅ Level 1 +
- ✅ User authentication (optional)
- ✅ IP blacklist
- ✅ Abuse detection
- ✅ Report to database
- ✅ Admin dashboard

**Time to implement:** 1 day  
**Security improvement:** 90%

### Level 3: Enterprise
- ✅ Level 2 +
- ✅ DDoS protection (Cloudflare)
- ✅ WAF (Web Application Firewall)
- ✅ Intrusion detection
- ✅ Audit logging
- ✅ Penetration testing

**Time to implement:** 1 week  
**Security improvement:** 99%

## Quick Win Security (30 minutes)

See `security-middleware.js` for ready-to-use code.

## Environment Variables (.env)

```env
# Server
PORT=3000
NODE_ENV=production

# Security
MAX_CONNECTIONS_PER_IP=10
RATE_LIMIT_WINDOW=60000
RATE_LIMIT_MAX=100
MESSAGE_MAX_SIZE=10240

# Optional: Auth
JWT_SECRET=your-secret-key-here
SESSION_SECRET=another-secret-key

# Optional: Database
DB_HOST=localhost
DB_USER=dbuser
DB_PASS=dbpassword
```

## Firewall Setup (UFW)

```bash
# Allow SSH
sudo ufw allow 22/tcp

# Allow HTTP/HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Allow WebSocket
sudo ufw allow 3000/tcp

# Block all other incoming
sudo ufw default deny incoming
sudo ufw default allow outgoing

# Enable
sudo ufw enable
```

## Cloudflare Setup (Recommended)

**Benefits:**
- ✅ DDoS protection (automatic)
- ✅ SSL/TLS (free)
- ✅ CDN (faster)
- ✅ Bot protection
- ✅ Rate limiting
- ✅ Analytics

**Setup:**
1. Add your domain to Cloudflare
2. Change nameservers
3. Enable "Proxy" (orange cloud)
4. SSL Mode: "Full (strict)"
5. Enable "Always Use HTTPS"

**Cost:** FREE

## Nginx Security Headers

```nginx
server {
    # ... existing config ...
    
    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;
    add_header Content-Security-Policy "default-src 'self' wss: ws:;" always;
    
    # Hide Nginx version
    server_tokens off;
    
    # Limit request size
    client_max_body_size 10M;
    
    # Timeouts
    client_body_timeout 12;
    client_header_timeout 12;
    send_timeout 10;
}
```

## Monitoring & Alerts

### Setup Alert System

```bash
# Install
npm install nodemailer

# Config in server
# Send email when:
# - Too many connections from 1 IP
# - Server crash
# - High memory usage
# - Suspicious activity
```

## Common Attack Vectors

### 1. WebSocket Flooding
**Attack:** Gửi hàng ngàn messages/giây
**Defense:** Rate limiting per connection

### 2. Connection Exhaustion
**Attack:** Mở 10,000 connections từ 1 IP
**Defense:** Connection limit per IP

### 3. Large Payload
**Attack:** Gửi message 100MB
**Defense:** Message size limit

### 4. XSS via Chat
**Attack:** Gửi `<script>alert('xss')</script>`
**Defense:** HTML escaping (đã có)

### 5. Slowloris
**Attack:** Giữ connections mở lâu, không gửi gì
**Defense:** Connection timeout

## Security Checklist

### Before Production
- [ ] Enable SSL/TLS (HTTPS/WSS)
- [ ] Setup Cloudflare (hoặc DDoS protection)
- [ ] Implement rate limiting
- [ ] Add connection limits per IP
- [ ] Validate all inputs
- [ ] Setup firewall (UFW)
- [ ] Hide error details in production
- [ ] Setup monitoring/alerts
- [ ] Regular backups
- [ ] Update dependencies (`npm audit`)

### Regular Maintenance
- [ ] Check logs daily
- [ ] Update packages weekly
- [ ] Review abuse reports
- [ ] Monitor resource usage
- [ ] Test security quarterly

## Recommended Tools

1. **Cloudflare** - DDoS protection (FREE)
2. **Let's Encrypt** - SSL certificates (FREE)
3. **PM2** - Process monitoring (FREE)
4. **Fail2ban** - Auto-ban abusers (FREE)
5. **Sentry** - Error tracking ($0-26/month)

## Security vs Performance

| Feature | Security | Performance Impact |
|---------|----------|-------------------|
| Rate limiting | High | Low (1-2%) |
| IP limits | Medium | Very low (<1%) |
| Input validation | High | Low (1%) |
| SSL/TLS | Essential | Low (2-5%) |
| Logging | Medium | Low (1-3%) |
| Authentication | High | Medium (5-10%) |

## Quick Implementation

Choose security level:

**Minimal (30 min):**
```bash
# Use the secure server
node server-secure.js
```

**Recommended (2 hours):**
```bash
# Setup Cloudflare + SSL + Rate limiting
# Full instructions in PM2-GUIDE.md
```

**Enterprise (1 week):**
- Hire security consultant
- Penetration testing
- Custom security rules

## Summary

**Must Have (Level 1):**
- ✅ Rate limiting
- ✅ Connection limits
- ✅ SSL/TLS
- ✅ Input validation

**Good to Have (Level 2):**
- ✅ IP blacklist
- ✅ Cloudflare
- ✅ Monitoring

**Optional (Level 3):**
- ⭐ Authentication
- ⭐ WAF
- ⭐ Audit logs

**Priority:** Implement Level 1 trước khi production!
