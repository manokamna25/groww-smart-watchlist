import React, { useState, useRef } from 'react';
import { toPng } from 'html-to-image';

interface OrderTicketModalProps {
  symbol: string;
  action: 'BUY' | 'SELL';
  price: number;
  eventTier?: string;
  onClose: () => void;
}

export function OrderTicketModal({ symbol, action, price, eventTier, onClose }: OrderTicketModalProps) {
  const [quantity, setQuantity] = useState(10);
  const [status, setStatus] = useState<'idle' | 'executing' | 'success'>('idle');
  const cardRef = useRef<HTMLDivElement>(null);

  const totalValue = quantity * price;

  const handleExecute = () => {
    setStatus('executing');
    setTimeout(() => {
      setStatus('success');
    }, 1500);
  };

  const handleShare = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      
      if (navigator.share) {
        const res = await fetch(dataUrl);
        const blob = await res.blob();
        const file = new File([blob], 'smart-catch.png', { type: 'image/png' });
        await navigator.share({
          title: 'Groww AI Smart Catch',
          text: `Just caught a massive anomaly on ${symbol} using Groww SmartWatch AI! 🚀`,
          files: [file]
        });
      } else {
        const link = document.createElement('a');
        link.download = `Groww-Catch-${symbol}.png`;
        link.href = dataUrl;
        link.click();
      }
    } catch (e) {
      console.error('Share failed', e);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm bg-[#121212] border border-white/10 rounded-3xl shadow-2xl overflow-hidden relative">
        
        {/* Header */}
        <div className={`px-6 py-4 border-b border-white/5 flex items-center justify-between ${action === 'BUY' ? 'bg-[#00D09C]/10' : 'bg-[#EF4444]/10'}`}>
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">{symbol}</h2>
            <span className="text-xs font-mono text-white/50">NSE EQUITIES</span>
          </div>
          <button onClick={onClose} className="text-white/40 hover:text-white transition-colors text-xl">✕</button>
        </div>

        {/* Body */}
        <div className="p-6">
          
          <div className="flex justify-between items-end mb-8">
            <span className="text-white/60 text-sm">Market Price</span>
            <span className={`text-2xl font-mono font-bold ${action === 'BUY' ? 'text-[#00D09C]' : 'text-[#EF4444]'}`}>
              ₹{price.toFixed(2)}
            </span>
          </div>

          {/* Quantity Controls */}
          <div className="mb-8 bg-white/[0.03] border border-white/10 rounded-xl p-4">
            <label className="text-xs text-white/50 uppercase tracking-widest block mb-3 font-semibold">Quantity</label>
            <div className="flex items-center justify-between">
              <button 
                onClick={() => setQuantity(Math.max(1, quantity - 10))}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 font-bold transition-colors"
              >-</button>
              <span className="text-xl font-mono font-bold text-white">{quantity}</span>
              <button 
                onClick={() => setQuantity(quantity + 10)}
                className="w-10 h-10 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/80 font-bold transition-colors"
              >+</button>
            </div>
          </div>

          <div className="flex justify-between items-center mb-6 px-1">
            <span className="text-white/60 text-sm">Estimated Total</span>
            <span className="text-lg font-mono font-bold text-white">₹{totalValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
          </div>

          {/* Action Button */}
          {status === 'idle' && (
            <button
              onClick={handleExecute}
              className={`w-full py-4 rounded-xl font-bold text-lg shadow-lg hover:shadow-xl transition-all active:scale-95 flex items-center justify-center gap-2 ${
                action === 'BUY' 
                  ? 'bg-groww-green text-black shadow-groww-green/20 hover:bg-[#00E5AA]' 
                  : 'bg-red-500 text-white shadow-red-500/20 hover:bg-red-400'
              }`}
            >
              {action} {symbol}
            </button>
          )}

          {status === 'executing' && (
            <button disabled className="w-full py-4 rounded-xl font-bold text-lg bg-white/10 text-white/50 flex items-center justify-center gap-3">
              <div className="w-5 h-5 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
              Processing...
            </button>
          )}

          {status === 'success' && (
            <div className="animate-slide-up flex flex-col gap-4">
              
              {/* Brag Card (Captured by html-to-image) */}
              <div ref={cardRef} className="bg-gradient-to-br from-[#121212] to-[#1a1a24] p-6 rounded-2xl border border-groww-green/30 shadow-[0_0_40px_rgba(0,208,156,0.15)] relative overflow-hidden">
                <div className="absolute top-0 right-0 w-32 h-32 bg-groww-green/10 rounded-full blur-3xl" />
                
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-groww-green to-blue-500 flex items-center justify-center">
                    <span className="text-white font-black text-sm">W</span>
                  </div>
                  <span className="font-bold text-white tracking-wide">Groww SmartWatch</span>
                </div>
                
                <div className="text-3xl font-black text-white mb-1">{symbol}</div>
                <div className="text-sm font-mono text-groww-green mb-6">EXEC @ ₹{price.toFixed(2)}</div>
                
                <div className="bg-black/40 border border-white/5 rounded-xl p-4 backdrop-blur-md">
                  <div className="text-xs text-white/50 uppercase tracking-widest font-semibold mb-2">AI Catalyst</div>
                  <div className="text-sm text-white/90">
                    Caught a <span className="text-groww-green font-bold">{(eventTier || 'Critical').toUpperCase()}</span> anomaly seconds before the breakout.
                  </div>
                </div>
              </div>

              {/* Share / Done Actions */}
              <div className="flex gap-3">
                <button 
                  onClick={handleShare}
                  className="flex-1 py-3.5 rounded-xl font-bold bg-[#1DA1F2] text-white shadow-[#1DA1F2]/20 hover:bg-[#1A91DA] transition-colors flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24"><path d="M23.953 4.57a10 10 0 01-2.825.775 4.958 4.958 0 002.163-2.723c-.951.555-2.005.959-3.127 1.184a4.92 4.92 0 00-8.384 4.482C7.69 8.095 4.067 6.13 1.64 3.162a4.822 4.822 0 00-.666 2.475c0 1.71.87 3.213 2.188 4.096a4.904 4.904 0 01-2.228-.616v.06a4.923 4.923 0 003.946 4.827 4.996 4.996 0 01-2.212.085 4.936 4.936 0 004.604 3.417 9.867 9.867 0 01-6.102 2.105c-.39 0-.779-.023-1.17-.067a13.995 13.995 0 007.557 2.209c9.053 0 13.998-7.496 13.998-13.985 0-.21 0-.42-.015-.63A9.935 9.935 0 0024 4.59z"/></svg>
                  Share to X
                </button>
                <button 
                  onClick={onClose}
                  className="px-6 py-3.5 rounded-xl font-bold bg-white/10 text-white hover:bg-white/20 transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
