export type ChangeTier = 'quiet' | 'notable' | 'meaningful' | 'critical';

export interface ChangeSignals {
  z: number;
  relative_to_index: number;
  volume_ratio: number;
  breakout: boolean;
  gap: boolean;
}

export interface ChangeEventDTO {
  id: string;
  symbol: string;
  ts: string;
  tier: ChangeTier;
  score: number;
  narrative: string;
  signals: ChangeSignals;
  confidence: 'high' | 'medium' | 'low';
  createdAt: string;
  acknowledged?: boolean;
}

export interface StockQuote {
  symbol: string;
  price: number;
  volume: number;
  changePct: number;
  exchangeTs: string;
  source: string;
  freshness: 'live' | 'delayed' | 'stale';
  marketClosed?: boolean;
}

export interface WatchlistItemDTO {
  id: string;
  watchlistId: string;
  symbol: string;
  addedAt: string;
  quote?: StockQuote;
  lastViewedPrice?: number;
  lastViewedAt?: string;
  hasUnseenChanges?: boolean;
}

export interface WatchlistDTO {
  id: string;
  userId: string;
  name: string;
  createdAt: string;
  items: WatchlistItemDTO[];
}

export interface WatchlistSummaryDTO {
  watchlist: WatchlistDTO;
  digest: {
    symbol: string;
    unseenEventsCount: number;
    events: ChangeEventDTO[];
    lastViewedAt?: string;
    lastViewedPrice?: number;
  }[];
}

export interface AuthResponse {
  user: {
    id: string;
    email: string;
  };
  token: string;
}
