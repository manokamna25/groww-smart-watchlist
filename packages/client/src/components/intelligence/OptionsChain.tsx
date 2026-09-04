import React, { useState, useEffect, useRef } from 'react';

export function OptionsChain({ optionsData }: { optionsData: any }) {
  if (!optionsData || !optionsData.calls || !optionsData.puts) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-white/40">
        <div className="animate-spin w-8 h-8 border-2 border-groww-green border-t-transparent rounded-full mb-4" />
        <p>Awaiting Options Data...</p>
      </div>
    );
  }

  const calls = optionsData.calls;
  const puts = optionsData.puts;
  const strikes = calls.map((c: any) => c.strike);

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-md">
      <div className="px-6 py-4 border-b border-white/10 flex justify-between items-center bg-white/[0.02]">
        <h3 className="font-bold text-lg text-white">Options Chain <span className="text-groww-green">{optionsData.symbol}</span></h3>
        <div className="text-sm font-mono text-white/50">
          Expiry: {optionsData.expiryDays} Days | Underlying: ₹{optionsData.underlyingPrice.toFixed(2)}
        </div>
      </div>

      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[600px]">
          <div className="grid grid-cols-[1fr_120px_1fr] text-xs font-mono font-semibold uppercase tracking-wider text-white/40 border-b border-white/10">
            <div className="px-6 py-3 text-left">CALLS (CE)</div>
            <div className="px-6 py-3 text-center bg-white/[0.02]">STRIKE</div>
            <div className="px-6 py-3 text-right">PUTS (PE)</div>
          </div>

          <div className="divide-y divide-white/5">
            {strikes.map((strike: number, index: number) => {
              const call = calls[index];
              const put = puts[index];
              
              // Determine if strike is ITM (In The Money)
              const callItm = strike < optionsData.underlyingPrice;
              const putItm = strike > optionsData.underlyingPrice;

              return (
                <div key={strike} className="grid grid-cols-[1fr_120px_1fr] hover:bg-white/[0.02] transition-colors group">
                  {/* Call Side */}
                  <div className={`px-6 py-3 flex justify-between items-center ${callItm ? 'bg-[#00D09C]/5' : ''}`}>
                    <span className="text-white/30 text-xs">Vol {call.impliedVol.toFixed(2)}</span>
                    <PriceCell price={call.price} />
                  </div>

                  {/* Strike */}
                  <div className="px-6 py-3 text-center font-bold text-white bg-white/[0.02]">
                    {strike.toLocaleString('en-IN')}
                  </div>

                  {/* Put Side */}
                  <div className={`px-6 py-3 flex justify-between items-center ${putItm ? 'bg-[#EF4444]/5' : ''}`}>
                    <PriceCell price={put.price} />
                    <span className="text-white/30 text-xs">Vol {put.impliedVol.toFixed(2)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PriceCell({ price }: { price: number }) {
  const [flash, setFlash] = useState<'up' | 'down' | null>(null);
  const prevPriceRef = useRef(price);

  useEffect(() => {
    if (price > prevPriceRef.current) {
      setFlash('up');
    } else if (price < prevPriceRef.current) {
      setFlash('down');
    }
    prevPriceRef.current = price;

    const timer = setTimeout(() => setFlash(null), 800);
    return () => clearTimeout(timer);
  }, [price]);

  return (
    <span className={`font-mono text-sm font-semibold transition-colors duration-300 ${
      flash === 'up' ? 'text-[#00D09C] drop-shadow-[0_0_10px_rgba(0,208,156,0.8)]' :
      flash === 'down' ? 'text-[#EF4444] drop-shadow-[0_0_10px_rgba(239,68,68,0.8)]' :
      'text-white'
    }`}>
      ₹{price.toFixed(2)}
    </span>
  );
}
