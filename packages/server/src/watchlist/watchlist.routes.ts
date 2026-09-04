import { Router } from 'express';
import { authMiddleware, AuthenticatedRequest } from '../middleware/auth';
import {
  getUserWatchlists,
  createWatchlist,
  addWatchlistItem,
  removeWatchlistItem,
  ackWatchlistItem,
  getWatchlistSummary,
} from './watchlist.service';

export const watchlistRouter = Router();

// Protect all watchlist routes with JWT auth
watchlistRouter.use(authMiddleware);

watchlistRouter.get('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const watchlists = await getUserWatchlists(req.user!.userId);
    res.json(watchlists);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.post('/', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { name } = req.body;
    const watchlist = await createWatchlist(req.user!.userId, name);
    res.status(201).json(watchlist);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.get('/:id/summary', async (req: AuthenticatedRequest, res, next) => {
  try {
    const summary = await getWatchlistSummary(req.user!.userId, req.params.id);
    res.json(summary);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.post('/:id/items', async (req: AuthenticatedRequest, res, next) => {
  try {
    const { symbol } = req.body;
    const item = await addWatchlistItem(req.user!.userId, req.params.id, symbol);
    res.status(201).json(item);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.delete('/:id/items/:symbol', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await removeWatchlistItem(req.user!.userId, req.params.id, req.params.symbol);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

watchlistRouter.post('/:id/items/:symbol/ack', async (req: AuthenticatedRequest, res, next) => {
  try {
    const result = await ackWatchlistItem(req.user!.userId, req.params.id, req.params.symbol);
    res.json(result);
  } catch (err) {
    next(err);
  }
});
