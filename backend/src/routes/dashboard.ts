import { Router } from 'express';
import prisma from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import type { ApiResponse } from '../types.js';

const router = Router();
router.use(requireAuth);

// GET /api/dashboard/summary - Cross-form overview statistics
router.get('/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;

    // 1. Fetch user forms
    const forms = await prisma.form.findMany({
      where: { userId },
      select: { id: true, isActive: true },
    });

    const totalForms = forms.length;
    const activeForms = forms.filter((f) => f.isActive).length;
    const formIds = forms.map((f) => f.id);

    if (formIds.length === 0) {
      const response: ApiResponse<unknown> = {
        success: true,
        data: {
          totalForms: 0,
          activeForms: 0,
          totalFeedbacks: 0,
          averageRating: 0,
          statusBreakdown: {
            RECEIVED: 0,
            IN_PROGRESS: 0,
            RESOLVED: 0,
          },
        },
      };
      return res.json(response);
    }

    // 2. Fetch feedback count and rating averages
    const aggregates = await prisma.feedback.aggregate({
      where: { formId: { in: formIds } },
      _count: { id: true },
      _avg: { rating: true },
    });

    const totalFeedbacks = aggregates._count.id;
    const averageRating = aggregates._avg.rating || 0;

    // 3. Status breakdown
    const statusGroups = await prisma.feedback.groupBy({
      by: ['status'],
      where: { formId: { in: formIds } },
      _count: { status: true },
    });

    const statusBreakdown = statusGroups.reduce(
      (acc: Record<string, number>, curr) => {
        acc[curr.status] = curr._count.status;
        return acc;
      },
      {
        RECEIVED: 0,
        IN_PROGRESS: 0,
        RESOLVED: 0,
      }
    );

    const response: ApiResponse<unknown> = {
      success: true,
      data: {
        totalForms,
        activeForms,
        totalFeedbacks,
        averageRating,
        statusBreakdown,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
