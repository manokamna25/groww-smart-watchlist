import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import { api } from './api';

let socket: Socket | null = null;

function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
    });
  }
  return socket;
}

export function useWatchlistSocket(
  symbols: string[],
  onTick: (data: any) => void,
  onChangeEvent: (data: any) => void,
  onOptionsTick?: (data: any) => void
) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const socketRef = useRef<Socket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());
  const lastEventTsRef = useRef<string | null>(null);

  const handleTick = useCallback(onTick, []);
  
  const handleEvent = useCallback((data: any) => {
    lastEventTsRef.current = data.ts;
    onChangeEvent(data);
  }, [onChangeEvent]);

  useEffect(() => {
    if (!isAuth || symbols.length === 0) return;

    const s = getSocket();
    socketRef.current = s;

    s.on('tick', handleTick);
    s.on('change_event', handleEvent);
    if (onOptionsTick) {
      s.on('options:tick', onOptionsTick);
    }
    
    // Reconnection sync logic
    const onConnect = async () => {
      if (lastEventTsRef.current) {
        try {
          const missedEvents = await api.intelligence.sync(lastEventTsRef.current);
          if (missedEvents && missedEvents.length > 0) {
            console.log(`Synced ${missedEvents.length} missed events since reconnect`);
            // The events are returned in ascending order, so we process them sequentially
            missedEvents.forEach(evt => handleEvent(evt));
          }
        } catch (err) {
          console.error("Failed to sync missed events:", err);
        }
      }
    };
    
    s.on('connect', onConnect);

    // Subscribe to new symbols, unsubscribe from removed
    const newSymbols = new Set(symbols.map((sym) => sym.toUpperCase()));
    const prevSymbols = subscribedRef.current;

    for (const sym of newSymbols) {
      if (!prevSymbols.has(sym)) {
        s.emit('subscribe', { symbol: sym });
      }
    }
    for (const sym of prevSymbols) {
      if (!newSymbols.has(sym)) {
        s.emit('unsubscribe', { symbol: sym });
      }
    }
    subscribedRef.current = newSymbols;

    return () => {
      s.off('tick', handleTick);
      s.off('change_event', handleEvent);
      if (onOptionsTick) {
        s.off('options:tick', onOptionsTick);
      }
      s.off('connect', onConnect);
    };
  }, [isAuth, symbols.join(',')]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const s = socketRef.current;
      if (s) {
        for (const sym of subscribedRef.current) {
          s.emit('unsubscribe', { symbol: sym });
        }
        subscribedRef.current = new Set();
      }
    };
  }, []);
}
