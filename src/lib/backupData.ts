// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import type Database from 'better-sqlite3';

type Row = Record<string, unknown>;

export interface BackupSnapshot {
  exportedAt: string;
  schemaVersion: number;
  contracts: Row[];
  clients: Row[];
  accounts: Row[];
  ledger: Row[];
  investors: Row[];
  investPools: Row[];
  transfers: Row[];
  auditLog: Row[];
  settings: Row[];
  tariffs: Row[];
  products: Row[];
  photos: Row[];
  templates: Row[];
  users: Row[];
}

const SCHEMA_VERSION = 2;

export function collectBackupData(db: Database.Database, exportedAt: string): BackupSnapshot {
  const clients = (db.prepare('SELECT * FROM clients').all() as Row[]).map(r => ({
    id: r.id,
    firstName: r.first_name,
    lastName: r.last_name,
    middleName: r.middle_name,
    phone: r.phone,
    address: r.address,
    contractsCount: r.contracts_count,
  }));

  const contracts = (db.prepare('SELECT * FROM contracts').all() as Row[]).map(r => ({
    id: r.id,
    number: r.number,
    createdAt: r.created_at,
    endDate: r.end_date,
    clientId: r.client_id,
    clientName: r.client_name,
    product: r.product,
    phone: r.phone,
    status: r.status,
    remainingDebt: r.remaining_debt,
    monthlyPayment: r.monthly_payment,
    paymentStatus: r.payment_status,
    cost: r.cost,
    purchaseCost: r.purchase_cost,
    markup: r.markup,
    firstPayment: r.first_payment,
    months: r.months,
    source: r.source,
    tariff: r.tariff,
    account: r.account,
    startDate: r.start_date,
    payDay: r.pay_day,
    comment: r.comment,
    approved: r.approved === 1,
    useEffectiveTerm: r.use_effective_term === 1,
    effectiveMonths: r.effective_months,
    effectiveDays: r.effective_days,
  }));

  const accounts = (db.prepare('SELECT * FROM accounts').all() as Row[]).map(r => ({
    id: r.id,
    name: r.name,
    type: r.type,
    balance: r.balance,
    orgBalance: r.org_balance,
    investorsBalance: r.investors_balance,
    investPoolBalance: r.invest_pool_balance,
  }));

  const ledger = (db.prepare('SELECT * FROM ledger').all() as Row[]).map(r => ({
    id: r.id,
    date: r.date,
    user: r.user,
    operation: r.operation,
    clientContract: r.client_contract,
    product: r.product,
    amount: r.amount,
    accountId: r.account_id,
    accountName: r.account_name,
    note: r.note,
    isOperationalExpense: r.is_operational_expense === 1,
  }));

  const investors = (db.prepare('SELECT * FROM investors').all() as Row[]).map(r => ({
    id: r.id,
    name: r.name,
    phone: r.phone,
    invested: r.invested,
    available: r.available,
    orgProfit: r.org_profit,
    investorProfit: r.investor_profit,
    accountId: r.account_id,
    accountName: r.account_name,
    accountType: r.account_type,
    profitPercent: r.profit_percent,
    profitType: r.profit_type ?? 'percent',
    profitFixed: r.profit_fixed,
    periodMonths: r.period_months,
    periodLabel: r.period_label,
  }));

  const investPools = (db.prepare('SELECT * FROM invest_pools').all() as Row[]).map(r => ({
    id: r.id,
    name: r.name,
    totalAmount: r.total_amount,
    available: r.available,
    investors: r.investors,
  }));

  const transfers = (db.prepare('SELECT * FROM transfers').all() as Row[]).map(r => ({
    id: r.id,
    fromAccountId: r.from_account_id,
    toAccountId: r.to_account_id,
    amount: r.amount,
    comment: r.comment,
    date: r.date,
  }));

  const auditLog = (db.prepare('SELECT * FROM audit_log').all() as Row[]).map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    employee: r.employee,
    action: r.action,
    section: r.section,
    entity: r.entity,
    details: r.details,
  }));

  const settings = (db.prepare('SELECT key, value FROM settings').all() as Row[]).map(r => ({
    key: r.key,
    value: r.value,
  }));

  const tariffs = (db.prepare('SELECT * FROM tariffs').all() as Row[]).map(r => ({
    id: r.id,
    name: r.name,
    markup: r.markup,
    isDefault: r.is_default === 1,
  }));

  const products = (db.prepare('SELECT * FROM products').all() as Row[]).map(r => ({
    id: r.id,
    name: r.name,
    category: r.category,
    price: r.price,
  }));

  const photos = (db.prepare('SELECT * FROM photos').all() as Row[]).map(r => ({
    id: r.id,
    clientId: r.client_id,
    filename: r.filename,
    createdAt: r.created_at,
  }));

  const templates = (db.prepare('SELECT * FROM templates').all() as Row[]).map(r => ({
    id: r.id,
    filename: r.filename,
    originalName: r.original_name,
    createdAt: r.created_at,
  }));

  const users = (db.prepare('SELECT login, password, name, role FROM users').all() as Row[]).map(r => ({
    login: r.login,
    password: r.password,
    name: r.name,
    role: r.role,
  }));

  return {
    exportedAt,
    schemaVersion: SCHEMA_VERSION,
    contracts,
    clients,
    accounts,
    ledger,
    investors,
    investPools,
    transfers,
    auditLog,
    settings,
    tariffs,
    products,
    photos,
    templates,
    users,
  };
}

