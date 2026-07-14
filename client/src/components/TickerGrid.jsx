import React, { useEffect, useRef, useState } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';

export const formatPrice = (value, currency, rate) => {
  if (value === undefined || value === null) return '---';
  const converted = currency === 'INR' ? value * rate : value;
  const locale = currency === 'INR' ? 'en-IN' : 'en-US';
  const currencyCode = currency === 'INR' ? 'INR' : 'USD';
  
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currencyCode,
    minimumFractionDigits: value < 5 ? 4 : 2,
    maximumFractionDigits: value < 5 ? 4 : 2,
  }).format(converted);
};

export const formatVolume = (value, currency, rate) => {
  if (!value) return '---';
  const converted = currency === 'INR' ? value * rate : value;
  const symbol = currency === 'INR' ? '₹' : '$';
  
  if (converted >= 1e9) {
    return `${symbol}${(converted / 1e9).toFixed(2)}B`;
  }
  if (converted >= 1e6) {
    return `${symbol}${(converted / 1e6).toFixed(2)}M`;
  }
  if (converted >= 1e3) {
    return `${symbol}${(converted / 1e3).toFixed(2)}K`;
  }
  return `${symbol}${converted.toFixed(2)}`;
};

function TickerCard({ assetKey, tickerData, currency, rate, isSelected, onSelect }) {
  const { symbol, name, price, change24h, high24h, low24h, volumeQuote } = tickerData;
  const prevPriceRef = useRef(price);
  const [flashClass, setFlashClass] = useState('');

  useEffect(() => {
    if (price === prevPriceRef.current || !price) return;
    
    if (price > prevPriceRef.current) {
      setFlashClass('flash-up');
    } else if (price < prevPriceRef.current) {
      setFlashClass('flash-down');
    }
    
    prevPriceRef.current = price;

    const timer = setTimeout(() => {
      setFlashClass('');
    }, 400);

    return () => clearTimeout(timer);
  }, [price]);

  const isPositive = change24h >= 0;
  const iconClass = assetKey === 'BTC' ? 'btc-icon' : assetKey === 'ETH' ? 'eth-icon' : 'sol-icon';

  return (
    <div 
      className={`glass-card ticker-card ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(assetKey)}
    >
      <div className="ticker-card-header">
        <div className="coin-info">
          <div className={`coin-icon-wrapper ${iconClass}`}>
            {assetKey[0]}
          </div>
          <div>
            <span className="coin-name">{name}</span>
            <span className="coin-symbol">{symbol}/USDT</span>
          </div>
        </div>

        <div className={`price-change-badge ${isPositive ? 'positive' : 'negative'}`}>
          {isPositive ? <ArrowUpRight size={16} /> : <ArrowDownRight size={16} />}
          <span>{isPositive ? '+' : ''}{change24h?.toFixed(2)}%</span>
        </div>
      </div>

      <div className={`ticker-price ${flashClass}`}>
        {formatPrice(price, currency, rate)}
      </div>

      <div className="ticker-stats">
        <div className="stat-item">
          <span className="stat-label">24h High</span>
          <span className="stat-value">{formatPrice(high24h, currency, rate)}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">24h Low</span>
          <span className="stat-value">{formatPrice(low24h, currency, rate)}</span>
        </div>
        <div className="stat-item" style={{ gridColumn: 'span 2', marginTop: '4px' }}>
          <span className="stat-label">24h Volume ({currency})</span>
          <span className="stat-value">{formatVolume(volumeQuote, currency, rate)}</span>
        </div>
      </div>
    </div>
  );
}

export default function TickerGrid({ tickers, selectedAsset, setSelectedAsset, currency, usdToInrRate }) {
  return (
    <section className="ticker-grid">
      {Object.keys(tickers).map((key) => (
        <TickerCard
          key={key}
          assetKey={key}
          tickerData={tickers[key]}
          currency={currency}
          rate={usdToInrRate}
          isSelected={selectedAsset === key}
          onSelect={setSelectedAsset}
        />
      ))}
    </section>
  );
}
