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

export function ConfidenceBadge({ confidence }: { confidence?: 'high' | 'medium' | 'low' }) {
  if (!confidence) return null;
  const config = {
    high: { color: 'text-groww-green', bg: 'bg-groww-green/10', label: 'High Confidence' },
    medium: { color: 'text-tier-meaningful', bg: 'bg-tier-meaningful/10', label: 'Medium Confidence' },
    low: { color: 'text-tier-critical', bg: 'bg-tier-critical/10', label: 'Low Confidence' },
  };
  const { color, bg, label } = config[confidence] || config.medium;
  return (
    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-sm ${color} ${bg} ml-2 uppercase tracking-wide`}>
      {label}
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
            <ConfidenceBadge confidence={event.confidence} />
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

export function ShowMathPanel({ signals, score, tier, confidence }: {
  signals: any;
  score: number;
  tier: string;
  confidence?: 'high' | 'medium' | 'low';
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
        <ConfidenceBadge confidence={confidence} />
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

export function AiExplainerChat({ symbol, event, onClose }: { symbol: string, event: any, onClose: () => void }) {
  const [phase, setPhase] = React.useState<number>(0);
  
  React.useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400); // show user message
    const t2 = setTimeout(() => setPhase(2), 1000); // show AI typing
    const t3 = setTimeout(() => setPhase(3), 2500); // show AI response
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [event]);

  let aiResponse = "";
  if (event) {
    if (event.signals?.volume_ratio > 3) {
      aiResponse = `I detected a massive ${event.signals.volume_ratio.toFixed(1)}x surge in trade volume compared to the rolling average, accompanied by a ${event.signals.z.toFixed(1)} standard deviation price move. This indicates extreme institutional activity, likely a breakout or capitulation event depending on the overall market trend.`;
    } else if (event.signals?.z < -3) {
      aiResponse = `The asset just experienced a ${event.signals.z.toFixed(1)} sigma downside move relative to its recent volatility. This is a highly abnormal statistical event (a "black swan" micro-crash). Our Black-Scholes engine also shows a corresponding spike in implied volatility.`;
    } else {
      aiResponse = `I spotted a ${event.signals.z > 0 ? 'bullish' : 'bearish'} statistical anomaly. The Z-Score of ${event.signals.z.toFixed(2)} means this move is highly unusual compared to ${symbol}'s normal behavior. ${event.narrative}`;
    }
  }

  return (
    <div className="card bg-groww-surface-1 border border-groww-green/20 animate-fade-in flex flex-col gap-4 relative">
      <div className="absolute top-3 right-3 flex gap-2">
        <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xs p-1 font-bold">✕</button>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xl">✨</span>
        <span className="text-sm font-bold text-white tracking-wide">Groww AI Analyst</span>
      </div>

      <div className="space-y-4">
        {/* User Message */}
        <div className={`flex flex-col items-end transition-all duration-500 ${phase >= 1 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-groww-green/10 text-groww-green border border-groww-green/20 px-4 py-2 rounded-2xl rounded-tr-sm text-sm max-w-[85%] shadow-sm">
            Explain the recent anomaly on {symbol}.
          </div>
        </div>

        {/* AI Typing / Response */}
        <div className={`flex flex-col items-start transition-all duration-500 ${phase >= 2 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
          <div className="bg-white/5 border border-white/10 text-white/90 px-4 py-3 rounded-2xl rounded-tl-sm text-sm max-w-[95%] shadow-md leading-relaxed min-h-[44px]">
            {phase === 2 && (
              <div className="flex gap-1 items-center h-5">
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '150ms' }} />
                <span className="w-1.5 h-1.5 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '300ms' }} />
              </div>
            )}
            {phase === 3 && (
              <div className="animate-fade-in">
                {aiResponse}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
