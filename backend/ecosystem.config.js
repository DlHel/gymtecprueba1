// Configuración PM2 para producción
// Uso: pm2 start ecosystem.config.js --env production

module.exports = {
  apps: [{
    name: 'gymtec-api',
    script: './src/server-clean.js',
    cwd: '/var/www/gymtec/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'development',
      PORT: 3000
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // Logs
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true,
    // Merge logs para facilitar lectura
    merge_logs: true,
    // Límite de intentos de restart
    max_restarts: 10,
    restart_delay: 4000
  }]
};
