import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

export const config = { api: { bodyParser: false } };

// POST /api/upload — multipart form upload, saves to /public/uploads/
export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const clientId = formData.get('clientId') as string;
    const files = formData.getAll('files') as File[];

    if (!clientId || files.length === 0) {
      return NextResponse.json({ error: 'Missing clientId or files' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
    fs.mkdirSync(uploadsDir, { recursive: true });

    const db = getDb();
    const saved: { id: string; url: string }[] = [];

    const ALLOWED_EXTS = new Set(['jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'pdf']);

    for (const file of files) {
        const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
        const rawExt = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const ext = ALLOWED_EXTS.has(rawExt) ? rawExt : 'jpg';
        const filename = `${id}.${ext}`;
      const filepath = path.join(uploadsDir, filename);
      const buffer = Buffer.from(await file.arrayBuffer());
      fs.writeFileSync(filepath, buffer);

      const now = new Date();
      const createdAt = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

      db.prepare('INSERT INTO photos (id, client_id, filename, created_at) VALUES (?, ?, ?, ?)').run(id, clientId, filename, createdAt);
      saved.push({ id, url: `/uploads/${filename}` });
    }

    return NextResponse.json({ photos: saved });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// GET /api/upload?clientId=xxx — list photos for a client
export async function GET(req: NextRequest) {
  try {
    const clientId = req.nextUrl.searchParams.get('clientId');
    if (!clientId) return NextResponse.json({ error: 'Missing clientId' }, { status: 400 });
    const db = getDb();
    const rows = db.prepare('SELECT id, filename FROM photos WHERE client_id = ? ORDER BY rowid DESC').all(clientId) as { id: string; filename: string }[];
    const photos = rows.map(r => ({ id: r.id, url: `/uploads/${r.filename}` }));
    return NextResponse.json({ photos });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/upload?id=xxx — delete a photo
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getDb();
    const row = db.prepare('SELECT filename FROM photos WHERE id = ?').get(id) as { filename: string } | undefined;
    if (row) {
      const filepath = path.join(process.cwd(), 'public', 'uploads', row.filename);
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      db.prepare('DELETE FROM photos WHERE id = ?').run(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
