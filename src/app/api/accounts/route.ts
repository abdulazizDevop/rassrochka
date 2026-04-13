import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id, name, type, balance, orgBalance, investorsBalance, investPoolBalance } = await req.json();
    const db = getDb();
    db.prepare(
      `INSERT INTO accounts (id, name, type, balance, org_balance, investors_balance, invest_pool_balance) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, type, balance, orgBalance, investorsBalance, investPoolBalance);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    const map: Record<string, string> = {
      name: 'name',
      type: 'type',
      balance: 'balance',
      orgBalance: 'org_balance',
      investorsBalance: 'investors_balance',
      investPoolBalance: 'invest_pool_balance',
    };
    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      const col = map[key];
      if (col) {
        setClauses.push(`${col} = ?`);
        values.push(value);
      }
    }
    if (setClauses.length === 0) {
      return NextResponse.json({ ok: true });
    }
    values.push(id);
    const db = getDb();
    db.prepare(`UPDATE accounts SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const db = getDb();
    db.prepare(`DELETE FROM accounts WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
