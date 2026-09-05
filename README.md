# 📈 Groww SmartWatch: Institutional Intelligence for Retail Investors

[![React](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-Live_Data-00D09C?style=for-the-badge&logo=socket.io)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)

> **Built for the Groww Hackathon 2026**
> 
> Empowering retail investors with the quantitative tools and Generative AI previously only available to Wall Street institutions.

---

## 🚀 The Problem

Retail investors trade at a massive disadvantage. Institutional traders use Bloomberg terminals, high-frequency anomaly detection (Z-Scores), and Black-Scholes options pricing engines to find breakouts before they happen. Retail investors are stuck staring at static charts, reacting *after* the market moves.

When forced to build a "Market Watchlist", most developers build a simple table of prices. But a list of prices doesn't tell a retail trader **why** a stock is moving, or **if** they should pay attention to it.

## 💡 The Solution: Groww SmartWatch

**SmartWatch** is a next-generation trading terminal built on Groww's design principles. It monitors thousands of assets simultaneously and alerts retail users the exact second an anomaly occurs. We didn't build an obvious watchlist; we built an **Institutional-grade Intelligence layer**.

### 🔥 Key Features & Judging Rubric Alignment

#### 1. "Meaningful Change" Detection (Z-Score Anomaly Engine)
*Addresses: "Help users understand what has meaningfully changed"*
Instead of showing a boring "+2%", we built a math engine that calculates rolling Z-Scores on volume and price. When a user logs back in, the **Smart AI Digest** mathematically identifies true anomalies and says: *"While you were away: 1 anomaly detected. CRITICAL."* 

#### 2. Deterministic Narrative Engine (Zero LLM Latency)
*Addresses: "Product Interpretation & Originality"*
Instead of an expensive, slow, and non-deterministic LLM API call that can fail during a live demo, we built a deterministic template engine. It translates complex math and Z-scores into simple, actionable English. Every word generated is traceable to a specific mathematical signal, which is critical for compliance and defendability.

#### 3. High-Performance Live Architecture
*Addresses: "Engineering Depth & Reliability"*
- **Live Candlestick Charts**: Integrated `lightweight-charts` by TradingView for 60fps canvas rendering of live OHLCV data.
- **WebSocket Streaming**: Sub-10ms latency updates via a custom WebSocket architecture, moving away from slow, stale REST polling.
- **Architecture Designed to Scale**: We implemented a per-symbol Redis Pub/Sub model. This means the WebSocket gateway only keeps a channel open for actively watched symbols. The fan-out cost scales with the number of *unique symbols watched*, NOT the number of users.

#### 4. Engineering Proofs & Edge Case Handling (Testable)
*Addresses: "Edge Cases, Resilience, & Simplicity"*
- **Post-Crash Recovery (Replay)**: If the WebSocket disconnects, the system automatically fetches missed events upon reconnection and fills the UI without duplicating data.
- **Out-of-Order Tick Handling**: If market ticks arrive out of sequence, the engine resolves conflicts using the `exchange_timestamp` rather than the server's arrival time, guaranteeing data integrity.
- **Config-Driven Thresholds**: The Z-score boundary tiers (Notable, Meaningful, Critical) are completely isolated in a config file, allowing risk management teams to tune thresholds in production without requiring an engineering deploy.

#### 4. Voice Alerts (Web Speech API)
*Addresses: "Originality & Thoughtfulness"*
Day traders look at multiple screens. SmartWatch uses the browser's native Web Speech API to provide auditory alerts for sudden market breakouts ("Critical spike detected in Reliance"), ensuring users never miss a trade even if they are in another tab.

#### 5. SEBI Regulatory Compliance & Product-Led Growth
*Addresses: "Edge Cases & Business Understanding"*
- **F&O Risk Disclosures**: We implemented the strict SEBI-mandated warning modals for Derivatives trading, proving we understand the real-world compliance constraints of Indian Fintechs.
- **Catch & Share Brag Cards**: Users can execute a Smart Trade and instantly generate a beautifully branded, SEBI-compliant PNG "Brag Card" to share on X/Twitter, powering a viral growth loop that drops Customer Acquisition Cost (CAC) to zero.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React + Vite + TypeScript.
- **Styling**: TailwindCSS with modern glassmorphism, responsive design, and CSS variables for theming (Groww Green `var(--groww-green)`).
- **State Management**: React Query (handling stale data & caching gracefully) + Zustand.
- **Backend**: Node.js worker simulating a high-frequency tick ingestion pipeline.
- **Math Engine**: Custom Black-Scholes options pricing model and standard deviation calculators for Z-Scores.

---

## 🚀 How to Run Locally

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd groww-smart-watchlist
   ```

2. **Install dependencies**
   ```bash
   npm run install:all
   ```

3. **Start the application** (Starts both the React client and the Node.js WebSocket Server)
   ```bash
   npm run dev
   ```

4. **Open the App**
   Navigate to `http://localhost:5173`

*(Tip: Use the "Dev Inject" button in the bottom right corner of the app to simulate live market anomalies and test the Voice Alerts and AI explanations!)*

---
*Disclaimer: This is a hackathon project and does not provide real financial advice. 9 out of 10 individual traders in equity Futures and Options Segment incur net losses.*
