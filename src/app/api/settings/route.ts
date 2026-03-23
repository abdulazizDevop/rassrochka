import { getDb } from '@/lib/db';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const db = getDb();
    const stmt = db.prepare(`INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)`);
    for (const [key, value] of Object.entries(body)) {
      stmt.run(key, String(value));
    }
    return NextResponse.json({ ok: true });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
