import { Router } from 'express';
import { z } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { AppError } from '../middleware/errorHandler.js';
import logger from '../logger.js';
import type { ApiResponse } from '../types.js';

const router = Router();

// Zod schemas for validation
const createFormSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters long'),
    description: z.string().optional(),
    categories: z
      .array(z.string().min(1, 'Category name cannot be empty'))
      .min(1, 'At least one category is required'),
  }),
});

const patchFormSchema = z.object({
  body: z.object({
    title: z.string().min(3, 'Title must be at least 3 characters long').optional(),
    description: z.string().optional(),
    categories: z
      .array(z.string().min(1, 'Category name cannot be empty'))
      .min(1, 'At least one category is required')
      .optional(),
    isActive: z.boolean().optional(),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const feedbackQuerySchema = z.object({
  query: z.object({
    category: z.string().optional(),
    status: z.string().optional(),
    search: z.string().optional(),
    page: z.preprocess((val) => val ?? '1', z.string().regex(/^\d+$/).transform(Number)),
    limit: z.preprocess((val) => val ?? '10', z.string().regex(/^\d+$/).transform(Number)),
    sortBy: z.preprocess(
      (val) => val ?? 'createdAt',
      z.enum(['createdAt', 'rating', 'category', 'status']),
    ),
    sortOrder: z.preprocess((val) => val ?? 'desc', z.enum(['asc', 'desc'])),
  }),
  params: z.object({
    id: z.string(),
  }),
});

const analyticsQuerySchema = z.object({
  query: z.object({
    days: z.preprocess((val) => val ?? '7', z.string().regex(/^\d+$/).transform(Number)),
  }),
  params: z.object({
    id: z.string(),
  }),
});

type FeedbackQueryParams = z.infer<typeof feedbackQuerySchema>['query'];
type AnalyticsQueryParams = z.infer<typeof analyticsQuerySchema>['query'];

function generateSlug(title: string): string {
  const cleanTitle = title
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  const suffix = Math.random().toString(36).substring(2, 7);
  return `${cleanTitle}-${suffix}`;
}

// Apply authentication middleware to all form routes
router.use(requireAuth);

// GET /api/forms - List all forms for authenticated business user
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;

    const forms = await prisma.form.findMany({
      where: { userId },
      include: {
        categories: true,
        _count: {
          select: { feedbacks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse<unknown> = {
      success: true,
      data: forms.map((f) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        slug: f.slug,
        isActive: f.isActive,
        createdAt: f.createdAt.toISOString(),
        categories: f.categories.map((c) => c.name),
        feedbackCount: f._count.feedbacks,
      })),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// GET /api/forms/:id - Get a specific form's details (returns 404 if ownership fails)
router.get('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const form = await prisma.form.findUnique({
      where: { id },
      include: { categories: true },
    });

    if (!form || form.userId !== userId) {
      throw new AppError(404, 'Form not found');
    }

    const response: ApiResponse<unknown> = {
      success: true,
      data: {
        id: form.id,
        title: form.title,
        description: form.description,
        slug: form.slug,
        isActive: form.isActive,
        createdAt: form.createdAt.toISOString(),
        categories: form.categories.map((c) => c.name),
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// POST /api/forms - Create a new feedback form
router.post('/', validate(createFormSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { title, description, categories } = req.body;

    const slug = generateSlug(title);

    // Create form and its categories in a transaction
    const newForm = await prisma.$transaction(async (tx) => {
      const form = await tx.form.create({
        data: {
          userId,
          title,
          description,
          slug,
        },
      });

      // Create categories
      await tx.formCategory.createMany({
        data: categories.map((name: string) => ({
          formId: form.id,
          name: name.trim(),
        })),
      });

      return form;
    });

    logger.info({ msg: 'New form created', formId: newForm.id, slug: newForm.slug, userId });

    const response: ApiResponse<unknown> = {
      success: true,
      message: 'Form created successfully',
      data: {
        id: newForm.id,
        title: newForm.title,
        description: newForm.description,
        slug: newForm.slug,
        isActive: newForm.isActive,
        createdAt: newForm.createdAt.toISOString(),
        publicUrl: `/f/${newForm.slug}`,
      },
    };

    res.status(201).json(response);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/forms/:id - Partial update of form settings and categories
router.patch('/:id', validate(patchFormSchema), async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { title, description, categories, isActive } = req.body;

    const existingForm = await prisma.form.findUnique({
      where: { id },
    });

    if (!existingForm || existingForm.userId !== userId) {
      throw new AppError(404, 'Form not found');
    }

    const updatedForm = await prisma.$transaction(async (tx) => {
      const form = await tx.form.update({
        where: { id },
        data: {
          title: title !== undefined ? title : undefined,
          description: description !== undefined ? description : undefined,
          isActive: isActive !== undefined ? isActive : undefined,
        },
      });

      if (categories !== undefined) {
        const normalizedNames = categories.map((name: string) => name.trim());

        // 1. Delete categories no longer in the updated list
        await tx.formCategory.deleteMany({
          where: {
            formId: id,
            NOT: {
              name: { in: normalizedNames },
            },
          },
        });

        // 2. Query remaining categories
        const remainingCategories = await tx.formCategory.findMany({
          where: { formId: id },
        });

        const remainingNames = remainingCategories.map((c) => c.name);

        // 3. Add new categories
        const namesToAdd = normalizedNames.filter((name: string) => !remainingNames.includes(name));
        if (namesToAdd.length > 0) {
          await tx.formCategory.createMany({
            data: namesToAdd.map((name: string) => ({
              formId: id,
              name,
            })),
          });
        }
      }

      return form;
    });

    logger.info({ msg: 'Form updated via PATCH', formId: updatedForm.id, userId });

    const response: ApiResponse<unknown> = {
      success: true,
      message: 'Form updated successfully',
      data: {
        id: updatedForm.id,
        title: updatedForm.title,
        slug: updatedForm.slug,
        isActive: updatedForm.isActive,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// DELETE /api/forms/:id - Soft-delete the form by setting isActive to false
router.delete('/:id', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const form = await prisma.form.findUnique({
      where: { id },
    });

    if (!form || form.userId !== userId) {
      throw new AppError(404, 'Form not found');
    }

    await prisma.form.update({
      where: { id },
      data: { isActive: false },
    });

    logger.info({ msg: 'Form soft-deleted', formId: id, userId });

    res.json({
      success: true,
      message: 'Form successfully soft-deleted',
    });
  } catch (error) {
    next(error);
  }
});

// GET /api/forms/:id/feedback - Paginated, filtered, and sorted feedback
router.get(
  '/:id/feedback',
  validate(feedbackQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { category, status, search, page, limit, sortBy, sortOrder } =
        req.query as unknown as FeedbackQueryParams;

      const form = await prisma.form.findUnique({
        where: { id },
      });

      if (!form || form.userId !== userId) {
        throw new AppError(404, 'Form not found');
      }

      const whereClause: Prisma.FeedbackWhereInput = { formId: id };

      if (category) {
        whereClause.category = category;
      }

      if (status) {
        whereClause.status = status;
      }

      if (search) {
        whereClause.OR = [{ comment: { contains: search } }, { email: { contains: search } }];
      }

      const skip = (page - 1) * limit;
      const take = limit;

      const [feedbacks, totalCount] = await prisma.$transaction([
        prisma.feedback.findMany({
          where: whereClause,
          orderBy: { [sortBy]: sortOrder },
          skip,
          take,
        }),
        prisma.feedback.count({ where: whereClause }),
      ]);

      res.json({
        success: true,
        data: feedbacks,
        meta: {
          total: totalCount,
          page,
          limit,
          totalPages: Math.ceil(totalCount / limit),
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

// GET /api/forms/:id/analytics - Detailed aggregations and days-trend
router.get(
  '/:id/analytics',
  validate(analyticsQuerySchema),
  async (req: AuthenticatedRequest, res, next) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;
      const { days } = req.query as unknown as AnalyticsQueryParams;

      const form = await prisma.form.findUnique({
        where: { id },
      });

      if (!form || form.userId !== userId) {
        throw new AppError(404, 'Form not found');
      }

      const totalCount = await prisma.feedback.count({
        where: { formId: id },
      });

      const ratingAggregate = await prisma.feedback.aggregate({
        where: { formId: id, rating: { not: null } },
        _avg: { rating: true },
      });
      const averageRating = ratingAggregate._avg.rating || 0;

      const categoryGroup = await prisma.feedback.groupBy({
        by: ['category'],
        where: { formId: id },
        _count: { category: true },
      });
      const categoryDistribution = categoryGroup.reduce((acc: Record<string, number>, curr) => {
        acc[curr.category] = curr._count.category;
        return acc;
      }, {});

      const statusGroup = await prisma.feedback.groupBy({
        by: ['status'],
        where: { formId: id },
        _count: { status: true },
      });
      const statusBreakdown = statusGroup.reduce((acc: Record<string, number>, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      }, {});

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const recentFeedbacks = await prisma.feedback.findMany({
        where: {
          formId: id,
          createdAt: { gte: startDate },
        },
        select: { createdAt: true },
      });

      const trendMap: Record<string, number> = {};
      for (let i = 0; i <= days; i++) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];
        trendMap[dateStr] = 0;
      }

      recentFeedbacks.forEach((f) => {
        const dateStr = f.createdAt.toISOString().split('T')[0];
        if (trendMap[dateStr] !== undefined) {
          trendMap[dateStr]++;
        }
      });

      const trend = Object.entries(trendMap)
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date));

      res.json({
        success: true,
        data: {
          totalCount,
          averageRating,
          categoryDistribution,
          statusBreakdown,
          trend,
        },
      });
    } catch (error) {
      next(error);
    }
  },
);

export default router;
