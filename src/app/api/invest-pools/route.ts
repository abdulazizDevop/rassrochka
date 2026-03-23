import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { id, name, totalAmount, available, investors } = await req.json();
    const db = getDb();
    db.prepare(
      `INSERT INTO invest_pools (id, name, total_amount, available, investors) VALUES (?, ?, ?, ?, ?)`
    ).run(id, name, totalAmount, available, JSON.stringify(investors));
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
      totalAmount: 'total_amount',
      available: 'available',
      investors: 'investors',
    };
    const setClauses: string[] = [];
    const values: any[] = [];
    for (const [key, value] of Object.entries(updates)) {
      const col = map[key];
      if (col) {
        setClauses.push(`${col} = ?`);
        values.push(key === 'investors' ? JSON.stringify(value) : value);
      }
    }
    if (setClauses.length === 0) {
      return NextResponse.json({ ok: true });
    }
    values.push(id);
    const db = getDb();
    db.prepare(`UPDATE invest_pools SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const db = getDb();
    db.prepare(`DELETE FROM invest_pools WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
