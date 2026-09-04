import React from 'react';

interface SebiRiskModalProps {
  isOpen: boolean;
  onAccept: () => void;
  onDecline: () => void;
}

export function SebiRiskModal({ isOpen, onAccept, onDecline }: SebiRiskModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bg-[#121212] border border-white/10 rounded-2xl shadow-2xl overflow-hidden relative">
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-red-500 to-orange-500" />
        
        <div className="p-8">
          <div className="w-12 h-12 bg-red-500/10 rounded-full flex items-center justify-center mb-6">
            <span className="text-red-500 text-2xl">⚠️</span>
          </div>
          
          <h2 className="text-xl font-bold text-white mb-2 tracking-tight">Risk Disclosures on Derivatives</h2>
          <p className="text-white/60 text-sm mb-6 leading-relaxed">
            As mandated by the Securities and Exchange Board of India (SEBI). Please read carefully before proceeding to the Futures & Options (F&O) segment.
          </p>

          <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-5 mb-8 space-y-4">
            <ul className="space-y-3 text-sm text-red-200/90 font-medium">
              <li className="flex gap-3">
                <span className="text-red-500 mt-0.5">•</span>
                <span>9 out of 10 individual traders in equity Futures and Options Segment, incurred net losses.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 mt-0.5">•</span>
                <span>On an average, loss makers registered net trading loss close to ₹ 50,000.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Over and above the net trading losses incurred, loss makers expended an additional 28% of net trading losses as transaction costs.</span>
              </li>
              <li className="flex gap-3">
                <span className="text-red-500 mt-0.5">•</span>
                <span>Those making net trading profits, incurred between 15% to 50% of such profits as transaction cost.</span>
              </li>
            </ul>
          </div>

          <div className="flex gap-4">
            <button 
              onClick={onDecline}
              className="flex-1 py-3 rounded-xl font-semibold bg-white/5 text-white hover:bg-white/10 transition-colors"
            >
              I Disagree
            </button>
            <button 
              onClick={onAccept}
              className="flex-1 py-3 rounded-xl font-bold bg-groww-green text-black hover:bg-[#00E5AA] transition-colors shadow-lg shadow-groww-green/20"
            >
              I Acknowledge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
