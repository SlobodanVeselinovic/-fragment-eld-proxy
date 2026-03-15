// ════════════════════════════════════════════════════
//  Fragment Logistics — Optima ELD Cloud Proxy
//  Deploy free on Render.com
// ════════════════════════════════════════════════════

const express = require('express');
const fetch = require('node-fetch');
const app = express();
const PORT = process.env.PORT || 3000;
const OPTIMA_BASE = 'https://web.optimaeld.com';

// ── CORS — allow all origins ─────────────────────────
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Api-Key, X-API-Key');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});
app.use(express.json());

// ── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Fragment Logistics ELD Proxy', time: new Date().toISOString() });
});

// ── Catch-all proxy — forwards everything to Optima ──
app.use(async (req, res) => {
  const apiKey = req.headers['x-api-key'] || req.headers['x-Api-Key'] || '';
  const url = OPTIMA_BASE + req.originalUrl;

  console.log(`Proxying: ${req.method} ${url}`);

  try {
    const r = await fetch(url, {
      method: req.method,
      headers: {
        'X-Api-Key': apiKey,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: req.method !== 'GET' ? JSON.stringify(req.body) : undefined,
    });
    const text = await r.text();
    console.log(`Response: ${r.status} — ${text.slice(0, 100)}`);
    res.status(r.status).set('Content-Type', 'application/json').send(text);
  } catch (e) {
    console.error('Proxy error:', e.message);
    res.status(502).json({ error: 'Proxy fetch failed', detail: e.message });
  }
});

app.listen(PORT, () => console.log(`Fragment Logistics ELD Proxy running on port ${PORT}`));

// ── Health check ─────────────────────────────────────
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Fragment Logistics ELD Proxy', time: new Date().toISOString() });
});

// ── Auth login — proxies to Optima ───────────────────
app.post('/auth/login', async (req, res) => {
  const { username, password, email, apiKey } = req.body;
  const user = username || email;

  const loginAttempts = [
    { url: `${OPTIMA_BASE}/api/auth/login`,    body: { username: user, password, apiKey } },
    { url: `${OPTIMA_BASE}/api/login`,          body: { email: user, password, apiKey } },
    { url: `${OPTIMA_BASE}/api/v1/auth/login`, body: { username: user, password } },
    { url: `${OPTIMA_BASE}/auth/login`,         body: { username: user, password, email: user } },
  ];

  for (const attempt of loginAttempts) {
    try {
      const r = await fetch(attempt.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'X-API-Key': apiKey || '',
        },
        body: JSON.stringify(attempt.body),
      });
      if (r.ok) {
        const data = await r.json();
        const token = data.token || data.accessToken || data.access_token || data.jwt || data.sessionToken;
        if (token) return res.json({ token });
      }
    } catch (e) { /* try next */ }
  }

  // If no login endpoint works, return the API key itself as the token
  // (some ELD providers use API key-only auth with no login step)
  res.json({ token: req.body.apiKey || 'apikey-auth' });
});

// ── Fleet / vehicles — proxies all known Optima endpoints ──
app.get('/api/vehicles', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const apiKey = req.headers['x-api-key'] || '';
  const token = authHeader.replace('Bearer ', '');

  const headers = {
    'Authorization': `Bearer ${token}`,
    'X-API-Key': apiKey,
    'Content-Type': 'application/json',
  };

  const endpoints = [
    `${OPTIMA_BASE}/api/vehicles`,
    `${OPTIMA_BASE}/api/fleet`,
    `${OPTIMA_BASE}/api/fleet/vehicles`,
    `${OPTIMA_BASE}/api/v1/vehicles`,
    `${OPTIMA_BASE}/api/v1/fleet`,
    `${OPTIMA_BASE}/api/trucks`,
    `${OPTIMA_BASE}/api/assets`,
    `${OPTIMA_BASE}/api/v2/vehicles`,
    `${OPTIMA_BASE}/api/tracking/vehicles`,
  ];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) {
        const data = await r.json();
        const arr = Array.isArray(data) ? data : data.data || data.vehicles || data.fleet || data.trucks || data.items;
        if (arr && arr.length) return res.json(arr);
      }
    } catch (e) { /* try next */ }
  }

  res.status(404).json({ error: 'No vehicle data returned from Optima ELD' });
});

// ── HOS data ─────────────────────────────────────────
app.get('/api/hos', async (req, res) => {
  const authHeader = req.headers['authorization'] || '';
  const apiKey = req.headers['x-api-key'] || '';
  const token = authHeader.replace('Bearer ', '');
  const headers = { 'Authorization': `Bearer ${token}`, 'X-API-Key': apiKey };

  const endpoints = [
    `${OPTIMA_BASE}/api/hos`,
    `${OPTIMA_BASE}/api/v1/hos`,
    `${OPTIMA_BASE}/api/drivers/hos`,
  ];

  for (const url of endpoints) {
    try {
      const r = await fetch(url, { headers });
      if (r.ok) return res.json(await r.json());
    } catch (e) {}
  }
  res.status(404).json({ error: 'HOS data not available' });
});

app.listen(PORT, () => console.log(`Fragment Logistics ELD Proxy running on port ${PORT}`));
