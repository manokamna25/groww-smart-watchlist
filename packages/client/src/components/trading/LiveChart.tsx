import React, { useEffect, useRef, useState } from 'react';
import { createChart, ColorType, IChartApi, ISeriesApi, Time, CandlestickSeries, createSeriesMarkers, ISeriesMarkersPluginApi } from 'lightweight-charts';

interface LiveChartProps {
  symbol: string;
  currentPrice: number;
  livePrice?: number;
  liveTime?: number;
  events?: any[];
}

export function LiveChart({ symbol, currentPrice, livePrice, liveTime, events = [] }: LiveChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const markersPluginRef = useRef<ISeriesMarkersPluginApi<Time> | null>(null);
  const [isReady, setIsReady] = useState(false);
  const lastCloseRef = useRef(currentPrice);
  const lastTimeRef = useRef<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!chartContainerRef.current) return;

    // Initialize Chart
    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.5)',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
        horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
      },
      timeScale: {
        timeVisible: true,
        secondsVisible: false,
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.1)',
      },
      crosshair: {
        mode: 0,
      }
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: '#00D09C',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#00D09C',
      wickDownColor: '#EF4444',
    });

    // Generate Mock Historical Data based on currentPrice
    const now = Math.floor(Date.now() / 1000);
    const alignedNow = now - (now % 5);
    const data = [];
    let price = currentPrice;
    
    // Reverse generate 100 candles (5s intervals to match live updates)
    for (let i = 100; i >= 0; i--) {
      const time = (alignedNow - i * 5) as Time;
      const open = price;
      const close = price + (Math.random() - 0.5) * (price * 0.002);
      const high = Math.max(open, close) + Math.random() * (price * 0.001);
      const low = Math.min(open, close) - Math.random() * (price * 0.001);
      
      data.push({ time, open, high, low, close });
      price = close;
    }

    lastCloseRef.current = data[data.length - 1].close;
    lastTimeRef.current = alignedNow;
    series.setData(data);

    chartRef.current = chart;
    seriesRef.current = series;
    setIsReady(true);

    const handleResize = () => {
      chart.applyOptions({ width: chartContainerRef.current?.clientWidth });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol]); // Remount if symbol changes entirely

  // Handle live ticks
  useEffect(() => {
    if (!isReady || !seriesRef.current || !livePrice) return;

    const ts = liveTime ? Math.floor(liveTime / 1000) : Math.floor(Date.now() / 1000);
    let roundedTime = ts - (ts % 5);
    
    if (roundedTime < lastTimeRef.current) {
      roundedTime = lastTimeRef.current;
    }

    const lastClose = lastCloseRef.current;
    
    seriesRef.current.update({
      time: roundedTime as Time,
      open: lastClose,
      high: Math.max(lastClose, livePrice),
      low: Math.min(lastClose, livePrice),
      close: livePrice
    });

    lastCloseRef.current = livePrice;
    lastTimeRef.current = roundedTime;

  }, [livePrice, liveTime, isReady]);

  // Handle AI Markers
  useEffect(() => {
    if (!isReady || !seriesRef.current || !events) return;

    const markers: any[] = events.map(e => {
      return {
        time: (Math.floor(new Date(e.ts).getTime() / 1000) - (Math.floor(new Date(e.ts).getTime() / 1000) % 5)) as Time,
        position: e.tier === 'critical' ? 'aboveBar' : 'belowBar',
        color: e.tier === 'critical' ? '#EF4444' : '#F97316',
        shape: e.tier === 'critical' ? 'arrowDown' : 'arrowUp',
        text: 'AI Alert',
      };
    });
    
    // Sort markers by time as required by lightweight-charts
    markers.sort((a, b) => (a.time as number) - (b.time as number));
    
    // Deduplicate markers with exact same time to prevent crash
    const uniqueMarkers = markers.filter((m, i, arr) => i === 0 || m.time !== arr[i-1].time);

    if (!markersPluginRef.current) {
      markersPluginRef.current = createSeriesMarkers(seriesRef.current, uniqueMarkers);
    } else {
      markersPluginRef.current.setMarkers(uniqueMarkers);
    }
  }, [events, isReady]);

  return (
    <div className="w-full h-full relative">
      <div ref={chartContainerRef} className="absolute inset-0" />
    </div>
  );
}
