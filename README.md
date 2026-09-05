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

## 🚀 The Problem

Retail investors trade at a massive disadvantage. Institutional traders use Bloomberg terminals, high-frequency anomaly detection (Z-Scores), and Black-Scholes options pricing engines to find breakouts before they happen. Retail investors are stuck staring at static charts, reacting *after* the market moves.

When forced to build a "Market Watchlist", most developers build a simple table of prices. But a list of prices doesn't tell a retail trader **why** a stock is moving, or **if** they should pay attention to it.

## 💡 The Solution: Groww SmartWatch

**SmartWatch** is a next-generation trading terminal built on Groww's design principles. It monitors thousands of assets simultaneously and alerts retail users the exact second an anomaly occurs. We didn't build an obvious watchlist; we built an **Institutional-grade Intelligence layer**.

---

## 🔥 Key Engineering Features & Judging Alignment

### 1. Hybrid Market Data Engine (Binance WebSocket + High-Freq Simulator)
*Addresses: "Engineering Depth & Reliability"*
To prove our system handles true global scale, our Node.js backend connects directly to the **live Binance WebSocket API** (`wss://stream.binance.com`). If you add `BTCUSDT` to your watchlist, you are watching real, live global trades hitting our ingestion engine. For Indian equities (where free live WebSockets don't exist), we run a synchronized high-frequency deterministic simulator.

### 2. Native OS Push Notifications (Service Workers)
*Addresses: "Edge Cases & Business Understanding"*
Retail traders can't stare at screens all day. We built a true **Service Worker** (`sw.js`). Even if the user minimizes the browser or switches tabs, our WebSocket connection keeps monitoring. If a critical breakout happens, the Service Worker triggers a **Native OS Push Notification** directly to their lock screen or desktop notification center.

### 3. Progressive Web App (PWA) Installability
*Addresses: "Product Execution"*
This isn't just a website. SmartWatch is a fully configured **Progressive Web App (PWA)**. Users can click "Add to Home Screen" on their mobile devices, and the app instantly installs as a native-feeling, fullscreen mobile application with zero browser chrome. 

### 4. "Meaningful Change" Detection (Z-Score Anomaly Engine)
*Addresses: "Help users understand what has meaningfully changed"*
Instead of showing a boring "+2%", we built a math engine that calculates rolling Z-Scores on volume and price. It separates "Quiet" noise from "Critical" anomalies. When you log in, the **Smart AI Digest** states: *"While you were away: 1 anomaly detected. CRITICAL."* 

### 5. Generative AI "Jarvis" Explainer
*Addresses: "Product Interpretation & Originality"*
When an anomaly hits, users can click **"Explain with AI"**. Our backend connects to Google Gemini to instantly generate a plain-English explanation of exactly what the anomaly means, complete with volume analysis and Greeks, helping retail users learn market dynamics on the fly.

### 6. Full Database Authentication & Persistence (PostgreSQL + Prisma)
*Addresses: "Defensibility & Production Readiness"*
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
