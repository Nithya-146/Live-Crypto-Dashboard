const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const webpush = require('web-push');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS for frontend development server
app.use(cors({
  origin: '*', // In production, replace with actual frontend origin
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type']
}));

app.use(bodyParser.json());

// In-memory subscription storage (simplification for dashboard demo)
let subscriptions = [];

// VAPID keys setup
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY
};

// Auto-generate VAPID keys if not configured in environment
if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  console.log('Generating dynamic VAPID keys for demo runtime...');
  const keys = webpush.generateVAPIDKeys();
  vapidKeys.publicKey = keys.publicKey;
  vapidKeys.privateKey = keys.privateKey;
  console.log('==================================================');
  console.log('DYNAMIC VAPID PUBLIC KEY:\n', vapidKeys.publicKey);
  console.log('DYNAMIC VAPID PRIVATE KEY:\n', vapidKeys.privateKey);
  console.log('==================================================');
}

// Configure web-push details
webpush.setVapidDetails(
  'mailto:support@crypto-dashboard.in', // Contact email
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

// Endpoints
app.get('/api/vapid-public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post('/api/subscribe', (req, res) => {
  const subscription = req.body;
  
  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Subscription endpoint is required.' });
  }

  // Check if subscription already exists
  const exists = subscriptions.some(sub => sub.endpoint === subscription.endpoint);
  if (!exists) {
    subscriptions.push(subscription);
    console.log(`New browser subscribed to Web Push. Total active: ${subscriptions.length}`);
  }

  res.status(201).json({ message: 'Subscribed successfully' });
});

app.post('/api/trigger-alert', (req, res) => {
  const { title, body, symbol, targetPrice, currentPrice, condition } = req.body;
  
  if (subscriptions.length === 0) {
    console.log('Alert triggered, but no browsers are subscribed yet.');
    return res.status(200).json({ message: 'No subscriptions to notify.' });
  }

  console.log(`Triggering alert for ${symbol}: price crossed ${condition} ${targetPrice} (current: ${currentPrice})`);

  const payload = JSON.stringify({
    title: title || 'Price Alert Triggered! 🚀',
    body: body || `${symbol} has reached ${currentPrice} USDT.`,
    icon: '/logo192.png', // Fallback icon path
    badge: '/favicon.ico',
    tag: `alert-${symbol}-${Date.now()}`
  });

  const notificationPromises = subscriptions.map(subscription => {
    return webpush.sendNotification(subscription, payload)
      .catch(err => {
        console.error('Error sending push notification, subscription may have expired:', err.statusCode);
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Remove expired subscription
          subscriptions = subscriptions.filter(sub => sub.endpoint !== subscription.endpoint);
          console.log(`Cleaned up expired subscription. Remaining: ${subscriptions.length}`);
        }
      });
  });

  Promise.all(notificationPromises)
    .then(() => res.json({ message: 'Alert notifications dispatched.' }))
    .catch(err => {
      console.error('Error in dispatching notifications:', err);
      res.status(500).json({ error: 'Failed to send notifications' });
    });
});

app.get('/health', (req, res) => {
  res.json({ status: 'OK', subscriptionsCount: subscriptions.length });
});

app.listen(PORT, () => {
  console.log(`Web Push Backend running on http://localhost:${PORT}`);
});
