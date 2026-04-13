import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

// GET /api/products
export async function GET() {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM products ORDER BY rowid DESC').all();
  return NextResponse.json({ products: rows });
}

// POST /api/products — create product
export async function POST(req: NextRequest) {
  try {
    const { name, category, price } = await req.json();
    if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });
    const db = getDb();
    const id = String(Date.now());
    db.prepare('INSERT INTO products (id, name, category, price) VALUES (?, ?, ?, ?)').run(id, name, category || '', price || 0);
    return NextResponse.json({ id, name, category: category || '', price: price || 0 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// PATCH /api/products — update product
export async function PATCH(req: NextRequest) {
  try {
    const { id, name, category, price } = await req.json();
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getDb();
    db.prepare('UPDATE products SET name = ?, category = ?, price = ? WHERE id = ?').run(name, category || '', price || 0, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// DELETE /api/products?id=xxx
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });
    const db = getDb();
    db.prepare('DELETE FROM products WHERE id = ?').run(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
