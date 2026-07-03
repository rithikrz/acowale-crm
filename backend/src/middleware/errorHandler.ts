import { Request, Response, NextFunction } from 'express';
import logger from '../logger.js';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
  ) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export const errorHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';
  const stack = err instanceof Error ? err.stack : undefined;

  if (statusCode === 500) {
    logger.error({
      msg: 'Unhandled Application Error',
      error: message,
      stack,
      path: req.path,
      method: req.method,
    });
  } else {
    logger.warn({
      msg: 'Client Application Error',
      statusCode,
      error: message,
      path: req.path,
    });
  }

  res.status(statusCode).json({
    success: false,
    error:
      statusCode === 500 && process.env.NODE_ENV === 'production'
        ? 'Internal Server Error'
        : message,
  });
};
