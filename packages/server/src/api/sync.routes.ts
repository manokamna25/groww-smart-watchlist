import { Router } from 'express';
import { prisma } from '../config/database';

export const syncRouter = Router();

// Endpoint for the client to fetch events missed during a WebSocket disconnection
syncRouter.post('/', async (req, res) => {
  const { since, symbols } = req.body;

  if (!since || !Array.isArray(symbols)) {
    return res.status(400).json({ error: 'Missing since timestamp or symbols array' });
  }

  const sinceDate = new Date(parseInt(since as string));

  try {
    const missedEvents = await prisma.changeEvent.findMany({
      where: {
        symbol: { in: symbols },
        createdAt: { gt: sinceDate },
      },
      orderBy: { createdAt: 'asc' }, // Replay in order
    });

    res.json(missedEvents); // Return array directly to match expected frontend structure
  } catch (error) {
    console.error('Failed to sync events:', error);
    res.status(500).json({ error: 'Failed to sync events' });
  }
});
