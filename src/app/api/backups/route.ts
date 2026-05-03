import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { collectBackupData } from '@/lib/backupData';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function nowStr() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// GET /api/backups — list all backups
export async function GET() {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const db = getDb();
    const rows = db.prepare('SELECT * FROM backups ORDER BY rowid DESC').all() as { id: string; filename: string; created_at: string; note: string }[];
    return NextResponse.json({ backups: rows.map(r => ({ id: r.id, createdAt: r.created_at, filename: r.filename, note: r.note, size: getSizeLabel(r.filename) })) });
  } catch (e) {
    return NextResponse.json({ backups: [], error: String(e) });
  }
}

// POST /api/backups — create backup directly from DB (ignores body)
export async function POST(_req: NextRequest) {
  try {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });

    const id = String(Date.now());
    const ts = nowStr();
    const filename = `backup_${ts.replace(/[:.]/g, '-').replace(/ /g, '_')}.json`;
    const filepath = path.join(BACKUPS_DIR, filename);

    const db = getDb();
    const snapshot = collectBackupData(db, ts);
    fs.writeFileSync(filepath, JSON.stringify(snapshot, null, 2), 'utf-8');

    db.prepare('INSERT INTO backups (id, filename, created_at, note) VALUES (?, ?, ?, ?)').run(id, filename, ts, 'Ручное создание');

    return NextResponse.json({ id, createdAt: ts, filename, note: 'Ручное создание', size: getSizeLabel(filename) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/backups?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getDb();
    const row = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as { filename: string } | undefined;
    if (row) {
      const filepath = path.join(BACKUPS_DIR, row.filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      db.prepare('DELETE FROM backups WHERE id = ?').run(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

function getSizeLabel(filename: string): string {
  try {
    const filepath = path.join(BACKUPS_DIR, filename);
    if (!fs.existsSync(filepath)) return '—';
    const bytes = fs.statSync(filepath).size;
    if (bytes < 1024) return `${bytes} Б`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} КБ`;
    return `${(bytes / 1024 / 1024).toFixed(2)} МБ`;
  } catch { return '—'; }
}
