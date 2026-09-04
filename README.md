# 📈 Groww Smart Watchlist & AI Screener

An enterprise-grade, real-time market intelligence platform built for the **Groww Hackathon**. 

Most watchlists only tell you *what* the price is. The **Groww Smart Watchlist** tells you *why* the price is moving. By utilizing a high-frequency WebSocket architecture and an advanced mathematical intelligence engine, this platform detects hidden market anomalies, institutional volume spikes, and breaking technical breakouts in real-time.

---

## ⚡ Key Features (The "Wow" Factor)

### 1. 🧠 Mathematical Intelligence Engine (Z-Scores)
Instead of hard-coded "if price > X" rules, the backend runs a rolling **Z-Score statistical analysis** on tick data. It calculates the moving average and standard deviation of asset volatility, allowing the engine to mathematically detect true statistical anomalies (like institutional block trades) while ignoring normal market noise.

### 2. 🚀 Real-Time WebSocket Pub/Sub Architecture
The platform is powered by a high-frequency WebSocket gateway (`Socket.io`). It utilizes a highly optimized Pub/Sub pattern to stream live tick data and intelligence events directly to the client without the overhead of HTTP polling. 

### 3. 📱 Simulated iOS Push Notifications
To bridge the gap between web and mobile, the platform features a custom-built, glassmorphic Push Notification system. When the engine detects a `CRITICAL` market event, it pushes an iOS-style alert directly into the web UI. Clicking the notification deep-links the user straight into the intelligence report.

### 4. 📉 Portfolio Risk "Stress Testing"
We didn't just build a price tracker; we built a quantitative risk engine. The Portfolio tab includes a **Monte Carlo Stress Test** feature. With one click, the system calculates the historical "Beta" (volatility correlation) of the user's specific assets and instantly reveals hidden, high-risk exposure by calculating exact projected losses during a simulated market crash.

### 5. 🛡️ Fault-Tolerant Infrastructure
The system is designed to be highly resilient. While it is built to scale across multiple nodes using an external **Redis** event bus, it features a built-in graceful degradation system. If the cloud Redis server crashes or is unavailable, the WebSocket engine automatically detects the failure and switches to a localized, in-memory event bus, keeping the platform 100% live without crashing.

---

## 🛠️ Technology Stack

- **Frontend:** React (Vite), TypeScript, Tailwind CSS (Custom Glassmorphic UI)
- **Backend:** Node.js, Express.js, TypeScript
- **Real-Time Data:** Socket.io (WebSocket), Custom Pub/Sub Event Bus
- **Database:** PostgreSQL (for persisting Watchlist user state)
- **Caching/Scaling:** Redis (with in-memory fallback)
- **Deployment:** Render.com (Unified Blueprint Architecture)

---

## ⚙️ How It Works (Architecture Flow)

1. **Market Ingestion:** The `SimulatedSource` engine generates highly realistic, micro-tick market data for NSE Equities.
2. **Analysis:** The `Scorer` intercepts every tick. It updates the rolling volatility baseline and calculates a Z-Score.
3. **Classification:** If the Z-Score breaches the threshold (>2.0), it is classified as `Notable`, `Meaningful`, or `Critical`.
4. **Broadcast:** The event is pushed to the Redis/Memory Event Bus.
5. **Client Delivery:** The `SocketGateway` instantly pushes the event and a natural-language narrative to the React frontend.

---

## 🚀 Running Locally

1. **Install Dependencies**
   ```bash
   npm install
   ```
2. **Generate Database Schema**
   ```bash
   npm run db:generate
   ```
3. **Start the Development Servers (Frontend & Backend)**
   ```bash
   npm run dev
   ```

*The application will automatically start on `http://localhost:5173`.*
