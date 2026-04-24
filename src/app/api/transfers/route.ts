import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id, fromAccountId, toAccountId, amount, comment, date } = await req.json();
    if (!id || !fromAccountId || !toAccountId) {
      return NextResponse.json({ error: 'id, fromAccountId, toAccountId are required' }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      `INSERT INTO transfers (id, from_account_id, to_account_id, amount, comment, date) VALUES (?, ?, ?, ?, ?, ?)`
    ).run(id, fromAccountId, toAccountId, amount ?? 0, comment ?? '', date ?? new Date().toISOString());
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
