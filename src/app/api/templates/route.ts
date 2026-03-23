import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const TEMPLATES_DIR = path.join(process.cwd(), 'public', 'templates');

// GET — list all templates
export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare('SELECT id, filename, original_name, created_at FROM templates ORDER BY rowid DESC').all() as {
      id: string; filename: string; original_name: string; created_at: string;
    }[];
    return NextResponse.json({ templates: rows.map(r => ({ ...r, url: `/templates/${r.filename}` })) });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// POST — upload .docx template (admin only)
export async function POST(req: NextRequest) {
  try {
    fs.mkdirSync(TEMPLATES_DIR, { recursive: true });
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    if (!file) return NextResponse.json({ error: 'No file' }, { status: 400 });

    const ext = (file.name.split('.').pop() ?? '').toLowerCase().replace(/[^a-z0-9]/g, '');
    if (ext !== 'docx') return NextResponse.json({ error: 'Только .docx файлы' }, { status: 400 });

    const id = `${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const filename = `${id}.docx`;
    const filepath = path.join(TEMPLATES_DIR, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    fs.writeFileSync(filepath, buffer);

    const now = new Date();
    const createdAt = `${String(now.getDate()).padStart(2,'0')}.${String(now.getMonth()+1).padStart(2,'0')}.${now.getFullYear()} ${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`;

    const db = getDb();
    db.prepare('INSERT INTO templates (id, filename, original_name, created_at) VALUES (?, ?, ?, ?)').run(id, filename, file.name, createdAt);

    return NextResponse.json({ id, filename, original_name: file.name, url: `/templates/${filename}`, created_at: createdAt });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE — remove template (admin only)
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = getDb();
    const row = db.prepare('SELECT filename FROM templates WHERE id = ?').get(id) as { filename: string } | undefined;
    if (row) {
      const filepath = path.join(TEMPLATES_DIR, row.filename);
      // Prevent path traversal
      if (!filepath.startsWith(TEMPLATES_DIR)) return NextResponse.json({ error: 'Invalid' }, { status: 400 });
      if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
      db.prepare('DELETE FROM templates WHERE id = ?').run(id);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
