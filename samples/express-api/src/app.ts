import express, { Application } from 'express';
import cors from 'cors';
import { authRouter } from './routes/auth.routes';
import { usersRouter } from './routes/users.routes';
import { errorHandler } from './middlewares/error.middleware';
import { requestLogger } from './middlewares/logger.middleware';

const app: Application = express();

app.use(cors());
app.use(express.json());
app.use(requestLogger);

// API Routes
app.use('/api/v1/auth', authRouter);
app.use('/api/v1/users', usersRouter);

// Global Error Handler
app.use(errorHandler);

export default app;
