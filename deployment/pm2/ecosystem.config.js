module.exports = {
  apps: [
    {
      name: "travel-api",

      cwd: "/var/www/Online-Corporate-Travel-Desk-/server",

      script: "src/server.js",

      instances: 1,

      exec_mode: "fork",

      autorestart: true,

      watch: false,

      max_memory_restart: "1G",

      error_file: "/var/www/Online-Corporate-Travel-Desk-/logs/error.log",

      out_file: "/var/www/Online-Corporate-Travel-Desk-/logs/output.log",

      log_date_format: "YYYY-MM-DD HH:mm:ss",

      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};