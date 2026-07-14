# Live Crypto Dashboard 🚀

A real-time cryptocurrency dashboard featuring live price tracking, an interactive order book, a tax calculator, and a Web Push notification system for custom price alerts.

## 🔗 Links
- **GitHub Repository**: [https://github.com/Nithya-146/Live-Crypto-Dashboard](https://github.com/Nithya-146/Live-Crypto-Dashboard)
- **Live Demo Site**: [https://nithya-146.github.io/Live-Crypto-Dashboard/](https://nithya-146.github.io/Live-Crypto-Dashboard/)

---

## 🛠️ Project Structure
The project is split into two components:
- **`client/`**: React frontend built with Vite, Tailwind CSS (optional/vanilla styling), and Recharts for real-time visualization.
- **`server/`**: Express backend built with `web-push` to register subscribers and send real-time browser push alerts when price conditions are met.

---

## 🚀 Getting Started

### Prerequisites
Make sure you have [Node.js](https://nodejs.org/) installed (v16+ recommended).

### 1. Server Setup (Backend)
The backend manages client Web Push subscriptions and triggers push notifications.

```bash
cd server
npm install
```

#### Configuration
Create a `.env` file inside the `server/` directory:
```env
PORT=5000
VAPID_PUBLIC_KEY=your_public_key
VAPID_PRIVATE_KEY=your_private_key
```
*Note: If no VAPID keys are provided, the server will dynamically auto-generate keys at startup for demo purposes.*

#### Run the Server
```bash
# Start in development mode with nodemon
npm run dev

# Start in production mode
npm start
```
The server will run at `http://localhost:5000`.

---

### 2. Client Setup (Frontend)
The frontend connects to the backend and displays live mock/WebSocket crypto data.

```bash
cd client
npm install
```

#### Run the Client
```bash
npm run dev
```
The client will run at `http://localhost:5173`. Open this URL in your browser to view the dashboard.

---

## 🌟 Key Features
- **Real-Time Price Tick Grid**: Live streaming price tickers for BTC, ETH, and SOL.
- **Order Book & Depth Chart**: Simulated interactive order book showing asks/bids with depth visualization.
- **Custom Price Alerts (Web Push)**: Register browser notification alerts to receive push notifications when prices cross target levels.
- **Crypto Tax Calculator**: Simple tax calculator aligned with standard crypto transaction rules.

---

## 🛠️ Technologies Used
- **Frontend**: React, Vite, Recharts, Lucide Icons
- **Backend**: Node.js, Express, Web-Push, CORS, Nodemon
