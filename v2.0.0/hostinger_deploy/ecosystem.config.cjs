// PM2 Process Manager Configuration for HedefMatik Backend
module.exports = {
  apps: [
    {
      name: "hedefmatik-api",
      cwd: "./backend",
      script: "venv/bin/uvicorn",
      args: "server:app --host 127.0.0.1 --port 8001 --workers 4",
      autorestart: true,
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
