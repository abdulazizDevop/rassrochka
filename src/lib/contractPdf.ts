import { Contract, Client } from './types';

export async function downloadContractPdf(contract: Contract, client: Client | undefined, companyName = 'AkhmadPay') {
  const { jsPDF } = await import('jspdf');
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

  // Load cyrillic font (built-in helvetica doesn't support it, use canvas text workaround)
  // We'll draw all text via canvas and embed as image
  const canvas = document.createElement('canvas');
  canvas.width = 794; // A4 at 96dpi
  canvas.height = 1123;
  const ctx = canvas.getContext('2d')!;

  // Background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Header bar
  ctx.fillStyle = '#5B5BD6';
  ctx.fillRect(0, 0, canvas.width, 70);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 26px Arial';
  ctx.fillText(companyName, 30, 38);
  ctx.font = '16px Arial';
  ctx.fillText(`Карточка договора №${contract.number}`, 30, 60);

  // Date top right
  ctx.font = '13px Arial';
  ctx.textAlign = 'right';
  ctx.fillText(`Дата: ${new Date().toLocaleDateString('ru-RU')}`, canvas.width - 30, 45);
  ctx.textAlign = 'left';

  // Separator
  let y = 95;
  const drawSection = (title: string) => {
    ctx.fillStyle = '#EEF0FF';
    ctx.fillRect(20, y - 18, canvas.width - 40, 28);
    ctx.fillStyle = '#5B5BD6';
    ctx.font = 'bold 15px Arial';
    ctx.fillText(title, 30, y);
    y += 20;
  };

  const drawRow = (label: string, value: string) => {
    ctx.fillStyle = '#374151';
    ctx.font = '13px Arial';
    ctx.fillText(label, 30, y);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 13px Arial';
    ctx.fillText(value || '—', 230, y);
    y += 22;
    // thin line
    ctx.strokeStyle = '#F3F4F6';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, y - 8);
    ctx.lineTo(canvas.width - 20, y - 8);
    ctx.stroke();
  };

  // Client section
  drawSection('Клиент');
  drawRow('ФИО:', contract.clientName);
  drawRow('Телефон:', contract.phone);
  if (client?.address) drawRow('Адрес:', client.address);
  y += 8;

  // Contract section
  drawSection('Договор');
  drawRow('Номер договора:', `№${contract.number}`);
  drawRow('Дата создания:', contract.createdAt);
  drawRow('Дата окончания:', contract.endDate);
  drawRow('Статус:', contract.status);
  drawRow('Тариф:', contract.tariff);
  drawRow('Товар / продукт:', contract.product);
  y += 8;

  // Finances
  drawSection('Финансы');
  drawRow('Стоимость товара:', `${contract.cost.toLocaleString('ru-RU')} ₽`);
  if (contract.purchaseCost) drawRow('Закупочная стоимость:', `${contract.purchaseCost.toLocaleString('ru-RU')} ₽`);
  drawRow('Наценка:', `${contract.markup.toLocaleString('ru-RU')} ₽`);
  drawRow('Первый взнос:', `${contract.firstPayment.toLocaleString('ru-RU')} ₽`);
  drawRow('Срок (месяцев):', `${contract.months}`);
  drawRow('Ежемесячный платёж:', `${contract.monthlyPayment.toLocaleString('ru-RU')} ₽`);
  drawRow('Остаток долга:', `${contract.remainingDebt.toLocaleString('ru-RU')} ₽`);
  drawRow('Источник:', contract.source);
  drawRow('Счёт:', contract.account);
  y += 8;

  // Payment schedule
  drawSection('График платежей');
  const [d, m, yr] = contract.startDate.split('.').map(Number);
  let cur = new Date(yr, m - 1, d);
  const monthly = contract.monthlyPayment;
  for (let i = 0; i < contract.months; i++) {
    cur = new Date(cur);
    cur.setMonth(cur.getMonth() + 1);
    const dateStr = cur.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    ctx.fillStyle = '#374151';
    ctx.font = '12px Arial';
    ctx.fillText(`${i + 1}. ${dateStr}`, 30, y);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px Arial';
    ctx.fillText(`${monthly.toLocaleString('ru-RU')} ₽`, 230, y);
    y += 18;
    if (y > canvas.height - 120) break; // prevent overflow
  }

  // Comment
  if (contract.comment) {
    y += 10;
    drawSection('Комментарий');
    ctx.fillStyle = '#374151';
    ctx.font = '13px Arial';
    // Word wrap simple
    const words = contract.comment.split(' ');
    let line = '';
    for (const word of words) {
      const test = line + word + ' ';
      if (ctx.measureText(test).width > canvas.width - 60) {
        ctx.fillText(line, 30, y);
        y += 18;
        line = word + ' ';
      } else {
        line = test;
      }
    }
    if (line) { ctx.fillText(line, 30, y); y += 18; }
  }

  // Passport photos
  const photos = client?.passportPhotos ?? [];
  if (photos.length > 0) {
    y += 15;
    drawSection('Фото паспорта');
    let px = 30;
    const pw = 180, ph = 130;
    for (let i = 0; i < photos.length; i++) {
      try {
        await new Promise<void>((resolve) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.onload = () => {
            ctx.drawImage(img, px, y, pw, ph);
            ctx.strokeStyle = '#E5E7EB';
            ctx.lineWidth = 2;
            ctx.strokeRect(px, y, pw, ph);
            px += pw + 15;
            resolve();
          };
          img.onerror = () => resolve();
          img.src = photos[i];
        });
      } catch { /* skip */ }
    }
    y += ph + 10;
  }

  // Footer
  ctx.fillStyle = '#9CA3AF';
  ctx.font = '11px Arial';
  ctx.fillText(`Сформировано: ${new Date().toLocaleString('ru-RU')} · ${companyName}`, 30, canvas.height - 20);

  // Embed canvas as image into PDF
  const imgData = canvas.toDataURL('image/png');
  const pdfW = doc.internal.pageSize.getWidth();
  const pdfH = doc.internal.pageSize.getHeight();
  doc.addImage(imgData, 'PNG', 0, 0, pdfW, pdfH);

  doc.save(`Договор_№${contract.number}_${contract.clientName.replace(/\s+/g, '_')}.pdf`);
}

