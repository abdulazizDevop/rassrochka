import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id, name, phone, invested, available, orgProfit, investorProfit, accountId, accountName, accountType, profitPercent, profitType, profitFixed, periodMonths, periodLabel } = await req.json();
    if (!id || !name) {
      return NextResponse.json({ error: 'id and name are required' }, { status: 400 });
    }
    const db = getDb();
    db.prepare(
      `INSERT INTO investors (id, name, phone, invested, available, org_profit, investor_profit, account_id, account_name, account_type, profit_percent, profit_type, profit_fixed, period_months, period_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(
      id,
      name,
      phone ?? null,
      invested ?? 0,
      available ?? 0,
      orgProfit ?? 0,
      investorProfit ?? 0,
      accountId ?? null,
      accountName ?? null,
      accountType ?? null,
      profitPercent ?? null,
      profitType || 'percent',
      profitFixed ?? null,
      periodMonths ?? null,
      periodLabel ?? null,
    );
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const db = getDb();
    db.prepare(`DELETE FROM investors WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
