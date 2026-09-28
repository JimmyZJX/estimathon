// PM2 process file: runs 5 independent Estimathon instances.
// Usage:
//   pm2 start ecosystem.config.js
//   pm2 save && pm2 startup   # enable start on boot
//
// Per-instance answers/teams are edited at runtime via the /metadata
// endpoint (POST from the scoreboard editor), so no code changes needed
// to differentiate instances.
module.exports = {
  apps: [1, 2, 3, 4, 5].map((i) => ({
    name: `estimathon-${i}`,
    script: 'js/server.js',
    cwd: __dirname,
    // Bind to localhost only: Caddy (with basic auth) is the public entry point.
    env: {
      HOST: '127.0.0.1',
      PORT: String(3000 + i),
      DATA_DIR: `dist/instance-${i}`,
    },
    // Restart on crash, keep logs small.
    autorestart: true,
    max_restarts: 10,
    merge_logs: false,
    out_file: `dist/logs/instance-${i}-out.log`,
    error_file: `dist/logs/instance-${i}-err.log`,
  })),
};
