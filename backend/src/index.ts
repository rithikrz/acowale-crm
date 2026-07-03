import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import logger from './logger.js';
import { errorHandler } from './middleware/errorHandler.js';
import authRouter from './routes/auth.js';
import formsRouter from './routes/forms.js';
import feedbackRouter from './routes/feedback.js';
import publicRouter from './routes/public.js';
import dashboardRouter from './routes/dashboard.js';
import prisma from './db.js';
import type { ApiResponse } from './types.js';

const app = express();
const PORT = process.env.PORT || 5000;

import crypto from 'crypto';

import { Request } from 'express';
import type { AuthUser } from './types.js';

// Request tracing and logging middleware
app.use((req: Request & { id?: string; user?: AuthUser }, res, next) => {
  req.id = crypto.randomUUID();

  // Log request start
  logger.info({
    msg: 'Incoming request',
    method: req.method,
    url: req.url,
    requestId: req.id,
    ip: req.ip,
  });

  // Log request completion on finish
  res.on('finish', () => {
    const userId = req.user?.id || 'anonymous';
    logger.info({
      msg: 'Request completed',
      method: req.method,
      url: req.url,
      status: res.statusCode,
      requestId: req.id,
      userId,
    });
  });

  next();
});

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

// Health Check Endpoint
app.get('/health', async (_req, res) => {
  try {
    // Run simple query to check DB connection
    await prisma.$queryRaw`SELECT 1`;
    res.status(200).json({ status: 'ok', db: 'connected' });
  } catch (error) {
    logger.error({ msg: 'Health check failed', error });
    res.status(500).json({ status: 'error', db: 'disconnected' });
  }
});

// Hello API placeholder
app.get('/api/hello', (_req, res) => {
  const response: ApiResponse<string> = {
    success: true,
    data: 'Hello World from Acowale CRM Backend!',
  };
  res.json(response);
});

// Route Registrations
app.use('/api/auth', authRouter);
app.use('/api/forms', formsRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/public', publicRouter);
app.use('/api/dashboard', dashboardRouter);

// Centralized Error Handler Middleware
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(
    `Backend server running on http://localhost:${PORT} in ${process.env.NODE_ENV || 'development'} mode`,
  );
});
