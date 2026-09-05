# 📈 Groww SmartWatch: Institutional Intelligence for Retail Investors

[![React](https://img.shields.io/badge/React-18.2.0-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5.0-646CFF?style=for-the-badge&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16.0-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma-5.0-2D3748?style=for-the-badge&logo=prisma)](https://prisma.io/)
[![Tailwind](https://img.shields.io/badge/Tailwind_CSS-3.4-38B2AC?style=for-the-badge&logo=tailwind-css)](https://tailwindcss.com/)
[![WebSockets](https://img.shields.io/badge/WebSockets-Live_Data-00D09C?style=for-the-badge&logo=socket.io)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-339933?style=for-the-badge&logo=node.js)](https://nodejs.org/)

> **Built for the Groww Hackathon 2026**
> 
> Empowering retail investors with the quantitative tools and real-time infrastructure previously only available to Wall Street institutions.

---

## 🎯 Core Technical Achievements

We engineered a robust, institutional-grade architecture designed to handle real-world scale and edge cases.

| Engineering Focus | Technical Implementation |
| :--- | :--- |
| **Mathematical Intelligence** | Built a real-time **Z-Score Anomaly Engine**. Instead of showing arbitrary percentage changes, our backend calculates statistical standard deviations (Z-Scores) on both price and volume to mathematically prove an anomaly. The AI Digest then generates a plain-English explanation. |
| **Resilience & Edge Cases** | Implemented **Out-of-Order Tick Handling** (resolving WebSocket packets using exchange timestamps, not server arrival time) and **Connection Recovery** (gracefully fetching missed ticks if the WebSocket drops). |
| **Scalable Architecture** | Bypassed slow REST APIs to build a **Hybrid Market Data Engine**. Connected directly to the live **Binance WebSocket API** to prove global scale handling, while using **Redis Pub/Sub** to fan-out WebSocket events only to users tracking specific assets. |
| **Production Readiness** | Fully production-ready with **PostgreSQL Database Authentication** (isolated watchlists per user), a **Progressive Web App (PWA)** implementation for native mobile installability, and **Native OS Service Worker Push Notifications**. |
| **User Experience (UX)** | Integrated the **Web Speech API** for Voice Alerts so day traders don't have to stare at their screens, and a **Generative AI Explainer** (Google Gemini) to translate complex Options Greeks dynamically. |

---

## 🚀 The Core Features

### 1. Hybrid Market Data Engine (Binance WebSocket + High-Freq Simulator)
To prove our system handles true global scale, our Node.js backend connects directly to the **live Binance WebSocket API** (`wss://stream.binance.com`). If you add `BTCUSDT` to your watchlist, you are watching real, live global trades hitting our ingestion engine. For Indian equities (where free live WebSockets don't exist), we run a synchronized high-frequency deterministic simulator.

### 2. Native OS Push Notifications (Service Workers)
Retail traders can't stare at screens all day. We built a true **Service Worker** (`sw.js`). Even if the user minimizes the browser or switches tabs, our WebSocket connection keeps monitoring. If a critical breakout happens, the Service Worker triggers a **Native OS Push Notification** directly to their lock screen or desktop notification center.

### 3. Progressive Web App (PWA) Installability
This isn't just a website. SmartWatch is a fully configured **Progressive Web App (PWA)**. Users can click "Add to Home Screen" on their mobile devices, and the app instantly installs as a native-feeling, fullscreen mobile application with zero browser chrome. 

### 4. Catch & Share Brag Cards (Viral Growth Loop)
Users can execute a Smart Trade and instantly generate a beautifully branded, SEBI-compliant PNG "Brag Card" to share on X/Twitter. We used `html-to-image` to generate these dynamically on the client side, powering a viral growth loop that drops Customer Acquisition Cost (CAC) to zero.

### 5. SEBI Regulatory Compliance 
We implemented the strict SEBI-mandated warning modals for Derivatives trading, proving we understand the real-world compliance constraints of Indian Fintechs. The platform enforces these disclosures before users can access Options data.

### 6. Generative AI "Jarvis" Explainer
When an anomaly hits, users can click **"Explain with AI"**. Our backend connects to Google Gemini to instantly generate a plain-English explanation of exactly what the anomaly means, complete with volume analysis and Greeks, helping retail users learn market dynamics on the fly.

### 7. Full Database Authentication & Persistence (PostgreSQL + Prisma)
We didn't just mock the client state. The app uses a full **Neon PostgreSQL database** managed by **Prisma ORM**. Every user can securely register, log in, and persist their unique watchlists and portfolio data permanently in the database.

---

## 🛠️ Tech Stack & Architecture

- **Frontend**: React + Vite + TypeScript.
- **Styling**: TailwindCSS with modern glassmorphism, responsive design, and CSS variables for theming (Groww Green `var(--groww-green)`).
- **Database**: PostgreSQL (Neon) with Prisma ORM.
- **State Management**: React Query (handling stale data & caching gracefully) + Zustand.
- **Backend**: Node.js worker with Express and Socket.io.
- **Live Data**: Hybrid Architecture (Real Binance WebSockets + Local Deterministic Math Simulator).
- **Push Engine**: Native Browser Service Workers & Web Speech API.

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

3. **Set up the Database** (Requires a Postgres URL in `.env`)
   ```bash
   npm run db:push
   npm run db:generate
   ```

4. **Start the application**
   ```bash
   npm run dev
   ```

5. **Open the App**
   Navigate to `http://localhost:5173`

*(Tip: Track `BTCUSDT` to watch the live Binance WebSocket feed! Use the "Dev Inject" button in the bottom right corner of the app to simulate live market anomalies and trigger the Native Push Notifications!)*

---
*Disclaimer: This is a hackathon project and does not provide real financial advice. 9 out of 10 individual traders in equity Futures and Options Segment incur net losses.*
