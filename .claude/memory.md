# Rassrochka (AkhmadPay) - Muddatli to'lov boshqaruv tizimi

## Maqsad
Kichik biznes uchun muddatli to'lov (installment/rassrochka) boshqaruv tizimi. Mijozlar, shartnomalar, to'lovlar, investorlar, analitika.

## Tech Stack
- **Fullstack:** Next.js 14, TypeScript, better-sqlite3, Bun
- **UI:** Tailwind CSS, Lucide React, Framer Motion, Recharts
- **PDF:** jspdf + html2canvas
- **Deploy:** Docker (podman), Timeweb server
- **Server:** 147.45.96.41 (Timeweb, Rossiya)

## Arxitektura
```
app/
  api/           — Next.js API routes (data, contracts, clients, accounts, ledger, audit, settings)
  page.tsx       — Main dashboard
data/
  app.db         — SQLite database
deploy.sh        — Production deploy script
docker-compose.yml
Dockerfile       — Bun-based build
backups/         — DB backups
```

## Database (SQLite)
- **clients** — mijozlar bazasi (pasport rasmi ham)
- **contracts** — shartnomalar (number, cost, remaining_debt, status)
- **ledger** — buxgalteriya yozuvlari
- **accounts** — hisoblar (cash, bank_main)
- **investors** — investorlar (name, phone, invested, available)
- **invest_pools** — invest fondi

## Muhim logika
- **To'lov jadvali:** shartnoma yaratilganda birinchi to'lov = bugundan + 1 oy (emas bugun!)
- **Qo'lda summa:** agar "Summa (uchun)" kiritilsa, tizim undan hisoblaydi (emas avtomatik)
- **Kechikkan kunlar:** to'lov muddati o'tsa necha kun o'tganini aniq ko'rsatish
- **Menejer roli:** menejer faqat o'z mijozlarini ko'radi, boshqalarni emas
- **Yopilgan shartnomalar:** shartnomalar bo'limida ko'rinmaydi, mijozlar bazasida qoladi
- **Sources (manbalar):** API orqali dinamik qo'shish/o'chirish (statik emas!)
- **3 kun qolgan to'lovlar:** alohida "Shoshilinch" bo'limi

## Oxirgi ishlar (2026-03/04)
- Investorlar moduli
- Analitika bug fix (real data bilan yangilanmagan)
- To'lov sanasi mantiqini tuzatish
- Menejer huquqlarini cheklash
- Shartnoma delete bug fix (delete qilganda qaytib kelish)
- Backup sahifasi 404 fix
- Mahsulot CRUD
- Grafik/chart xatoliklari tuzatish
