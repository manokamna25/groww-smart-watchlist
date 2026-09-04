import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { calculateWatchlistDigest } from '../intelligence/digest';

export async function getUserWatchlists(userId: string) {
  const watchlists = await prisma.watchlist.findMany({
    where: { userId },
    include: {
      items: {
        orderBy: { addedAt: 'asc' },
      },
    },
    orderBy: { createdAt: 'asc' },
  });
  return watchlists;
}

export async function createWatchlist(userId: string, name: string) {
  if (!name || !name.trim()) {
    throw new AppError('Watchlist name is required', 400);
  }

  const watchlist = await prisma.watchlist.create({
    data: {
      userId,
      name: name.trim(),
    },
    include: {
      items: true,
    },
  });

  return watchlist;
}

export async function addWatchlistItem(userId: string, watchlistId: string, symbol: string) {
  if (!symbol || !symbol.trim()) {
    throw new AppError('Symbol is required', 400);
  }

  const cleanSymbol = symbol.trim().toUpperCase();

  const watchlist = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
  });

  if (!watchlist) {
    throw new AppError('Watchlist not found', 404);
  }

  const existingItem = await prisma.watchlistItem.findUnique({
    where: {
      watchlistId_symbol: {
        watchlistId,
        symbol: cleanSymbol,
      },
    },
  });

  if (existingItem) {
    throw new AppError(`Symbol ${cleanSymbol} is already in this watchlist`, 409);
  }

  const item = await prisma.watchlistItem.create({
    data: {
      watchlistId,
      symbol: cleanSymbol,
    },
  });

  // Ensure default UserSymbolState exists
  await prisma.userSymbolState.upsert({
    where: {
      userId_symbol: {
        userId,
        symbol: cleanSymbol,
      },
    },
    update: {},
    create: {
      userId,
      symbol: cleanSymbol,
      lastViewedAt: new Date(0), // Epoch start means all past events are unseen
      lastViewedPrice: 0.0,
    },
  });

  return item;
}

export async function removeWatchlistItem(userId: string, watchlistId: string, symbol: string) {
  const cleanSymbol = symbol.trim().toUpperCase();

  const watchlist = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
  });

  if (!watchlist) {
    throw new AppError('Watchlist not found', 404);
  }

  const item = await prisma.watchlistItem.findUnique({
    where: {
      watchlistId_symbol: {
        watchlistId,
        symbol: cleanSymbol,
      },
    },
  });

  if (!item) {
    throw new AppError(`Symbol ${cleanSymbol} not found in watchlist`, 404);
  }

  await prisma.watchlistItem.delete({
    where: { id: item.id },
  });

  return { success: true, message: `Removed ${cleanSymbol} from watchlist` };
}

export async function ackWatchlistItem(userId: string, watchlistId: string, symbol: string) {
  const cleanSymbol = symbol.trim().toUpperCase();

  const watchlist = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
  });

  if (!watchlist) {
    throw new AppError('Watchlist not found', 404);
  }

  // Get latest price tick if available
  const latestTick = await prisma.priceTick.findFirst({
    where: { symbol: cleanSymbol },
    orderBy: { exchangeTs: 'desc' },
  });

  const now = new Date();
  const price = latestTick ? latestTick.price : 0.0;

  const state = await prisma.userSymbolState.upsert({
    where: {
      userId_symbol: {
        userId,
        symbol: cleanSymbol,
      },
    },
    update: {
      lastViewedAt: now,
      lastViewedPrice: price,
    },
    create: {
      userId,
      symbol: cleanSymbol,
      lastViewedAt: now,
      lastViewedPrice: price,
    },
  });

  return { success: true, symbol: cleanSymbol, lastViewedAt: state.lastViewedAt, lastViewedPrice: state.lastViewedPrice };
}

export async function getWatchlistSummary(userId: string, watchlistId: string, sensitivity: string = 'balanced') {
  const watchlist = await prisma.watchlist.findFirst({
    where: { id: watchlistId, userId },
    include: {
      items: true,
    },
  });

  if (!watchlist) {
    throw new AppError('Watchlist not found', 404);
  }

  const symbolList = watchlist.items.map((item) => item.symbol);
  let digest = await calculateWatchlistDigest(userId, symbolList);

  // Apply sensitivity filter
  digest = digest.map(d => {
    const filteredEvents = d.events.filter(e => {
      if (sensitivity === 'conservative' && e.tier !== 'critical') return false;
      if (sensitivity === 'balanced' && e.tier === 'notable') return false;
      return true;
    });
    return {
      ...d,
      events: filteredEvents,
      unseenEventsCount: filteredEvents.filter(e => !e.acknowledged).length
    };
  }).filter(d => d.events.length > 0);

  let unseenEvents = 0;
  let criticalEvents = 0;
  let sectorEvents = 0;
  let highestScoreEvent: any = null;

  for (const d of digest) {
    unseenEvents += d.unseenEventsCount;
    for (const e of d.events) {
      if (!e.acknowledged) {
        if (e.tier === 'critical') criticalEvents++;
        if (e.symbol.startsWith('SECTOR_')) sectorEvents++;
        
        if (!highestScoreEvent || e.score > highestScoreEvent.score) {
          highestScoreEvent = e;
        }
      }
    }
  }

  let globalSummary = null;
  if (unseenEvents > 0) {
    let summaryText = `While you were away: ${unseenEvents} anomalies detected`;
    if (sectorEvents > 0) {
      summaryText += ` (${sectorEvents} Sector, ${unseenEvents - sectorEvents} Individual). `;
    } else {
      summaryText += `. `;
    }
    
    if (criticalEvents > 0) {
      summaryText += `${criticalEvents} CRITICAL. `;
    }
    
    if (highestScoreEvent && highestScoreEvent.symbol) {
      summaryText += `Biggest mover: ${highestScoreEvent.symbol.replace('SECTOR_', '')}.`;
    }
    globalSummary = summaryText;
  }

  return {
    watchlist: {
      id: watchlist.id,
      userId: watchlist.userId,
      name: watchlist.name,
      createdAt: watchlist.createdAt.toISOString(),
      items: watchlist.items.map((item) => ({
        id: item.id,
        watchlistId: item.watchlistId,
        symbol: item.symbol,
        addedAt: item.addedAt.toISOString(),
      })),
    },
    digest,
    globalSummary,
  };
}
