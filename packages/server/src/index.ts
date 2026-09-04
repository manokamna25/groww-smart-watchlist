import express from 'express';
import http from 'http';
import cors from 'cors';
import { env } from './config/env';
import { authRouter } from './auth/auth.routes';
import { watchlistRouter } from './watchlist/watchlist.routes';
import { intelligenceRouter } from './intelligence/intelligence.routes';
import { devRouter } from './market/dev.routes';
import { errorHandler } from './middleware/errorHandler';
import { socketGateway } from './ws/gateway';
import { initRedis } from './config/redis';

export const app = express();
export const server = http.createServer(app);

app.use(cors());
app.use(express.json());

// Healthcheck endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Route registration
app.use('/api/auth', authRouter);
app.use('/api/watchlists', watchlistRouter);
app.use('/api/intelligence', intelligenceRouter);
app.use('/api/dev', devRouter);

// Central error handler
app.use(errorHandler);

// In production, serve the compiled React frontend statically
if (process.env.NODE_ENV === 'production') {
  const path = require('path');
  const clientBuildPath = path.join(__dirname, '../../client/dist');
  app.use(express.static(clientBuildPath));
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Initialize Socket.io gateway
socketGateway.init(server);

import { ingestionEngine } from './market/ingestion';

if (process.env.NODE_ENV !== 'test') {
  initRedis().then(() => {
    // Seed instruments and start the market ingestion engine
    ingestionEngine.seedInstruments().then(() => {
      ingestionEngine.start();
      console.log('📈 Simulated Market Feed Started');
      
      server.listen(env.PORT, () => {
        console.log(`🚀 Smart Watchlist Backend listening on port ${env.PORT}`);
      });
    });
  });
}
