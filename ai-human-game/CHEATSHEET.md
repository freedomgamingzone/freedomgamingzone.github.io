# PM2 Cheatsheet - AI Human Game

## 🚀 Deployment Commands

```bash
# First time setup
npm install -g pm2
pm2 start ecosystem.cluster.config.js
pm2 startup
pm2 save

# Or use npm scripts
npm run pm2:start
```

## 🔄 Daily Operations

```bash
# Update code và restart
git pull
pm2 restart ai-human-game
# hoặc: npm run pm2:restart

# Xem logs
pm2 logs ai-human-game
# hoặc: npm run pm2:logs

# Monitor realtime
pm2 monit
# hoặc: npm run pm2:monit

# Xem stats
curl http://localhost:3001/stats
# hoặc: npm run stats
```

## 📊 Monitoring

```bash
# Quick status
pm2 status
pm2 list

# Detailed info
pm2 show ai-human-game

# Memory usage
pm2 info ai-human-game | grep memory

# Logs
pm2 logs ai-human-game --lines 50
pm2 logs ai-human-game --err  # Chỉ errors
```

## 🛠️ Management

```bash
# Stop server
pm2 stop ai-human-game

# Start lại
pm2 start ai-human-game

# Restart (có downtime)
pm2 restart ai-human-game

# Reload (zero-downtime)
pm2 reload ai-human-game

# Delete khỏi PM2
pm2 delete ai-human-game
```

## 🔧 Advanced

```bash
# Scale to 8 processes
pm2 scale ai-human-game 8

# Update PM2
npm install pm2@latest -g
pm2 update

# Clear logs
pm2 flush

# Reset restart counter
pm2 reset ai-human-game
```

## 🆘 Troubleshooting

```bash
# Server không start
pm2 logs ai-human-game --err
pm2 describe ai-human-game

# Memory leak
pm2 restart ai-human-game --max-memory-restart 2G

# Restart toàn bộ PM2
pm2 kill
pm2 resurrect
```

## 📱 Production Checklist

- [ ] `pm2 start ecosystem.cluster.config.js`
- [ ] `pm2 startup` (auto-start on reboot)
- [ ] `pm2 save` (save current list)
- [ ] Test: `curl http://localhost:3001/stats`
- [ ] Monitor: `pm2 monit`
- [ ] Firewall: Open ports 3000, 3001
- [ ] SSL: Setup with Let's Encrypt
- [ ] Monitoring: Setup alerts

## 🎯 Quick Numbers

- **1 process:** 5,000-10,000 users
- **4 processes (cluster):** 20,000-40,000 users
- **Memory per 1K users:** ~50-100MB
- **Recommended VPS:** 4GB RAM, 4 CPU cores

## 🔗 Useful Links

- Stats: http://localhost:3001/stats
- PM2 Docs: https://pm2.keymetrics.io/docs/
- WebSocket Test: https://websocketking.com/

---

**TIP:** Bookmark this file! 📌
