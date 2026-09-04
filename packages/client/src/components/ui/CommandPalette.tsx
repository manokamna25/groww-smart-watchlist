import React, { useState, useEffect, useRef } from 'react';

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
  symbols: string[];
  onAction: (action: string, payload?: any) => void;
}

export function CommandPalette({ isOpen, onClose, symbols, onAction }: CommandPaletteProps) {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const q = query.toLowerCase();
  
  // Generate dynamic commands based on search
  const commands: { id: string; icon: string; label: string; action: string; payload?: string }[] = [
    { id: 'home', icon: '🏠', label: 'Go to Dashboard', action: 'TAB_DASHBOARD' },
    { id: 'intel', icon: '🧠', label: 'Open Intelligence', action: 'TAB_INTEL' },
    { id: 'voice', icon: '🔊', label: 'Toggle Voice Alerts', action: 'TOGGLE_VOICE' },
    ...symbols.map(sym => ({
      id: `buy-${sym}`,
      icon: '🛒',
      label: `Smart Buy ${sym}`,
      action: 'BUY',
      payload: sym
    })),
    ...symbols.map(sym => ({
      id: `sell-${sym}`,
      icon: '📉',
      label: `Short Sell ${sym}`,
      action: 'SELL',
      payload: sym
    })),
  ].filter(c => c.label.toLowerCase().includes(q));

  return (
    <div className="fixed inset-0 z-[1000] flex items-start justify-center pt-[15vh] px-4 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
      <div 
        className="w-full max-w-2xl bg-[#121212]/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 py-3 border-b border-white/10">
          <span className="text-white/50 text-xl mr-3">🔍</span>
          <input 
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none text-white text-lg focus:outline-none placeholder:text-white/30"
            placeholder="Type a command or search (e.g. 'Buy RELIANCE')"
            value={query}
            onChange={e => setQuery(e.target.value)}
          />
          <span className="text-[10px] font-bold px-2 py-1 bg-white/10 text-white/50 rounded border border-white/5">ESC</span>
        </div>
        
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {commands.length === 0 ? (
            <div className="py-8 text-center text-white/40 text-sm">No commands found.</div>
          ) : (
            commands.map((cmd, idx) => (
              <button
                key={cmd.id}
                onClick={() => {
                  onAction(cmd.action, cmd.payload);
                  onClose();
                }}
                className="w-full text-left px-4 py-3 rounded-xl hover:bg-groww-green/10 hover:text-groww-green transition-colors flex items-center gap-3 group text-white/80"
              >
                <span className="text-xl group-hover:scale-110 transition-transform">{cmd.icon}</span>
                <span className="font-medium">{cmd.label}</span>
                {idx === 0 && <span className="ml-auto text-[10px] bg-white/5 px-2 py-1 rounded text-white/30">↵</span>}
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
