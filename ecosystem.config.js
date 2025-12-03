module.exports = {
  apps: [
    {
      name: 'ai-robot-sim',
      script: 'npm',
      args: 'run dev',
      cwd: '/Users/avi/dev/avio/sb-projects/ai-robot-sim',
      env: {
        PORT: 4091,
        NODE_ENV: 'development'
      },
      watch: false,
      autorestart: true,
      max_restarts: 10
    }
  ]
};
