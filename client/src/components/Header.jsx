import React from 'react';
import { Activity, Flame, ShieldAlert } from 'lucide-react';

export default function Header({ isWsConnected, currency, setCurrency, usdToInrRate }) {
  return (
    <header className="glass-card header">
      <div className="logo-container">
        <Activity className="logo-icon" />
        <h1 className="logo-text">AETHER CRYPTO</h1>
        <span className="timeframe-badge">LIVE FEEDS</span>
      </div>

      <div className="header-controls">
        {/* Connection status indicator */}
        <div className="connection-status">
          <div className={`status-dot ${isWsConnected ? 'connected' : 'disconnected'}`}></div>
          <span>Binance WS: {isWsConnected ? 'Connected' : 'Reconnecting...'}</span>
        </div>

        {/* Dynamic USD/INR toggle with exchange rate label */}
        <div className="currency-toggle-wrapper" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            1 USD ≈ {usdToInrRate} INR
          </span>
          <div className="currency-toggle">
            <button
              className={`toggle-btn ${currency === 'USD' ? 'active' : ''}`}
              onClick={() => setCurrency('USD')}
            >
              USD ($)
            </button>
            <button
              className={`toggle-btn ${currency === 'INR' ? 'active' : ''}`}
              onClick={() => setCurrency('INR')}
            >
              INR (₹)
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
