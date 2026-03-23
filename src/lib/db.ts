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

  // Seed clients
  const clientCount = (db.prepare('SELECT COUNT(*) as c FROM clients').get() as { c: number }).c;
  if (clientCount === 0) {
    const ins = db.prepare('INSERT INTO clients (id, first_name, last_name, middle_name, phone, address, contracts_count) VALUES (?, ?, ?, ?, ?, ?, ?)');
    ins.run('1', 'a111', 'a111', 'a111', '+7 (222) 222-22-22', '', 1);
    ins.run('2', 'a11', 'a11', 'a11', '+7 (222) 222-22-22', '', 1);
    ins.run('3', 'a1', 'a1', 'a1', '+7 (111) 111-11-1', '', 1);
    ins.run('4', 'a222', 'a222', 'a222', '+7 (555) 555-55-55', '', 1);
    ins.run('5', 'a22', 'a22', 'a22', '+7 (333) 333-33-33', '', 1);
    ins.run('6', 'a2', 'a2', 'a2', '+7 (222) 222-22-22', '', 1);
    ins.run('7', 'нуцалов', 'шамиль', '', '+7 (928) 504-76-97', '', 1);
    ins.run('8', 'пул1', 'пул1', 'пул1', '+7 (555) 555-55-55', '', 1);
    ins.run('9', 'пул2', 'пул2', 'пул2', '+7 (666) 666-66-66', '', 1);
    ins.run('10', 'пул3', 'пул3', 'пул3', '+7 (777) 777-77-77', '', 1);
    ins.run('11', 'пул4', 'пул4', 'пул4', '+7 (926) 869-61-69', 'Хазар ул. Школьная 4', 1);
    ins.run('12', 'старый', 'старый', '', '+7 (444) 444-44-44', '', 1);
  }

  // Seed contracts
  const contractCount = (db.prepare('SELECT COUNT(*) as c FROM contracts').get() as { c: number }).c;
  if (contractCount === 0) {
    const ins = db.prepare('INSERT INTO contracts (id, number, created_at, end_date, client_id, client_name, product, phone, status, remaining_debt, monthly_payment, payment_status, cost, markup, first_payment, months, source, tariff, account, start_date, pay_day, approved) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    ins.run('1', 1, '03.08.2025', '03.01.2026', '12', 'старый', 'Холодильник', '+7 (444) 444-44-44', 'Погашен', 0, 7800, 'Погашен', 46800, 0, 0, 6, 'Баланс', 'стандарт', 'общий', '03.08.2025', 3, 1);
    ins.run('2', 2, '03.09.2025', '03.06.2026', '4', 'a222 a222 a222', 'Ковер', '+7 (555) 555-55-55', 'Просрочен', 234000, 26000, 'Не оплачено', 156000, 0, 0, 9, 'Баланс', 'стандарт', 'общий', '03.09.2025', 3, 1);
    ins.run('3', 3, '03.11.2025', '03.06.2026', '1', 'a111 a111 a111', 'Телевизор', '+7 (222) 222-22-22', 'Списан', 4287, 18571, 'Оплачено', 130000, 0, 0, 7, 'Баланс', 'стандарт', 'общий', '03.11.2025', 3, 1);
    ins.run('4', 4, '02.01.2026', '02.04.2026', '9', 'пул2 пул2 пул2', 'айфон', '+7 (666) 666-66-66', 'Просрочен', 85800, 42900, 'Оплачено', 85800, 0, 0, 2, 'Баланс', 'стандарт', 'общий', '02.01.2026', 2, 1);
    ins.run('5', 5, '13.02.2026', '13.08.2026', '7', 'нуцалов шамиль', 'телефон айфон', '+7 (928) 504-76-97', 'В процессе', 58500, 19500, 'Оплачено', 117000, 0, 0, 6, 'Баланс', 'стандарт', 'общий', '13.02.2026', 13, 1);
    ins.run('6', 6, '03.03.2026', '03.09.2026', '3', 'a1 a1 a1', 'Айфон', '+7 (111) 111-11-1', 'В процессе', 91000, 15167, 'Новый договор', 91000, 0, 0, 6, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('7', 7, '03.03.2026', '03.11.2026', '6', 'a2 a2 a2', 'Айфон', '+7 (222) 222-22-22', 'В процессе', 91000, 11375, 'Новый договор', 91000, 0, 0, 8, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('8', 8, '03.03.2026', '03.12.2026', '2', 'a11 a11 a11', 'Айфон', '+7 (222) 222-22-22', 'В процессе', 195000, 21667, 'Новый договор', 195000, 0, 0, 9, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('9', 9, '03.03.2026', '03.06.2026', '5', 'a22 a22 a22', 'Айфон', '+7 (333) 333-33-33', 'В процессе', 195000, 65000, 'Новый договор', 195000, 0, 0, 3, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('10', 10, '03.03.2026', '03.06.2026', '8', 'пул1 пул1 пул1', 'Айфон', '+7 (555) 555-55-55', 'В процессе', 25000, 13000, 'Новый договор', 25000, 0, 0, 3, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('11', 11, '03.03.2026', '03.06.2026', '10', 'пул3 пул3 пул3', 'Ноутбук', '+7 (777) 777-77-77', 'Досрочно погашен', 0, 32500, 'Погашен', 97500, 0, 0, 3, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('12', 12, '03.03.2026', '03.06.2026', '11', 'пул4 пул4 пул4', 'Смартфон', '+7 (999) 999-99-99', 'Досрочно погашен', 0, 18571, 'Погашен', 130000, 0, 0, 7, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
    ins.run('13', 13, '03.03.2026', '03.06.2026', '7', 'нуцалов шамиль', 'Планшет', '+7 (926) 869-61-69', 'Досрочно погашен', 0, 32500, 'Погашен', 97500, 0, 0, 3, 'Баланс', 'стандарт', 'общий', '03.03.2026', 5, 1);
  }

  // Seed accounts
  const accountCount = (db.prepare('SELECT COUNT(*) as c FROM accounts').get() as { c: number }).c;
  if (accountCount === 0) {
    const ins = db.prepare('INSERT INTO accounts (id, name, type, balance, org_balance, investors_balance, invest_pool_balance) VALUES (?, ?, ?, ?, ?, ?, ?)');
    ins.run('cash', 'общий', 'нал', 3945563, 0, 2391093, 1554471);
    ins.run('bank_main', 'Средства в банке', 'безнал', 0, 0, 0, 0);
  }

  // Seed ledger
  const ledgerCount = (db.prepare('SELECT COUNT(*) as c FROM ledger').get() as { c: number }).c;
  if (ledgerCount === 0) {
    const ins = db.prepare('INSERT INTO ledger (id, date, user, operation, client_contract, product, amount, account_id, account_name, note) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)');
    ins.run('1', '10.03.2026 13:53', 'Админ', 'Отмена: Платёж клиента', 'пулл пулл пулл — договор #16', 'Кухня', 0, 'cash', 'Долг клиента', 'Долг закрыт');
    ins.run('2', '10.03.2026 13:53', 'Админ', 'Отмена: Перевод денег пула', 'пулл пулл пулл — договор #16', 'Кухня', 20000, 'cash', 'общий', 'Удаление платежа #18: о переносе платежа в пул');
    ins.run('3', '10.03.2026 12:56', 'Админ', 'Перевод денег пула', 'пул4 пул4 пул4 — договор #17', 'стол', 150000, 'cash', 'общий', 'Перенос первого взноса по договору #17 в пул 2');
    ins.run('4', '10.03.2026 12:56', 'Админ', 'Платёж клиента', 'пул4 пул4 пул4 — договор #17', 'стол', 150000, 'cash', 'общий', 'Первый взнос по договору');
    ins.run('5', '10.03.2026 12:56', 'Админ', 'Новый договор', 'пул4 пул4 пул4 — договор #17', 'стол', 345000, 'cash', 'Долг клиента', 'Создание договора с пул4 пул4 (#17) · стол · стоим. 345 000 ₽ = 300 000 ₽ тс + 45 000 ₽ наценка');
    ins.run('6', '10.03.2026 12:56', 'Админ', 'Перевод денег пула', 'пул4 пул4 пул4 — договор #17', 'стол', 300000, 'cash', 'общий', 'Покрытие покупки товара #2');
    ins.run('7', '10.03.2026 12:56', 'Админ', 'Отмена: ContractReserveCash', 'пул4 пул4 пул4 — договор #17', 'стол', 300000, 'cash', 'общий', 'Разморожено по договору');
    ins.run('8', '10.03.2026 12:56', 'Админ', 'Отмена: ContractReservePool', 'пул4 пул4 пул4 — договор #17', 'стол', 300000, 'bank_main', 'Обязательство: ааа ааа ааа', 'Разморожено по договору');
    ins.run('9', '10.03.2026 12:56', 'Админ', 'ContractReservePool', 'пул4 пул4 пул4 — договор #17', 'стол', 300000, 'cash', 'Счет резерва', 'Заморожено по договору (пул)');
    ins.run('10', '10.03.2026 12:56', 'Админ', 'ContractReserveCash', 'пул4 пул4 пул4 — договор #17', 'стол', 300000, 'cash', 'Счет резерва', 'Заморожено по договору (касса)');
    ins.run('11', '10.03.2026 03:00', 'Админ', 'Перевод денег пула', 'пулл пулл пулл — договор #16', 'Кухня', 10000, 'cash', 'общий', 'Перенос платежа #22 в пул');
    ins.run('12', '10.03.2026 03:00', 'Админ', 'Платёж клиента', 'пулл пулл пулл — договор #16', 'Кухня', 10000, 'cash', 'общий', 'Платеж #22 по договору пулл пулл (#16)');
    ins.run('13', '10.03.2026 03:00', 'Админ', 'Перевод денег пула', 'пулл пулл пулл — договор #16', 'Кухня', 20000, 'cash', 'общий', 'Перенос платежа #21 в пул');
    ins.run('14', '10.03.2026 03:00', 'Админ', 'Платёж клиента', 'пулл пулл пулл — договор #16', 'Кухня', 20000, 'cash', 'общий', 'Платеж #21 по договору пулл пулл (#16)');
  }

  // Seed investors
  const investorCount = (db.prepare('SELECT COUNT(*) as c FROM investors').get() as { c: number }).c;
  if (investorCount === 0) {
    const ins = db.prepare('INSERT INTO investors (id, name, invested, available, org_profit, investor_profit) VALUES (?, ?, ?, ?, ?, ?)');
    ins.run('1', 'a1', 1000000, 0, 42900, 42900);
    ins.run('2', 'a2', 500000, 0, 17482, 26222);
    ins.run('3', 'a3', 1000000, 0, 0, 0);
    ins.run('4', 'шамиль', 1000000, 0, 0, 0);
    ins.run('5', 'шамиль1', 500000, 0, 0, 0);
    ins.run('6', 'шамиль2', 300000, 0, 0, 0);
  }

  // Seed invest pools
  const poolCount = (db.prepare('SELECT COUNT(*) as c FROM invest_pools').get() as { c: number }).c;
  if (poolCount === 0) {
    const ins = db.prepare('INSERT INTO invest_pools (id, name, total_amount, available, investors) VALUES (?, ?, ?, ?, ?)');
    ins.run('1', 'Пул 1', 1500000, 800000, JSON.stringify(['a1', 'a2']));
    ins.run('2', 'Пул 2', 2000000, 1200000, JSON.stringify(['a3', 'шамиль']));
  }

  // Seed products
  const productCount = (db.prepare('SELECT COUNT(*) as c FROM products').get() as { c: number }).c;
  if (productCount === 0) {
    const ins = db.prepare('INSERT INTO products (id, name, category, price) VALUES (?, ?, ?, ?)');
    ins.run('1', 'iPhone 15 Pro', 'Телефоны', 130000);
    ins.run('2', 'Samsung Galaxy S24', 'Телефоны', 95000);
    ins.run('3', 'MacBook Air', 'Ноутбуки', 195000);
    ins.run('4', 'Холодильник Samsung', 'Техника', 85000);
    ins.run('5', 'Телевизор LG 55"', 'Техника', 75000);
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
