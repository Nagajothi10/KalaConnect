'use strict';

/**
 * Chat routes — AI Shopping Assistant
 * POST /api/chat   — send a message, get a reply
 * GET  /api/chat   — retrieve session history
 * DELETE /api/chat — clear session
 */

const express = require('express');
const crypto = require('crypto');
const db = require('../db/database');
const { chatWithAssistant } = require('../middleware/aiService');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

const MAX_HISTORY = 20; // messages per session to keep costs manageable

/** Get or create a chat session. Returns the session row. */
function getOrCreateSession(sessionKey, customerId = null) {
  let session = db.prepare('SELECT * FROM chat_sessions WHERE session_key = ?').get(sessionKey);
  if (!session) {
    db.prepare(
      'INSERT INTO chat_sessions (customer_id, session_key, history) VALUES (?, ?, ?)'
    ).run(customerId, sessionKey, '[]');
    session = db.prepare('SELECT * FROM chat_sessions WHERE session_key = ?').get(sessionKey);
  }
  return session;
}

/**
 * POST /api/chat
 * Body: { message: string, session_key?: string }
 * Auth: optional (works for both guests and logged-in customers)
 */
router.post('/', (req, res, next) => {
  (async () => {
    try {
      const { message, session_key } = req.body || {};
      if (!message || typeof message !== 'string' || !message.trim()) {
        return res.status(400).json({ error: 'message is required.' });
      }
      if (message.trim().length > 1000) {
        return res.status(400).json({ error: 'Message is too long (max 1000 characters).' });
      }

      // Resolve customer ID from optional Bearer token
      let customerId = null;
      const authHeader = req.headers.authorization || '';
      const [scheme, token] = authHeader.split(' ');
      if (scheme === 'Bearer' && token) {
        try {
          const jwt = require('jsonwebtoken');
          const payload = jwt.verify(token, process.env.JWT_SECRET);
          if (payload.role === 'customer') customerId = payload.id;
        } catch (_) { /* ignore invalid tokens for chat */ }
      }

      // Use or generate session key
      const key = (typeof session_key === 'string' && session_key.length > 4)
        ? session_key
        : crypto.randomBytes(16).toString('hex');

      const session = getOrCreateSession(key, customerId);
      let history = [];
      try { history = JSON.parse(session.history || '[]'); } catch (_) { history = []; }

      // Trim history to last MAX_HISTORY messages
      if (history.length > MAX_HISTORY) {
        history = history.slice(history.length - MAX_HISTORY);
      }

      // Get published products for context
      const products = db.prepare(`
        SELECT p.id, p.ai_title, p.product_name, p.material, p.craft_type,
               p.price, p.ai_category, p.ai_description, a.name as artisan_name, a.district
        FROM products p JOIN artisans a ON p.artisan_id = a.id
        WHERE p.published = 1 AND p.stock > 0
        ORDER BY p.created_date DESC LIMIT 40
      `).all();

      const { reply, history: updatedHistory, error: aiError } = await chatWithAssistant(
        message.trim(),
        history,
        products
      );

      // Persist updated history
      db.prepare(
        'UPDATE chat_sessions SET history = ?, updated_date = datetime(\'now\') WHERE session_key = ?'
      ).run(JSON.stringify(updatedHistory), key);

      return res.json({
        reply,
        session_key: key,
        ai_error: aiError || null,
      });
    } catch (err) {
      return next(err);
    }
  })();
});

/**
 * GET /api/chat?session_key=xxx
 * Retrieve chat history for a session.
 */
router.get('/', (req, res) => {
  const { session_key } = req.query;
  if (!session_key) return res.json({ history: [], session_key: null });

  const session = db.prepare('SELECT * FROM chat_sessions WHERE session_key = ?').get(session_key);
  if (!session) return res.json({ history: [], session_key });

  let history = [];
  try { history = JSON.parse(session.history || '[]'); } catch (_) { history = []; }

  return res.json({ history, session_key });
});

/**
 * DELETE /api/chat?session_key=xxx
 * Clear a chat session.
 */
router.delete('/', (req, res, next) => {
  try {
    const { session_key } = req.query;
    if (session_key) {
      db.prepare('UPDATE chat_sessions SET history = ?, updated_date = datetime(\'now\') WHERE session_key = ?')
        .run('[]', session_key);
    }
    return res.json({ message: 'Chat history cleared.' });
  } catch (err) { return next(err); }
});

module.exports = router;
