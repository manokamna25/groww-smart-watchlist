import { Router } from 'express';
import { socketGateway } from '../ws/gateway';

export const marketRouter = Router();

marketRouter.get('/sentiment/:symbol', (req, res) => {
  const symbol = req.params.symbol.toUpperCase();
  // We can add a base multiplier to simulate a larger crowd (e.g. 100x)
  // or just return the exact refCount for demo purposes.
  // We'll add a baseline of ~30 + random to make it look active, plus the actual refCount.
  const actualCount = socketGateway.getRefCount(symbol);
  
  // Deterministic random based on symbol length to keep it somewhat stable
  const baseCount = 30 + (symbol.length * 7); 
  
  return res.json({
    symbol,
    activeTraders: baseCount + actualCount * 12
  });
});
