import React, { useState, useEffect } from 'react';
import { Bell, Trash2, ShieldAlert, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { formatPrice } from './TickerGrid';

const BACKEND_URL = 'http://localhost:5000';

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');
 
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
 
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PriceAlerts({ alerts, setAlerts, currency, usdToInrRate, currentPrices }) {
  const [selectedAsset, setSelectedAsset] = useState('BTC');
  const [condition, setCondition] = useState('above');
  const [inputValue, setInputValue] = useState('');
  
  const [pushSupported, setPushSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [subscriptionObject, setSubscriptionObject] = useState(null);
  const [notificationPermission, setNotificationPermission] = useState('default');
  const [errorMsg, setErrorMsg] = useState('');

  // 1. Check support for service workers and push notifications on load
  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setPushSupported(true);
      setNotificationPermission(Notification.permission);
      
      // Check if already subscribed
      navigator.serviceWorker.ready.then(registration => {
        registration.pushManager.getSubscription().then(subscription => {
          if (subscription) {
            setSubscriptionObject(subscription);
            setIsSubscribed(true);
            // Re-sync with backend on load
            sendSubscriptionToBackend(subscription);
          }
        });
      });
    }
  }, []);

  const sendSubscriptionToBackend = async (subscription) => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription)
      });
      if (!response.ok) throw new Error('Failed to register subscription on server.');
      console.log('Push subscription synced with backend.');
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to connect to backend server for notifications.');
    }
  };

  const subscribeUser = async () => {
    setErrorMsg('');
    try {
      // Request notifications permission first
      const permission = await Notification.requestPermission();
      setNotificationPermission(permission);
      
      if (permission !== 'granted') {
        throw new Error('Notification permission denied.');
      }

      // Register or find service worker
      const registration = await navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`);
      console.log('Service Worker registered with scope:', registration.scope);

      // Fetch VAPID public key
      const keyResponse = await fetch(`${BACKEND_URL}/api/vapid-public-key`);
      if (!keyResponse.ok) throw new Error('Could not fetch public VAPID key from backend.');
      const { publicKey } = await keyResponse.json();

      const convertedVapidKey = urlBase64ToUint8Array(publicKey);

      // Subscribe browser push service
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: convertedVapidKey
      });

      setSubscriptionObject(subscription);
      setIsSubscribed(true);
      
      // Save subscription to Node.js backend
      await sendSubscriptionToBackend(subscription);
      
      // Celebrate!
      confetti({
        particleCount: 80,
        spread: 60,
        origin: { y: 0.8 }
      });
    } catch (err) {
      console.error('Subscription error:', err);
      setErrorMsg(err.message || 'Notification setup failed. Make sure the Node.js server is running.');
    }
  };

  const handleAddAlert = (e) => {
    e.preventDefault();
    if (!inputValue || isNaN(inputValue)) return;

    const valueNum = parseFloat(inputValue);
    
    // We normalize all thresholds stored in state to USD.
    // If the input was entered in INR, we convert it to USD by dividing by the rate.
    const valueUsd = currency === 'INR' ? valueNum / usdToInrRate : valueNum;

    const newAlert = {
      id: `alert-${Date.now()}`,
      asset: selectedAsset,
      condition,
      valueUsd,
      triggered: false,
      createdAt: Date.now()
    };

    setAlerts(prev => [newAlert, ...prev]);
    setInputValue('');

    // Trigger standard alert feedback
    confetti({
      particleCount: 30,
      colors: ['#00f2fe', '#4facfe'],
      origin: { y: 0.9 }
    });
  };

  const handleDeleteAlert = (id) => {
    setAlerts(prev => prev.filter(alert => alert.id !== id));
  };

  // Triggers a test push notification instantly from the backend
  const triggerTestNotification = async () => {
    if (!isSubscribed) return;
    try {
      const response = await fetch(`${BACKEND_URL}/api/trigger-alert`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'Aether Alert Check! 📡',
          body: `Test push sent successfully. Live prices are active!`,
          symbol: 'TEST',
          targetPrice: 0,
          currentPrice: 0,
          condition: 'test'
        })
      });
      if (response.ok) {
        console.log('Test notification sent.');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Failed to send test push.');
    }
  };

  return (
    <div className="glass-card alerts-card">
      <div className="panel-header">
        <div className="panel-title">
          <Bell size={18} style={{ color: 'var(--primary)' }} />
          <span>Price Alert Thresholds</span>
        </div>
      </div>

      {/* Push status or setup button */}
      {!pushSupported ? (
        <div className="tax-infobox" style={{ color: 'var(--danger)', border: '1px solid var(--danger)' }}>
          Push alerts are not supported on this browser (Incognito mode or unsupported device).
        </div>
      ) : !isSubscribed ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button className="alert-btn" onClick={subscribeUser}>
            <Bell size={16} /> Enable Browser Push Alerts
          </button>
          <p style={{ fontSize: '11px', color: 'var(--text-muted)', textAlign: 'center' }}>
            Uses system-level push notifications, delivered even when dashboard is closed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center', justifyContent: 'space-between' }}>
          <div className="connection-status" style={{ background: 'var(--success-bg)', borderColor: 'var(--success)' }}>
            <div className="status-dot connected"></div>
            <span style={{ color: 'var(--success)', fontWeight: '600' }}>Push Notifications Active</span>
          </div>
          <button className="alert-btn test-btn" onClick={triggerTestNotification} style={{ padding: '6px 12px', fontSize: '12px' }}>
            <Sparkles size={12} /> Test Push
          </button>
        </div>
      )}

      {errorMsg && (
        <div className="tax-infobox" style={{ color: 'var(--danger)', background: 'rgba(255,23,68,0.05)', borderColor: 'rgba(255,23,68,0.15)' }}>
          {errorMsg}
        </div>
      )}

      {/* Form to add alerts */}
      <form onSubmit={handleAddAlert} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="alert-input-group">
          <div className="alert-input-wrapper">
            <label className="alert-label">Asset</label>
            <select 
              className="alert-select"
              value={selectedAsset}
              onChange={(e) => setSelectedAsset(e.target.value)}
            >
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
              <option value="SOL">SOL (Solana)</option>
            </select>
          </div>

          <div className="alert-input-wrapper">
            <label className="alert-label">Condition</label>
            <select 
              className="alert-select"
              value={condition}
              onChange={(e) => setCondition(e.target.value)}
            >
              <option value="above">Goes Above (&gt;)</option>
              <option value="below">Goes Below (&lt;)</option>
            </select>
          </div>
        </div>

        <div className="alert-input-wrapper">
          <label className="alert-label">Target Price ({currency})</label>
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <span style={{ position: 'absolute', left: '12px', color: 'var(--text-muted)' }}>
              {currency === 'INR' ? '₹' : '$'}
            </span>
            <input
              type="number"
              step="any"
              required
              className="alert-input"
              style={{ paddingLeft: '28px', width: '100%' }}
              placeholder={currentPrices[selectedAsset] ? (currency === 'INR' ? (currentPrices[selectedAsset] * usdToInrRate).toFixed(0) : currentPrices[selectedAsset].toFixed(0)) : '0'}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
            />
          </div>
        </div>

        <button type="submit" className="alert-btn">
          Add Price Alert
        </button>
      </form>

      {/* Alert Listings */}
      <div className="active-alerts-list">
        {alerts.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '12px', textAlign: 'center', padding: '10px 0' }}>
            No active alerts configured.
          </p>
        ) : (
          alerts.map((alert) => (
            <div key={alert.id} className="alert-item">
              <div className="alert-item-info">
                <div>
                  <span className="alert-symbol">{alert.asset}</span>{' '}
                  <span className="alert-condition">
                    is {alert.condition === 'above' ? 'above' : 'below'}
                  </span>
                </div>
                <div style={{ fontWeight: '600', fontSize: '14px', marginTop: '2px' }}>
                  {formatPrice(alert.valueUsd, currency, usdToInrRate)}
                </div>
              </div>
              <button 
                className="alert-delete-btn"
                onClick={() => handleDeleteAlert(alert.id)}
                title="Remove alert"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
