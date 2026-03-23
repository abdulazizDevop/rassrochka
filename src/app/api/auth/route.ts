import { NextRequest, NextResponse } from 'next/server';
import { getDb, bcrypt } from '@/lib/db';

interface UserRow { login: string; password: string; name: string; role: string; }

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const login = String(body.login ?? '').trim().slice(0, 64);
    const password = String(body.password ?? '').slice(0, 128);

    if (!login || !password) {
      return NextResponse.json({ error: 'Введите логин и пароль' }, { status: 400 });
    }

    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as UserRow | undefined;
    if (!user || !bcrypt.compareSync(password, user.password)) {
      return NextResponse.json({ error: 'Неверный логин или пароль' }, { status: 401 });
    }

    return NextResponse.json({ login: user.login, name: user.name, role: user.role });
  } catch (e) {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
