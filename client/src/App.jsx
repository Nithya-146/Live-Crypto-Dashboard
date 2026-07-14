import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import TickerGrid from './components/TickerGrid';
import CandlestickChart from './components/CandlestickChart';
import OrderBook from './components/OrderBook';
import PriceAlerts from './components/PriceAlerts';
import TaxCalculator from './components/TaxCalculator';

const BACKEND_URL = 'http://localhost:5000';

export default function App() {
  const [currency, setCurrency] = useState('USD');
  const [usdToInrRate, setUsdToInrRate] = useState(83.95);
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [isWsConnected, setIsWsConnected] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);

  // Live tickers state
  const [tickers, setTickers] = useState({
    BTC: { symbol: 'BTCUSDT', name: 'Bitcoin', price: 91520.40, change24h: 3.42, high24h: 92800.00, low24h: 88200.00, volumeQuote: 1450000000 },
    ETH: { symbol: 'ETHUSDT', name: 'Ethereum', price: 3342.15, change24h: -1.15, high24h: 3450.00, low24h: 3280.00, volumeQuote: 820000000 },
    SOL: { symbol: 'SOLUSDT', name: 'Solana', price: 145.85, change24h: 8.95, high24h: 148.50, low24h: 132.10, volumeQuote: 340000000 }
  });

  // Candles history
  const [candles, setCandles] = useState({ BTC: [], ETH: [], SOL: [] });

  // Price alerts state
  const [alerts, setAlerts] = useState(() => {
    const saved = localStorage.getItem('crypto_price_alerts');
    return saved ? JSON.parse(saved) : [];
  });

  const wsRef = useRef(null);
  const simIntervalRef = useRef(null);
  const ticksReceivedRef = useRef(0);

  // Sync alerts with localStorage
  useEffect(() => {
    localStorage.setItem('crypto_price_alerts', JSON.stringify(alerts));
  }, [alerts]);

  // 1. Fetch live USD/INR exchange rate
  useEffect(() => {
    fetch('https://open.er-api.com/v6/latest/USD')
      .then(res => {
        if (!res.ok) throw new Error();
        return res.json();
      })
      .then(data => {
        if (data.rates && data.rates.INR) {
          setUsdToInrRate(parseFloat(data.rates.INR.toFixed(2)));
          console.log(`Live USD/INR exchange rate updated: ${data.rates.INR}`);
        }
      })
      .catch(() => {
        console.log('Failed to fetch live exchange rate, using fallback of 83.95');
      });
  }, []);

  // Generate fallback candles if API blocked
  const generateMockHistory = (asset, basePrice) => {
    const history = [];
    let currentPrice = basePrice;
    let time = Date.now() - (100 * 60 * 1000); // 100 mins ago
    
    for (let i = 0; i < 100; i++) {
      const change = (Math.random() - 0.48) * 0.002 * currentPrice; // Slight upward bias
      const open = currentPrice;
      const close = currentPrice + change;
      const high = Math.max(open, close) + (Math.random() * 0.001 * currentPrice);
      const low = Math.min(open, close) - (Math.random() * 0.001 * currentPrice);
      const volume = Math.random() * 50 + 5;

      history.push({
        timestamp: time,
        open,
        high,
        low,
        close,
        volume
      });
      currentPrice = close;
      time += 60 * 1000;
    }
    return history;
  };

  // 2. Pre-fetch historical 1-min candles
  useEffect(() => {
    const fetchHistory = async (asset, symbol, basePrice) => {
      try {
        const response = await fetch(
          `https://api.binance.com/api/v3/klines?symbol=${symbol}&interval=1m&limit=100`
        );
        if (!response.ok) throw new Error();
        const data = await response.json();
        const formattedCandles = data.map(item => ({
          timestamp: item[0],
          open: parseFloat(item[1]),
          high: parseFloat(item[2]),
          low: parseFloat(item[3]),
          close: parseFloat(item[4]),
          volume: parseFloat(item[5])
        }));
        
        setCandles(prev => ({
          ...prev,
          [asset]: formattedCandles
        }));
      } catch (err) {
        console.warn(`Binance REST API blocked/unavailable. Generating fallback history for ${asset}.`);
        const mockCandles = generateMockHistory(asset, basePrice);
        setCandles(prev => ({
          ...prev,
          [asset]: mockCandles
        }));
      }
    };

    fetchHistory('BTC', 'BTCUSDT', 91200);
    fetchHistory('ETH', 'ETHUSDT', 3320);
    fetchHistory('SOL', 'SOLUSDT', 142);
  }, []);

  // 3. Connect WebSocket or Trigger Local Simulation Fallback
  useEffect(() => {
    const streams = [
      'btcusdt@ticker',
      'ethusdt@ticker',
      'solusdt@ticker',
      'btcusdt@kline_1m',
      'ethusdt@kline_1m',
      'solusdt@kline_1m'
    ].join('/');

    const wsUrl = `wss://stream.binance.com:9443/stream?streams=${streams}`;
    let socketConnectionTimeout = null;

    const startSimulation = () => {
      if (simIntervalRef.current) return;
      setIsSimulated(true);
      console.log('Initiating high-fidelity local simulator (Aether Feed)...');
      
      simIntervalRef.current = setInterval(() => {
        const now = Date.now();
        
        setTickers(prev => {
          const keys = ['BTC', 'ETH', 'SOL'];
          const next = { ...prev };
          
          keys.forEach(key => {
            const current = prev[key];
            const volatility = key === 'SOL' ? 0.0012 : key === 'ETH' ? 0.0008 : 0.0005;
            const deltaPercent = (Math.random() - 0.495) * volatility; // slight upward drift
            const nextPrice = Math.max(0.01, current.price * (1 + deltaPercent));
            const newHigh = Math.max(current.high24h, nextPrice);
            const newLow = Math.min(current.low24h, nextPrice);
            const newVolume = current.volumeQuote + (Math.random() * nextPrice * 0.1);

            next[key] = {
              ...current,
              price: nextPrice,
              high24h: newHigh,
              low24h: newLow,
              volumeQuote: newVolume,
              change24h: current.change24h + (deltaPercent * 10)
            };

            // Check alerts
            checkPriceAlerts(key, nextPrice);

            // Update local candles
            setCandles(prevCandles => {
              const history = [...prevCandles[key]];
              if (history.length === 0) return prevCandles;

              const last = history[history.length - 1];
              const candleIntervalMs = 60 * 1000;
              const currentCandleStart = Math.floor(now / candleIntervalMs) * candleIntervalMs;

              const updatedCandle = {
                timestamp: currentCandleStart,
                open: last.timestamp === currentCandleStart ? last.open : last.close,
                high: last.timestamp === currentCandleStart ? Math.max(last.high, nextPrice) : Math.max(last.close, nextPrice),
                low: last.timestamp === currentCandleStart ? Math.min(last.low, nextPrice) : Math.min(last.close, nextPrice),
                close: nextPrice,
                volume: last.timestamp === currentCandleStart ? last.volume + (Math.random() * 0.5) : Math.random() * 0.5
              };

              if (last.timestamp === currentCandleStart) {
                history[history.length - 1] = updatedCandle;
              } else {
                history.push(updatedCandle);
                if (history.length > 100) history.shift();
              }

              return {
                ...prevCandles,
                [key]: history
              };
            });
          });

          return next;
        });
      }, 1000);
    };

    const connectWs = () => {
      console.log('Connecting to Binance WebSocket...');
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      // Start fallback timer: if no connection succeeds or no ticks received in 4 seconds, fall back
      socketConnectionTimeout = setTimeout(() => {
        if (ticksReceivedRef.current === 0) {
          console.warn('WebSocket connection attempt timed out/blocked.');
          startSimulation();
        }
      }, 4000);

      ws.onopen = () => {
        clearTimeout(socketConnectionTimeout);
        setIsWsConnected(true);
        setIsSimulated(false);
        if (simIntervalRef.current) {
          clearInterval(simIntervalRef.current);
          simIntervalRef.current = null;
        }
        console.log('Successfully connected to Binance WebSocket.');
      };

      ws.onmessage = (event) => {
        ticksReceivedRef.current += 1;
        const message = JSON.parse(event.data);
        const { stream, data } = message;

        if (stream.endsWith('@ticker')) {
          handleTickerMessage(data);
        } else if (stream.endsWith('@kline_1m')) {
          handleKlineMessage(data);
        }
      };

      ws.onclose = () => {
        setIsWsConnected(false);
        clearTimeout(socketConnectionTimeout);
        // Start simulation immediately if connection drops and isn't restored
        startSimulation();
      };

      ws.onerror = (err) => {
        console.warn('WebSocket encountered connection error. Triggering simulation fallback.');
        clearTimeout(socketConnectionTimeout);
        startSimulation();
      };
    };

    connectWs();

    return () => {
      clearTimeout(socketConnectionTimeout);
      if (wsRef.current) wsRef.current.close();
      if (simIntervalRef.current) {
        clearInterval(simIntervalRef.current);
        simIntervalRef.current = null;
      }
    };
  }, []);

  const handleTickerMessage = (data) => {
    const symbolMap = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' };
    const key = symbolMap[data.s];
    if (!key) return;

    const newPrice = parseFloat(data.c);

    setTickers(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        price: newPrice,
        change24h: parseFloat(data.p),
        high24h: parseFloat(data.h),
        low24h: parseFloat(data.l),
        volumeQuote: parseFloat(data.q)
      }
    }));

    checkPriceAlerts(key, newPrice);
  };

  const handleKlineMessage = (data) => {
    const symbolMap = { BTCUSDT: 'BTC', ETHUSDT: 'ETH', SOLUSDT: 'SOL' };
    const key = symbolMap[data.s];
    if (!key) return;

    const k = data.k;
    const newCandle = {
      timestamp: k.t,
      open: parseFloat(k.o),
      high: parseFloat(k.h),
      low: parseFloat(k.l),
      close: parseFloat(k.c),
      volume: parseFloat(k.v)
    };

    setCandles(prev => {
      const history = [...prev[key]];
      if (history.length === 0) return { ...prev, [key]: [newCandle] };

      const lastCandle = history[history.length - 1];

      if (lastCandle.timestamp === newCandle.timestamp) {
        history[history.length - 1] = newCandle;
      } else {
        history.push(newCandle);
        if (history.length > 100) history.shift();
      }

      return { ...prev, [key]: history };
    });
  };

  const sendAlertNotification = async (alert, currentPrice) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/trigger-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Price Alert: ${alert.asset}! 🔔`,
          body: `${alert.asset} price has gone ${alert.condition} threshold. Current: ${currentPrice.toFixed(2)} USDT`,
          symbol: alert.asset,
          targetPrice: alert.valueUsd,
          currentPrice,
          condition: alert.condition
        })
      });
      if (response.ok) {
        console.log(`Dispatched push alert for ${alert.asset}`);
      }
    } catch (e) {
      console.error('Failed to trigger server alert:', e);
    }
  };

  const checkPriceAlerts = (asset, currentPrice) => {
    setAlerts(prevAlerts => {
      let alertsChanged = false;
      const updatedAlerts = prevAlerts.map(alert => {
        if (alert.asset !== asset || alert.triggered) return alert;

        let isTriggered = false;
        if (alert.condition === 'above' && currentPrice >= alert.valueUsd) {
          isTriggered = true;
        } else if (alert.condition === 'below' && currentPrice <= alert.valueUsd) {
          isTriggered = true;
        }

        if (isTriggered) {
          alertsChanged = true;
          sendAlertNotification(alert, currentPrice);
          return { ...alert, triggered: true };
        }

        return alert;
      });

      return alertsChanged ? updatedAlerts.filter(a => !a.triggered) : prevAlerts;
    });
  };

  const selectedTicker = tickers[selectedAsset];

  return (
    <div className="dashboard-container">
      {/* Fallback Simulation Notice */}
      {isSimulated && (
        <div style={{
          background: 'linear-gradient(90deg, rgba(255,179,0,0.15) 0%, rgba(255,179,0,0.05) 100%)',
          border: '1px solid rgba(255,179,0,0.3)',
          color: 'var(--warning)',
          padding: '12px 18px',
          borderRadius: '12px',
          fontSize: '13px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          animation: 'pulse-success 4s infinite'
        }}>
          <div>
            <strong>Network Notice:</strong> Direct connection to Binance WebSocket is blocked or timed out (common for Indian ISPs). 
            Dashboard has automatically activated the <strong>Aether Live Simulation Feed</strong> to maintain real-time tick updates.
          </div>
          <span style={{ fontSize: '11px', textTransform: 'uppercase', fontWeight: 'bold', background: 'rgba(255,179,0,0.1)', padding: '2px 8px', borderRadius: '4px' }}>
            Simulation Active
          </span>
        </div>
      )}

      <Header
        isWsConnected={isWsConnected || isSimulated}
        currency={currency}
        setCurrency={setCurrency}
        usdToInrRate={usdToInrRate}
      />

      <TickerGrid
        tickers={tickers}
        selectedAsset={selectedAsset}
        setSelectedAsset={setSelectedAsset}
        currency={currency}
        usdToInrRate={usdToInrRate}
      />

      <main className="main-layout">
        <CandlestickChart
          candles={candles[selectedAsset]}
          assetName={selectedAsset}
          currency={currency}
          usdToInrRate={usdToInrRate}
        />

        <div className="sidebar">
          <OrderBook
            currentPrice={selectedTicker.price}
            assetSymbol={selectedAsset}
            currency={currency}
            usdToInrRate={usdToInrRate}
          />
        </div>
      </main>

      <div className="two-col-layout" style={{ marginTop: '12px' }}>
        <PriceAlerts
          alerts={alerts}
          setAlerts={setAlerts}
          currency={currency}
          usdToInrRate={usdToInrRate}
          currentPrices={{
            BTC: tickers.BTC.price,
            ETH: tickers.ETH.price,
            SOL: tickers.SOL.price
          }}
        />

        <TaxCalculator
          currentPrices={{
            BTC: tickers.BTC.price,
            ETH: tickers.ETH.price,
            SOL: tickers.SOL.price
          }}
          currency={currency}
          usdToInrRate={usdToInrRate}
        />
      </div>
    </div>
  );
}
