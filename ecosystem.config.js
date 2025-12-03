module.exports = {
  apps: [
    {
      name: 'ai-robot-sim',
      script: 'node_modules/next/dist/bin/next',
      args: 'dev -p 4091',
      cwd: 'C:/Users/user/dev/ai-robot-sim',
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
