import { NextRequest, NextResponse } from 'next/server';
import { getDb, bcrypt } from '@/lib/db';

interface UserRow { login: string; password: string; name: string; role: string; }

// GET /api/users — list all users
export async function GET() {
  try {
    const db = getDb();
    const users = db.prepare('SELECT login, name, role FROM users').all() as Omit<UserRow, 'password'>[];
    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}

// PATCH /api/users — update login/password
// skipCurrentPasswordCheck=true only for admin changing another user
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const login = String(body.login ?? '').trim().slice(0, 64);
    const currentPassword = body.currentPassword !== undefined ? String(body.currentPassword).slice(0, 128) : undefined;
    const newPassword = body.newPassword !== undefined ? String(body.newPassword).slice(0, 128) : undefined;
    const newLogin = body.newLogin !== undefined ? String(body.newLogin).trim().slice(0, 64) : undefined;
    const newName = body.newName !== undefined ? String(body.newName).trim().slice(0, 128) : undefined;
    const skipCheck = Boolean(body.skipCurrentPasswordCheck);

    if (!login) return NextResponse.json({ error: 'Не указан логин' }, { status: 400 });

    const db = getDb();
    const row = db.prepare('SELECT * FROM users WHERE login = ?').get(login) as UserRow | undefined;
    if (!row) return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });

    // Verify current password if required
    if (!skipCheck && currentPassword !== undefined) {
      if (!bcrypt.compareSync(currentPassword, row.password)) {
        return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 401 });
      }
    }

    if (newPassword) {
      if (newPassword.length < 4) return NextResponse.json({ error: 'Пароль слишком короткий (мин. 4 символа)' }, { status: 400 });
      const hash = bcrypt.hashSync(newPassword, 10);
      db.prepare('UPDATE users SET password = ? WHERE login = ?').run(hash, login);
    }

    if (newLogin && newLogin !== login) {
      if (newLogin.length < 3) return NextResponse.json({ error: 'Логин слишком короткий (мин. 3 символа)' }, { status: 400 });
      const exists = db.prepare('SELECT login FROM users WHERE login = ?').get(newLogin);
      if (exists) return NextResponse.json({ error: 'Логин уже занят' }, { status: 409 });
      db.prepare('UPDATE users SET login = ? WHERE login = ?').run(newLogin, login);
    }

    if (newName) {
      db.prepare('UPDATE users SET name = ? WHERE login = ?').run(newName, newLogin ?? login);
    }

    const updated = db.prepare('SELECT login, name, role FROM users WHERE login = ?').get(newLogin ?? login) as Omit<UserRow, 'password'>;
    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Ошибка сервера' }, { status: 500 });
  }
}
