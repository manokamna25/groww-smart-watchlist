import { Router } from 'express';
import { env } from '../config/env';
import { simulatedMarketSource } from './simulatedSource';

export const devRouter = Router();

devRouter.post('/inject-event', (req, res) => {
  if (!env.DEV_MODE) {
    return res.status(403).json({ error: 'Dev mode disabled. Event injection is forbidden in production.' });
  }

  const { symbol, type } = req.body;
  if (!symbol || !type) {
    return res.status(400).json({ error: 'symbol and type (spike | gap | volume_anomaly) are required.' });
  }

  if (!['spike', 'spike_up', 'spike_down', 'gap', 'volume_anomaly'].includes(type)) {
    return res.status(400).json({ error: 'Invalid event type. Must be spike, spike_up, spike_down, gap, or volume_anomaly.' });
  }

  try {
    simulatedMarketSource.injectEvent(symbol, type);
    return res.json({
      success: true,
      message: `Successfully scheduled ${type} injection for ${symbol.toUpperCase()} on next tick.`,
    });
  } catch (err: any) {
    return res.status(400).json({ error: err.message });
  }
});
