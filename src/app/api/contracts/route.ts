import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

const camelToSnakeMap: Record<string, string> = {
  createdAt: 'created_at',
  endDate: 'end_date',
  clientId: 'client_id',
  clientName: 'client_name',
  remainingDebt: 'remaining_debt',
  monthlyPayment: 'monthly_payment',
  paymentStatus: 'payment_status',
  purchaseCost: 'purchase_cost',
  firstPayment: 'first_payment',
  startDate: 'start_date',
  payDay: 'pay_day',
  useEffectiveTerm: 'use_effective_term',
  effectiveMonths: 'effective_months',
  effectiveDays: 'effective_days',
};

function toSnake(key: string): string {
  return camelToSnakeMap[key] || key;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id, number, createdAt, endDate, clientId, clientName, product, phone,
      status, remainingDebt, monthlyPayment, paymentStatus, cost, purchaseCost,
      markup, firstPayment, months, source, tariff, account, startDate, payDay,
      comment, approved, useEffectiveTerm, effectiveMonths, effectiveDays,
    } = body;

    if (!id) {
      return NextResponse.json({ error: 'id is required' }, { status: 400 });
    }

    const db = getDb();
    db.prepare(
      `INSERT INTO contracts (
        id, number, created_at, end_date, client_id, client_name, product, phone,
        status, remaining_debt, monthly_payment, payment_status, cost, purchase_cost,
        markup, first_payment, months, source, tariff, account, start_date, pay_day,
        comment, approved, use_effective_term, effective_months, effective_days
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      number ?? 0,
      createdAt || '',
      endDate || '',
      clientId || '',
      clientName || '',
      product || '',
      phone || '',
      status || 'В процессе',
      remainingDebt ?? 0,
      monthlyPayment ?? 0,
      paymentStatus || 'Новый договор',
      cost ?? 0,
      purchaseCost ?? null,
      markup ?? 0,
      firstPayment ?? 0,
      months ?? 0,
      source || '',
      tariff || '',
      account || '',
      startDate || '',
      payDay ?? 1,
      comment ?? null,
      approved ? 1 : 0,
      useEffectiveTerm ? 1 : 0,
      effectiveMonths ?? null,
      effectiveDays ?? null,
    );

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [key, value] of Object.entries(updates)) {
      const column = toSnake(key);
      setClauses.push(`${column} = ?`);
      if (key === 'approved' || key === 'useEffectiveTerm') {
        values.push(value ? 1 : 0);
      } else {
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ ok: true });
    }

    values.push(id);
    const db = getDb();
    db.prepare(`UPDATE contracts SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = getDb();
    // Find the contract first to know its number for cascade
    const contract = db.prepare('SELECT number FROM contracts WHERE id = ?').get(id) as { number: number } | undefined;

    if (contract) {
      const marker = `#${contract.number}`;
      // Cascade: revert account balances from linked ledger entries
      const linked = db.prepare(`SELECT account_id, operation, amount FROM ledger WHERE note LIKE ?`).all(`%${marker}%`) as { account_id: string; operation: string; amount: number }[];
      const balanceDelta: Record<string, number> = {};
      for (const e of linked) {
        if (!e.account_id) continue;
        if (e.operation === 'Пополнение' || e.operation === 'Платёж клиента' || e.operation === 'Новый договор') {
          balanceDelta[e.account_id] = (balanceDelta[e.account_id] || 0) - e.amount;
        } else if (e.operation === 'Списание') {
          balanceDelta[e.account_id] = (balanceDelta[e.account_id] || 0) + e.amount;
        }
      }
      const updateAcc = db.prepare('UPDATE accounts SET balance = balance + ? WHERE id = ?');
      for (const [accId, delta] of Object.entries(balanceDelta)) {
        updateAcc.run(delta, accId);
      }
      // Delete linked ledger entries
      db.prepare('DELETE FROM ledger WHERE note LIKE ?').run(`%${marker}%`);
    }

    db.prepare('DELETE FROM contracts WHERE id = ?').run(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
