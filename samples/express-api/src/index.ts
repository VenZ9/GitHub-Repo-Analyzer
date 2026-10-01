import http from 'http';
import app from './app';
import { logger } from './utils/logger';
import { connectDatabase } from './config/database';

const PORT = process.env.PORT || 4000;

async function bootstrap() {
  await connectDatabase();
  const server = http.createServer(app);
  server.listen(PORT, () => {
    logger.info(`Express Authentication Server running on port ${PORT}`);
  });
}

bootstrap().catch(err => {
  logger.error('Failed to start server:', err);
  process.exit(1);
});
