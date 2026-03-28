import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

// GET /api/backups/auto — get last auto backup info
export async function GET() {
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM backups WHERE note LIKE '%авто%' OR note LIKE '%Авто%' OR note LIKE '%auto%' ORDER BY rowid DESC LIMIT 1").get() as { id: string; filename: string; created_at: string; note: string } | undefined;
    return NextResponse.json({ lastAuto: row ? { createdAt: row.created_at } : null });
  } catch {
    return NextResponse.json({ lastAuto: null });
  }
}
