'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const path = require('path');
const multer = require('multer');

const db = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');
const { analyzeImage } = require('../middleware/opencvBridge');
const { generateProductContent } = require('../middleware/aiService');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const REQUIRED_FIELDS = ['name', 'dob', 'email', 'phone', 'password', 'district', 'state', 'address'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

// ── Multer upload configuration ───────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '..', 'uploads'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `artisan_${req.user?.id || 'unknown'}_${Date.now()}${ext}`);
  },
});

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, and WebP images are accepted.'));
    }
  },
});

// ── Helpers ──────────────────────────────────────────────────────────────────
function clean(body) {
  const out = {};
  for (const key of REQUIRED_FIELDS) {
    const value = body[key];
    out[key] = typeof value === 'string' ? value.trim() : value;
  }
  return out;
}

function validateSignup(input) {
  const errors = {};
  for (const field of REQUIRED_FIELDS) {
    if (!input[field]) errors[field] = 'This field is required.';
  }
  if (input.email && !EMAIL_RE.test(input.email)) errors.email = 'Enter a valid email address.';
  if (input.phone && !PHONE_RE.test(input.phone)) errors.phone = 'Enter a phone number with 7 to 15 digits.';
  if (input.password && input.password.length < 8) errors.password = 'Use at least 8 characters.';
  if (input.dob && !DOB_RE.test(input.dob)) errors.dob = 'Use the date picker to choose a date of birth.';
  else if (input.dob) {
    const dob = new Date(`${input.dob}T00:00:00Z`);
    if (Number.isNaN(dob.getTime()) || dob > new Date()) errors.dob = 'Date of birth must be in the past.';
  }
  return errors;
}

function publicArtisan(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, district: row.district, state: row.state, address: row.address, dob: row.dob, role: 'artisan' };
}

// Prepared statements
const insertArtisan = db.prepare(`INSERT INTO artisans (name, dob, email, phone, password, district, state, address) VALUES (@name, @dob, @email, @phone, @password, @district, @state, @address)`);
const findArtisanByEmail = db.prepare('SELECT * FROM artisans WHERE email = ? COLLATE NOCASE');
const findArtisanById = db.prepare('SELECT * FROM artisans WHERE id = ?');

// ── Auth routes (preserved from Phase 1) ─────────────────────────────────────

router.post('/signup', (req, res, next) => {
  try {
    const input = clean(req.body || {});
    const errors = validateSignup(input);
    if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    if (findArtisanByEmail.get(input.email)) return res.status(409).json({ error: 'An artisan account already uses this email.', fields: { email: 'This email is already registered.' } });
    input.email = input.email.toLowerCase();
    input.password = bcrypt.hashSync(input.password, BCRYPT_ROUNDS);
    const result = insertArtisan.run(input);
    const artisan = findArtisanById.get(result.lastInsertRowid);
    return res.status(201).json({ token: signToken({ id: artisan.id, role: 'artisan' }), user: publicArtisan(artisan) });
  } catch (err) { return next(err); }
});

router.post('/login', (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
    const artisan = findArtisanByEmail.get(email);
    if (!artisan || !bcrypt.compareSync(password, artisan.password)) return res.status(401).json({ error: 'That email and password do not match.' });
    return res.json({ token: signToken({ id: artisan.id, role: 'artisan' }), user: publicArtisan(artisan) });
  } catch (err) { return next(err); }
});

router.get('/me', requireAuth('artisan'), (req, res) => {
  const artisan = findArtisanById.get(req.user.id);
  if (!artisan) return res.status(404).json({ error: 'This account no longer exists.' });
  return res.json({ user: publicArtisan(artisan) });
});

// ── Product routes ────────────────────────────────────────────────────────────

/**
 * POST /api/artisan/upload
 * Upload product image → OpenCV analysis → Gemini AI generation → save draft
 */
router.post('/upload', requireAuth('artisan'), upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: 'No image uploaded.' });

    const { material, craft_type } = req.body;
    if (!material || !craft_type) {
      return res.status(400).json({ error: 'Material and craft type are required.' });
    }

    const imagePath = req.file.path;
    const imageUrl = `/uploads/${req.file.filename}`;

    // 1. OpenCV image quality analysis
    const cvResult = await analyzeImage(imagePath);
    const qualityReport = JSON.stringify(cvResult);
    const qualityScore = cvResult.quality_score || 70;

    // 2. Build colour palette string for AI
    const palette = cvResult.palette
      ? cvResult.palette.map((c) => c.hex).join(', ')
      : '';

    // 3. Find similar-product prices for price range suggestion
    const similarProducts = db.prepare(
      `SELECT price FROM products WHERE craft_type = ? AND published = 1 AND price > 0 ORDER BY created_date DESC LIMIT 20`
    ).all(craft_type);
    const similarPrices = similarProducts.map((p) => p.price);

    // 4. Gemini AI content generation
    const aiContent = await generateProductContent(
      { material, craft_type, palette, quality_score: qualityScore },
      similarPrices
    );

    // 5. Save as draft (published = 0 until artisan approves)
    const result = db.prepare(`
      INSERT INTO products (artisan_id, image_path, product_name, material, craft_type,
        ai_title, ai_description, ai_tags, ai_category, ai_price_min, ai_price_max,
        quality_score, quality_report, price, published)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0)
    `).run(
      req.user.id,
      imageUrl,
      aiContent.ai_title || `${craft_type} in ${material}`,
      material,
      craft_type,
      aiContent.ai_title,
      aiContent.ai_description,
      aiContent.ai_tags,
      aiContent.ai_category,
      aiContent.ai_price_min,
      aiContent.ai_price_max,
      qualityScore,
      qualityReport,
      aiContent.ai_price_min || 500
    );

    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(result.lastInsertRowid);

    return res.status(201).json({
      product,
      analysis: cvResult,
      ai: aiContent,
      message: 'Image analysed and listing draft created. Review and publish below.',
    });
  } catch (err) { return next(err); }
});

