import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { id, timestamp, employee, action, section, entity, details } = await req.json();
    const db = getDb();
    db.prepare(
      `INSERT INTO audit_log (id, timestamp, employee, action, section, entity, details) VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, timestamp, employee || '', action || '', section || '', entity || '', details || '');
    return NextResponse.json({ ok: true, id });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/audit — clears all audit entries (or one by id if provided)
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    const db = getDb();
    if (id) {
      db.prepare('DELETE FROM audit_log WHERE id = ?').run(id);
    } else {
      db.prepare('DELETE FROM audit_log').run();
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
