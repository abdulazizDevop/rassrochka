import { NextRequest, NextResponse } from 'next/server';
import { getDb } from '@/lib/db';

export async function POST(req: NextRequest) {
  try {
    const { id, firstName, lastName, middleName, phone, address, contractsCount } = await req.json();
    const db = getDb();

    db.prepare(
      `INSERT INTO clients (id, first_name, last_name, middle_name, phone, address, contracts_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(id, firstName, lastName, middleName, phone, address || '', contractsCount);

    return NextResponse.json({ ok: true, id });
  } catch (error) {
    console.error('POST /api/clients error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, ...updates } = body;
    const db = getDb();

    const fieldMap: Record<string, string> = {
      firstName: 'first_name',
      lastName: 'last_name',
      middleName: 'middle_name',
      phone: 'phone',
      address: 'address',
      contractsCount: 'contracts_count',
    };

    const setClauses: string[] = [];
    const values: unknown[] = [];

    for (const [camel, value] of Object.entries(updates)) {
      const column = fieldMap[camel];
      if (column) {
        setClauses.push(`${column} = ?`);
        values.push(value);
      }
    }

    if (setClauses.length === 0) {
      return NextResponse.json({ ok: false, error: 'No valid fields to update' }, { status: 400 });
    }

    values.push(id);
    db.prepare(`UPDATE clients SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('PATCH /api/clients error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const db = getDb();

    db.prepare('DELETE FROM clients WHERE id = ?').run(id);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('DELETE /api/clients error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
