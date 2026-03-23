import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { id, date, user, operation, clientContract, product, amount, accountId, accountName, note, isOperationalExpense } = await req.json();
    const db = await getDb();
    db.prepare(
      `INSERT INTO ledger (id, date, user, operation, client_contract, product, amount, account_id, account_name, note, is_operational_expense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, date, user, operation, clientContract, product, amount, accountId, accountName, note, isOperationalExpense ? 1 : 0);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
