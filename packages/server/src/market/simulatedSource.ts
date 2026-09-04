import { MarketDataSource, Tick } from './adapter';

export interface InstrumentProfile {
  symbol: string;
  name: string;
  exchange: string;
  sector: string;
  basePrice: number;
  currentPrice: number;
  baseVolume: number;
  volatility: number;
  indexCorrelation: number;
}

export class SimulatedMarketDataSource implements MarketDataSource {
  private listeners: ((tick: Tick) => void | Promise<void>)[] = [];
  private intervalId: NodeJS.Timeout | null = null;
  private instruments: Map<string, InstrumentProfile> = new Map();
  private indexPrice: number = 22000.0;
  private pendingInjections: Map<string, 'spike' | 'gap' | 'volume_anomaly'> = new Map();

  constructor() {
    this.initInstruments();
  }

  private initInstruments() {
    const seed: Omit<InstrumentProfile, 'currentPrice'>[] = [
      // Major Index Proxy
      { symbol: 'NIFTY_INDEX', name: 'Nifty 50 Index', exchange: 'NSE', sector: 'INDEX', basePrice: 22000, baseVolume: 500000, volatility: 0.003, indexCorrelation: 1.0 },
      
      // Blue Chips (High Market Correlation, Low Volatility)
      { symbol: 'RELIANCE', name: 'Reliance Industries Ltd', exchange: 'NSE', sector: 'Energy', basePrice: 2550, baseVolume: 10000, volatility: 0.005, indexCorrelation: 0.85 },
      { symbol: 'TCS', name: 'Tata Consultancy Services', exchange: 'NSE', sector: 'IT', basePrice: 3850, baseVolume: 8000, volatility: 0.004, indexCorrelation: 0.75 },
      { symbol: 'HDFCBANK', name: 'HDFC Bank Ltd', exchange: 'NSE', sector: 'Banking', basePrice: 1620, baseVolume: 15000, volatility: 0.004, indexCorrelation: 0.90 },
      { symbol: 'ICICIBANK', name: 'ICICI Bank Ltd', exchange: 'NSE', sector: 'Banking', basePrice: 1050, baseVolume: 12000, volatility: 0.005, indexCorrelation: 0.85 },
      { symbol: 'INFY', name: 'Infosys Ltd', exchange: 'NSE', sector: 'IT', basePrice: 1520, baseVolume: 9000, volatility: 0.006, indexCorrelation: 0.70 },
      { symbol: 'BHARTIARTL', name: 'Bharti Airtel Ltd', exchange: 'NSE', sector: 'Telecom', basePrice: 1120, baseVolume: 7000, volatility: 0.005, indexCorrelation: 0.65 },
      { symbol: 'ITC', name: 'ITC Ltd', exchange: 'NSE', sector: 'FMCG', basePrice: 430, baseVolume: 14000, volatility: 0.003, indexCorrelation: 0.50 },
      { symbol: 'L&T', name: 'Larsen & Toubro Ltd', exchange: 'NSE', sector: 'Capital Goods', basePrice: 3450, baseVolume: 6000, volatility: 0.006, indexCorrelation: 0.80 },
      { symbol: 'KOTAKBANK', name: 'Kotak Mahindra Bank', exchange: 'NSE', sector: 'Banking', basePrice: 1750, baseVolume: 5000, volatility: 0.005, indexCorrelation: 0.80 },
      { symbol: 'AXISBANK', name: 'Axis Bank Ltd', exchange: 'NSE', sector: 'Banking', basePrice: 1080, baseVolume: 8000, volatility: 0.007, indexCorrelation: 0.82 },

      // High Volatility / Small-cap Personalities
      { symbol: 'SUZLON', name: 'Suzlon Energy Ltd', exchange: 'NSE', sector: 'Clean Energy', basePrice: 48, baseVolume: 50000, volatility: 0.025, indexCorrelation: 0.20 },
      { symbol: 'ZOMATO', name: 'Zomato Ltd', exchange: 'NSE', sector: 'Consumer Tech', basePrice: 220, baseVolume: 35000, volatility: 0.018, indexCorrelation: 0.40 },
      { symbol: 'PAYTM', name: 'One97 Communications', exchange: 'NSE', sector: 'Fintech', basePrice: 410, baseVolume: 25000, volatility: 0.022, indexCorrelation: 0.15 },
      { symbol: 'TATAMOTORS', name: 'Tata Motors Ltd', exchange: 'NSE', sector: 'Auto', basePrice: 980, baseVolume: 18000, volatility: 0.012, indexCorrelation: 0.65 },
      { symbol: 'YESBANK', name: 'Yes Bank Ltd', exchange: 'NSE', sector: 'Banking', basePrice: 24, baseVolume: 80000, volatility: 0.030, indexCorrelation: 0.10 },
      
      // Market-Uncorrelated / Defensive Personalities
      { symbol: 'SUNPHARMA', name: 'Sun Pharmaceutical Ltd', exchange: 'NSE', sector: 'Pharma', basePrice: 1550, baseVolume: 6000, volatility: 0.006, indexCorrelation: 0.25 },
      { symbol: 'CIPLA', name: 'Cipla Ltd', exchange: 'NSE', sector: 'Pharma', basePrice: 1480, baseVolume: 5000, volatility: 0.005, indexCorrelation: 0.20 },
      { symbol: 'DIVISLAB', name: 'Divis Laboratories Ltd', exchange: 'NSE', sector: 'Pharma', basePrice: 3750, baseVolume: 4000, volatility: 0.008, indexCorrelation: 0.30 },
      { symbol: 'NTPC', name: 'NTPC Ltd', exchange: 'NSE', sector: 'Power', basePrice: 330, baseVolume: 20000, volatility: 0.004, indexCorrelation: 0.55 },
      { symbol: 'POWERGRID', name: 'Power Grid Corp', exchange: 'NSE', sector: 'Power', basePrice: 275, baseVolume: 18000, volatility: 0.004, indexCorrelation: 0.50 },

      // Additional Liquid Stocks
      { symbol: 'MARUTI', name: 'Maruti Suzuki India', exchange: 'NSE', sector: 'Auto', basePrice: 11500, baseVolume: 2000, volatility: 0.008, indexCorrelation: 0.70 },
      { symbol: 'BAJFINANCE', name: 'Bajaj Finance Ltd', exchange: 'NSE', sector: 'NBFC', basePrice: 6800, baseVolume: 3000, volatility: 0.010, indexCorrelation: 0.78 },
      { symbol: 'ASIANPAINT', name: 'Asian Paints Ltd', exchange: 'NSE', sector: 'Consumer', basePrice: 2850, baseVolume: 4000, volatility: 0.006, indexCorrelation: 0.60 },
      { symbol: 'TITAN', name: 'Titan Company Ltd', exchange: 'NSE', sector: 'Consumer', basePrice: 3600, baseVolume: 3500, volatility: 0.007, indexCorrelation: 0.65 },
      { symbol: 'ULTRACEMCO', name: 'UltraTech Cement Ltd', exchange: 'NSE', sector: 'Materials', basePrice: 9900, baseVolume: 1500, volatility: 0.006, indexCorrelation: 0.75 },
      { symbol: 'WIPRO', name: 'Wipro Ltd', exchange: 'NSE', sector: 'IT', basePrice: 480, baseVolume: 12000, volatility: 0.008, indexCorrelation: 0.65 },
      { symbol: 'HCLTECH', name: 'HCL Technologies Ltd', exchange: 'NSE', sector: 'IT', basePrice: 1540, baseVolume: 7000, volatility: 0.007, indexCorrelation: 0.70 },
      { symbol: 'COALINDIA', name: 'Coal India Ltd', exchange: 'NSE', sector: 'Mining', basePrice: 440, baseVolume: 22000, volatility: 0.007, indexCorrelation: 0.45 },
      { symbol: 'TATASTEEL', name: 'Tata Steel Ltd', exchange: 'NSE', sector: 'Metals', basePrice: 145, baseVolume: 40000, volatility: 0.012, indexCorrelation: 0.60 },
    ];

    for (const item of seed) {
      this.instruments.set(item.symbol, {
        ...item,
        currentPrice: item.basePrice,
      });
    }
  }

