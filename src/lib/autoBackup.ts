/**
 * Auto-backup scheduler — runs daily at 23:50
 * Imported in instrumentation.ts so it starts with the server
 */

let scheduled = false;

const RETENTION_DAYS = 30;

export function startAutoBackupScheduler() {
  if (scheduled) return;
  scheduled = true;

  checkAndSchedule();
}

function msUntil2350(): number {
  const now = new Date();
  const target = new Date();
  target.setHours(23, 50, 0, 0);
  if (target <= now) {
    // already past today's 23:50 — schedule for tomorrow
    target.setDate(target.getDate() + 1);
  }
  return target.getTime() - now.getTime();
}

function checkAndSchedule() {
  const ms = msUntil2350();
  setTimeout(() => {
    triggerAutoBackup();
    // Re-schedule for next day (24h later)
    setInterval(() => triggerAutoBackup(), 24 * 60 * 60 * 1000);
  }, ms);
}

async function triggerAutoBackup() {
  try {
    const { getDb } = await import('./db');
    const { collectBackupData } = await import('./backupData');
    const db = getDb();

    const pathMod = await import('path');
    const fs = await import('fs');

    const BACKUPS_DIR = pathMod.join(process.cwd(), 'backups');
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });

    const pad = (n: number) => String(n).padStart(2, '0');
    const now = new Date();
    const ts = `${pad(now.getDate())}.${pad(now.getMonth()+1)}.${now.getFullYear()} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

    const snapshot = collectBackupData(db, ts);
    const id = String(Date.now());
    const filename = `auto_backup_${ts.replace(/[:.]/g, '-').replace(/ /g, '_')}.json`;
    const filepath = pathMod.join(BACKUPS_DIR, filename);

    fs.writeFileSync(
      filepath,
      JSON.stringify({ ...snapshot, autoBackup: true }, null, 2),
      'utf-8',
    );

    db.prepare('INSERT INTO backups (id, filename, created_at, note) VALUES (?, ?, ?, ?)').run(id, filename, ts, 'Авто-бэкап 23:50');

    console.log(`[AutoBackup] Saved: ${filename}`);

    // Retention: keep auto-backups for RETENTION_DAYS days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - RETENTION_DAYS);
    cutoff.setHours(0, 0, 0, 0);

    const oldRows = db.prepare(
      "SELECT id, filename FROM backups WHERE note = 'Авто-бэкап 23:50'"
    ).all() as { id: string; filename: string }[];

    for (const row of oldRows) {
      const match = row.filename.match(/auto_backup_(\d{2})-(\d{2})-(\d{4})/);
      if (!match) continue;
      const [, dd, mm, yyyy] = match;
      const fileDate = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      fileDate.setHours(0, 0, 0, 0);

      if (fileDate < cutoff) {
        const filePath = pathMod.join(BACKUPS_DIR, row.filename);
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        db.prepare('DELETE FROM backups WHERE id = ?').run(row.id);
        console.log(`[AutoBackup] Deleted old backup: ${row.filename}`);
      }
    }
  } catch (e) {
    console.error('[AutoBackup] Error:', e);
  }
}
