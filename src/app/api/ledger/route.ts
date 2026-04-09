import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { id, date, user, operation, clientContract, product, amount, accountId, accountName, note, isOperationalExpense } = await req.json();
    const db = getDb();
    db.prepare(
      `INSERT INTO ledger (id, date, user, operation, client_contract, product, amount, account_id, account_name, note, is_operational_expense) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, date, user, operation, clientContract, product, amount, accountId, accountName, note, isOperationalExpense ? 1 : 0);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/ledger?id=xxx  OR  /api/ledger?notePattern=...
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const notePattern = req.nextUrl.searchParams.get('notePattern');
    const db = getDb();
    if (id) {
      db.prepare('DELETE FROM ledger WHERE id = ?').run(id);
    } else if (notePattern) {
      db.prepare('DELETE FROM ledger WHERE note LIKE ?').run(`%${notePattern}%`);
    } else {
      return NextResponse.json({ error: 'Missing id or notePattern' }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
