import React, { useEffect, useState } from 'react';
import { Layers } from 'lucide-react';
import { formatPrice } from './TickerGrid';

export default function OrderBook({ currentPrice, assetSymbol, currency, usdToInrRate }) {
  const [bids, setBids] = useState([]);
  const [asks, setAsks] = useState([]);
  
  // Seed the simulated order book around the current price
  useEffect(() => {
    if (!currentPrice) return;
    
    // Generate 5 levels of bids and asks
    const generateOrderBook = () => {
      const bidList = [];
      const askList = [];
      const tickSize = currentPrice * 0.0003; // Dynamic step size (0.03% of price)
      
      let accumBidVolume = 0;
      let accumAskVolume = 0;

      for (let i = 1; i <= 5; i++) {
        // Asks (above market price) - higher price gets more accumulated volume
        const askPrice = currentPrice + (i * tickSize);
        const askSize = Math.random() * (2.5 / i) + 0.05;
        accumAskVolume += askSize;
        askList.push({
          price: askPrice,
          amount: askSize,
          depth: 0 // Will compute later
        });

        // Bids (below market price)
        const bidPrice = currentPrice - (i * tickSize);
        const bidSize = Math.random() * (2.5 / i) + 0.05;
        accumBidVolume += bidSize;
        bidList.push({
          price: bidPrice,
          amount: bidSize,
          depth: 0
        });
      }

      // Compute relative depth percentage for background bars
      const maxBidDepth = accumBidVolume;
      const maxAskDepth = accumAskVolume;

      let currentBidDepth = 0;
      const bidsWithDepth = bidList.map(bid => {
        currentBidDepth += bid.amount;
        return { ...bid, depthPercent: (currentBidDepth / maxBidDepth) * 100 };
      });

      let currentAskDepth = 0;
      const asksWithDepth = askList.map(ask => {
        currentAskDepth += ask.amount;
        return { ...ask, depthPercent: (currentAskDepth / maxAskDepth) * 100 };
      }).reverse(); // Display highest asks at the top

      setBids(bidsWithDepth);
      setAsks(asksWithDepth);
    };

    // Initialize or perturb slightly on price changes to simulate action
    generateOrderBook();

    // Set up small interval perturbation to look "live" even if price ticker is steady
    const interval = setInterval(() => {
      setBids(prevBids => 
        prevBids.map(bid => {
          const delta = (Math.random() - 0.5) * 0.1 * bid.amount;
          const newAmount = Math.max(0.01, bid.amount + delta);
          return { ...bid, amount: newAmount };
        })
      );
      setAsks(prevAsks => 
        prevAsks.map(ask => {
          const delta = (Math.random() - 0.5) * 0.1 * ask.amount;
          const newAmount = Math.max(0.01, ask.amount + delta);
          return { ...ask, amount: newAmount };
        })
      );
    }, 1200);

    return () => clearInterval(interval);
  }, [currentPrice]);

  if (!currentPrice) {
    return (
      <div className="glass-card">
        <div className="panel-title"><Layers size={18} /> Order Book</div>
        <p style={{ color: 'var(--text-muted)', fontSize: '13px', marginTop: '12px' }}>
          Awaiting live data feeds...
        </p>
      </div>
    );
  }

  // Calculate spread values
  const topBid = bids[0]?.price || currentPrice;
  const topAsk = asks[asks.length - 1]?.price || currentPrice;
  const spread = Math.abs(topAsk - topBid);
  const spreadPercent = (spread / currentPrice) * 100;

  return (
    <div className="glass-card order-book-container">
      <div className="panel-header">
        <div className="panel-title">
          <Layers size={18} style={{ color: 'var(--primary)' }} />
          <span>Simulated Order Book</span>
        </div>
        <span className="panel-subtitle">{assetSymbol}/USDT</span>
      </div>

      <table className="order-book-table">
        <thead>
          <tr>
            <th className="order-book-th">Price ({currency})</th>
            <th className="order-book-th">Size ({assetSymbol})</th>
            <th className="order-book-th">Total</th>
          </tr>
        </thead>
        <tbody>
          {/* ASKS (SELLS) - RED */}
          {asks.map((ask, index) => (
            <tr key={`ask-${index}`} className="order-row">
              <td className="order-td ask-price">
                {formatPrice(ask.price, currency, usdToInrRate)}
              </td>
              <td className="order-td">{ask.amount.toFixed(4)}</td>
              <td className="order-td">{(ask.price * ask.amount).toFixed(2)}</td>
              <div 
                className="depth-bar ask" 
                style={{ width: `${ask.depthPercent}%` }} 
              />
            </tr>
          ))}

          {/* SPREAD INDICATOR */}
          <tr style={{ height: '36px' }}>
            <td colSpan="3" style={{ padding: '4px 0' }}>
              <div className="spread-row">
                <span style={{ color: 'var(--text-light)' }}>
                  Mid: {formatPrice(currentPrice, currency, usdToInrRate)}
                </span>
                <span style={{ color: 'var(--text-muted)' }}>
                  Spread: {formatPrice(spread, currency, usdToInrRate)} ({spreadPercent.toFixed(3)}%)
                </span>
              </div>
            </td>
          </tr>

          {/* BIDS (BUYS) - GREEN */}
          {bids.map((bid, index) => (
            <tr key={`bid-${index}`} className="order-row">
              <td className="order-td bid-price">
                {formatPrice(bid.price, currency, usdToInrRate)}
              </td>
              <td className="order-td">{bid.amount.toFixed(4)}</td>
              <td className="order-td">{(bid.price * bid.amount).toFixed(2)}</td>
              <div 
                className="depth-bar bid" 
                style={{ width: `${bid.depthPercent}%` }} 
              />
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
