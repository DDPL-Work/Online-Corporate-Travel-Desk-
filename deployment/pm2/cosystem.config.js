module.exports = {
  apps: [
    {
      name: "travel-api",

      cwd: "/var/www/travel-app/server",

      script: "src/index.js",

      instances: 1,

      exec_mode: "fork",

      autorestart: true,

      watch: false,

      max_memory_restart: "1G",

      error_file: "/var/www/travel-app/logs/error.log",

      out_file: "/var/www/travel-app/logs/output.log",

      log_date_format: "YYYY-MM-DD HH:mm:ss",

      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};