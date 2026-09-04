import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';

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
  onChangeEvent: (data: any) => void
) {
  const isAuth = useAuthStore((s) => s.isAuthenticated());
  const socketRef = useRef<Socket | null>(null);
  const subscribedRef = useRef<Set<string>>(new Set());

  const handleTick = useCallback(onTick, []);
  const handleEvent = useCallback(onChangeEvent, []);

  useEffect(() => {
    if (!isAuth || symbols.length === 0) return;

    const s = getSocket();
    socketRef.current = s;

    s.on('tick', handleTick);
    s.on('change_event', handleEvent);

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
