'use strict';

require('dotenv').config();

const path = require('path');
const express = require('express');
const cors = require('cors');

require('./db/database'); // opens the connection and runs the schema on boot

const artisanRoutes  = require('./routes/artisan');
const customerRoutes = require('./routes/customer');
const productRoutes  = require('./routes/products');
const chatRoutes     = require('./routes/chat');

const app = express();
const PORT = Number(process.env.PORT) || 3001;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

app.use(cors({ origin: CLIENT_ORIGIN }));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Serve uploaded product images
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    time: new Date().toISOString(),
    gemini: Boolean(process.env.GEMINI_API_KEY),
  });
});

app.use('/api/artisan',  artisanRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/products', productRoutes);
app.use('/api/chat',     chatRoutes);

// 404 fallback
app.use((req, res) => {
  res.status(404).json({ error: `No route matches ${req.method} ${req.originalUrl}.` });
});

// Error handler
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error('[error]', err);
  const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 500);
  const message = err.message || 'Something went wrong on the server.';
  res.status(status).json({ error: message });
});

app.listen(PORT, () => {
  console.log(`[api] KalaConnect Phase 4 API listening on http://localhost:${PORT}`);
  console.log(`[api] allowing requests from ${CLIENT_ORIGIN}`);
  console.log(`[ai]  Gemini key configured: ${Boolean(process.env.GEMINI_API_KEY)}`);
});
