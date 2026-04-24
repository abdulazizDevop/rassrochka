import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id, date, user, operation, clientContract, product, amount, accountId, accountName, note, isOperationalExpense } = await req.json();
    if (!id || !operation) {
      return NextResponse.json({ error: 'id and operation are required' }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      `INSERT INTO ledger (id, date, user, operation, client_contract, product, amount, account_id, account_name, note, is_operational_expense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      date ?? '',
      user ?? '',
      operation,
      clientContract ?? null,
      product ?? null,
      amount ?? 0,
      accountId ?? '',
      accountName ?? '',
      note ?? '',
      isOperationalExpense ? 1 : 0,
    );
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/ledger?id=xxx  OR  /api/ledger?notePattern=...  OR  /api/ledger?operationalOnly=1
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const notePattern = req.nextUrl.searchParams.get('notePattern');
    const operationalOnly = req.nextUrl.searchParams.get('operationalOnly');
    const db = getDb();
    if (id) {
      db.prepare('DELETE FROM ledger WHERE id = ?').run(id);
    } else if (notePattern) {
      db.prepare('DELETE FROM ledger WHERE note LIKE ?').run(`%${notePattern}%`);
    } else if (operationalOnly === '1') {
      db.prepare('DELETE FROM ledger WHERE is_operational_expense = 1').run();
    } else {
      return NextResponse.json({ error: 'Missing id, notePattern, or operationalOnly' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