// Accept either camelCase (new) or snake_case (legacy auto-backup) keys.
function pick<T = unknown>(row: Row, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null) return row[k] as T;
  }
  return undefined;
}

function asInt(v: unknown): number {
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return Math.trunc(v);
  if (typeof v === 'string') return Number.isFinite(Number(v)) ? Math.trunc(Number(v)) : 0;
  return 0;
}

function asNum(v: unknown, fallback = 0): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string' && v.trim() !== '' && Number.isFinite(Number(v))) return Number(v);
  return fallback;
}

function asStr(v: unknown, fallback = ''): string {
  if (v === null || v === undefined) return fallback;
  return String(v);
}

export function restoreBackupData(db: Database.Database, raw: Record<string, unknown>): { restored: Record<string, number> } {
  const tx = db.transaction(() => {
    const restored: Record<string, number> = {};

    // Wipe in dependency-safe order
    db.exec(`
      DELETE FROM photos;
      DELETE FROM templates;
      DELETE FROM transfers;
      DELETE FROM ledger;
      DELETE FROM contracts;
      DELETE FROM clients;
      DELETE FROM invest_pools;
      DELETE FROM investors;
      DELETE FROM accounts;
      DELETE FROM audit_log;
      DELETE FROM tariffs;
      DELETE FROM products;
      DELETE FROM settings;
      DELETE FROM users;
    `);

    // ── Clients ───────────────────────────────────────────────
    const clientsArr = (raw.clients as Row[] | undefined) ?? [];
    const insClient = db.prepare(`INSERT INTO clients (id, first_name, last_name, middle_name, phone, address, contracts_count) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const r of clientsArr) {
      insClient.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'firstName', 'first_name')),
        asStr(pick(r, 'lastName', 'last_name')),
        asStr(pick(r, 'middleName', 'middle_name')),
        asStr(pick(r, 'phone')),
        asStr(pick(r, 'address')),
        asInt(pick(r, 'contractsCount', 'contracts_count')),
      );
    }
    restored.clients = clientsArr.length;

    // ── Contracts ─────────────────────────────────────────────
    const contractsArr = (raw.contracts as Row[] | undefined) ?? [];
    const insContract = db.prepare(`INSERT INTO contracts (
      id, number, created_at, end_date, client_id, client_name, product, phone, status,
      remaining_debt, monthly_payment, payment_status, cost, purchase_cost, markup,
      first_payment, months, source, tariff, account, start_date, pay_day, comment, approved,
      use_effective_term, effective_months, effective_days
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of contractsArr) {
      insContract.run(
        asStr(pick(r, 'id')),
        asInt(pick(r, 'number')),
        asStr(pick(r, 'createdAt', 'created_at')),
        asStr(pick(r, 'endDate', 'end_date')),
        asStr(pick(r, 'clientId', 'client_id')),
        asStr(pick(r, 'clientName', 'client_name')),
        asStr(pick(r, 'product')),
        asStr(pick(r, 'phone')),
        asStr(pick(r, 'status')),
        asNum(pick(r, 'remainingDebt', 'remaining_debt')),
        asNum(pick(r, 'monthlyPayment', 'monthly_payment')),
        asStr(pick(r, 'paymentStatus', 'payment_status')),
        asNum(pick(r, 'cost')),
        pick(r, 'purchaseCost', 'purchase_cost') !== undefined ? asNum(pick(r, 'purchaseCost', 'purchase_cost')) : null,
        asNum(pick(r, 'markup')),
        asNum(pick(r, 'firstPayment', 'first_payment')),
        asInt(pick(r, 'months')),
        asStr(pick(r, 'source')),
        asStr(pick(r, 'tariff')),
        asStr(pick(r, 'account')),
        asStr(pick(r, 'startDate', 'start_date')),
        asInt(pick(r, 'payDay', 'pay_day')) || 1,
        asStr(pick(r, 'comment')),
        asInt(pick(r, 'approved')),
        asInt(pick(r, 'useEffectiveTerm', 'use_effective_term')),
        pick(r, 'effectiveMonths', 'effective_months') !== undefined ? asInt(pick(r, 'effectiveMonths', 'effective_months')) : null,
        pick(r, 'effectiveDays', 'effective_days') !== undefined ? asInt(pick(r, 'effectiveDays', 'effective_days')) : null,
      );
    }
    restored.contracts = contractsArr.length;

    // ── Accounts ──────────────────────────────────────────────
    const accountsArr = (raw.accounts as Row[] | undefined) ?? [];
    const insAccount = db.prepare(`INSERT INTO accounts (id, name, type, balance, org_balance, investors_balance, invest_pool_balance) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const r of accountsArr) {
      insAccount.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'name')),
        asStr(pick(r, 'type')),
        asNum(pick(r, 'balance')),
        asNum(pick(r, 'orgBalance', 'org_balance')),
        asNum(pick(r, 'investorsBalance', 'investors_balance')),
        asNum(pick(r, 'investPoolBalance', 'invest_pool_balance')),
      );
    }
    // Re-seed default accounts if backup was empty
    if (accountsArr.length === 0) {
      insAccount.run('cash', 'общий', 'нал', 0, 0, 0, 0);
      insAccount.run('bank_main', 'Средства в банке', 'безнал', 0, 0, 0, 0);
    }
    restored.accounts = accountsArr.length;

    // ── Ledger ────────────────────────────────────────────────
    const ledgerArr = (raw.ledger as Row[] | undefined) ?? [];
    const insLedger = db.prepare(`INSERT INTO ledger (id, date, user, operation, client_contract, product, amount, account_id, account_name, note, is_operational_expense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of ledgerArr) {
      insLedger.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'date')),
        asStr(pick(r, 'user')),
        asStr(pick(r, 'operation')),
        asStr(pick(r, 'clientContract', 'client_contract')),
        asStr(pick(r, 'product')),
        asNum(pick(r, 'amount')),
        asStr(pick(r, 'accountId', 'account_id')),
        asStr(pick(r, 'accountName', 'account_name')),
        asStr(pick(r, 'note')),
        asInt(pick(r, 'isOperationalExpense', 'is_operational_expense')),
      );
    }
    restored.ledger = ledgerArr.length;

    // ── Investors ─────────────────────────────────────────────
    const investorsArr = (raw.investors as Row[] | undefined) ?? [];
    const insInvestor = db.prepare(`INSERT INTO investors (id, name, phone, invested, available, org_profit, investor_profit, account_id, account_name, account_type, profit_percent, profit_type, profit_fixed, period_months, period_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    for (const r of investorsArr) {
      insInvestor.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'name')),
        asStr(pick(r, 'phone')),
        asNum(pick(r, 'invested')),
        asNum(pick(r, 'available')),
        asNum(pick(r, 'orgProfit', 'org_profit')),
        asNum(pick(r, 'investorProfit', 'investor_profit')),
        asStr(pick(r, 'accountId', 'account_id')),
        asStr(pick(r, 'accountName', 'account_name')),
        asStr(pick(r, 'accountType', 'account_type')),
        pick(r, 'profitPercent', 'profit_percent') !== undefined ? asNum(pick(r, 'profitPercent', 'profit_percent')) : null,
        asStr(pick(r, 'profitType', 'profit_type'), 'percent'),
        pick(r, 'profitFixed', 'profit_fixed') !== undefined ? asNum(pick(r, 'profitFixed', 'profit_fixed')) : null,
        pick(r, 'periodMonths', 'period_months') !== undefined ? asInt(pick(r, 'periodMonths', 'period_months')) : null,
        asStr(pick(r, 'periodLabel', 'period_label')),
      );
    }
    restored.investors = investorsArr.length;

    // ── Invest Pools ──────────────────────────────────────────
    const poolsArr = ((raw.investPools ?? raw.invest_pools) as Row[] | undefined) ?? [];
    const insPool = db.prepare(`INSERT INTO invest_pools (id, name, total_amount, available, investors) VALUES (?, ?, ?, ?, ?)`);
    for (const r of poolsArr) {
      const investorsField = pick(r, 'investors');
      const investorsJson = typeof investorsField === 'string'
        ? investorsField
        : JSON.stringify(investorsField ?? []);
      insPool.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'name')),
        asNum(pick(r, 'totalAmount', 'total_amount')),
        asNum(pick(r, 'available')),
        investorsJson,
      );
    }
    restored.investPools = poolsArr.length;

    // ── Transfers ─────────────────────────────────────────────
    const transfersArr = (raw.transfers as Row[] | undefined) ?? [];
    const insTransfer = db.prepare(`INSERT INTO transfers (id, from_account_id, to_account_id, amount, comment, date) VALUES (?, ?, ?, ?, ?, ?)`);
    for (const r of transfersArr) {
      insTransfer.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'fromAccountId', 'from_account_id')),
        asStr(pick(r, 'toAccountId', 'to_account_id')),
        asNum(pick(r, 'amount')),
        asStr(pick(r, 'comment')),
        asStr(pick(r, 'date')),
      );
    }
    restored.transfers = transfersArr.length;

    // ── Audit log ─────────────────────────────────────────────
    const auditArr = ((raw.auditLog ?? raw.audit_log) as Row[] | undefined) ?? [];
    const insAudit = db.prepare(`INSERT INTO audit_log (id, timestamp, employee, action, section, entity, details) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    for (const r of auditArr) {
      insAudit.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'timestamp')),
        asStr(pick(r, 'employee')),
        asStr(pick(r, 'action')),
        asStr(pick(r, 'section')),
        asStr(pick(r, 'entity')),
        asStr(pick(r, 'details')),
      );
    }
    restored.auditLog = auditArr.length;

    // ── Settings ──────────────────────────────────────────────
    const settingsArr = (raw.settings as Row[] | Record<string, unknown> | undefined) ?? [];
    const insSetting = db.prepare(`INSERT INTO settings (key, value) VALUES (?, ?)`);
    if (Array.isArray(settingsArr)) {
      for (const r of settingsArr) {
        const v = pick(r, 'value');
        const value = typeof v === 'string' ? v : JSON.stringify(v);
        insSetting.run(asStr(pick(r, 'key')), value);
      }
      restored.settings = settingsArr.length;
    } else {
      // Object form: { key: value, ... }
      let count = 0;
      for (const [key, value] of Object.entries(settingsArr)) {
        const stored = typeof value === 'string' ? value : JSON.stringify(value);
        insSetting.run(key, stored);
        count++;
      }
      restored.settings = count;
    }

    // ── Tariffs ───────────────────────────────────────────────
    const tariffsArr = (raw.tariffs as Row[] | undefined) ?? [];
    const insTariff = db.prepare(`INSERT INTO tariffs (id, name, markup, is_default) VALUES (?, ?, ?, ?)`);
    for (const r of tariffsArr) {
      insTariff.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'name')),
        asNum(pick(r, 'markup')),
        asInt(pick(r, 'isDefault', 'is_default')),
      );
    }
    restored.tariffs = tariffsArr.length;

    // ── Products ──────────────────────────────────────────────
    const productsArr = (raw.products as Row[] | undefined) ?? [];
    const insProduct = db.prepare(`INSERT INTO products (id, name, category, price) VALUES (?, ?, ?, ?)`);
    for (const r of productsArr) {
      insProduct.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'name')),
        asStr(pick(r, 'category')),
        asNum(pick(r, 'price')),
      );
    }
    restored.products = productsArr.length;

    // ── Photos (metadata only) ────────────────────────────────
    const photosArr = (raw.photos as Row[] | undefined) ?? [];
    const insPhoto = db.prepare(`INSERT INTO photos (id, client_id, filename, created_at) VALUES (?, ?, ?, ?)`);
    for (const r of photosArr) {
      insPhoto.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'clientId', 'client_id')),
        asStr(pick(r, 'filename')),
        asStr(pick(r, 'createdAt', 'created_at')),
      );
    }
    restored.photos = photosArr.length;

    // ── Templates (metadata only) ─────────────────────────────
    const templatesArr = (raw.templates as Row[] | undefined) ?? [];
    const insTemplate = db.prepare(`INSERT INTO templates (id, filename, original_name, created_at) VALUES (?, ?, ?, ?)`);
    for (const r of templatesArr) {
      insTemplate.run(
        asStr(pick(r, 'id')),
        asStr(pick(r, 'filename')),
        asStr(pick(r, 'originalName', 'original_name')),
        asStr(pick(r, 'createdAt', 'created_at')),
      );
    }
    restored.templates = templatesArr.length;

    // ── Users ─────────────────────────────────────────────────
    const usersArr = (raw.users as Row[] | undefined) ?? [];
    const insUser = db.prepare(`INSERT INTO users (login, password, name, role) VALUES (?, ?, ?, ?)`);
    for (const r of usersArr) {
      insUser.run(
        asStr(pick(r, 'login')),
        asStr(pick(r, 'password')),
        asStr(pick(r, 'name')),
        asStr(pick(r, 'role'), 'viewer'),
      );
    }
    // Re-seed default admin if backup had no users (prevent lock-out)
    if (usersArr.length === 0) {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const bcrypt = require('bcryptjs');
      insUser.run('admin', bcrypt.hashSync('admin', 10), 'Администратор', 'admin');
    }
    restored.users = usersArr.length;

    return restored;
  });

  const restored = tx();
  return { restored };
}