  public getInstruments(): InstrumentProfile[] {
    return Array.from(this.instruments.values());
  }

  public injectEvent(symbol: string, type: 'spike' | 'gap' | 'volume_anomaly') {
    const cleanSymbol = symbol.toUpperCase();
    if (!this.instruments.has(cleanSymbol)) {
      throw new Error(`Symbol ${cleanSymbol} not recognized in market simulator.`);
    }
    this.pendingInjections.set(cleanSymbol, type);
  }

  public onTick(callback: (tick: Tick) => void | Promise<void>): void {
    this.listeners.push(callback);
  }

  public generateTickForSymbol(symbol: string, indexPctChange: number = 0.0): Tick {
    const inst = this.instruments.get(symbol);
    if (!inst) throw new Error(`Symbol ${symbol} not found`);

    let priceChangePct = 0;
    let volumeMultiplier = 1.0;

    const pendingInjection = this.pendingInjections.get(symbol);
    if (pendingInjection) {
      this.pendingInjections.delete(symbol);
      if (pendingInjection === 'spike') {
        priceChangePct = (Math.random() > 0.5 ? 1 : -1) * 0.055; // 5.5% sudden move
        volumeMultiplier = 3.5;
      } else if (pendingInjection === 'gap') {
        priceChangePct = (Math.random() > 0.5 ? 1 : -1) * 0.040; // 4.0% gap
        volumeMultiplier = 2.0;
      } else if (pendingInjection === 'volume_anomaly') {
        priceChangePct = (Math.random() - 0.5) * 0.010;
        volumeMultiplier = 5.0; // 5x volume spike
      }
    } else {
      // Geometric Brownian Motion step - tuned down for highly realistic tick-by-tick behavior
      // Real stocks don't jump 0.5% every 2 seconds unless there's news.
      // We reduce the base volatility by 90% (x 0.1) so it just gently ticks up and down.
      const randomComponent = (Math.random() - 0.5) * 2 * (inst.volatility * 0.1);
      const indexComponent = indexPctChange * inst.indexCorrelation;
      priceChangePct = indexComponent + randomComponent;
      volumeMultiplier = 0.9 + Math.random() * 0.2; // Keep volume stable (0.9x to 1.1x)
    }

    const newPrice = Math.max(1.0, Number((inst.currentPrice * (1 + priceChangePct)).toFixed(2)));
    const newVolume = Math.round(inst.baseVolume * volumeMultiplier);

    inst.currentPrice = newPrice;

    return {
      symbol: inst.symbol,
      price: newPrice,
      volume: newVolume,
      exchangeTs: new Date(),
      source: 'SIMULATED_NSE',
    };
  }

  public stepAll(): Tick[] {
    // 1. Generate Index tick first
    const indexInst = this.instruments.get('NIFTY_INDEX')!;
    const indexChange = (Math.random() - 0.5) * 2 * indexInst.volatility;
    const indexTick = this.generateTickForSymbol('NIFTY_INDEX', indexChange);
    const indexPctChange = indexChange;

    const ticks: Tick[] = [indexTick];

    // 2. Generate ticks for all other stocks correlated to index
    for (const symbol of this.instruments.keys()) {
      if (symbol === 'NIFTY_INDEX') continue;
      const tick = this.generateTickForSymbol(symbol, indexPctChange);
      ticks.push(tick);
    }

    // 3. Notify listeners
    for (const tick of ticks) {
      for (const cb of this.listeners) {
        cb(tick);
      }
    }

    return ticks;
  }

  public start(intervalMs: number = 2000): void {
    if (this.intervalId) return;
    this.intervalId = setInterval(() => {
      this.stepAll();
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }
}

// Global singleton instance for app runtime
export const simulatedMarketSource = new SimulatedMarketDataSource();
