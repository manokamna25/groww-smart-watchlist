import React from 'react';

const TIER_STYLES: Record<string, string> = {
  quiet: 'badge-quiet',
  notable: 'badge-notable',
  meaningful: 'badge-meaningful',
  critical: 'badge-critical',
};

export function ChangeBadge({ tier, count }: { tier: string; count?: number }) {
  return (
    <span className={`badge ${TIER_STYLES[tier] || 'badge-quiet'}`}>
      {tier.toUpperCase()}
      {count !== undefined && count > 0 && <span className="ml-1">({count})</span>}
    </span>
  );
}

export function FreshnessBadge({ freshness }: { freshness: 'live' | 'delayed' | 'stale' }) {
  const cls = freshness === 'live' ? 'badge-live' : freshness === 'delayed' ? 'badge-delayed' : 'badge-stale';
  return (
    <span className={`badge ${cls}`}>
      {freshness === 'live' && <span className="w-1.5 h-1.5 rounded-full bg-freshness-live mr-1 animate-pulse-soft" />}
      {freshness.toUpperCase()}
    </span>
  );
}

export function PriceDisplay({ price, changePct }: { price: number; changePct?: number }) {
  const isPositive = (changePct ?? 0) >= 0;
  return (
    <div className="text-right">
      <div className="font-mono font-semibold text-groww-text-primary">
        ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
      </div>
      {changePct !== undefined && (
        <div className={`text-xs font-mono ${isPositive ? 'text-groww-green' : 'text-tier-critical'}`}>
          {isPositive ? '+' : ''}{changePct.toFixed(2)}%
        </div>
      )}
    </div>
  );
}

export function NarrativeCard({ event, onShowMath, onAck }: {
  event: any;
  onShowMath?: (eventId: string) => void;
  onAck?: (eventId: string) => void;
}) {
  return (
    <div className={`card animate-slide-up ${event.acknowledged ? 'opacity-60' : ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <ChangeBadge tier={event.tier} />
            <span className="text-xs text-groww-text-muted">
              {new Date(event.ts).toLocaleTimeString()}
            </span>
          </div>
          <p className="text-sm text-groww-text-primary leading-relaxed">{event.narrative}</p>
        </div>
        <div className="flex flex-col gap-1">
          {onShowMath && (
            <button
              onClick={() => onShowMath(event.id)}
              className="text-xs text-groww-purple hover:text-groww-green transition-colors"
              title="Show the math"
            >
              📊
            </button>
          )}
          {onAck && !event.acknowledged && (
            <button
              onClick={() => onAck(event.id)}
              className="text-xs text-groww-text-muted hover:text-groww-green transition-colors"
              title="Dismiss"
            >
              ✓
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export function ShowMathPanel({ signals, score, tier }: {
  signals: any;
  score: number;
  tier: string;
}) {
  const rows = [
    { label: 'Z-Score', value: signals.z, desc: 'Move vs own volatility' },
    { label: 'Market-Relative', value: signals.relative_to_index, desc: 'Move vs Nifty' },
    { label: 'Volume Ratio', value: signals.volume_ratio, desc: 'vs rolling avg volume' },
    { label: 'Breakout', value: signals.breakout ? 'YES' : 'No', desc: 'Range breakout' },
    { label: 'Gap', value: signals.gap ? 'YES' : 'No', desc: 'Gap open/close' },
  ];
  return (
    <div className="card bg-groww-surface-2 animate-slide-up">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-groww-text-primary">Signal Breakdown</span>
        <ChangeBadge tier={tier} />
        <span className="text-xs text-groww-text-muted font-mono">score: {score.toFixed(2)}</span>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {rows.map((r) => (
          <div key={r.label} className="bg-groww-bg rounded-lg px-3 py-2">
            <div className="text-xs text-groww-text-muted">{r.desc}</div>
            <div className="flex justify-between items-baseline">
              <span className="text-xs font-medium text-groww-text-secondary">{r.label}</span>
              <span className={`font-mono text-sm font-semibold ${
                typeof r.value === 'number' && Math.abs(r.value) > 2 ? 'text-tier-meaningful' : 'text-groww-text-primary'
              }`}>
                {typeof r.value === 'number' ? r.value.toFixed(2) : r.value}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
