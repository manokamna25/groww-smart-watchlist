import { prisma } from '../config/database';
import { MarketDataSource, Tick } from './adapter';
import { simulatedMarketSource } from './simulatedSource';
import { scoreTick, TickInput } from '../intelligence/scorer';
import { generateNarrative } from '../intelligence/narrator';
import { redisPub } from '../config/redis';
import { socketGateway } from '../ws/gateway';
import { optionsService } from './options.service';

const TIER_LEVELS: Record<string, number> = { quiet: 0, notable: 1, meaningful: 2, critical: 3 };

export class IngestionEngine {
  private dataSource: MarketDataSource;
  private history: Map<string, TickInput[]> = new Map();
  private indexHistory: TickInput[] = [];
  private lastFired: Map<string, { tier: string, ts: number }> = new Map();
  private sectorAnomalies: Map<string, { symbol: string, direction: 'up' | 'down', ts: number }[]> = new Map();
  private instrumentSectors: Map<string, string> = new Map();
  private lastProcessedTs: Map<string, number> = new Map();

  constructor(dataSource: MarketDataSource = simulatedMarketSource) {
    this.dataSource = dataSource;
    const instruments = simulatedMarketSource.getInstruments();
    for (const inst of instruments) {
      this.instrumentSectors.set(inst.symbol, inst.sector);
    }
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
    // 0. Out-of-order tick rejection (Data Integrity)
    const incomingTs = tick.exchangeTs.getTime();
    const lastTs = this.lastProcessedTs.get(tick.symbol) || 0;
    if (incomingTs < lastTs) {
      console.warn(`[Data Integrity] Discarded out-of-order tick for ${tick.symbol}. Incoming: ${incomingTs}, Last: ${lastTs}`);
      return null;
    }
    this.lastProcessedTs.set(tick.symbol, incomingTs);

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

    // Generate and publish Options Chain for this tick
    try {
      // Assuming a default daily volatility of 0.015 for the options generation if we don't have the exact profile here
      const optionsChain = optionsService.generateChain(tick.symbol, tick.price, 0.015);
      if (redisPub.status === 'ready') {
        await redisPub.publish(`options:tick:${tick.symbol}`, JSON.stringify(optionsChain));
      } else {
        socketGateway.broadcastDirect(tick.symbol, 'options:tick', optionsChain);
      }
    } catch (err) {
      console.error('Failed to generate options chain:', err);
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

      let shouldFire = false;
      if (scored.tier !== 'quiet') {
        const lastEvent = this.lastFired.get(tick.symbol);
        const now = Date.now();
        const COOLDOWN_MS = 60000;

        if (!lastEvent) {
          shouldFire = true;
        } else {
          const timeSinceLast = now - lastEvent.ts;
          const isEscalation = TIER_LEVELS[scored.tier] > TIER_LEVELS[lastEvent.tier];
          if (timeSinceLast > COOLDOWN_MS || isEscalation) {
            shouldFire = true;
          }
        }
      }

      // Persist notable+ change events to DB (if they pass dedup)
      if (shouldFire) {
        this.lastFired.set(tick.symbol, { tier: scored.tier, ts: Date.now() });

        // Sector Clustering Logic
        const sector = this.instrumentSectors.get(tick.symbol) || 'Unknown';
        const direction = scored.pricePctChange >= 0 ? 'up' : 'down';
        const eventNow = Date.now();
        
        let anomalies = this.sectorAnomalies.get(sector) || [];
        anomalies = anomalies.filter(a => eventNow - a.ts < 60000); // 60s sliding window
        anomalies.push({ symbol: tick.symbol, direction, ts: eventNow });
        this.sectorAnomalies.set(sector, anomalies);

        const sameDirectionAnomalies = anomalies.filter(a => a.direction === direction);
        const distinctSymbols = new Set(sameDirectionAnomalies.map(a => a.symbol));

        const oppositeDirection = direction === 'up' ? 'down' : 'up';
        const oppositeAnomalies = anomalies.filter(a => a.direction === oppositeDirection);
        const distinctOppositeSymbols = new Set(oppositeAnomalies.map(a => a.symbol));

        let finalSymbol = tick.symbol;
        let narrative = generateNarrative(
          tick.symbol,
          scored.pricePctChange,
          scored.indexPctChange,
          scored.signals
        );

        if (distinctOppositeSymbols.size >= 3) {
          // Divergence detected!
          narrative = `${sector} sector is broadly moving ${oppositeDirection}, but ${tick.symbol} is aggressively moving ${direction} — stock-specific deviation detected.`;
          scored.tier = 'critical';
          scored.confidence = 'high';
          
          // Clear the window to avoid spamming events
          this.sectorAnomalies.set(sector, []);
        } else if (distinctSymbols.size >= 3) {
          // Cluster detected! Override the event payload
          finalSymbol = `SECTOR_${sector.toUpperCase().replace(/\s+/g, '_')}`;
          const symbolsList = Array.from(distinctSymbols).join(', ');
          narrative = `${sector} sector move detected: ${symbolsList} all moving ${direction} >2% together — likely a macro event.`;
          scored.tier = 'meaningful'; // Ensure cluster events are highly visible
          
          // Clear the window to avoid spamming cluster events
          this.sectorAnomalies.set(sector, []);
        }

        const changeEvent = await prisma.changeEvent.create({
          data: {
            symbol: finalSymbol,
            ts: tick.exchangeTs,
            tier: scored.tier,
            score: scored.score,
            narrative,
            signals: scored.signals as any,
            confidence: scored.confidence,
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
          confidence: changeEvent.confidence,
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
