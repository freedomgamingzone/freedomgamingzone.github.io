// PM2 Cluster Mode - Scale to multiple CPU cores
module.exports = {
  apps: [{
    name: 'ai-human-game',
    script: './server.js',
    
    // Cluster mode - sử dụng tất cả CPU cores
    instances: 'max',  // hoặc số cụ thể như 2, 4
    exec_mode: 'cluster',
    
    autorestart: true,
    watch: false,
    max_memory_restart: '2G',
    
    env: {
      NODE_ENV: 'production',
      PORT: 3000,
      // Tăng max connections
      UV_THREADPOOL_SIZE: 128,
      NODE_OPTIONS: '--max-old-space-size=4096' // 4GB heap
    },
    
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    
    // Restart strategies
    min_uptime: '10s',
    max_restarts: 10,
    restart_delay: 4000
  }]
};
