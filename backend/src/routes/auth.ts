import { Router } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import prisma from '../db.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import logger from '../logger.js';
import type { ApiResponse, AuthResponse } from '../types.js';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'acowale_crm_super_secret_dev_key_rithik_ranjan';

const signupSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(6, 'Password must be at least 6 characters long'),
    businessName: z.string().min(2, 'Business name must be at least 2 characters long'),
  }),
});

const loginSchema = z.object({
  body: z.object({
    email: z.string().email('Invalid email address'),
    password: z.string().min(1, 'Password is required'),
  }),
});

// GET /api/auth/me
router.get('/me', requireAuth, (req: AuthenticatedRequest, res) => {
  const response: ApiResponse<AuthResponse> = {
    success: true,
    data: {
      user: req.user!,
    },
  };
  res.json(response);
});

// POST /api/auth/signup
router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { email, password, businessName } = req.body;

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new AppError(400, 'A business with this email address already exists');
    }

    // Hash password
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    // Create user
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        businessName,
      },
    });

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, businessName: user.businessName },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info({ msg: 'New business user signed up', userId: user.id, email: user.email });

    const response: ApiResponse<AuthResponse & { token: string }> = {
      success: true,
      message: 'Signup successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          businessName: user.businessName,
        },
        token,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/login
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Verify password
    const passwordMatch = await bcrypt.compare(password, user.passwordHash);
    if (!passwordMatch) {
      throw new AppError(401, 'Invalid email or password');
    }

    // Generate token
    const token = jwt.sign(
      { userId: user.id, email: user.email, businessName: user.businessName },
      JWT_SECRET,
      { expiresIn: '7d' },
    );

    // Set cookie
    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    logger.info({ msg: 'Business user logged in', userId: user.id, email: user.email });

    const response: ApiResponse<AuthResponse & { token: string }> = {
      success: true,
      message: 'Login successful',
      data: {
        user: {
          id: user.id,
          email: user.email,
          businessName: user.businessName,
        },
        token,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/auth/logout
router.post('/logout', (_req, res) => {
  res.clearCookie('token');
  res.json({ success: true, message: 'Logged out successfully' });
});

export default router;

