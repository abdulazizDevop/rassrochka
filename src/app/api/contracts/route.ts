import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

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
      comment, approved,
    } = body;

    const db = getDb();
    db.prepare(
      `INSERT INTO contracts (
        id, number, created_at, end_date, client_id, client_name, product, phone,
        status, remaining_debt, monthly_payment, payment_status, cost, purchase_cost,
        markup, first_payment, months, source, tariff, account, start_date, pay_day,
        comment, approved
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id, number, createdAt, endDate, clientId, clientName, product, phone,
      status, remainingDebt, monthlyPayment, paymentStatus, cost, purchaseCost ?? null,
      markup, firstPayment, months, source, tariff, account, startDate, payDay,
      comment ?? null, approved ? 1 : 0
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
      values.push(key === 'approved' ? (value ? 1 : 0) : value);
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

    const db = getDb();
    db.prepare('DELETE FROM contracts WHERE id = ?').run(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/contracts error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
