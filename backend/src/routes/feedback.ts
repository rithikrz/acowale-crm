import { Router } from 'express';
import prisma from '../db.js';
import { requireAuth, type AuthenticatedRequest } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import type { ApiResponse } from '../types.js';

const router = Router();
router.use(requireAuth);

// GET /api/feedback - Retrieve feedback submissions scoped to user's forms
router.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { formId } = req.query;

    // Build form query filter
    const formFilter: { userId: string; id?: string } = { userId };
    if (formId && typeof formId === 'string') {
      // Verify ownership of the specified form
      const ownedForm = await prisma.form.findFirst({
        where: { id: formId, userId },
      });
      if (!ownedForm) {
        throw new AppError(403, 'You do not have permission to view feedback for this form');
      }
      formFilter.id = formId;
    }

    const feedbacks = await prisma.feedback.findMany({
      where: {
        form: formFilter,
      },
      include: {
        form: {
          select: { title: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const response: ApiResponse<unknown> = {
      success: true,
      data: feedbacks.map((f) => ({
        id: f.id,
        formId: f.formId,
        formTitle: f.form.title,
        category: f.category,
        comment: f.comment,
        email: f.email,
        rating: f.rating,
        status: f.status,
        createdAt: f.createdAt.toISOString(),
      })),
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

// PATCH /api/feedback/:id/status - Update feedback status (Received, In Progress, Resolved)
router.patch('/:id/status', async (req: AuthenticatedRequest, res, next) => {
  try {
    const userId = req.user!.id;
    const { id } = req.params;
    const { status } = req.body;

    if (!['RECEIVED', 'IN_PROGRESS', 'RESOLVED'].includes(status)) {
      throw new AppError(400, 'Invalid status value. Must be RECEIVED, IN_PROGRESS, or RESOLVED');
    }

    // Find the feedback item and verify ownership of the form it belongs to
    const feedback = await prisma.feedback.findUnique({
      where: { id },
      include: { form: true },
    });

    if (!feedback) {
      throw new AppError(404, 'Feedback not found');
    }

    if (feedback.form.userId !== userId) {
      throw new AppError(403, 'You do not have permission to modify this feedback');
    }

    const updatedFeedback = await prisma.feedback.update({
      where: { id },
      data: { status },
    });

    const response: ApiResponse<unknown> = {
      success: true,
      message: 'Status updated successfully',
      data: {
        id: updatedFeedback.id,
        status: updatedFeedback.status,
      },
    };

    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;
