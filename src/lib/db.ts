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
  const count = (db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number }).c;
  if (count === 0) {
    db.prepare('INSERT INTO users (login, password, name, role) VALUES (?, ?, ?, ?)').run('admin', bcrypt.hashSync('admin', 10), 'Администратор', 'admin');
    db.prepare('INSERT INTO users (login, password, name, role) VALUES (?, ?, ?, ?)').run('manager', bcrypt.hashSync('manager', 10), 'Менеджер', 'viewer');
  }
}

export { bcrypt };
