import WebSocket from 'ws';
import { MarketDataSource, Tick } from './adapter';
import { InstrumentProfile } from './simulatedSource';

export class BinanceMarketDataSource implements MarketDataSource {
  private listeners: ((tick: Tick) => void | Promise<void>)[] = [];
  private ws: WebSocket | null = null;
  private instruments: Map<string, InstrumentProfile> = new Map();

  constructor() {
    this.initInstruments();
  }

  public start() {
    this.connect();
  }

  public stop() {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  private initInstruments() {
    const seed: Omit<InstrumentProfile, 'currentPrice'>[] = [
      { symbol: 'BTCUSDT', name: 'Bitcoin / TetherUS', exchange: 'BINANCE', sector: 'Crypto', basePrice: 60000, baseVolume: 1000, volatility: 0.03, indexCorrelation: 0.8 },
      { symbol: 'ETHUSDT', name: 'Ethereum / TetherUS', exchange: 'BINANCE', sector: 'Crypto', basePrice: 3000, baseVolume: 10000, volatility: 0.04, indexCorrelation: 0.9 },
    ];

    for (const item of seed) {
      this.instruments.set(item.symbol, {
        ...item,
        currentPrice: item.basePrice,
      });
    }
  }

  private connect() {
    const symbols = Array.from(this.instruments.keys()).map(s => s.toLowerCase());
    const streams = symbols.map(s => `${s}@trade`).join('/');
    const url = `wss://stream.binance.com:9443/ws/${streams}`;

    this.ws = new WebSocket(url);

    this.ws.on('open', () => {
      console.log('Connected to Binance Live WebSocket');
    });

    this.ws.on('message', (data: WebSocket.Data) => {
      try {
        const payload = JSON.parse(data.toString());
        // Binance @trade event: { e: "trade", s: "BTCUSDT", p: "60000.00", q: "0.01", T: 16123456789 }
        if (payload.e === 'trade' && payload.s && payload.p && payload.q) {
          const symbol = payload.s;
          const price = parseFloat(payload.p);
          const volume = parseFloat(payload.q) * price; // dollar volume
          const exchangeTs = new Date(payload.T);

          // Update current price
          const inst = this.instruments.get(symbol);
          if (inst) {
            inst.currentPrice = price;
          }

          const tick: Tick = {
            symbol,
            price,
            volume,
            exchangeTs,
            source: 'BINANCE'
          };

          for (const listener of this.listeners) {
            listener(tick);
          }
        }
      } catch (err) {
        console.error('Binance message parse error:', err);
      }
    });

    this.ws.on('error', (err) => {
      console.error('Binance WebSocket error:', err);
    });

    this.ws.on('close', () => {
      console.log('Binance WebSocket closed, reconnecting in 5s...');
      setTimeout(() => this.connect(), 5000);
    });
  }

  public getInstruments(): InstrumentProfile[] {
    return Array.from(this.instruments.values());
  }

  public onTick(callback: (tick: Tick) => void | Promise<void>): void {
    this.listeners.push(callback);
  }
}

export const binanceMarketSource = new BinanceMarketDataSource();