/**
 * GET /api/artisan/products
 * List artisan's own products (drafts + published)
 */
router.get('/products', requireAuth('artisan'), (req, res) => {
  const products = db.prepare(
    `SELECT * FROM products WHERE artisan_id = ? ORDER BY created_date DESC`
  ).all(req.user.id);
  return res.json({ products });
});

/**
 * GET /api/artisan/products/:id
 * Get a single product (artisan must own it)
 */
router.get('/products/:id', requireAuth('artisan'), (req, res) => {
  const product = db.prepare('SELECT * FROM products WHERE id = ? AND artisan_id = ?').get(req.params.id, req.user.id);
  if (!product) return res.status(404).json({ error: 'Product not found.' });
  return res.json({ product });
});

/**
 * PUT /api/artisan/products/:id
 * Edit and optionally publish a product (artisan must own it)
 */
router.put('/products/:id', requireAuth('artisan'), (req, res, next) => {
  try {
    const existing = db.prepare('SELECT * FROM products WHERE id = ? AND artisan_id = ?').get(req.params.id, req.user.id);
    if (!existing) return res.status(404).json({ error: 'Product not found.' });

    const {
      product_name, material, craft_type, ai_title, ai_description, ai_tags, price, stock, published
    } = req.body;

    // Validate price
    const priceNum = parseFloat(price);
    if (price !== undefined && (isNaN(priceNum) || priceNum < 0)) {
      return res.status(400).json({ error: 'Price must be a non-negative number.' });
    }

    db.prepare(`
      UPDATE products SET
        product_name = COALESCE(@product_name, product_name),
        material = COALESCE(@material, material),
        craft_type = COALESCE(@craft_type, craft_type),
        ai_title = COALESCE(@ai_title, ai_title),
        ai_description = COALESCE(@ai_description, ai_description),
        ai_tags = COALESCE(@ai_tags, ai_tags),
        price = COALESCE(@price, price),
        stock = COALESCE(@stock, stock),
        published = COALESCE(@published, published)
      WHERE id = @id AND artisan_id = @artisan_id
    `).run({
      product_name: product_name || null,
      material: material || null,
      craft_type: craft_type || null,
      ai_title: ai_title || null,
      ai_description: ai_description || null,
      ai_tags: ai_tags || null,
      price: price !== undefined ? priceNum : null,
      stock: stock !== undefined ? parseInt(stock) : null,
      published: published !== undefined ? (published ? 1 : 0) : null,
      id: req.params.id,
      artisan_id: req.user.id,
    });

    const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    return res.json({ product: updated });
  } catch (err) { return next(err); }
});

/**
 * DELETE /api/artisan/products/:id
 * Delete a product (artisan must own it)
 */
router.delete('/products/:id', requireAuth('artisan'), (req, res, next) => {
  try {
    const product = db.prepare('SELECT * FROM products WHERE id = ?').get(req.params.id);
    if (!product) {
      return res.status(404).json({ error: 'Product not found.' });
    }
    if (product.artisan_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to delete another artisan\'s product.' });
    }
    db.prepare('DELETE FROM products WHERE id = ? AND artisan_id = ?').run(req.params.id, req.user.id);
    return res.json({ message: 'Product deleted successfully.' });
  } catch (err) { return next(err); }
});

/**
 * GET /api/artisan/dashboard
 * Artisan dashboard stats
 */
router.get('/dashboard', requireAuth('artisan'), (req, res) => {
  const stats = {
    total_products: db.prepare('SELECT COUNT(*) as c FROM products WHERE artisan_id = ?').get(req.user.id).c,
    published: db.prepare('SELECT COUNT(*) as c FROM products WHERE artisan_id = ? AND published = 1').get(req.user.id).c,
    drafts: db.prepare('SELECT COUNT(*) as c FROM products WHERE artisan_id = ? AND published = 0').get(req.user.id).c,
    total_orders: db.prepare('SELECT COUNT(*) as c FROM orders o JOIN products p ON o.product_id = p.id WHERE p.artisan_id = ?').get(req.user.id).c,
    recent_products: db.prepare('SELECT * FROM products WHERE artisan_id = ? ORDER BY created_date DESC LIMIT 5').all(req.user.id),
  };
  return res.json(stats);
});

module.exports = router;
