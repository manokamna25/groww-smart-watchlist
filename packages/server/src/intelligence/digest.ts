import { prisma } from '../config/database';
import { AppError } from '../middleware/errorHandler';

export async function calculateWatchlistDigest(userId: string, symbols: string[]) {
  if (symbols.length === 0) return [];

  // Fetch last viewed states for user across these symbols
  const states = await prisma.userSymbolState.findMany({
    where: {
      userId,
      symbol: { in: symbols },
    },
  });

  const stateMap = new Map(states.map((s) => [s.symbol, s]));

  // Fetch event acknowledgments for this user
  const acks = await prisma.changeAcknowledgment.findMany({
    where: {
      userId,
    },
  });
  const ackSet = new Set(acks.map((a) => a.changeEventId));

  const digest = await Promise.all(
    symbols.map(async (symbol) => {
      const state = stateMap.get(symbol);
      const lastViewedAt = state ? state.lastViewedAt : new Date(0);

      // Fetch change events after lastViewedAt
      const events = await prisma.changeEvent.findMany({
        where: {
          symbol,
          ts: { gt: lastViewedAt },
        },
        orderBy: { ts: 'desc' },
        take: 20,
      });

      const formattedEvents = events.map((e) => ({
        id: e.id,
        symbol: e.symbol,
        ts: e.ts.toISOString(),
        tier: e.tier as any,
        score: e.score,
        narrative: e.narrative,
        signals: e.signals as any,
        createdAt: e.createdAt.toISOString(),
        acknowledged: ackSet.has(e.id),
      }));

      const unseenEventsCount = formattedEvents.filter((e) => !e.acknowledged).length;

      return {
        symbol,
        unseenEventsCount,
        events: formattedEvents,
        lastViewedAt: state ? state.lastViewedAt.toISOString() : undefined,
        lastViewedPrice: state ? state.lastViewedPrice : undefined,
      };
    })
  );

  return digest;
}

export async function getEventBreakdown(eventId: string) {
  const event = await prisma.changeEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError('Change event not found', 404);
  }

  // Fetch latest stock details/price
  const latestTick = await prisma.priceTick.findFirst({
    where: { symbol: event.symbol },
    orderBy: { exchangeTs: 'desc' },
  });

  return {
    id: event.id,
    symbol: event.symbol,
    ts: event.ts.toISOString(),
    tier: event.tier,
    score: event.score,
    narrative: event.narrative,
    signals: event.signals,
    latestPrice: latestTick ? latestTick.price : null,
    createdAt: event.createdAt.toISOString(),
  };
}

export async function acknowledgeEvent(userId: string, eventId: string) {
  const event = await prisma.changeEvent.findUnique({
    where: { id: eventId },
  });

  if (!event) {
    throw new AppError('Change event not found', 404);
  }

  const ack = await prisma.changeAcknowledgment.upsert({
    where: {
      userId_changeEventId: {
        userId,
        changeEventId: eventId,
      },
    },
    update: {
      status: 'acknowledged',
    },
    create: {
      userId,
      changeEventId: eventId,
      status: 'acknowledged',
    },
  });

  return {
    success: true,
    eventId: ack.changeEventId,
    status: ack.status,
    updatedAt: ack.updatedAt.toISOString(),
  };
}
