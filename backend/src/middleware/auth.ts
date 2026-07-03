import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { AppError } from './errorHandler.js';
import prisma from '../db.js';
import type { AuthUser } from '../types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'acowale_crm_super_secret_dev_key_rithik_ranjan';

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export const requireAuth = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction,
): Promise<void> => {
  try {
    let token: string | undefined;

    // 1. Check Authorization header first (Bearer token)
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2. Check cookies as fallback
    else if (req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }

    if (!token) {
      throw new AppError(401, 'Authentication token missing or invalid');
    }

    // Verify token
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string;
      email: string;
      businessName: string;
    };

    // Check if user still exists
    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
    });

    if (!user) {
      throw new AppError(401, 'User associated with this token no longer exists');
    }

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      businessName: user.businessName,
    };

    next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      next(new AppError(401, 'Invalid or expired token'));
      return;
    }
    next(error);
  }
};

