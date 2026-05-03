import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import { collectBackupData, restoreBackupData } from '@/lib/backupData';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

function nowStr() {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
}

// POST /api/backups/restore?id=xxx
//   — restore from existing backup file by id
// POST /api/backups/restore  (with JSON body)
//   — restore from uploaded JSON snapshot
export async function POST(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    let raw: Record<string, unknown> | null = null;

    if (id) {
      const db = getDb();
      const row = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as { filename: string } | undefined;
      if (!row) return NextResponse.json({ error: 'Backup not found' }, { status: 404 });
      const filepath = path.join(BACKUPS_DIR, path.basename(row.filename));
      if (!filepath.startsWith(BACKUPS_DIR + path.sep) && filepath !== BACKUPS_DIR) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'Backup file missing' }, { status: 404 });
      raw = JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    } else {
      try {
        raw = await req.json();
      } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
      }
    }

    if (!raw || typeof raw !== 'object') {
      return NextResponse.json({ error: 'Invalid backup payload' }, { status: 400 });
    }

    const db = getDb();

    // Safety: snapshot the current DB before wiping, so the operator can roll back
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
    const safetyTs = nowStr();
    const safetyFilename = `before_restore_${safetyTs.replace(/[:.]/g, '-').replace(/ /g, '_')}.json`;
    const safetyFilepath = path.join(BACKUPS_DIR, safetyFilename);
    const safetySnapshot = collectBackupData(db, safetyTs);
    fs.writeFileSync(safetyFilepath, JSON.stringify(safetySnapshot, null, 2), 'utf-8');
    const safetyId = String(Date.now());
    db.prepare('INSERT INTO backups (id, filename, created_at, note) VALUES (?, ?, ?, ?)')
      .run(safetyId, safetyFilename, safetyTs, 'Перед восстановлением');

    // Run restore (transactional inside restoreBackupData)
    const { restored } = restoreBackupData(db, raw);

    return NextResponse.json({
      ok: true,
      restored,
      safetyBackup: { id: safetyId, filename: safetyFilename, createdAt: safetyTs },
    });
  } catch (e) {
    console.error('Restore failed:', e);
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
