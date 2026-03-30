import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function GET() {
  try {
    const db = getDb();

    // --- Clients ---
    const clientsRaw = db.prepare('SELECT * FROM clients').all() as Record<string, unknown>[];
    const clients = clientsRaw.map((r) => ({
      id: r.id,
      firstName: r.first_name,
      lastName: r.last_name,
      middleName: r.middle_name,
      phone: r.phone,
      address: r.address,
      contractsCount: r.contracts_count,
    }));

    // --- Contracts ---
    const contractsRaw = db.prepare('SELECT * FROM contracts').all() as Record<string, unknown>[];
    const contracts = contractsRaw.map((r) => ({
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
    }));

    // --- Accounts ---
    const accountsRaw = db.prepare('SELECT * FROM accounts').all() as Record<string, unknown>[];
    const accounts = accountsRaw.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      balance: r.balance,
      orgBalance: r.org_balance,
      investorsBalance: r.investors_balance,
      investPoolBalance: r.invest_pool_balance,
    }));

    // --- Ledger ---
    const ledgerRaw = db.prepare('SELECT * FROM ledger').all() as Record<string, unknown>[];
    const ledger = ledgerRaw.map((r) => ({
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

    // --- Investors ---
    const investorsRaw = db.prepare('SELECT * FROM investors').all() as Record<string, unknown>[];
    const investors = investorsRaw.map((r) => ({
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
      periodMonths: r.period_months,
      periodLabel: r.period_label,
    }));

    // --- Invest Pools ---
    const investPoolsRaw = db.prepare('SELECT * FROM invest_pools').all() as Record<string, unknown>[];
    const investPools = investPoolsRaw.map((r) => ({
      id: r.id,
      name: r.name,
      totalAmount: r.total_amount,
      available: r.available,
      investors: JSON.parse(r.investors as string) as string[],
    }));

    // --- Transfers ---
    const transfersRaw = db.prepare('SELECT * FROM transfers').all() as Record<string, unknown>[];
    const transfers = transfersRaw.map((r) => ({
      id: r.id,
      fromAccountId: r.from_account_id,
      toAccountId: r.to_account_id,
      amount: r.amount,
      comment: r.comment,
      date: r.date,
    }));

    // --- Audit Log ---
    const auditLogRaw = db.prepare('SELECT * FROM audit_log').all() as Record<string, unknown>[];
    const auditLog = auditLogRaw.map((r) => ({
      id: r.id,
      timestamp: r.timestamp,
      employee: r.employee,
      action: r.action,
      section: r.section,
      entity: r.entity,
      details: r.details,
    }));

    // --- Settings ---
    const settingsRaw = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
    const numberKeys = new Set(['minFirstPaymentPercent', 'minFirstPaymentAmount', 'minMonths', 'maxMonths', 'daysUntilOverdue']);
    const booleanKeys = new Set(['enableSecurityDepartment']);
    const jsonKeys = new Set(['paymentMethods', 'contractStatuses', 'paymentStatuses']);
    const settings: Record<string, unknown> = {};
    for (const { key, value } of settingsRaw) {
      if (numberKeys.has(key)) {
        settings[key] = Number(value);
      } else if (booleanKeys.has(key)) {
        settings[key] = value === 'true';
      } else if (jsonKeys.has(key)) {
        try { settings[key] = JSON.parse(value); } catch { settings[key] = value; }
      } else {
        settings[key] = value;
      }
    }

    // --- Tariffs ---
    const tariffsRaw = db.prepare('SELECT * FROM tariffs').all() as Record<string, unknown>[];
    const tariffs = tariffsRaw.map((r) => ({
      id: r.id,
      name: r.name,
      markup: r.markup,
      isDefault: r.is_default === 1,
    }));

    // --- Products ---
    const productsRaw = db.prepare('SELECT * FROM products').all() as Record<string, unknown>[];
    const products = productsRaw.map((r) => ({
      id: r.id,
      name: r.name,
      category: r.category,
      price: r.price,
    }));

    return NextResponse.json({
      clients,
      contracts,
      accounts,
      ledger,
      investors,
      investPools,
      transfers,
      auditLog,
      settings,
      tariffs,
      products,
    });
  } catch (error) {
    console.error('Failed to load data:', error);
    return NextResponse.json(
      { error: 'Failed to load data' },
      { status: 500 },
    );
  }
}
