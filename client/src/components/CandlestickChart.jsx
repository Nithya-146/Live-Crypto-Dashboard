import React from 'react';
import {
  ComposedChart,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Bar,
  ReferenceLine
} from 'recharts';
import { formatPrice } from './TickerGrid';

// Custom shape for the candlestick
const CandlestickShape = (props) => {
  const { x, y, width, height, payload } = props;
  if (!payload || x === undefined || y === undefined || width === undefined || height === undefined) return null;
  
  const { open, close, high, low } = payload;
  const isPositive = close >= open;
  const color = isPositive ? 'var(--success)' : 'var(--danger)';
  
  // Math mapping for wick coordinates based on linear interpolation
  const bodyHeight = Math.abs(open - close);
  const ratio = bodyHeight === 0 ? 1 : height / bodyHeight;
  
  const topPrice = Math.max(open, close);
  const bottomPrice = Math.min(open, close);
  
  const wickTop = y - (high - topPrice) * ratio;
  const wickBottom = y + height + (bottomPrice - low) * ratio;
  const center = x + width / 2;
  
  return (
    <g>
      {/* Wick Line */}
      <line
        x1={center}
        y1={wickTop}
        x2={center}
        y2={wickBottom}
        stroke={color}
        strokeWidth={1.5}
      />
      {/* Candle Body */}
      <rect
        x={x}
        y={y}
        width={width}
        height={Math.max(height, 2)} // Minimum 2px height for visual clarity
        fill={color}
        stroke={color}
        strokeWidth={1}
      />
    </g>
  );
};

// Custom tooltip renderer
const CustomTooltip = ({ active, payload, currency, rate }) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const isPositive = data.close >= data.open;
    
    // We display timestamps in IST
    const istTime = new Date(data.timestamp).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });

    return (
      <div className="chart-tooltip">
        <p className="tooltip-title">IST Time: {istTime}</p>
        <div className="tooltip-row">
          <span className="tooltip-label">Open:</span>
          <span className="tooltip-value">{formatPrice(data.open, currency, 1)}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">High:</span>
          <span className="tooltip-value success">{formatPrice(data.high, currency, 1)}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Low:</span>
          <span className="tooltip-value danger">{formatPrice(data.low, currency, 1)}</span>
        </div>
        <div className="tooltip-row">
          <span className="tooltip-label">Close:</span>
          <span className="tooltip-value">{formatPrice(data.close, currency, 1)}</span>
        </div>
        <div className="tooltip-row" style={{ marginTop: '4px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '4px' }}>
          <span className="tooltip-label">Volume:</span>
          <span className="tooltip-value" style={{ color: 'var(--primary)' }}>
            {data.volume.toFixed(4)}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

export default function CandlestickChart({ candles, assetName, currency, usdToInrRate }) {
  // 1. Convert OHLC prices to the toggled currency
  const rate = currency === 'INR' ? usdToInrRate : 1;
  
  const convertedData = candles.map(candle => ({
    ...candle,
    open: candle.open * rate,
    high: candle.high * rate,
    low: candle.low * rate,
    close: candle.close * rate,
    openClose: [candle.open * rate, candle.close * rate]
  }));

  // 2. Calculate dynamic domains for cleaner axis bounds
  const prices = convertedData.flatMap(c => [c.low, c.high]);
  const minPrice = prices.length ? Math.min(...prices) * 0.999 : 0;
  const maxPrice = prices.length ? Math.max(...prices) * 1.001 : 100;

  // Last close price to draw reference line
  const lastCandle = convertedData[convertedData.length - 1];
  const currentPrice = lastCandle ? lastCandle.close : null;

  // Format tick labels for X-axis in IST timezone
  const formatXAxis = (tickItem) => {
    return new Date(tickItem).toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatYAxis = (tickItem) => {
    if (tickItem >= 1e6) return `${currency === 'INR' ? '₹' : '$'}${(tickItem / 1e6).toFixed(2)}M`;
    if (tickItem >= 1e3) return `${currency === 'INR' ? '₹' : '$'}${(tickItem / 1e3).toFixed(1)}K`;
    return `${currency === 'INR' ? '₹' : '$'}${tickItem.toFixed(1)}`;
  };

  return (
    <div className="glass-card chart-panel">
      <div className="chart-header">
        <div className="chart-title-group">
          <h2 className="chart-title">{assetName} Live Candles</h2>
          <span className="timeframe-badge">1 MINUTE RESOLUTION</span>
        </div>
        {currentPrice && (
          <div style={{ fontSize: '15px', fontWeight: '600' }}>
            Last Close:{' '}
            <span className={lastCandle.close >= lastCandle.open ? 'flash-up' : 'flash-down'}>
              {formatPrice(currentPrice / rate, currency, rate)}
            </span>
          </div>
        )}
      </div>

      <div className="chart-container">
        {convertedData.length === 0 ? (
          <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
            Waiting for live WebSocket ticks to build first candle... (usually within 10-15s)
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart
              data={convertedData}
              margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
            >
              <XAxis
                dataKey="timestamp"
                tickFormatter={formatXAxis}
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                domain={[minPrice, maxPrice]}
                orientation="right"
                stroke="var(--text-muted)"
                fontSize={11}
                tickLine={false}
                axisLine={false}
                tickFormatter={formatYAxis}
              />
              <Tooltip
                content={<CustomTooltip currency={currency} rate={rate} />}
                cursor={{ stroke: 'rgba(255, 255, 255, 0.05)', strokeWidth: 1 }}
              />
              
              {currentPrice && (
                <ReferenceLine
                  y={currentPrice}
                  stroke={lastCandle.close >= lastCandle.open ? 'rgba(0, 230, 118, 0.3)' : 'rgba(255, 23, 68, 0.3)'}
                  strokeDasharray="3 3"
                />
              )}

              <Bar
                dataKey="openClose"
                shape={<CandlestickShape />}
                maxBarSize={14}
              />
            </ComposedChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
