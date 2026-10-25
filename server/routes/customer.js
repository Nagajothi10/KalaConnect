'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');

const db = require('../db/database');
const { signToken, requireAuth } = require('../middleware/auth');

const router = express.Router();

const BCRYPT_ROUNDS = 12;
const REQUIRED_FIELDS = ['name', 'dob', 'email', 'phone', 'password', 'district', 'state', 'address'];
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;
const DOB_RE = /^\d{4}-\d{2}-\d{2}$/;

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

function publicCustomer(row) {
  return { id: row.id, name: row.name, email: row.email, phone: row.phone, district: row.district, state: row.state, address: row.address, dob: row.dob, role: 'customer' };
}

const insertCustomer = db.prepare(`INSERT INTO customers (name, dob, email, phone, password, district, state, address) VALUES (@name, @dob, @email, @phone, @password, @district, @state, @address)`);
const findCustomerByEmail = db.prepare('SELECT * FROM customers WHERE email = ? COLLATE NOCASE');
const findCustomerById = db.prepare('SELECT * FROM customers WHERE id = ?');

// ── Auth ──────────────────────────────────────────────────────────────────────

router.post('/signup', (req, res, next) => {
  try {
    const input = clean(req.body || {});
    const errors = validateSignup(input);
    if (Object.keys(errors).length > 0) return res.status(400).json({ error: 'Check the highlighted fields.', fields: errors });
    if (findCustomerByEmail.get(input.email)) return res.status(409).json({ error: 'A customer account already uses this email.', fields: { email: 'This email is already registered.' } });
    input.email = input.email.toLowerCase();
    input.password = bcrypt.hashSync(input.password, BCRYPT_ROUNDS);
    const result = insertCustomer.run(input);
    const customer = findCustomerById.get(result.lastInsertRowid);
    return res.status(201).json({ token: signToken({ id: customer.id, role: 'customer' }), user: publicCustomer(customer) });
  } catch (err) { return next(err); }
});

router.post('/login', (req, res, next) => {
  try {
    const email = typeof req.body?.email === 'string' ? req.body.email.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';
    if (!email || !password) return res.status(400).json({ error: 'Enter your email and password.' });
    const customer = findCustomerByEmail.get(email);
    if (!customer || !bcrypt.compareSync(password, customer.password)) return res.status(401).json({ error: 'That email and password do not match.' });
    return res.json({ token: signToken({ id: customer.id, role: 'customer' }), user: publicCustomer(customer) });
  } catch (err) { return next(err); }
});

router.get('/me', requireAuth('customer'), (req, res) => {
  const customer = findCustomerById.get(req.user.id);
  if (!customer) return res.status(404).json({ error: 'This account no longer exists.' });
  return res.json({ user: publicCustomer(customer) });
});

// ── Cart ──────────────────────────────────────────────────────────────────────

router.get('/cart', requireAuth('customer'), (req, res) => {
  const items = db.prepare(`
    SELECT c.id as cart_id, c.quantity, p.id as product_id, p.ai_title as title,
           p.product_name, p.image_path, p.price, p.material, p.craft_type,
           a.name as artisan_name
    FROM cart c
    JOIN products p ON c.product_id = p.id
    JOIN artisans a ON p.artisan_id = a.id
    WHERE c.customer_id = ? AND p.published = 1
    ORDER BY c.id DESC
  `).all(req.user.id);
  const total = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
  return res.json({ items, total: Math.round(total * 100) / 100 });
});

router.post('/cart', requireAuth('customer'), (req, res, next) => {
  try {
    const productId = parseInt(req.body?.product_id);
    const quantity = parseInt(req.body?.quantity) || 1;
    if (!productId) return res.status(400).json({ error: 'product_id is required.' });
    if (quantity < 1) return res.status(400).json({ error: 'Quantity must be at least 1.' });

    const product = db.prepare('SELECT * FROM products WHERE id = ? AND published = 1').get(productId);
    if (!product) return res.status(404).json({ error: 'Product not found or not available.' });
    if (product.stock < quantity) return res.status(400).json({ error: `Only ${product.stock} in stock.` });

    // Upsert cart entry
    db.prepare(`
      INSERT INTO cart (customer_id, product_id, quantity) VALUES (?, ?, ?)
      ON CONFLICT(customer_id, product_id) DO UPDATE SET quantity = quantity + excluded.quantity
    `).run(req.user.id, productId, quantity);

    return res.status(201).json({ message: 'Added to cart.' });
  } catch (err) { return next(err); }
});

router.put('/cart/:id', requireAuth('customer'), (req, res, next) => {
  try {
    const quantity = parseInt(req.body?.quantity);
    if (!quantity || quantity < 1) {
      // quantity = 0 means remove
      db.prepare('DELETE FROM cart WHERE id = ? AND customer_id = ?').run(req.params.id, req.user.id);
      return res.json({ message: 'Removed from cart.' });
    }
    db.prepare('UPDATE cart SET quantity = ? WHERE id = ? AND customer_id = ?').run(quantity, req.params.id, req.user.id);
    return res.json({ message: 'Cart updated.' });
  } catch (err) { return next(err); }
});

router.delete('/cart/:id', requireAuth('customer'), (req, res, next) => {
  try {
    db.prepare('DELETE FROM cart WHERE id = ? AND customer_id = ?').run(req.params.id, req.user.id);
    return res.json({ message: 'Removed from cart.' });
  } catch (err) { return next(err); }
});

// ── Orders ────────────────────────────────────────────────────────────────────

router.post('/orders/checkout', requireAuth('customer'), (req, res, next) => {
  try {
    const cartItems = db.prepare(`
      SELECT c.quantity, p.id as product_id, p.price, p.stock, p.artisan_id
      FROM cart c JOIN products p ON c.product_id = p.id
      WHERE c.customer_id = ? AND p.published = 1
    `).all(req.user.id);

    if (cartItems.length === 0) return res.status(400).json({ error: 'Your cart is empty.' });

    // Check stock
    for (const item of cartItems) {
      if (item.stock < item.quantity) {
        return res.status(400).json({ error: `Insufficient stock for product ID ${item.product_id}.` });
      }
    }

    // Place orders and decrement stock in a transaction
    const placeOrder = db.transaction(() => {
      const orderIds = [];
      for (const item of cartItems) {
        const r = db.prepare(`
          INSERT INTO orders (customer_id, product_id, quantity, price_at_order)
          VALUES (?, ?, ?, ?)
        `).run(req.user.id, item.product_id, item.quantity, item.price);
        orderIds.push(r.lastInsertRowid);

        db.prepare('UPDATE products SET stock = stock - ? WHERE id = ?').run(item.quantity, item.product_id);
      }
      db.prepare('DELETE FROM cart WHERE customer_id = ?').run(req.user.id);
      return orderIds;
    });

    const orderIds = placeOrder();
    return res.status(201).json({ message: 'Order placed successfully!', order_ids: orderIds });
  } catch (err) { return next(err); }
});

router.get('/orders', requireAuth('customer'), (req, res) => {
  const orders = db.prepare(`
    SELECT o.id as order_id, o.quantity, o.price_at_order, o.status, o.order_date,
           p.id as product_id, p.ai_title as title, p.product_name, p.image_path,
           p.material, p.craft_type, a.name as artisan_name, a.district, a.state
    FROM orders o
    JOIN products p ON o.product_id = p.id
    JOIN artisans a ON p.artisan_id = a.id
    WHERE o.customer_id = ?
    ORDER BY o.order_date DESC
  `).all(req.user.id);
  return res.json({ orders });
});

module.exports = router;
