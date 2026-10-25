'use strict';

const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');

const DB_FILE = path.join(__dirname, 'kalaconnect.db');
const SCHEMA_FILE = path.join(__dirname, 'schema.sql');

const db = new Database(DB_FILE);

// Durability + integrity settings
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

function initialise() {
  const schema = fs.readFileSync(SCHEMA_FILE, 'utf8');
  db.exec(schema);

  const tables = db
    .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'")
    .all()
    .map((row) => row.name)
    .sort();

  console.log(`[db] ready at ${DB_FILE}`);
  console.log(`[db] tables: ${tables.join(', ')}`);
}

initialise();

module.exports = db;
