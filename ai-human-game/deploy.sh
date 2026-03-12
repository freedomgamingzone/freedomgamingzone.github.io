#!/bin/bash

# Deploy script for AI Human Game
# Usage: bash deploy.sh

echo "🚀 Starting deployment..."

# Pull latest code
echo "📥 Pulling latest code from git..."
git pull origin main

# Install dependencies if package.json changed
if git diff --name-only HEAD@{1} HEAD | grep -q "package.json"; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Restart with PM2 (zero-downtime)
echo "🔄 Restarting server with PM2..."
pm2 restart ai-human-game

# Show status
echo "✅ Deployment complete!"
pm2 status
pm2 logs ai-human-game --lines 20