export function downloadContractExcel(contract: Contract, client: Client | undefined) {
  const XLSX = require('xlsx');
  const wb = XLSX.utils.book_new();

  const rows = [
    ['КАРТОЧКА ДОГОВОРА', ''],
    ['', ''],
    ['Клиент', ''],
    ['ФИО', contract.clientName],
    ['Телефон', contract.phone],
    ['Адрес', client?.address ?? ''],
    ['', ''],
    ['Договор', ''],
    ['Номер', `№${contract.number}`],
    ['Дата создания', contract.createdAt],
    ['Дата окончания', contract.endDate],
    ['Статус', contract.status],
    ['Тариф', contract.tariff],
    ['Товар', contract.product],
    ['', ''],
    ['Финансы', ''],
    ['Стоимость', contract.cost],
    ['Закупочная стоимость', contract.purchaseCost ?? ''],
    ['Наценка', contract.markup],
    ['Первый взнос', contract.firstPayment],
    ['Срок (месяцев)', contract.months],
    ['Ежемесячный платёж', contract.monthlyPayment],
    ['Остаток долга', contract.remainingDebt],
    ['Источник', contract.source],
    ['Счёт', contract.account],
    ['', ''],
    ['Комментарий', contract.comment ?? ''],
  ];

  // Payment schedule
  rows.push(['', ''], ['График платежей', '']);
  const [d, m, yr] = contract.startDate.split('.').map(Number);
  let cur = new Date(yr, m - 1, d);
  for (let i = 0; i < contract.months; i++) {
    cur = new Date(cur);
    cur.setMonth(cur.getMonth() + 1);
    const dateStr = cur.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    rows.push([`Платёж ${i + 1} (${dateStr})`, contract.monthlyPayment]);
  }

  // Passport photo links
  const photos = client?.passportPhotos ?? [];
  if (photos.length > 0) {
    rows.push(['', ''], ['Фото паспорта (ссылки)', '']);
    photos.forEach((url, i) => {
      const fullUrl = url.startsWith('http') ? url : `${window.location.origin}${url}`;
      rows.push([`Фото ${i + 1}`, fullUrl]);
    });
  }

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws['!cols'] = [{ wch: 30 }, { wch: 50 }];
  XLSX.utils.book_append_sheet(wb, ws, 'Карточка');
  XLSX.writeFile(wb, `Договор_№${contract.number}_${contract.clientName.replace(/\s+/g, '_')}.xlsx`);
}
