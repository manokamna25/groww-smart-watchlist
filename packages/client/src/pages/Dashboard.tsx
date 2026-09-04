import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../hooks/api';
import { useWatchlistSocket } from '../hooks/useWatchlistSocket';
import { useAuthStore } from '../store/auth.store';
import { ChangeBadge, NarrativeCard, ShowMathPanel, AiExplainerChat } from '../components/intelligence/IntelligenceComponents';
import { LiveChart } from '../components/trading/LiveChart';
import { OptionsChain } from '../components/intelligence/OptionsChain';
import { OrderTicketModal } from '../components/trading/OrderTicketModal';
import { CommandPalette } from '../components/ui/CommandPalette';
import { SebiRiskModal } from '../components/ui/SebiRiskModal';

function LiveTradersBadge({ symbol }: { symbol: string }) {
  const { data } = useQuery({
    queryKey: ['sentiment', symbol],
    queryFn: () => api.market.sentiment(symbol),
    refetchInterval: 5000,
  });

  if (!data || data.activeTraders < 10) return null;

  return (
    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-semibold animate-fade-in shadow-[0_0_10px_rgba(239,68,68,0.2)]">
      <span className="animate-pulse">🔥</span>
      {data.activeTraders} watching
    </div>
  );
}

function PremiumSparkline({ isPositive }: { isPositive: boolean }) {
  const color = isPositive ? '#00D09C' : '#EF4444';
  const gradientId = isPositive ? 'grad-green' : 'grad-red';
  
  const path = isPositive 
    ? "M0,25 Q10,15 20,20 T40,10 T60,15 T80,5 L80,30 L0,30 Z" 
    : "M0,5 Q10,15 20,10 T40,20 T60,15 T80,25 L80,30 L0,30 Z";
    
  const strokePath = isPositive 
    ? "M0,25 Q10,15 20,20 T40,10 T60,15 T80,5" 
    : "M0,5 Q10,15 20,10 T40,20 T60,15 T80,25";

  return (
    <svg width="100%" height="40" viewBox="0 0 80 30" preserveAspectRatio="none" className="opacity-80">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.3" />
          <stop offset="100%" stopColor={color} stopOpacity="0.0" />
        </linearGradient>
      </defs>
      <path d={path} fill={`url(#${gradientId})`} />
      <path d={strokePath} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export default function Dashboard() {
  const { logout, sensitivity, setSensitivity } = useAuthStore();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<'dashboard' | 'intelligence' | 'portfolio' | 'derivatives'>('dashboard');
  
  const [optionsData, setOptionsData] = useState<Record<string, any>>({});

  const [selectedWatchlistId] = useState<string | null>(null);
  const [addSymbol, setAddSymbol] = useState('');
  const [expandedSymbol, setExpandedSymbol] = useState<string | null>(null);
  const [aiExplainingSymbol, setAiExplainingSymbol] = useState<string | null>(null);
  const [showMathEventId, setShowMathEventId] = useState<string | null>(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);
  const [hasAcceptedRisk, setHasAcceptedRisk] = useState(false);
  const [showRiskModal, setShowRiskModal] = useState(false);
  const [livePrices, setLivePrices] = useState<Record<string, { price: number; ts: string; prevPrice?: number }>>({});
  const [liveEvents, setLiveEvents] = useState<any[]>([]);
  const [voiceEnabled, setVoiceEnabled] = useState(false);
  
  const [devInjectSymbol, setDevInjectSymbol] = useState('RELIANCE');
  const [devInjectType, setDevInjectType] = useState('spike');

  const [pushNotification, setPushNotification] = useState<any>(null);
  const [stressTestActive, setStressTestActive] = useState(false);
  const [stressProgress, setStressProgress] = useState(100);

  // Trading Modal State
  const [tradeModal, setTradeModal] = useState<{ isOpen: boolean; symbol: string; action: 'BUY' | 'SELL'; price: number; eventTier?: string }>({
    isOpen: false,
    symbol: '',
    action: 'BUY',
    price: 0
  });

  // Queries
  const { data: watchlists, isLoading } = useQuery({
    queryKey: ['watchlists'],
    queryFn: api.watchlists.list,
  });

  const activeWatchlistId = selectedWatchlistId || watchlists?.[0]?.id;

  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ['watchlist-summary', activeWatchlistId, sensitivity],
    queryFn: () => api.watchlists.summary(activeWatchlistId!, sensitivity),
    enabled: !!activeWatchlistId,
    refetchInterval: 10000,
  });

  const { data: mathBreakdown } = useQuery({
    queryKey: ['event-breakdown', showMathEventId],
    queryFn: () => api.intelligence.breakdown(showMathEventId!),
    enabled: !!showMathEventId,
  });

  // Mutations
  const addItemMutation = useMutation({
    mutationFn: (symbol: string) => api.watchlists.addItem(activeWatchlistId!, symbol),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['watchlists'] }); refetchSummary(); setAddSymbol(''); },
  });

  const removeItemMutation = useMutation({
    mutationFn: (symbol: string) => api.watchlists.removeItem(activeWatchlistId!, symbol),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['watchlists'] }); refetchSummary(); },
  });

  const ackItemMutation = useMutation({
    mutationFn: (symbol: string) => api.watchlists.ackItem(activeWatchlistId!, symbol),
    onSuccess: () => refetchSummary(),
  });

  const ackEventMutation = useMutation({
    mutationFn: (eventId: string) => api.intelligence.ack(eventId),
    onSuccess: () => refetchSummary(),
  });

  const devInjectMutation = useMutation({
    mutationFn: () => api.dev.injectEvent(devInjectSymbol, devInjectType),
  });

  // Socket subscriptions
  const symbols = useMemo(
    () => summary?.watchlist?.items?.map((i: any) => i.symbol) || [],
    [summary]
  );

  const handleTick = useCallback((data: any) => {
    setLivePrices((prev) => {
      const prevPrice = prev[data.symbol]?.price;
      return { 
        ...prev, 
        [data.symbol]: { price: data.price, ts: data.exchangeTs, prevPrice } 
      };
    });
  }, []);

  const handleChangeEvent = useCallback((data: any) => {
    // Filter based on user sensitivity preference
    if (sensitivity === 'conservative' && data.tier !== 'critical') return;
    if (sensitivity === 'balanced' && data.tier === 'notable') return;

    setLiveEvents((prev) => [data, ...prev.slice(0, 19)]);
    refetchSummary();
    
    // Trigger Push Notification based on sensitivity
    const shouldPush = 
      data.tier === 'critical' || 
      (sensitivity === 'aggressive' && data.tier === 'meaningful');

    if (shouldPush) {
      setPushNotification(data);
      setTimeout(() => setPushNotification(null), 6000);

      // AI Voice Alert
      if (voiceEnabled && 'speechSynthesis' in window) {
        const text = `${data.tier === 'critical' ? 'Critical' : 'Meaningful'} anomaly detected on ${data.symbol}. ${data.narrative}`;
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 1.1; // Slightly faster for a professional feel
        utterance.pitch = 0.9; 
        window.speechSynthesis.speak(utterance);
      }
    }
  }, [sensitivity, voiceEnabled]);

  const handleOptionsTick = useCallback((data: any) => {
    setOptionsData(prev => ({ ...prev, [data.symbol]: data }));
  }, []);

  useWatchlistSocket(symbols, handleTick, handleChangeEvent, handleOptionsTick);

  // Cmd+K Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(prev => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#030305]">
        <div className="animate-spin w-8 h-8 border-2 border-groww-green border-t-transparent rounded-full" />
      </div>
    );
  }

  // --- MOCK DATA FOR THE TABS ---
  const mockIntelligence = [
    { sym: 'HDFCBANK', price: 1540.2, pct: -2.1, tier: 'critical', desc: 'HDFCBANK fell 2.1% on 4.2x average volume, while Nifty was flat. Significant institutional selling detected.' },
    { sym: 'ZOMATO', price: 210.5, pct: +5.4, tier: 'meaningful', desc: 'ZOMATO gained 5.4%. Stock broke out of its 52-week high resistance level on heavy volume.' },
    { sym: 'TATAMOTORS', price: 980.1, pct: -3.5, tier: 'notable', desc: 'TATAMOTORS opened with a -3.5% gap down, severely underperforming the auto index.' },
  ];

  const mockPortfolio = [
    { sym: 'ITC', qty: 250, avg: 410.5, ltp: 450.2, tier: 'quiet', desc: 'No significant anomalies detected.' },
    { sym: 'INFY', qty: 50, avg: 1350.0, ltp: 1420.5, tier: 'quiet', desc: 'No significant anomalies detected.' },
    { sym: 'RELIANCE', qty: 100, avg: 2600.0, ltp: 2530.1, tier: 'meaningful', desc: 'RELIANCE dropped 2.7% on high volume. This is currently dragging your portfolio down by ₹6,990.' },
  ];

  return (
    <div className="min-h-screen bg-[#030305] text-white flex flex-col md:flex-row overflow-hidden font-sans selection:bg-groww-green/30 relative">
      <CommandPalette 
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        symbols={symbols}
        onAction={(action, payload) => {
          if (action === 'TAB_DASHBOARD') setActiveTab('dashboard');
          if (action === 'TAB_INTEL') setActiveTab('intelligence');
          if (action === 'TOGGLE_VOICE') setVoiceEnabled(!voiceEnabled);
          if (action === 'BUY' || action === 'SELL') {
            const price = livePrices[payload]?.price || 0;
            setTradeModal({ isOpen: true, symbol: payload, action, price });
          }
        }}
      />
      
      <SebiRiskModal 
        isOpen={showRiskModal} 
        onAccept={() => {
          setHasAcceptedRisk(true);
          setShowRiskModal(false);
          setActiveTab('derivatives');
        }} 
        onDecline={() => setShowRiskModal(false)} 
      />

      {/* --- ELITE FEATURE: iOS PUSH NOTIFICATION --- */}
      <div 
        className={`absolute bottom-8 right-[400px] z-[100] transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          pushNotification ? 'translate-y-0 opacity-100 scale-100' : 'translate-y-24 opacity-0 scale-95 pointer-events-none'
        }`}
      >
        <div 
          onClick={() => {
            setActiveTab('intelligence');
            setPushNotification(null);
          }}
          className="w-[380px] bg-black/60 backdrop-blur-2xl border border-white/20 shadow-[0_20px_50px_rgba(0,0,0,0.5)] rounded-[24px] p-4 cursor-pointer hover:bg-black/80 transition-colors group relative overflow-hidden"
        >
          {/* Shine effect */}
          <div className="absolute inset-0 bg-gradient-to-tr from-white/0 via-white/5 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
          
          <div className="flex gap-4 relative z-10">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-groww-green to-blue-600 flex items-center justify-center shadow-lg flex-shrink-0">
              <span className="text-white font-black text-xl">W</span>
            </div>
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex justify-between items-start mb-1">
                <span className="font-semibold text-white/90 text-sm tracking-wide">Groww Intelligence</span>
                <span className="text-xs text-white/40">now</span>
              </div>
              <p className="text-sm text-white font-medium truncate mb-1">⚠️ {pushNotification?.symbol} anomaly detected!</p>
              <p className="text-xs text-white/60 line-clamp-2 leading-snug">{pushNotification?.narrative}</p>
            </div>
          </div>
          <div className="mt-3 w-10 h-1 rounded-full bg-white/20 mx-auto group-hover:bg-white/40 transition-colors" />
        </div>
      </div>

      {/* 1. Glassmorphic Sidebar / Bottom Nav */}
      <div className="order-last md:order-first w-full md:w-20 lg:w-64 border-t md:border-t-0 md:border-r border-white/5 bg-[#030305] md:bg-white/[0.01] flex md:flex-col justify-between backdrop-blur-3xl relative z-50">
        <div className="flex md:flex-col w-full md:w-auto overflow-hidden">
          <div className="hidden md:flex h-20 items-center justify-center lg:justify-start lg:px-8 border-b border-white/5">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-groww-green to-blue-500 flex items-center justify-center shadow-[0_0_20px_rgba(0,208,156,0.3)]">
              <span className="text-white font-black text-xl">W</span>
            </div>
            <span className="hidden lg:block ml-3 font-bold text-lg tracking-wide text-white">SMART<span className="text-groww-green">WATCH</span></span>
          </div>
          
          <nav className="flex md:flex-col md:mt-8 px-2 md:px-4 md:space-y-2 w-full justify-around py-3 md:py-0">
            <div 
              onClick={() => setActiveTab('dashboard')}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'dashboard' ? 'bg-white/5 text-white border border-white/10 md:shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-xl md:text-lg">📊</span>
              <span className="text-[10px] md:text-sm font-medium lg:block">Dash</span>
            </div>
            <div 
              onClick={() => setActiveTab('intelligence')}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'intelligence' ? 'bg-white/5 text-white border border-white/10 md:shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-xl md:text-lg">⚡</span>
              <span className="text-[10px] md:text-sm font-medium lg:block">Intel</span>
            </div>
            <div 
              onClick={() => setActiveTab('portfolio')}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'portfolio' ? 'bg-white/5 text-white border border-white/10 md:shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-xl md:text-lg">💼</span>
              <span className="text-[10px] md:text-sm font-medium lg:block">Port</span>
            </div>
            <div 
              onClick={() => {
                if (!hasAcceptedRisk) {
                  setShowRiskModal(true);
                } else {
                  setActiveTab('derivatives');
                }
              }}
              className={`flex flex-col md:flex-row items-center gap-1 md:gap-4 px-3 md:px-4 py-2 md:py-3 rounded-xl transition-all cursor-pointer ${
                activeTab === 'derivatives' ? 'bg-white/5 text-white border border-white/10 md:shadow-[0_0_15px_rgba(255,255,255,0.05)]' : 'text-white/50 hover:text-white hover:bg-white/5'
              }`}
            >
              <span className="text-xl md:text-lg">🔥</span>
              <span className="text-[10px] md:text-sm font-medium lg:block">F&O</span>
            </div>
          </nav>
        </div>

        <div className="hidden md:block p-4 border-t border-white/5">
          <button onClick={logout} className="flex items-center gap-4 px-4 py-3 w-full text-white/50 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all cursor-pointer">
            <span className="text-lg">🚪</span>
            <span className="hidden lg:block font-medium text-sm">Sign Out</span>
          </button>
        </div>
      </div>

      {/* 2. Main Content Area */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        
        {/* Ambient background glows */}
        <div className="absolute top-[-20%] left-[-10%] w-[500px] h-[500px] bg-groww-green/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[20%] w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

        {/* Top Header */}
        <header className="h-20 border-b border-white/5 flex items-center justify-between px-4 lg:px-8 bg-black/20 backdrop-blur-md z-20">
          <div className="flex items-center gap-2 lg:gap-4">
            <h1 className="text-2xl font-bold bg-gradient-to-r from-white to-white/60 bg-clip-text text-transparent">
              {activeTab === 'dashboard' && 'Market Overview'}
              {activeTab === 'intelligence' && 'Global AI Screener'}
              {activeTab === 'portfolio' && 'Smart Holdings'}
              {activeTab === 'derivatives' && 'Derivatives Pricing'}
            </h1>
            {activeTab === 'dashboard' && (
              <span className="hidden md:inline-block px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-mono text-white/50">
                {symbols.length} Assets Tracked
              </span>
            )}
            {activeTab === 'intelligence' && (
              <span className="hidden md:inline-block px-3 py-1 rounded-full bg-groww-green/10 text-groww-green border border-groww-green/20 text-xs font-mono">
                Live Z-Score Scanning
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            <button
              onClick={() => setIsCommandPaletteOpen(true)}
              className="hidden xl:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-white/40 hover:text-white/80 hover:bg-white/10 transition-colors mr-2"
            >
              <span className="text-sm">🔍</span>
              <span className="text-xs font-medium tracking-wide">Search</span>
              <span className="ml-4 text-[10px] font-mono bg-white/10 px-1.5 py-0.5 rounded border border-white/5">⌘K</span>
            </button>
            
            {/* Voice Toggle */}
            <button
              onClick={() => {
                if (!voiceEnabled && 'speechSynthesis' in window) {
                  // Speak a confirmation to unlock audio context and prove it works
                  const u = new SpeechSynthesisUtterance('Voice alerts enabled');
                  u.rate = 1.1;
                  u.pitch = 0.9;
                  window.speechSynthesis.speak(u);
                } else if (voiceEnabled && 'speechSynthesis' in window) {
                  // Instantly stop any ongoing speech if muting
                  window.speechSynthesis.cancel();
                }
                setVoiceEnabled(!voiceEnabled);
              }}
              className={`p-2 rounded-xl transition-all border ${
                voiceEnabled 
                  ? 'bg-groww-green/20 text-groww-green border-groww-green/50 shadow-[0_0_15px_rgba(0,208,156,0.3)]' 
                  : 'bg-white/5 text-white/40 hover:text-white border-white/10'
              }`}
              title={voiceEnabled ? "Voice Alerts ON" : "Voice Alerts OFF"}
            >
              {voiceEnabled ? '🔊' : '🔇'}
            </button>

            {activeTab === 'dashboard' && (
              <div className="flex items-center gap-2 lg:gap-6">
                
                {/* Alert Sensitivity Toggle */}
                <div className="hidden 2xl:flex items-center bg-black/40 border border-white/10 rounded-xl p-1 backdrop-blur-md">
                  <button 
                    onClick={() => setSensitivity('conservative')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sensitivity === 'conservative' ? 'bg-groww-green text-black shadow-[0_0_10px_rgba(0,208,156,0.3)]' : 'text-white/40 hover:text-white/80'}`}
                  >
                    Conservative
                  </button>
                  <button 
                    onClick={() => setSensitivity('balanced')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sensitivity === 'balanced' ? 'bg-groww-green text-black shadow-[0_0_10px_rgba(0,208,156,0.3)]' : 'text-white/40 hover:text-white/80'}`}
                  >
                    Balanced
                  </button>
                  <button 
                    onClick={() => setSensitivity('aggressive')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${sensitivity === 'aggressive' ? 'bg-groww-green text-black shadow-[0_0_10px_rgba(0,208,156,0.3)]' : 'text-white/40 hover:text-white/80'}`}
                  >
                    Aggressive
                  </button>
                </div>

                <div className="relative group flex items-center">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 group-focus-within:text-groww-green transition-colors z-10 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
                  </div>
                  <input
                    value={addSymbol}
                    onChange={(e) => setAddSymbol(e.target.value.toUpperCase())}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && addSymbol) {
                        addItemMutation.mutate(addSymbol);
                      }
                    }}
                    className="w-32 md:w-48 lg:w-72 bg-white/[0.03] hover:bg-white/[0.05] border border-white/10 hover:border-white/20 backdrop-blur-md rounded-full pl-11 pr-12 lg:pr-20 py-2.5 text-sm text-white placeholder-white/40 focus:outline-none focus:border-groww-green focus:bg-white/[0.05] focus:shadow-[0_0_20px_rgba(0,208,156,0.15)] transition-all"
                    placeholder="Track symbol..."
                  />
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center transition-opacity pointer-events-none hidden lg:flex">
                    {addSymbol ? (
                      <span className="text-[9px] font-bold bg-groww-green text-black px-2 py-1 rounded-md border border-groww-green shadow-[0_0_10px_rgba(0,208,156,0.3)] uppercase tracking-widest">ENTER ↵</span>
                    ) : (
                      <span className="text-[10px] font-bold bg-white/[0.05] text-white/70 px-2 py-1 rounded-md border border-white/10 uppercase tracking-widest group-focus-within:opacity-0 transition-opacity shadow-sm">⌘ K</span>
                    )}
                  </div>
                </div>
              </div>
            )}
            
            {activeTab === 'intelligence' && (
              <span className="px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-xs font-mono text-orange-400 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"/> Scanning 2,412 NSE Equities
              </span>
            )}
          </div>

          {/* Removed duplicate activeTab === 'dashboard' block */}
        </header>

        {/* Dynamic Watchlist Grid */}
        <main className="flex-1 overflow-y-auto p-8 no-scrollbar z-20">
          
          {/* --- DASHBOARD TAB --- */}
          {activeTab === 'dashboard' && (
            <>
              {summary?.globalSummary && (
                <div className="mb-6 p-4 rounded-xl bg-gradient-to-r from-groww-green/20 to-transparent border border-groww-green/30 animate-fade-in shadow-[0_0_20px_rgba(0,208,156,0.1)]">
                  <div className="flex items-start gap-3">
                    <span className="text-xl">✨</span>
                    <div>
                      <h3 className="text-sm font-bold text-white/90 mb-1 tracking-wide uppercase">Smart AI Digest</h3>
                      <p className="text-sm text-groww-green/90 font-medium">{summary.globalSummary}</p>
                    </div>
                  </div>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-6 items-start">
              {summary?.watchlist?.items?.map((item: any) => {
                const digest = summary.digest?.find((d: any) => d.symbol === item.symbol);
                const live = livePrices[item.symbol];
                const price = live?.price || digest?.lastViewedPrice || 0;
                const prevPrice = live?.prevPrice || (price * 0.999);
                const isPositive = price >= prevPrice;
                
                const unseen = digest?.unseenEventsCount || 0;
                const topTier = digest?.events?.[0]?.tier || 'quiet';
                const isExpanded = expandedSymbol === item.symbol;

                let borderClass = 'border-white/10 hover:border-white/20';
                let shadowClass = 'shadow-xl shadow-black/50';
                
                if (unseen > 0) {
                  if (topTier === 'critical') {
                    borderClass = 'border-red-500/50';
                    shadowClass = 'shadow-[0_0_25px_rgba(239,68,68,0.15)]';
                  } else if (topTier === 'meaningful') {
                    borderClass = 'border-orange-500/50';
                    shadowClass = 'shadow-[0_0_25px_rgba(249,115,22,0.15)]';
                  } else if (topTier === 'notable') {
                    borderClass = 'border-yellow-500/50';
                    shadowClass = 'shadow-[0_0_25px_rgba(234,179,8,0.1)]';
                  }
                }

                return (
                  <div 
                    key={item.id} 
                    className={`relative flex flex-col bg-white/[0.02] backdrop-blur-sm rounded-2xl border ${borderClass} ${shadowClass} transition-all duration-300 overflow-hidden group`}
                  >
                    <button 
                      onClick={(e) => { e.stopPropagation(); removeItemMutation.mutate(item.symbol); }}
                      className="absolute top-4 right-4 w-7 h-7 rounded-full bg-white/10 flex items-center justify-center text-white/60 hover:bg-red-500/20 hover:text-red-400 hover:opacity-100 transition-all z-20"
                      title="Remove from Watchlist"
                    >
                      ✕
                    </button>

                    <div className="p-6 pb-2 cursor-pointer relative z-10" onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}>
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex items-center gap-3">
                            <h2 className="text-2xl font-bold tracking-tight text-white">{item.symbol}</h2>
                            <LiveTradersBadge symbol={item.symbol} />
                          </div>
                          <span className="text-xs font-mono text-white/40 uppercase tracking-wider">NSE EQUITIES</span>
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-mono font-semibold tracking-tight text-white">
                            ₹{price.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </div>
                          <div className={`text-sm font-mono font-medium ${isPositive ? 'text-[#00D09C]' : 'text-[#EF4444]'}`}>
                            {isPositive ? '+' : ''}{Math.abs(price - prevPrice).toFixed(2)} ({isPositive ? '+' : ''}{((price - prevPrice)/prevPrice * 100).toFixed(2)}%)
                          </div>
                        </div>
                      </div>

                      {unseen > 0 && (
                        <div className="mb-2">
                          <ChangeBadge tier={topTier} count={unseen} />
                        </div>
                      )}
                    </div>

                    <div className="mt-auto w-full h-16 relative" onClick={() => setExpandedSymbol(isExpanded ? null : item.symbol)}>
                      <div className="absolute inset-0 bottom-0 pointer-events-none">
                        <PremiumSparkline isPositive={isPositive} />
                      </div>
                    </div>

                    {isExpanded && (
                      <div className="border-t border-white/10 bg-black/40 backdrop-blur-md p-5 space-y-4 animate-slide-up relative z-10">
                        {/* 🌟 Top 20 Feature: Live Candlestick Chart */}
                        <div className="h-48 mb-4 border border-white/5 rounded-xl overflow-hidden bg-black/50">
                          <LiveChart 
                            symbol={item.symbol} 
                            currentPrice={digest?.lastViewedPrice || price} 
                            livePrice={live?.price}
                            liveTime={live ? new Date(live.ts).getTime() : undefined}
                            events={digest?.events || []}
                          />
                        </div>

                        {digest?.events && digest.events.length > 0 ? (
                          <>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-xs font-semibold text-white/40 uppercase tracking-widest">Intelligence Report</span>
                              <div className="flex items-center gap-3">
                                {aiExplainingSymbol !== item.symbol && (
                                  <button
                                    onClick={() => setAiExplainingSymbol(item.symbol)}
                                    className="text-xs text-groww-purple hover:text-white transition-colors flex items-center gap-1 font-medium bg-groww-purple/10 px-2 py-1 rounded-full border border-groww-purple/20"
                                  >
                                    <span>✨</span> Explain with AI
                                  </button>
                                )}
                                <button
                                  onClick={() => ackItemMutation.mutate(item.symbol)}
                                  className="text-xs text-groww-green hover:text-white transition-colors"
                                >
                                  Mark as read
                                </button>
                              </div>
                            </div>
                            
                            {aiExplainingSymbol === item.symbol ? (
                              <AiExplainerChat 
                                symbol={item.symbol} 
                                event={digest.events[0]} 
                                onClose={() => setAiExplainingSymbol(null)} 
                              />
                            ) : (
                              <div className="space-y-3">
                                {digest.events.slice(0, 3).map((event: any) => (
                                  <div key={event.id} className="relative">
                                    <NarrativeCard
                                      event={event}
                                      onShowMath={(id) => setShowMathEventId(showMathEventId === id ? null : id)}
                                      onAck={(id) => ackEventMutation.mutate(id)}
                                    />
                                    {showMathEventId === event.id && mathBreakdown && (
                                      <div className="mt-2 ml-4 pl-4 border-l-2 border-white/10">
                                        <ShowMathPanel signals={mathBreakdown.signals} score={mathBreakdown.score} tier={mathBreakdown.tier} confidence={mathBreakdown.confidence} />
                                      </div>
                                    )}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Smart Execute Trade Button */}
                            <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
                              <button
                                onClick={() => setTradeModal({ isOpen: true, symbol: item.symbol, action: 'BUY', price, eventTier: digest.events?.[0]?.tier })}
                                className="flex-1 py-2.5 rounded-lg bg-[#00D09C]/10 hover:bg-[#00D09C]/20 border border-[#00D09C]/30 text-[#00D09C] font-bold text-sm transition-colors flex items-center justify-center gap-2"
                              >
                                <span>🛒</span> Smart Buy {item.symbol}
                              </button>
                              <button
                                onClick={() => setTradeModal({ isOpen: true, symbol: item.symbol, action: 'SELL', price, eventTier: digest.events?.[0]?.tier })}
                                className="flex-1 py-2.5 rounded-lg bg-[#EF4444]/10 hover:bg-[#EF4444]/20 border border-[#EF4444]/30 text-[#EF4444] font-bold text-sm transition-colors flex items-center justify-center gap-2"
                              >
                                <span>📉</span> Smart Sell
                              </button>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-white/30 text-center py-4 font-mono">
                            Awaiting market anomalies...
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}

              {symbols.length === 0 && (
                <div className="col-span-full flex flex-col items-center justify-center p-20 border-2 border-dashed border-white/10 rounded-3xl bg-white/[0.01]">
                  <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-3xl mb-4">📈</div>
                  <h3 className="text-xl font-bold text-white mb-2">Your Command Center is Empty</h3>
                  <p className="text-white/40 text-center max-w-md">Search for a symbol in the top bar to start tracking intelligent market events instantly.</p>
                </div>
              )}
            </div>
            </>
          )}

          {/* --- INTELLIGENCE TAB MOCKUP --- */}
          {activeTab === 'intelligence' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="mb-8 p-6 rounded-2xl bg-gradient-to-r from-orange-500/10 to-transparent border border-orange-500/20">
                <h2 className="text-xl font-bold text-white mb-2">Global Market Anomalies Detected</h2>
                <p className="text-white/60 text-sm">The Z-score engine is currently scanning 2,412 active equities. The following assets are showing severe deviation from their rolling volatility baseline.</p>
              </div>
              <div className="space-y-4">
                {mockIntelligence.map((item, i) => (
                  <div key={i} className="flex bg-white/[0.02] border border-white/10 rounded-xl overflow-hidden hover:bg-white/[0.05] transition-all cursor-pointer">
                    <div className={`w-2 ${item.tier === 'critical' ? 'bg-red-500' : item.tier === 'meaningful' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                    <div className="flex-1 p-5 flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="font-bold text-lg">{item.sym}</h3>
                          <ChangeBadge tier={item.tier} />
                        </div>
                        <p className="text-sm text-white/60">{item.desc}</p>
                      </div>
                      <div className="text-right ml-8">
                        <div className="font-mono text-lg font-bold">₹{item.price.toFixed(2)}</div>
                        <div className={`font-mono text-sm ${item.pct > 0 ? 'text-[#00D09C]' : 'text-[#EF4444]'}`}>
                          {item.pct > 0 ? '+' : ''}{item.pct.toFixed(2)}%
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* --- PORTFOLIO TAB MOCKUP --- */}
          {activeTab === 'portfolio' && (
            <div className="animate-fade-in max-w-4xl mx-auto">
              <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between p-8 rounded-3xl bg-gradient-to-br from-white/[0.05] to-transparent border border-white/10 relative overflow-hidden">
                <div className="relative z-10">
                  <div className="text-white/40 text-sm font-medium mb-1">Total Invested Value</div>
                  <div className="text-4xl font-bold font-mono tracking-tight text-white mb-2">
                    {stressTestActive ? (
                      <span className="text-red-500 animate-pulse">₹3,81,150.00</span>
                    ) : (
                      '₹4,23,500.00'
                    )}
                  </div>
                  <div className={`font-mono font-medium flex items-center gap-2 ${stressTestActive ? 'text-red-500' : 'text-[#00D09C]'}`}>
                    <span>{stressTestActive ? '-₹42,350.00 (-10.0%)' : '+₹45,210.50 (+11.9%)'}</span>
                    <span className="text-white/30 text-xs font-sans bg-white/10 px-2 py-0.5 rounded-full">All Time</span>
                  </div>
                </div>
                
                <div className="relative z-10 mt-6 md:mt-0">
                  <button 
                    onClick={() => {
                      setStressTestActive(true);
                      setStressProgress(0);
                      const interval = setInterval(() => {
                        setStressProgress(p => {
                          if (p >= 100) { clearInterval(interval); return 100; }
                          return p + 5;
                        });
                      }, 50);
                      setTimeout(() => setStressTestActive(false), 8000); // auto reset
                    }}
                    disabled={stressTestActive}
                    className={`px-6 py-3 rounded-xl font-bold text-sm flex items-center gap-2 transition-all ${
                      stressTestActive 
                        ? 'bg-red-500/20 text-red-400 border border-red-500/50 cursor-not-allowed'
                        : 'bg-white/10 hover:bg-white/20 text-white border border-white/20 shadow-lg shadow-black/50'
                    }`}
                  >
                    {stressTestActive ? (
                      <>
                        <span className="animate-spin text-lg">⚙️</span>
                        <span>Running Stress Test {stressProgress}%</span>
                      </>
                    ) : (
                      <>
                        <span className="text-lg">📉</span>
                        <span>Run Market Crash Test (-10%)</span>
                      </>
                    )}
                  </button>
                </div>
                
                {/* Background radar effect for stress test */}
                {stressTestActive && (
                  <div className="absolute inset-0 z-0 flex items-center justify-center opacity-30">
                    <div className="w-[800px] h-[800px] rounded-full border border-red-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite]" />
                    <div className="absolute w-[600px] h-[600px] rounded-full border border-red-500 animate-[ping_2s_cubic-bezier(0,0,0.2,1)_infinite_0.5s]" />
                  </div>
                )}
              </div>

              <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                Your Assets <span className="text-xs px-2 py-0.5 bg-white/10 rounded-full text-white/50">Smart Scanning Active</span>
              </h3>
              
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.01]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-white/[0.02] border-b border-white/10">
                    <tr>
                      <th className="px-6 py-4 font-medium text-white/40">Asset</th>
                      <th className="px-6 py-4 font-medium text-white/40 text-right">Holdings</th>
                      <th className="px-6 py-4 font-medium text-white/40 text-right">Avg / LTP</th>
                      <th className="px-6 py-4 font-medium text-white/40">Smart Insights</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {mockPortfolio.map((item, i) => {
                      const beta = item.sym === 'RELIANCE' ? 1.2 : (item.sym === 'ZOMATO' ? 1.8 : 0.85);
                      const projectedDrop = 10 * beta;
                      const currentValue = item.qty * item.ltp;
                      const loss = currentValue * (projectedDrop / 100);

                      return (
                        <tr key={i} className={`transition-colors group ${stressTestActive && beta > 1 ? 'bg-red-500/5' : 'hover:bg-white/[0.02]'}`}>
                          <td className="px-6 py-4 font-bold text-white flex items-center gap-2">
                            {item.sym}
                            {stressTestActive && beta > 1 && <span className="text-[10px] bg-red-500/20 text-red-400 px-2 py-0.5 rounded border border-red-500/30 uppercase">High Risk Beta</span>}
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            <div className="text-white">{item.qty}</div>
                          </td>
                          <td className="px-6 py-4 text-right font-mono">
                            <div className="text-white/50 text-xs mb-1">₹{item.avg.toFixed(2)}</div>
                            <div className="text-white font-medium">₹{item.ltp.toFixed(2)}</div>
                          </td>
                          <td className="px-6 py-4">
                            {stressTestActive ? (
                              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-2 max-w-xs animate-pulse-soft">
                                <div className="text-xs font-bold text-red-400 mb-1">PROJECTED CRASH LOSS</div>
                                <div className="text-sm font-mono text-red-200">-₹{loss.toFixed(2)} (-{projectedDrop.toFixed(1)}%)</div>
                              </div>
                            ) : item.tier === 'quiet' ? (
                              <span className="text-white/30 text-xs italic flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-white/10" /> Monitoring...
                              </span>
                            ) : (
                              <div className="bg-orange-500/10 border border-orange-500/20 rounded-lg p-2 max-w-xs animate-pulse-soft">
                                <div className="mb-1"><ChangeBadge tier={item.tier} /></div>
                                <div className="text-xs text-orange-200/70 leading-snug">{item.desc}</div>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* --- DERIVATIVES TAB --- */}
          {activeTab === 'derivatives' && (
            <div className="animate-fade-in max-w-5xl mx-auto space-y-6">
              <div className="mb-4">
                <h2 className="text-xl font-bold text-white mb-2">Options Smart Chain</h2>
                <p className="text-white/60 text-sm">Real-time theoretical premiums calculated via Black-Scholes-Merton model over WebSockets.</p>
              </div>
              
              <div className="space-y-8">
                {symbols.length > 0 ? (
                  symbols.map(sym => (
                    <OptionsChain key={sym} optionsData={optionsData[sym]} />
                  ))
                ) : (
                  <div className="text-center p-12 bg-white/[0.02] rounded-2xl border border-white/5">
                    <span className="text-4xl mb-4 block">🔍</span>
                    <p className="text-white/50">Add a stock to your watchlist to view its options chain.</p>
                  </div>
                )}
              </div>
            </div>
          )}

        </main>
      </div>

      {/* 3. Global Intelligence Feed (Right Sidebar) */}
      <div className="hidden xl:flex w-[380px] border-l border-white/5 bg-[#050505]/80 backdrop-blur-2xl flex-col h-screen z-20">
        
        <div className="h-20 border-b border-white/5 flex items-center px-6">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-groww-green animate-pulse" />
            <h2 className="text-sm font-bold tracking-widest uppercase text-white/80">Live Global Feed</h2>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3 no-scrollbar">
          {liveEvents.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 opacity-50">
              <span className="text-4xl mb-4">📡</span>
              <p className="text-sm text-white/50 font-mono">Listening to websocket...<br/>Waiting for significant market shifts.</p>
            </div>
          ) : (
            liveEvents.map((evt, i) => (
              <div key={evt.id || i} className="bg-white/[0.03] border border-white/5 rounded-xl p-4 animate-slide-up hover:bg-white/[0.05] transition-colors">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-bold text-white text-sm tracking-tight">{evt.symbol}</span>
                  <span className="text-[10px] font-mono text-white/30">{new Date(evt.ts).toLocaleTimeString()}</span>
                </div>
                <div className="mb-2">
                  <ChangeBadge tier={evt.tier || 'quiet'} />
                </div>
                <p className="text-sm text-white/60 leading-snug">{evt.narrative}</p>
              </div>
            ))
          )}
        </div>

        {/* Hackathon Demo Control (Bottom Section of Sidebar) */}
        <div className="p-5 border-t border-white/10 bg-gradient-to-b from-transparent to-groww-green/5">
          <h3 className="text-xs font-bold uppercase tracking-widest text-groww-green mb-4 flex items-center gap-2">
            <span>⚡</span> Presenter Controls
          </h3>
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={devInjectSymbol}
                onChange={(e) => setDevInjectSymbol(e.target.value.toUpperCase())}
                className="w-1/2 bg-black/50 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder-white/30 focus:outline-none focus:border-groww-green/50"
                placeholder="Symbol"
              />
              <select
                value={devInjectType}
                onChange={(e) => setDevInjectType(e.target.value)}
                className="w-1/2 bg-black/50 border border-white/10 rounded-lg px-2 py-2 text-xs text-white focus:outline-none focus:border-groww-green/50"
              >
                <option value="spike">Spike (Random)</option>
                <option value="spike_up">Spike UP (+5.5%)</option>
                <option value="spike_down">Drop DOWN (-5.5%)</option>
                <option value="gap">Gap (±4%)</option>
                <option value="volume_anomaly">Vol (5x)</option>
              </select>
            </div>
            <button
              onClick={() => devInjectMutation.mutate()}
              className="w-full bg-white/10 hover:bg-groww-green/20 text-white hover:text-groww-green border border-white/10 hover:border-groww-green/50 font-medium py-2 rounded-lg transition-all text-sm shadow-lg shadow-black/50 active:scale-95"
              disabled={devInjectMutation.isPending}
            >
              {devInjectMutation.isPending ? 'Injecting...' : 'Simulate Event'}
            </button>
          </div>
        </div>

      </div>

      {tradeModal.isOpen && (
        <OrderTicketModal
          symbol={tradeModal.symbol}
          action={tradeModal.action}
          price={tradeModal.price}
          onClose={() => setTradeModal({ ...tradeModal, isOpen: false })}
        />
      )}

    </div>
  );
}
