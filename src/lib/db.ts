// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore — no type declarations for better-sqlite3 in this env
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import bcrypt from 'bcryptjs';

const DB_PATH = path.join(process.cwd(), 'data', 'app.db');

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (_db) return _db;
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });
  _db = new Database(DB_PATH);
  _db.pragma('journal_mode = WAL');
  initSchema(_db);
  return _db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      login     TEXT PRIMARY KEY,
      password  TEXT NOT NULL,
      name      TEXT NOT NULL,
      role      TEXT NOT NULL DEFAULT 'viewer'
    );

    CREATE TABLE IF NOT EXISTS photos (
      id          TEXT PRIMARY KEY,
      client_id   TEXT NOT NULL,
      filename    TEXT NOT NULL,
      created_at  TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS backups (
      id          TEXT PRIMARY KEY,
      filename    TEXT NOT NULL,
      created_at  TEXT NOT NULL,
      note        TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS clients (
      id               TEXT PRIMARY KEY,
      first_name       TEXT NOT NULL,
      last_name        TEXT NOT NULL,
      middle_name      TEXT NOT NULL DEFAULT '',
      phone            TEXT NOT NULL,
      address          TEXT NOT NULL DEFAULT '',
      contracts_count  INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS contracts (
      id              TEXT PRIMARY KEY,
      number          INTEGER NOT NULL,
      created_at      TEXT NOT NULL,
      end_date        TEXT NOT NULL,
      client_id       TEXT NOT NULL,
      client_name     TEXT NOT NULL,
      product         TEXT NOT NULL,
      phone           TEXT NOT NULL,
      status          TEXT NOT NULL,
      remaining_debt  REAL NOT NULL DEFAULT 0,
      monthly_payment REAL NOT NULL DEFAULT 0,
      payment_status  TEXT NOT NULL,
      cost            REAL NOT NULL DEFAULT 0,
      purchase_cost   REAL,
      markup          REAL NOT NULL DEFAULT 0,
      first_payment   REAL NOT NULL DEFAULT 0,
      months          INTEGER NOT NULL,
      source          TEXT NOT NULL DEFAULT '',
      tariff          TEXT NOT NULL DEFAULT '',
      account         TEXT NOT NULL DEFAULT '',
      start_date      TEXT NOT NULL,
      pay_day         INTEGER NOT NULL DEFAULT 1,
      comment         TEXT,
      approved        INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id                  TEXT PRIMARY KEY,
      name                TEXT NOT NULL,
      type                TEXT NOT NULL,
      balance             REAL NOT NULL DEFAULT 0,
      org_balance         REAL NOT NULL DEFAULT 0,
      investors_balance   REAL NOT NULL DEFAULT 0,
      invest_pool_balance REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS ledger (
      id                    TEXT PRIMARY KEY,
      date                  TEXT NOT NULL,
      user                  TEXT NOT NULL,
      operation             TEXT NOT NULL,
      client_contract       TEXT,
      product               TEXT,
      amount                REAL NOT NULL DEFAULT 0,
      account_id            TEXT NOT NULL,
      account_name          TEXT NOT NULL,
      note                  TEXT NOT NULL DEFAULT '',
      is_operational_expense INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS investors (
      id              TEXT PRIMARY KEY,
      name            TEXT NOT NULL,
      phone           TEXT,
      invested        REAL NOT NULL DEFAULT 0,
      available       REAL NOT NULL DEFAULT 0,
      org_profit      REAL NOT NULL DEFAULT 0,
      investor_profit REAL NOT NULL DEFAULT 0,
      account_id      TEXT,
      account_name    TEXT,
      account_type    TEXT,
      profit_percent  REAL,
      profit_type     TEXT DEFAULT 'percent',
      profit_fixed    REAL,
      period_months   INTEGER,
      period_label    TEXT
    );

    CREATE TABLE IF NOT EXISTS invest_pools (
      id           TEXT PRIMARY KEY,
      name         TEXT NOT NULL,
      total_amount REAL NOT NULL DEFAULT 0,
      available    REAL NOT NULL DEFAULT 0,
      investors    TEXT NOT NULL DEFAULT '[]'
    );

    CREATE TABLE IF NOT EXISTS transfers (
      id              TEXT PRIMARY KEY,
      from_account_id TEXT NOT NULL,
      to_account_id   TEXT NOT NULL,
      amount          REAL NOT NULL DEFAULT 0,
      comment         TEXT NOT NULL DEFAULT '',
      date            TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS audit_log (
      id        TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      employee  TEXT NOT NULL,
      action    TEXT NOT NULL,
      section   TEXT NOT NULL,
      entity    TEXT NOT NULL,
      details   TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS settings (
      key   TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS tariffs (
      id         TEXT PRIMARY KEY,
      name       TEXT NOT NULL,
      markup     REAL NOT NULL DEFAULT 0,
      is_default INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS products (
      id       TEXT PRIMARY KEY,
      name     TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT '',
      price    REAL NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS templates (
      id            TEXT PRIMARY KEY,
      filename      TEXT NOT NULL,
      original_name TEXT NOT NULL,
      created_at    TEXT NOT NULL
    );
  `);

  // Migrate plaintext passwords to bcrypt hashes
  const rows = db.prepare('SELECT login, password FROM users').all() as { login: string; password: string }[];
  for (const row of rows) {
    if (!row.password.startsWith('$2')) {
      const hash = bcrypt.hashSync(row.password, 10);
      db.prepare('UPDATE users SET password = ? WHERE login = ?').run(hash, row.login);
    }
  }

  // Seed default users if table is empty
  const userCount = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (userCount === 0) {
    db.prepare('INSERT INTO users (login, password, name, role) VALUES (?, ?, ?, ?)').run('admin', bcrypt.hashSync('admin', 10), 'Администратор', 'admin');
    db.prepare('INSERT INTO users (login, password, name, role) VALUES (?, ?, ?, ?)').run('manager', bcrypt.hashSync('manager', 10), 'Менеджер', 'viewer');
  }

  // No seed clients — created by admin through the UI

  // No seed data for contracts, clients, ledger, investors, pools, products
  // All data is created by admin through the UI
  // Only accounts are seeded with empty balances if none exist
  const accountCount = (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number }).c;
  if (accountCount === 0) {
    const ins = db.prepare('INSERT INTO accounts (id, name, type, balance, org_balance, investors_balance, invest_pool_balance) VALUES (?, ?, ?, ?, ?, ?, ?)');
    ins.run('cash', 'общий', 'нал', 0, 0, 0, 0);
    ins.run('bank_main', 'Средства в банке', 'безнал', 0, 0, 0, 0);
  }

  // Seed default settings
  const settingsCount = (db.prepare('SELECT COUNT(*) as c FROM settings').get() as { c: number }).c;
  if (settingsCount === 0) {
    const ins = db.prepare('INSERT INTO settings (key, value) VALUES (?, ?)');
    ins.run('minFirstPaymentPercent', '25');
    ins.run('minFirstPaymentAmount', '0');
    ins.run('minMonths', '1');
    ins.run('maxMonths', '9');
    ins.run('daysUntilOverdue', '4');
    ins.run('enableSecurityDepartment', 'false');
    ins.run('printFormat', 'A4');
    ins.run('companyName', 'AkhmadPay');
  }

  // Seed default tariff
  const tariffCount = (db.prepare('SELECT COUNT(*) as c FROM tariffs').get() as { c: number }).c;
  if (tariffCount === 0) {
    db.prepare('INSERT INTO tariffs (id, name, markup, is_default) VALUES (?, ?, ?, ?)').run('1', 'стандарт', 0, 1);
  }
}

export { bcrypt };
