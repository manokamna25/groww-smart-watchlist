import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getEventBreakdown, acknowledgeEvent } from './digest';

export const intelligenceRouter = Router();

// Protect intelligence endpoints with JWT auth
intelligenceRouter.use(authMiddleware);

intelligenceRouter.get('/events/:id/breakdown', async (req: AuthenticatedRequest, res, next) => {
  try {
    const breakdown = await getEventBreakdown(req.params.id);
    res.json(breakdown);
  } catch (err) {
    next(err);
  }
});

intelligenceRouter.post('/events/:id/ack', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await acknowledgeEvent(req.user!.userId, req.params.id);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
