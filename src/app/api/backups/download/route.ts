import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export const dynamic = 'force-dynamic';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

// GET /api/backups/download?id=xxx
export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getDb();
    const row = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as { filename: string } | undefined;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const filepath = path.join(BACKUPS_DIR, path.basename(row.filename));
    // Prevent path traversal
    if (!filepath.startsWith(BACKUPS_DIR + path.sep) && filepath !== BACKUPS_DIR) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
    if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'File missing' }, { status: 404 });
    const content = fs.readFileSync(filepath);
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="${row.filename}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
