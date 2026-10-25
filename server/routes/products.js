'use strict';

const express = require('express');
const db = require('../db/database');

const router = express.Router();

// ── Public product catalogue ──────────────────────────────────────────────────

/**
 * GET /api/products
 * List all published products with optional filtering.
 * Query params: material, craft_type, category, q (search), page, limit
 */
router.get('/', (req, res) => {
  const { material, craft_type, category, q, page = 1, limit = 20 } = req.query;
  const offset = (Math.max(1, parseInt(page)) - 1) * Math.min(100, parseInt(limit) || 20);
  const lim = Math.min(100, parseInt(limit) || 20);

  let where = ['p.published = 1', 'p.stock > 0'];
  const params = [];

  if (material) { where.push('LOWER(p.material) LIKE ?'); params.push(`%${material.toLowerCase()}%`); }
  if (craft_type) { where.push('LOWER(p.craft_type) LIKE ?'); params.push(`%${craft_type.toLowerCase()}%`); }
  if (category) { where.push('LOWER(COALESCE(p.ai_category, p.craft_type)) LIKE ?'); params.push(`%${category.toLowerCase()}%`); }
  if (q) {
    where.push('(LOWER(p.ai_title) LIKE ? OR LOWER(p.product_name) LIKE ? OR LOWER(p.ai_tags) LIKE ? OR LOWER(p.material) LIKE ? OR LOWER(p.craft_type) LIKE ?)');
    const term = `%${q.toLowerCase()}%`;
    params.push(term, term, term, term, term);
  }

  const whereClause = where.join(' AND ');
  const products = db.prepare(`
    SELECT p.*, a.name as artisan_name, a.district, a.state
    FROM products p
    JOIN artisans a ON p.artisan_id = a.id
    WHERE ${whereClause}
    ORDER BY p.created_date DESC
    LIMIT ? OFFSET ?
  `).all(...params, lim, offset);

  const total = db.prepare(`SELECT COUNT(*) as c FROM products p WHERE ${whereClause}`).get(...params).c;

  return res.json({ products, total, page: parseInt(page), limit: lim });
});

/**
 * GET /api/products/:id
 * Single product detail with artisan info.
 */
router.get('/:id', (req, res) => {
  const product = db.prepare(`
    SELECT p.*, a.name as artisan_name, a.district, a.state, a.address
    FROM products p
    JOIN artisans a ON p.artisan_id = a.id
    WHERE p.id = ? AND p.published = 1
  `).get(req.params.id);

  if (!product) return res.status(404).json({ error: 'Product not found.' });

  // Similar products
  const similar = db.prepare(`
    SELECT p.id, p.ai_title, p.product_name, p.image_path, p.price, p.material, p.craft_type
    FROM products p
    WHERE p.published = 1 AND p.stock > 0 AND p.id != ?
      AND (p.craft_type = ? OR p.material = ?)
    ORDER BY p.created_date DESC LIMIT 4
  `).all(product.id, product.craft_type, product.material);

  return res.json({ product, similar });
});

module.exports = router;
