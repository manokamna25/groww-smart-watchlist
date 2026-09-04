import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import { getEventBreakdown, acknowledgeEvent } from './digest';
import { prisma } from '../config/database';

export const intelligenceRouter = Router();

// Protect intelligence endpoints with JWT auth
intelligenceRouter.use(authMiddleware);

intelligenceRouter.get('/sync', async (req: AuthenticatedRequest, res, next) => {
  try {
    const afterTs = req.query.afterTs as string;
    if (!afterTs) return res.json([]);
    
    const date = new Date(afterTs);
    if (isNaN(date.getTime())) return res.json([]);

    const missedEvents = await prisma.changeEvent.findMany({
      where: { ts: { gt: date } },
      orderBy: { ts: 'asc' },
      take: 50,
    });

    const formattedEvents = missedEvents.map((e) => ({
      id: e.id,
      symbol: e.symbol,
      ts: e.ts.toISOString(),
      tier: e.tier,
      score: e.score,
      narrative: e.narrative,
      signals: e.signals,
      confidence: e.confidence,
      createdAt: e.createdAt.toISOString(),
    }));

    res.json(formattedEvents);
  } catch (err) {
    next(err);
  }
});

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
