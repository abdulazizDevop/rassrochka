import { NextRequest, NextResponse } from 'next/server';
import * as XLSX from 'xlsx';
import { getDb } from '@/lib/db';
import path from 'path';
import fs from 'fs';

const BACKUPS_DIR = path.join(process.cwd(), 'backups');

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 });

    const db = getDb();
    const row = db.prepare('SELECT filename FROM backups WHERE id = ?').get(id) as { filename: string } | undefined;
    if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const filepath = path.join(BACKUPS_DIR, row.filename);
    if (!fs.existsSync(filepath)) return NextResponse.json({ error: 'File missing' }, { status: 404 });

    const raw = JSON.parse(fs.readFileSync(filepath, 'utf-8'));

    // Determine base URL for photo links
    const host = req.headers.get('host') ?? 'localhost:3000';
    const protocol = host.startsWith('localhost') ? 'http' : 'https';
    const baseUrl = `${protocol}://${host}`;

    const wb = XLSX.utils.book_new();

    // ── Sheet 1: Договоры ──────────────────────────────────────────────────
    if (Array.isArray(raw.contracts) && raw.contracts.length > 0) {
      const contractRows = raw.contracts.map((c: any) => ({
        '№ договора': c.number ?? '',
        'Дата создания': c.createdAt ?? '',
        'Дата окончания': c.endDate ?? '',
        'Клиент': c.clientName ?? '',
        'Телефон': c.phone ?? '',
        'Продукт': c.product ?? '',
        'Статус': c.status ?? '',
        'Статус оплаты': c.paymentStatus ?? '',
        'Стоимость': c.cost ?? 0,
        'Себестоимость': c.purchaseCost ?? 0,
        'Наценка (%)': c.markup ?? 0,
        'Первый взнос': c.firstPayment ?? 0,
        'Ежемес. платёж': c.monthlyPayment ?? 0,
        'Остаток долга': c.remainingDebt ?? 0,
        'Месяцев': c.months ?? 0,
        'День оплаты': c.payDay ?? '',
        'Счёт': c.account ?? '',
        'Тариф': c.tariff ?? '',
        'Источник': c.source ?? '',
        'Комментарий': c.comment ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(contractRows);
      autoWidth(ws, contractRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Договоры');
    }

      // ── Sheet 2: Клиенты ───────────────────────────────────────────────────
      if (Array.isArray(raw.clients) && raw.clients.length > 0) {
        const clientRows = raw.clients.map((c: any) => {
          const photos: string[] = Array.isArray(c.passportPhotos) ? c.passportPhotos : [];
          const photo1 = photos[0] ? (photos[0].startsWith('http') ? photos[0] : `${baseUrl}${photos[0]}`) : '';
          const photo2 = photos[1] ? (photos[1].startsWith('http') ? photos[1] : `${baseUrl}${photos[1]}`) : '';
          const photo3 = photos[2] ? (photos[2].startsWith('http') ? photos[2] : `${baseUrl}${photos[2]}`) : '';
          return {
            'ID': c.id ?? '',
            'Фамилия': c.lastName ?? '',
            'Имя': c.firstName ?? '',
            'Отчество': c.middleName ?? '',
            'Телефон': c.phone ?? '',
            'Адрес': c.address ?? '',
            'Кол-во договоров': c.contractsCount ?? 0,
            'Фото паспорта 1': photo1,
            'Фото паспорта 2': photo2,
            'Фото паспорта 3': photo3,
          };
        });
        const ws = XLSX.utils.json_to_sheet(clientRows);
        autoWidth(ws, clientRows);

        // Make each photo cell a clickable hyperlink
        const range = XLSX.utils.decode_range(ws['!ref'] ?? 'A1');
        const keys = Object.keys(clientRows[0] ?? {});
        const photoCols = [
          keys.indexOf('Фото паспорта 1'),
          keys.indexOf('Фото паспорта 2'),
          keys.indexOf('Фото паспорта 3'),
        ].filter(i => i >= 0);

        for (let R = range.s.r + 1; R <= range.e.r; R++) {
          for (const C of photoCols) {
            const cellAddr = XLSX.utils.encode_cell({ r: R, c: C });
            const cell = ws[cellAddr];
            if (cell && typeof cell.v === 'string' && cell.v.length > 0) {
              cell.l = { Target: cell.v, Tooltip: 'Открыть фото паспорта' };
              cell.s = { font: { color: { rgb: '0563C1' }, underline: true } };
            }
          }
        }

        XLSX.utils.book_append_sheet(wb, ws, 'Клиенты');
      }

      // ── Sheet 6: Подсчёт покупок ──────────────────────────────────────────
      if (Array.isArray(raw.contracts) && raw.contracts.length > 0) {
        // Group by client
        const clientMap: Record<string, { name: string; phone: string; count: number; total: number; products: string[] }> = {};
        for (const c of raw.contracts as any[]) {
          const key = c.clientName ?? 'Неизвестно';
          if (!clientMap[key]) {
            clientMap[key] = { name: key, phone: c.phone ?? '', count: 0, total: 0, products: [] };
          }
          clientMap[key].count += 1;
          clientMap[key].total += Number(c.cost ?? 0);
          if (c.product && !clientMap[key].products.includes(c.product)) {
            clientMap[key].products.push(c.product);
          }
        }
        const summaryRows = Object.values(clientMap)
          .sort((a, b) => b.count - a.count)
          .map(r => ({
            'Клиент': r.name,
            'Телефон': r.phone,
            'Кол-во покупок': r.count,
            'Общая сумма (₽)': r.total,
            'Средний чек (₽)': r.count > 0 ? Math.round(r.total / r.count) : 0,
            'Товары': r.products.join(', '),
          }));
        const ws6 = XLSX.utils.json_to_sheet(summaryRows);
        autoWidth(ws6, summaryRows);
        XLSX.utils.book_append_sheet(wb, ws6, 'Подсчёт покупок');

        // ── Sheet 7: Топ товаров ──────────────────────────────────────────────
        const productMap: Record<string, { count: number; total: number }> = {};
        for (const c of raw.contracts as any[]) {
          const prod = c.product ?? 'Без названия';
          if (!productMap[prod]) productMap[prod] = { count: 0, total: 0 };
          productMap[prod].count += 1;
          productMap[prod].total += Number(c.cost ?? 0);
        }
        const productRows = Object.entries(productMap)
          .sort((a, b) => b[1].count - a[1].count)
          .map(([name, d]) => ({
            'Товар': name,
            'Продаж': d.count,
            'Выручка (₽)': d.total,
            'Средняя цена (₽)': d.count > 0 ? Math.round(d.total / d.count) : 0,
          }));
        const ws7 = XLSX.utils.json_to_sheet(productRows);
        autoWidth(ws7, productRows);
        XLSX.utils.book_append_sheet(wb, ws7, 'Топ товаров');
      }

    // ── Sheet 3: Журнал операций ───────────────────────────────────────────
    if (Array.isArray(raw.ledger) && raw.ledger.length > 0) {
      const ledgerRows = raw.ledger.map((l: any) => ({
        'Дата': l.date ?? '',
        'Сотрудник': l.user ?? '',
        'Операция': l.operation ?? '',
        'Клиент/Договор': l.clientContract ?? '',
        'Продукт': l.product ?? '',
        'Сумма': l.amount ?? 0,
        'Счёт': l.accountName ?? '',
        'Примечание': l.note ?? '',
        'Операц. расход': l.isOperationalExpense ? 'Да' : 'Нет',
      }));
      const ws = XLSX.utils.json_to_sheet(ledgerRows);
      autoWidth(ws, ledgerRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Журнал операций');
    }

    // ── Sheet 4: Счета ─────────────────────────────────────────────────────
    if (Array.isArray(raw.accounts) && raw.accounts.length > 0) {
      const accountRows = raw.accounts.map((a: any) => ({
        'Название': a.name ?? '',
        'Тип': a.type ?? '',
        'Общий баланс': a.balance ?? 0,
        'Баланс орг.': a.orgBalance ?? 0,
        'Баланс инвесторов': a.investorsBalance ?? 0,
        'Инвест. пул': a.investPoolBalance ?? 0,
      }));
      const ws = XLSX.utils.json_to_sheet(accountRows);
      autoWidth(ws, accountRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Счета');
    }

    // ── Sheet 5: Инвесторы ────────────────────────────────────────────────
    if (Array.isArray(raw.investors) && raw.investors.length > 0) {
      const investorRows = raw.investors.map((i: any) => ({
        'Имя': i.name ?? '',
        'Телефон': i.phone ?? '',
        'Вложено': i.invested ?? 0,
        'Доступно': i.available ?? 0,
        'Прибыль орг.': i.orgProfit ?? 0,
        'Прибыль инв.': i.investorProfit ?? 0,
        'Счёт': i.accountName ?? '',
        'Тип оплаты': i.accountType ?? '',
      }));
      const ws = XLSX.utils.json_to_sheet(investorRows);
      autoWidth(ws, investorRows);
      XLSX.utils.book_append_sheet(wb, ws, 'Инвесторы');
    }

    const excelName = row.filename.replace('.json', '.xlsx');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });

    return new NextResponse(buf, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${excelName}"`,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}

// Auto-fit column widths
function autoWidth(ws: XLSX.WorkSheet, rows: Record<string, unknown>[]) {
  if (!rows.length) return;
  const keys = Object.keys(rows[0]);
  const colWidths = keys.map(k => {
    const maxVal = Math.max(
      k.length,
      ...rows.map(r => String(r[k] ?? '').length)
    );
    return { wch: Math.min(maxVal + 2, 50) };
  });
  ws['!cols'] = colWidths;
}
