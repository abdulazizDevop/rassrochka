import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { id, timestamp, employee, action, section, entity, details } = await req.json();
    const db = await getDb();
    db.prepare(
      `INSERT INTO audit_log (id, timestamp, employee, action, section, entity, details) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, timestamp, employee, action, section, entity, details);
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
