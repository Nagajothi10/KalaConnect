-- KalaConnect Phase 4 database schema (SQLite)
-- Executed once on first launch by db/database.js

PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS artisans (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  dob          TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone        TEXT    NOT NULL,
  password     TEXT    NOT NULL,
  district     TEXT    NOT NULL,
  state        TEXT    NOT NULL,
  address      TEXT    NOT NULL,
  created_date TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS customers (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  name         TEXT    NOT NULL,
  dob          TEXT    NOT NULL,
  email        TEXT    NOT NULL UNIQUE COLLATE NOCASE,
  phone        TEXT    NOT NULL,
  password     TEXT    NOT NULL,
  district     TEXT    NOT NULL,
  state        TEXT    NOT NULL,
  address      TEXT    NOT NULL,
  created_date TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS products (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  artisan_id      INTEGER NOT NULL REFERENCES artisans(id) ON DELETE CASCADE,
  image_path      TEXT    NOT NULL,
  product_name    TEXT    NOT NULL,
  material        TEXT    NOT NULL,
  craft_type      TEXT    NOT NULL,
  price           REAL    NOT NULL DEFAULT 0,
  stock           INTEGER NOT NULL DEFAULT 1,
  ai_title        TEXT,
  ai_description  TEXT,
  ai_tags         TEXT,    -- JSON array stored as string
  ai_category     TEXT,    -- suggested category from image analysis
  ai_price_min    REAL,    -- price range suggestion
  ai_price_max    REAL,
  quality_score   REAL,    -- 0-100 overall quality score
  quality_report  TEXT,    -- JSON: { blur, brightness, exposure, resolution, warnings[] }
  published       INTEGER NOT NULL DEFAULT 1,  -- 0=draft, 1=published
  created_date    TEXT    NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS cart (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id  INTEGER NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  quantity    INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  UNIQUE (customer_id, product_id)
);

CREATE TABLE IF NOT EXISTS orders (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id   INTEGER NOT NULL REFERENCES products(id)  ON DELETE CASCADE,
  quantity     INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  price_at_order REAL NOT NULL DEFAULT 0,
  status       TEXT NOT NULL DEFAULT 'pending',
  order_date   TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS chat_sessions (
  id           INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id  INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  session_key  TEXT NOT NULL UNIQUE,
  history      TEXT NOT NULL DEFAULT '[]',  -- JSON array of {role, parts}
  created_date TEXT NOT NULL DEFAULT (datetime('now')),
  updated_date TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_products_artisan    ON products (artisan_id);
CREATE INDEX IF NOT EXISTS idx_products_craft_type ON products (craft_type);
CREATE INDEX IF NOT EXISTS idx_products_material   ON products (material);
CREATE INDEX IF NOT EXISTS idx_products_published  ON products (published);
CREATE INDEX IF NOT EXISTS idx_cart_customer       ON cart (customer_id);
CREATE INDEX IF NOT EXISTS idx_orders_customer     ON orders (customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_session_key    ON chat_sessions (session_key);
