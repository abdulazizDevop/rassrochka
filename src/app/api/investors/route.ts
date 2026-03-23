import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { id, name, phone, invested, available, orgProfit, investorProfit, accountId, accountName, accountType, profitPercent, periodMonths, periodLabel } = await req.json();
    const db = await getDb();
    db.prepare(
      `INSERT INTO investors (id, name, phone, invested, available, org_profit, investor_profit, account_id, account_name, account_type, profit_percent, period_months, period_label) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
    ).run(id, name, phone, invested, available, orgProfit, investorProfit, accountId, accountName, accountType, profitPercent, periodMonths, periodLabel);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const db = await getDb();
    db.prepare(`DELETE FROM investors WHERE id = ?`).run(id);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
