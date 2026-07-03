import { Router } from 'express';
import { z } from 'zod';
import rateLimit from 'express-rate-limit';
import prisma from '../db.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../logger.js';
import type { ApiResponse } from '../types.js';

const router = Router();

// Rate limiter for feedback submission
const feedbackSubmitLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 15, // Limit each IP to 15 submissions per windowMs
  message: {
    success: false,
    error: 'Too many feedback submissions from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const submitFeedbackSchema = z.object({
  body: z.object({
    category: z.string().min(1, 'Category is required'),
    comment: z
      .string()
      .min(5, 'Comment must be at least 5 characters long')
      .max(1000, 'Comment cannot exceed 1000 characters'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    rating: z.number().int().min(1).max(5).optional(),
  }),
  params: z.object({
    slug: z.string(),
  }),
});

// Zod schema for the legacy /feedback endpoint compatibility
const legacySubmitFeedbackSchema = z.object({
  body: z.object({
    formId: z.string(),
    category: z.string().min(1, 'Category is required'),
    comment: z
      .string()
      .min(5, 'Comment must be at least 5 characters long')
      .max(1000, 'Comment cannot exceed 1000 characters'),
    email: z.string().email('Invalid email address').optional().or(z.literal('')),
    rating: z.number().int().min(1).max(5).optional(),
  }),
});

// GET /api/public/forms/:slug - Fetch form details publicly (returns 404 if form is inactive or does not exist)
router.get('/forms/:slug', async (req, res, next) => {
  try {
    const { slug } = req.params;

    const form = await prisma.form.findUnique({
      where: { slug },
      include: { categories: true },
    });

    if (!form || !form.isActive) {
      throw new AppError(404, 'Form not found or is inactive');
    }

    const response: ApiResponse<unknown> = {
      success: true,
      data: {
        id: form.id,
        title: form.title,
        description: form.description,
        slug: form.slug,
        isActive: form.isActive,
        categories: form.categories.map((c) => c.name),
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/public/forms/:slug/feedback - Submit feedback by slug (rate limited & category checked)
router.post(
  '/forms/:slug/feedback',
  feedbackSubmitLimiter,
  validate(submitFeedbackSchema),
  async (req, res, next) => {
    try {
      const { slug } = req.params;
      const { category, comment, email, rating } = req.body;

      // Fetch the form and its categories
      const form = await prisma.form.findUnique({
        where: { slug },
        include: { categories: true },
      });

      if (!form || !form.isActive) {
        throw new AppError(404, 'Form not found or is inactive');
      }

      // Validate category against form's custom category list
      const validCategories = form.categories.map((c) => c.name);
      if (!validCategories.includes(category)) {
        throw new AppError(400, `Invalid category. Must be one of: ${validCategories.join(', ')}`);
      }

      // Create feedback submission
      const feedback = await prisma.feedback.create({
        data: {
          formId: form.id,
          category,
          comment,
          email: email || null,
          rating: rating || null,
          status: 'RECEIVED',
        },
      });

      logger.info({
        msg: 'Feedback submitted successfully via slug',
        feedbackId: feedback.id,
        slug,
      });

      const response: ApiResponse<unknown> = {
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          id: feedback.id,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },
);

// Keep legacy POST /api/public/feedback for compatibility with the frontend views created earlier
router.post(
  '/feedback',
  feedbackSubmitLimiter,
  validate(legacySubmitFeedbackSchema),
  async (req, res, next) => {
    try {
      const { formId, category, comment, email, rating } = req.body;

      const form = await prisma.form.findUnique({
        where: { id: formId },
      });

      if (!form || !form.isActive) {
        throw new AppError(404, 'Form not found or is inactive');
      }

      const feedback = await prisma.feedback.create({
        data: {
          formId,
          category,
          comment,
          email: email || null,
          rating: rating || null,
          status: 'RECEIVED',
        },
      });

      logger.info({
        msg: 'Legacy feedback submitted successfully',
        feedbackId: feedback.id,
        formId,
      });

      const response: ApiResponse<unknown> = {
        success: true,
        message: 'Feedback submitted successfully',
        data: {
          id: feedback.id,
        },
      };

      res.status(201).json(response);
    } catch (error) {
      next(error);
    }
  },
);

export default router;
