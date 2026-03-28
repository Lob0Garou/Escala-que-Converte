import app from './app.js';
import env from './config/env.js';

const server = app.listen(env.apiPort, env.apiHost, () => {
  console.log(`[api] listening on http://${env.apiHost}:${env.apiPort}`);
});

const shutdown = (signal: string) => {
  console.log(`[api] received ${signal}, shutting down`);
  server.close(() => {
    process.exit(0);
  });
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
