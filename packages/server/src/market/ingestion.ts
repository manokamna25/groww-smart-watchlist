import { prisma } from '../config/database';
import { MarketDataSource, Tick } from './adapter';
import { simulatedMarketSource } from './simulatedSource';
import { scoreTick, TickInput } from '../intelligence/scorer';
import { generateNarrative } from '../intelligence/narrator';
import { redisPub } from '../config/redis';
import { socketGateway } from '../ws/gateway';

export class IngestionEngine {
  private dataSource: MarketDataSource;
  private history: Map<string, TickInput[]> = new Map();
  private indexHistory: TickInput[] = [];

  constructor(dataSource: MarketDataSource = simulatedMarketSource) {
    this.dataSource = dataSource;
  }

  public async seedInstruments() {
    const instruments = simulatedMarketSource.getInstruments();
    for (const inst of instruments) {
      await prisma.instrument.upsert({
        where: { symbol: inst.symbol },
        update: {
          name: inst.name,
          exchange: inst.exchange,
          sector: inst.sector,
        },
        create: {
          symbol: inst.symbol,
          name: inst.name,
          exchange: inst.exchange,
          sector: inst.sector,
        },
      });
    }
  }

  public async processTick(tick: Tick) {
    // 1. Persist tick to DB
    const savedTick = await prisma.priceTick.create({
      data: {
        symbol: tick.symbol,
        price: tick.price,
        volume: tick.volume,
        exchangeTs: tick.exchangeTs,
        source: tick.source,
      },
    });

    const payload = {
      id: savedTick.id,
      symbol: tick.symbol,
      price: tick.price,
      volume: tick.volume,
      exchangeTs: tick.exchangeTs.toISOString(),
      source: tick.source,
    };

    // 2. Publish tick to Redis channel + direct gateway broadcast
    if (redisPub.status === 'ready') {
      await redisPub.publish(`tick:${tick.symbol}`, JSON.stringify(payload));
    } else {
      socketGateway.broadcastDirect(tick.symbol, 'tick', payload);
    }

    // 3. Track rolling history (~20 ticks)
    if (tick.symbol === 'NIFTY_INDEX') {
      this.indexHistory.push({ price: tick.price, volume: tick.volume });
      if (this.indexHistory.length > 20) this.indexHistory.shift();
      return savedTick;
    }

    const symbolHistory = this.history.get(tick.symbol) || [];
    
    // Evaluate change intelligence if we have previous history
    if (symbolHistory.length > 0) {
      const currentIndexTick = this.indexHistory.length > 0 ? this.indexHistory[this.indexHistory.length - 1] : undefined;
      const scored = scoreTick(
        { price: tick.price, volume: tick.volume },
        symbolHistory,
        currentIndexTick,
        this.indexHistory
      );

      // Persist notable+ change events to DB
      if (scored.tier !== 'quiet') {
        const narrative = generateNarrative(
          tick.symbol,
          scored.pricePctChange,
          scored.indexPctChange,
          scored.signals
        );

        const changeEvent = await prisma.changeEvent.create({
          data: {
            symbol: tick.symbol,
            ts: tick.exchangeTs,
            tier: scored.tier,
            score: scored.score,
            narrative,
            signals: scored.signals as any,
          },
        });

        const eventPayload = {
          id: changeEvent.id,
          symbol: changeEvent.symbol,
          ts: changeEvent.ts.toISOString(),
          tier: changeEvent.tier,
          score: changeEvent.score,
          narrative: changeEvent.narrative,
          signals: changeEvent.signals,
          createdAt: changeEvent.createdAt.toISOString(),
        };

        // Publish event to Redis channel + direct gateway broadcast
        if (redisPub.status === 'ready') {
          await redisPub.publish(`event:${tick.symbol}`, JSON.stringify(eventPayload));
        } else {
          socketGateway.broadcastDirect(tick.symbol, 'change_event', eventPayload);
        }
      }
    }

    symbolHistory.push({ price: tick.price, volume: tick.volume });
    if (symbolHistory.length > 20) symbolHistory.shift();
    this.history.set(tick.symbol, symbolHistory);

    return savedTick;
  }

  public start() {
    this.dataSource.onTick(async (tick) => {
      try {
        await this.processTick(tick);
      } catch (err) {
        console.error(`Error ingesting tick for ${tick.symbol}:`, err);
      }
    });

    this.dataSource.start();
  }

  public stop() {
    this.dataSource.stop();
  }
}

export const ingestionEngine = new IngestionEngine();
