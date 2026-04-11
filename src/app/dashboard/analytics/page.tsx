'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { ChevronDown } from 'lucide-react';
import { motion, useInView, AnimatePresence, type Variants } from 'framer-motion';

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '.' + digits.slice(2);
  return digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
}

function parseDate(str: string): Date | null {
  const m = str.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

function toInputDate(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
}

function fromInputDate(s: string): Date | null {
  return parseDate(s);
}

type QuickPeriod = 'month' | 'half' | 'year';
const SOURCES = ['Все источники', 'Баланс', 'Инвест. пул'];

// ─── Mountain Area Chart ──────────────────────────────────────────────────────
function MountainChart({
  data,
  dataKey,
  color,
}: {
  data: { month: string; income: number; expenses: number }[];
  dataKey: 'income' | 'expenses';
  color: string;
}) {
  const ref = useRef<SVGSVGElement>(null);
  const inView = useInView(ref, { once: true });
  const [hovered, setHovered] = useState<number | null>(null);
  const [dims, setDims] = useState({ w: 480, h: 200 });

  const containerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver(entries => {
      for (const e of entries) {
        const w = e.contentRect.width;
        if (w > 0 && isFinite(w)) setDims({ w, h: 200 });
      }
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  const W = Math.max(dims.w, 100);
  const H = dims.h;
  const PAD = { top: 16, bottom: 32, left: 36, right: 12 };
  const innerW = Math.max(W - PAD.left - PAD.right, 0);
  const innerH = Math.max(H - PAD.top - PAD.bottom, 0);

  // Sanitize values: skip NaN/undefined
  const safeVals = data.map(d => {
    const v = d[dataKey];
    return typeof v === 'number' && isFinite(v) ? v : 0;
  });
  const max = Math.max(...safeVals, 1);
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  const pts = data.map((d, i) => {
    const val = safeVals[i];
    const x = PAD.left + (data.length === 1 ? innerW / 2 : (i / Math.max(data.length - 1, 1)) * innerW);
    const y = PAD.top + innerH - (val / max) * innerH;
    return {
      x: isFinite(x) ? x : PAD.left,
      y: isFinite(y) ? y : PAD.top + innerH,
      val,
      label: d.month,
    };
  });

  // Smooth cubic bezier path
  function smoothPath(points: { x: number; y: number }[]) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      d += ` C ${cpx} ${prev.y}, ${cpx} ${curr.y}, ${curr.x} ${curr.y}`;
    }
    return d;
  }

  const linePath = smoothPath(pts);
  const areaPath = pts.length > 0
    ? `${linePath} L ${pts[pts.length - 1].x} ${PAD.top + innerH} L ${pts[0].x} ${PAD.top + innerH} Z`
    : '';

  const gradId = `grad-${dataKey}`;

  return (
    <div ref={containerRef} className="w-full relative" style={{ height: H }}>
      <svg
        ref={ref}
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        style={{ overflow: 'visible' }}
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0.02" />
          </linearGradient>
          <clipPath id={`clip-${dataKey}`}>
            <motion.rect
              x={PAD.left}
              y={PAD.top}
              width={innerW}
              height={innerH + 4}
              initial={{ scaleX: 0 }}
              animate={inView ? { scaleX: 1 } : { scaleX: 0 }}
              style={{ transformOrigin: `${PAD.left}px center` }}
              transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
            />
          </clipPath>
        </defs>

        {/* Y grid lines */}
        {yTicks.map(t => {
          const y = PAD.top + innerH - t * innerH;
          return (
            <g key={t}>
              <line
                x1={PAD.left} y1={y} x2={PAD.left + innerW} y2={y}
                stroke="#f1f5f9" strokeWidth="1" strokeDasharray="4 4"
              />
              <text
                x={PAD.left - 4} y={y + 3}
                textAnchor="end" fontSize="9" fill="#cbd5e1"
              >
                {t === 0 ? '0' : `${Math.round((max * t) / 1000)}K`}
              </text>
            </g>
          );
        })}

        {/* Area fill */}
        {pts.length > 0 && (
          <path
            d={areaPath}
            fill={`url(#${gradId})`}
            clipPath={`url(#clip-${dataKey})`}
          />
        )}

        {/* Line */}
        {pts.length > 0 && (
          <path
            d={linePath}
            fill="none"
            stroke={color}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            clipPath={`url(#clip-${dataKey})`}
          />
        )}

        {/* Dots + hover zones */}
        {pts.map((p, i) => (
          <g key={i}>
            <circle
              cx={p.x} cy={p.y} r={hovered === i ? 5 : 3.5}
              fill={hovered === i ? color : '#fff'}
              stroke={color}
              strokeWidth="2"
              style={{ transition: 'r 0.15s, fill 0.15s' }}
            />
            {/* invisible hit area */}
            <rect
              x={p.x - 20} y={PAD.top}
              width={40} height={innerH}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
              onMouseLeave={() => setHovered(null)}
              style={{ cursor: 'crosshair' }}
            />
          </g>
        ))}

        {/* X labels */}
        {pts.map((p, i) => (
          <text
            key={i}
            x={p.x} y={H - 6}
            textAnchor="middle"
            fontSize="9"
            fill={hovered === i ? color : '#94a3b8'}
            style={{ transition: 'fill 0.15s' }}
          >
            {p.label}
          </text>
        ))}

        {/* Tooltip */}
        {hovered !== null && pts[hovered] && (() => {
          const p = pts[hovered];
          const TW = 110, TH = 42;
          let tx = p.x - TW / 2;
          if (tx < PAD.left) tx = PAD.left;
          if (tx + TW > W - PAD.right) tx = W - PAD.right - TW;
          const ty = p.y - TH - 10 < PAD.top ? p.y + 12 : p.y - TH - 10;
          return (
            <g>
              <rect x={tx} y={ty} width={TW} height={TH} rx="7" fill="#111827" opacity="0.92" />
              <text x={tx + TW / 2} y={ty + 14} textAnchor="middle" fontSize="10" fill="#e2e8f0" fontWeight="600">
                {p.label}
              </text>
              <text x={tx + TW / 2} y={ty + 30} textAnchor="middle" fontSize="11" fill={color} fontWeight="700">
                {(p.val / 1000).toFixed(1)}K ₽
              </text>
            </g>
          );
        })()}
      </svg>

      {data.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center text-gray-300 text-sm">
          Нет данных
        </div>
      )}
    </div>
  );
}

// ─── Animated Arc (donut) ─────────────────────────────────────────────────────
function AnimatedArc({ pct, color, size = 100, stroke = 14 }: { pct: number; color: string; size?: number; stroke?: number }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const safePct = typeof pct === 'number' && isFinite(pct) ? Math.max(0, Math.min(pct, 100)) : 0;
  const dash = circ * (safePct / 100);

  return (
    <svg ref={ref} width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={stroke} />
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none" stroke={color} strokeWidth={stroke}
        strokeLinecap="round"
        strokeDasharray={circ}
        initial={{ strokeDashoffset: circ }}
        animate={inView ? { strokeDashoffset: circ - dash } : { strokeDashoffset: circ }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
      />
    </svg>
  );
}

// ─── Animated number ──────────────────────────────────────────────────────────
function AnimNum({ value, fmt: fmtFn = fmt }: { value: number; fmt?: (n: number) => string }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });
  const [display, setDisplay] = useState(0);

  useEffect(() => {
    if (!inView) return;
    const end = typeof value === 'number' && isFinite(value) ? value : 0;
    if (end === 0) { setDisplay(0); return; }
    let start = 0;
    const dur = 900;
    const step = 16;
    const inc = (end / dur) * step;
    const timer = setInterval(() => {
      start = Math.min(start + inc, end);
      setDisplay(Math.round(start));
      if (start >= end) clearInterval(timer);
    }, step);
    return () => clearInterval(timer);
  }, [inView, value]);

  return <span ref={ref}>{fmtFn(display)}</span>;
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AnalyticsPage() {
  const { contracts, ledger, investors, currentUser } = useApp();

  const today = new Date();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [source, setSource] = useState('Все источники');
  const [sourceOpen, setSourceOpen] = useState(false);
  const [showOpsModal, setShowOpsModal] = useState<false | 'income' | 'expense'>(false);

  function applyQuick(q: QuickPeriod) {
    const now = new Date();
    let from = new Date(now);
    if (q === 'month') {
      from = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (q === 'half') {
      from = new Date(now);
      from.setMonth(from.getMonth() - 6);
    } else {
      from = new Date(now);
      from.setFullYear(from.getFullYear() - 1);
    }
    setDateFrom(toInputDate(from));
    setDateTo(toInputDate(now));
  }

  const dFrom = fromInputDate(dateFrom);
  const dTo = fromInputDate(dateTo);

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const d = parseDate(c.startDate || c.createdAt);
      if (!d) return true;
      if (dFrom && d < dFrom) return false;
      if (dTo && d > dTo) return false;
      if (source !== 'Все источники' && c.source !== source) return false;
      return true;
    });
  }, [contracts, dFrom, dTo, source]);

  const allActive = contracts.filter(c => c.status === 'В процессе');
  const allDebt = contracts.reduce((s, c) => s + (c.remainingDebt || 0), 0);
  const overdueContracts = contracts.filter(c => c.status === 'Просрочен');
  const overdueDebt = overdueContracts.reduce((s, c) => s + (c.remainingDebt || 0), 0);
  const writtenOffContracts = contracts.filter(c => c.status === 'Списан');
  const writtenOffDebt = writtenOffContracts.reduce((s, c) => s + (c.remainingDebt || 0), 0);

  const income = filteredContracts.reduce((s, c) => s + (c.cost || 0), 0);
  const expenses = filteredContracts.reduce((s, c) => s + (c.purchaseCost ?? c.cost ?? 0), 0);

  const operationalExpenses = useMemo(() => {
    return ledger.filter(e => {
      if (!e.isOperationalExpense) return false;
      const d = parseDate(e.date);
      if (!d) return false;
      if (dFrom && d < dFrom) return false;
      if (dTo && d > dTo) return false;
      return true;
    }).reduce((s, e) => s + e.amount, 0);
  }, [ledger, dFrom, dTo]);

  const totalExpenses = expenses + operationalExpenses;
  const actualProfit = income - totalExpenses;
  const margin = income > 0 ? ((actualProfit / income) * 100).toFixed(1) : '0';

  const potentialProfit = filteredContracts
    .filter(c => c.status === 'В процессе')
    .reduce((s, c) => s + (c.remainingDebt || 0), 0);
  const potentialMargin = income > 0 ? ((potentialProfit / income) * 100).toFixed(1) : '0';

  const payments = useMemo(() => {
    return ledger.filter(e => {
      if (e.operation !== 'Платёж клиента') return false;
      const d = parseDate(e.date);
      if (!d) return false;
      if (dFrom && d < dFrom) return false;
      if (dTo && d > dTo) return false;
      return true;
    });
  }, [ledger, dFrom, dTo]);

  const paymentsCount = payments.length;
  const paymentsSum = payments.reduce((s, e) => s + e.amount, 0);
  const avgPayment = paymentsCount > 0 ? Math.round(paymentsSum / paymentsCount) : 0;
  const cardPayments = payments.filter(p => p.note?.toLowerCase().includes('карт'));
  const cardSum = cardPayments.reduce((s, e) => s + e.amount, 0);
  const cashPayments = payments.filter(p => !p.note?.toLowerCase().includes('карт'));
  const cashSum = cashPayments.reduce((s, e) => s + e.amount, 0);

  const ltv = allActive.length > 0
    ? Math.round(allActive.reduce((s, c) => s + c.cost, 0) / allActive.length)
    : 0;
  const avgMonths = filteredContracts.length > 0
    ? (filteredContracts.reduce((s, c) => s + (c.months || 0), 0) / filteredContracts.length).toFixed(1)
    : '0';
  const expectedPayments = allActive.reduce((s, c) => s + c.monthlyPayment, 0);
  const paidMonthly = allActive.filter(c => c.paymentStatus === 'Оплачено').reduce((s, c) => s + c.monthlyPayment, 0);
  const collectability = expectedPayments > 0 ? ((paidMonthly / expectedPayments) * 100).toFixed(1) : '0';
  const collectNum = Number(collectability);

  const totalGoodsValue = contracts.reduce((s, c) => s + c.cost, 0);
  const totalCostValue = contracts.reduce((s, c) => s + (c.purchaseCost ?? c.cost), 0);
  const totalFirstPayment = contracts.reduce((s, c) => s + (c.firstPayment || 0), 0);

  const overdueAvgStr = useMemo(() => {
    if (!overdueContracts.length) return 'нет';
    const now = new Date();
    const days = overdueContracts.map(c => {
      const d = parseDate(c.endDate);
      if (!d) return 0;
      return Math.max(0, Math.floor((now.getTime() - d.getTime()) / 86400000));
    });
    const avg = Math.round(days.reduce((a, b) => a + b, 0) / days.length);
    return `${(avg / 30).toFixed(1)} мес (${avg} дн.)`;
  }, [overdueContracts]);

  const incomeOps = useMemo(() => {
    return ledger.filter(e => {
      if (e.operation !== 'Платёж клиента' && e.operation !== 'Пополнение') return false;
      const d = parseDate(e.date);
      if (!d) return false;
      if (dFrom && d < dFrom) return false;
      if (dTo && d > dTo) return false;
      return true;
    });
  }, [ledger, dFrom, dTo]);

  const expenseOps = useMemo(() => {
    return ledger.filter(e => {
      if (e.operation !== 'Списание' && e.operation !== 'Новый договор') return false;
      const d = parseDate(e.date);
      if (!d) return false;
      if (dFrom && d < dFrom) return false;
      if (dTo && d > dTo) return false;
      return true;
    });
  }, [ledger, dFrom, dTo]);

  const productGroups = useMemo(() => {
    const map: Record<string, { count: number; revenue: number }> = {};
    contracts.forEach(c => {
      const key = c.product || 'Без названия';
      if (!map[key]) map[key] = { count: 0, revenue: 0 };
      map[key].count++;
      map[key].revenue += c.cost;
    });
    return Object.entries(map).sort((a, b) => b[1].revenue - a[1].revenue).slice(0, 3);
  }, [contracts]);
  const topProductRevenue = productGroups.reduce((s, entry) => s + entry[1].revenue, 0);
  const contractProductMargin = contracts.reduce((s, c) => s + (c.cost - (c.purchaseCost ?? c.cost)), 0);
  const productCount = new Set(contracts.map(c => c.product || '')).size;

  const totalInvested = investors.reduce((s, i) => s + i.invested, 0);
  const totalOrgProfit = investors.reduce((s, i) => s + i.orgProfit, 0);
  const totalInvestorProfit = investors.reduce((s, i) => s + i.investorProfit, 0);

  const last3MonthsContracts = useMemo(() => {
    const now = new Date();
    const cutoff = new Date(now);
    cutoff.setMonth(cutoff.getMonth() - 3);
    return contracts.filter(c => {
      const d = parseDate(c.startDate || c.createdAt);
      return d && d >= cutoff;
    });
  }, [contracts]);
  const last3Profit = last3MonthsContracts.reduce((s, c) => s + (c.cost - (c.purchaseCost ?? c.cost)), 0);
  const forecastBetter = actualProfit >= last3Profit / 3;
  const forecastIncome = allActive.reduce((s, c) => s + c.monthlyPayment, 0);
  const forecastDebt = allActive.reduce((s, c) => s + (c.remainingDebt || 0), 0);
  const expectedMonthlyPayments = allActive.reduce((s, c) => s + c.monthlyPayment, 0);
  const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1)
    .toLocaleString('ru-RU', { month: 'long' });

    // ─── Monthly stats from contracts ────────────────────────────────────────
    const monthlyStats = useMemo(() => {
      const map: Record<string, { label: string; count: number; revenue: number; avgInstallment: number; installments: number[] }> = {};
      contracts.forEach(c => {
        const d = parseDate(c.startDate || c.createdAt);
        if (!d) return;
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
        if (!map[key]) map[key] = { label, count: 0, revenue: 0, avgInstallment: 0, installments: [] };
        map[key].count++;
        map[key].revenue += c.cost;
        if (c.monthlyPayment > 0) map[key].installments.push(c.monthlyPayment);
      });
      return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, v]) => ({ ...v, avgInstallment: v.installments.length > 0 ? Math.round(v.installments.reduce((a, b) => a + b, 0) / v.installments.length) : 0 }));
    }, [contracts]);

    const bestMonthByCount = useMemo(() => {
      if (!monthlyStats.length) return null;
      return monthlyStats.reduce((best, m) => m.count > best.count ? m : best, monthlyStats[0]);
    }, [monthlyStats]);

    const bestMonthByRevenue = useMemo(() => {
      if (!monthlyStats.length) return null;
      return monthlyStats.reduce((best, m) => m.revenue > best.revenue ? m : best, monthlyStats[0]);
    }, [monthlyStats]);

    const topProducts = useMemo(() => {
      const map: Record<string, { name: string; count: number; revenue: number; avgCost: number; costs: number[] }> = {};
      contracts.forEach(c => {
        const key = c.product || 'Не указан';
        if (!map[key]) map[key] = { name: key, count: 0, revenue: 0, avgCost: 0, costs: [] };
        map[key].count++;
        map[key].revenue += c.cost;
        map[key].costs.push(c.cost);
      });
      return Object.values(map)
        .map(p => ({ ...p, avgCost: Math.round(p.costs.reduce((a, b) => a + b, 0) / p.costs.length) }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    }, [contracts]);

    const avgInstallment = useMemo(() => {
      const vals = contracts.filter(c => c.monthlyPayment > 0).map(c => c.monthlyPayment);
      if (!vals.length) return 0;
      return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
    }, [contracts]);

    const bestInstallment = useMemo(() => {
      // "Лучшая" рассрочка — медиана (самая частая диапазон)
      const vals = contracts.filter(c => c.monthlyPayment > 0).map(c => c.monthlyPayment).sort((a, b) => a - b);
      if (!vals.length) return 0;
      return vals[Math.floor(vals.length / 2)];
    }, [contracts]);

    const avgContractSum = useMemo(() => {
      if (!contracts.length) return 0;
      return Math.round(contracts.reduce((s, c) => s + c.cost, 0) / contracts.length);
    }, [contracts]);

  const monthlyChartData = useMemo(() => {
    const map: Record<string, { month: string; income: number; expenses: number }> = {};
    ledger.forEach(e => {
      const d = parseDate(e.date);
      if (!d) return;
      const amt = typeof e.amount === 'number' && isFinite(e.amount) ? e.amount : 0;
      if (amt === 0) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = `${String(d.getMonth() + 1).padStart(2, '0')}.${d.getFullYear()}`;
      if (!map[key]) map[key] = { month: label, income: 0, expenses: 0 };
      if (e.operation === 'Платёж клиента' || e.operation === 'Пополнение') {
        map[key].income += amt;
      } else if (e.operation === 'Списание' || e.operation === 'Новый договор') {
        map[key].expenses += amt;
      }
    });
    return Object.entries(map)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(entry => entry[1]);
  }, [ledger]);

  const containerVariants: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.07 } },
  };
  const cardVariants: Variants = {
    hidden: { opacity: 0, y: 24, scale: 0.97 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } },
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <>
      <motion.div initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Аналитика</h1>
        <p className="text-sm text-gray-500 mb-6">Понятные цифры по финансам</p>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.05 }}
        className="bg-white rounded-2xl border border-gray-100 shadow-sm px-6 py-4 mb-6 flex flex-wrap gap-6 items-end"
      >
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Период:</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">С</span>
            <input type="text" value={dateFrom} onChange={e => setDateFrom(formatDateInput(e.target.value))} maxLength={10} placeholder="дд.мм.гггг"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            <span className="text-sm text-gray-500">По</span>
            <input type="text" value={dateTo} onChange={e => setDateTo(formatDateInput(e.target.value))} maxLength={10} placeholder="дд.мм.гггг"
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Быстрый выбор:</p>
          <div className="flex gap-2">
            {(['month', 'half', 'year'] as QuickPeriod[]).map((q, i) => (
              <button key={q} onClick={() => applyQuick(q)}
                className="px-4 py-2 text-sm border border-gray-200 rounded-lg hover:bg-indigo-50 hover:border-indigo-300 hover:text-indigo-700 transition">
                {['Текущий месяц', 'Полгода', 'Год'][i]}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Источник:</p>
          <div className="relative">
            <button onClick={() => setSourceOpen(o => !o)}
              className="flex items-center gap-2 border border-gray-200 rounded-lg px-4 py-2 text-sm min-w-[180px] justify-between hover:border-indigo-300 transition">
              {source} <ChevronDown size={14} className="text-gray-400" />
            </button>
            {sourceOpen && (
              <div className="absolute top-full left-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg z-20 min-w-[180px]">
                {SOURCES.map(s => (
                  <button key={s} onClick={() => { setSource(s); setSourceOpen(false); }}
                    className={`block w-full text-left px-4 py-2.5 text-sm hover:bg-indigo-50 hover:text-indigo-700 transition first:rounded-t-xl last:rounded-b-xl ${source === s ? 'font-medium text-indigo-700' : 'text-gray-700'}`}>
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Row 1: Income / Expenses / Profit */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
        {/* Income */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden"
          whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(34,197,94,0.12)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-green-50 opacity-60" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-4 h-4 rounded-full bg-green-400 shadow-lg shadow-green-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Доходы</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-1 relative z-10">
            <AnimNum value={income} />
          </div>
          <p className="text-xs text-gray-400 mb-4">Операционные поступления</p>
          <button onClick={() => setShowOpsModal('income')}
            className="text-xs font-medium text-gray-700 hover:text-indigo-600 transition flex items-center justify-between w-full border-t border-gray-50 pt-3">
            <span>Показать операции</span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">{incomeOps.length}</span>
          </button>
        </motion.div>

        {/* Expenses */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden"
          whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(239,68,68,0.10)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-red-50 opacity-60" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-4 h-4 rounded-full bg-red-300 shadow-lg shadow-red-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Расходы</span>
          </div>
          <div className="text-3xl font-bold text-red-500 mb-1 relative z-10">
            <AnimNum value={totalExpenses} />
          </div>
          <p className="text-xs text-gray-400 mb-4">Выплаты партнёрам и операционные</p>
          <button onClick={() => setShowOpsModal('expense')}
            className="text-xs font-medium text-gray-700 hover:text-indigo-600 transition flex items-center justify-between w-full border-t border-gray-50 pt-3 mb-2">
            <span>Показать операции</span>
            <span className="bg-gray-100 text-gray-600 rounded-full px-2 py-0.5 text-xs">{expenseOps.length}</span>
          </button>
          <div className="flex items-center justify-between text-xs border-t border-gray-50 pt-2">
            <span className="text-gray-500">Операционные</span>
            <span className="font-medium text-gray-700">{fmt(operationalExpenses)}</span>
          </div>
        </motion.div>

        {/* Profit */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 relative overflow-hidden"
          whileHover={{ y: -3, boxShadow: '0 8px 32px rgba(99,102,241,0.10)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="absolute -right-6 -top-6 w-24 h-24 rounded-full bg-indigo-50 opacity-60" />
          <div className="flex items-center gap-2 mb-3 relative z-10">
            <div className="w-4 h-4 rounded-full bg-indigo-300 shadow-lg shadow-indigo-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Прибыль</span>
          </div>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Фактическая</div>
          <div className={`text-2xl font-bold mb-1 ${actualProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            <AnimNum value={Math.abs(actualProfit)} fmt={v => (actualProfit < 0 ? '-' : '') + fmt(v)} />
          </div>
          <p className={`text-xs mb-4 ${actualProfit >= 0 ? 'text-green-500' : 'text-red-400'}`}>
            Маржинальность: {margin}%
          </p>
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Потенциальная</div>
          <div className="text-2xl font-bold text-green-600 mb-1">
            <AnimNum value={potentialProfit} />
          </div>
          <p className="text-xs text-green-500 mb-3">Маржинальность: {potentialMargin}%</p>
        </motion.div>
      </motion.div>

      {/* Row 2 */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
        {/* Contracts */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(99,102,241,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-indigo-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Договоры</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-0.5">{contracts.length}</div>
          <p className="text-xs text-gray-400 mb-3">договоров в системе</p>
          <div className="flex items-center gap-2 mb-4">
            <AnimatedArc pct={allActive.length / Math.max(contracts.length, 1) * 100} color="#6366f1" size={48} stroke={8} />
            <span className="inline-block bg-indigo-100 text-indigo-700 text-xs font-medium rounded-full px-2.5 py-1">
              {allActive.length} активных
            </span>
          </div>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Выдано товаров</span>
              <span className="font-medium text-gray-700">{fmt(totalGoodsValue)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Себестоимость</span>
              <span className="font-medium text-gray-700">{fmt(totalCostValue)}</span>
            </div>
            {totalFirstPayment > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Первый взнос</span>
                <span className="font-medium text-gray-700">{fmt(totalFirstPayment)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Debt */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(249,115,22,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Задолженность</span>
          </div>
          <div className="text-2xl font-bold text-orange-500 mb-0.5"><AnimNum value={allDebt} /></div>
          <p className="text-xs text-gray-400 mb-2">задолженность</p>
          <AnimatedArc pct={allDebt > 0 ? (overdueDebt / allDebt) * 100 : 0} color="#ef4444" size={48} stroke={8} />
          <div className="text-xs text-gray-400 uppercase tracking-wide mb-1 mt-2">Просрочено</div>
          <div className="text-xl font-bold text-red-500 mb-0.5"><AnimNum value={overdueDebt} /></div>
          <p className="text-xs text-gray-400 mb-3">
            {allDebt > 0 ? ((overdueDebt / allDebt) * 100).toFixed(1) : 0}% от долга
          </p>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Средняя просрочка</span>
              <span className="font-medium text-gray-700">{overdueAvgStr}</span>
            </div>
            {writtenOffDebt > 0 && (
              <div className="flex justify-between text-xs">
                <span className="text-gray-500">Списано</span>
                <span className="font-medium text-red-500">-{fmt(writtenOffDebt)}</span>
              </div>
            )}
          </div>
        </motion.div>

        {/* Unit-economics */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(34,197,94,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-green-400" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Юнит-экономика</span>
          </div>
          <div className="flex items-center gap-3 mb-2">
            <div className="relative">
              <AnimatedArc pct={collectNum} color={collectNum >= 80 ? '#22c55e' : collectNum >= 50 ? '#eab308' : '#ef4444'} size={60} stroke={10} />
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-bold text-gray-700">{collectability}%</span>
              </div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{collectability}%</div>
              <span className={`inline-block text-xs font-medium rounded-full px-2 py-0.5 ${
                collectNum >= 80 ? 'bg-green-100 text-green-700' :
                collectNum >= 50 ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-600'
              }`}>
                {collectNum >= 80 ? 'Высокая' : collectNum >= 50 ? 'Средняя' : 'Низкая'}
              </span>
            </div>
          </div>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">LTV / Доход с договора</span>
              <span className="font-medium text-gray-700">{fmt(ltv)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Средний срок договора</span>
              <span className="font-medium text-gray-700">{avgMonths} мес</span>
            </div>
          </div>
        </motion.div>

        {/* Payments */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(168,85,247,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-purple-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Платежи</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-0.5">{paymentsCount}</div>
          <p className="text-xs text-gray-400 mb-0.5">платежей проведено</p>
          <p className="text-xs text-gray-400 mb-3">На сумму: {fmt(paymentsSum)}</p>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Средний платёж</span>
              <span className="font-medium text-gray-700">{fmt(avgPayment)}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-2">
              <span className="text-gray-500">На карту — {cardPayments.length} пл.</span>
              <span className="font-medium text-gray-700">{fmt(cardSum)}</span>
            </div>
            <div className="flex items-center justify-between text-xs bg-gray-50 rounded-lg px-2.5 py-2">
              <span className="text-gray-500">Наличными — {cashPayments.length} пл.</span>
              <span className="font-medium text-gray-700">{fmt(cashSum)}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Row 3 */}
      <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Products */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(59,130,246,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-blue-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">По товарам</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-0.5">{fmt(topProductRevenue)}</div>
          <p className="text-xs text-gray-400 mb-3">доход с товара</p>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Кол-во товаров</span>
              <span className="font-medium text-gray-700">{productCount}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Маржа по договорам</span>
              <span className="font-medium text-gray-700">{fmt(contractProductMargin)}</span>
            </div>
          </div>
        </motion.div>

        {/* Partners */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(249,115,22,0.06)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-orange-200" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">По партнёрам</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-0.5">{fmt(0)}</div>
          <p className="text-xs text-gray-400 mb-3">долг партнёрам</p>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Партнёрских договоров</span>
              <span className="font-medium text-gray-700">0</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Сумма договоров</span>
              <span className="font-medium text-gray-700">{fmt(0)}</span>
            </div>
          </div>
        </motion.div>

        {/* Investments */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(20,184,166,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-teal-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Инвестиции</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 mb-0.5"><AnimNum value={totalOrgProfit} /></div>
          <p className="text-xs text-gray-400 mb-3">доход организации</p>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Вложено всего</span>
              <span className="font-medium text-gray-700">{fmt(totalInvested)}</span>
            </div>
            <div className="flex justify-between text-xs">
              <span className="text-gray-500">Прирост партнёрам</span>
              <span className={`font-medium ${totalInvestorProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>{fmt(totalInvestorProfit)}</span>
            </div>
          </div>
        </motion.div>

        {/* Forecast */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
          whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(236,72,153,0.08)' }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
          <div className="flex items-center gap-2 mb-3">
            <div className="w-3.5 h-3.5 rounded-full bg-pink-300" />
            <span className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Прогноз на {nextMonth} {today.getFullYear()}
            </span>
          </div>
          <div className={`text-xl font-bold mb-1 ${forecastBetter ? 'text-green-600' : 'text-orange-500'}`}>
            {forecastBetter ? 'Лучше' : 'Ниже'}
          </div>
          <p className="text-xs text-gray-400 mb-3">чем средние 3 мес.</p>
          <div className="space-y-2 border-t border-gray-50 pt-3">
            <div className="flex justify-between text-xs bg-gray-50 rounded-lg px-2 py-1.5">
              <span className="text-gray-500">Прогноз дохода</span>
              <span className="font-medium text-gray-700">{fmt(forecastIncome)}</span>
            </div>
            <div className="flex justify-between text-xs bg-gray-50 rounded-lg px-2 py-1.5">
              <span className="text-gray-500">Ожидаемые платежи</span>
              <span className="font-medium text-gray-700">{fmt(expectedMonthlyPayments)}</span>
            </div>
            <div className="flex justify-between text-xs bg-gray-50 rounded-lg px-2 py-1.5">
              <span className="text-gray-500">Прогноз долга</span>
              <span className="font-medium text-gray-700">{fmt(forecastDebt)}</span>
            </div>
          </div>
        </motion.div>
      </motion.div>

        {/* ─── Блок: Лучшие месяцы + Рассрочка + Топ товаров ─── */}
        <motion.div variants={containerVariants} initial="hidden" animate="show" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">

          {/* Лучшие месяцы */}
          <motion.div variants={cardVariants}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(99,102,241,0.10)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
                <span className="text-base">📅</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Лучшие месяцы</p>
                <p className="text-xs text-gray-400">По договорам из базы</p>
              </div>
            </div>
            {monthlyStats.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-3">
                {bestMonthByCount && (
                  <div className="bg-indigo-50 rounded-xl px-3.5 py-3">
                    <p className="text-xs text-indigo-500 font-semibold mb-0.5">Больше всего договоров</p>
                    <p className="text-sm font-bold text-indigo-700 capitalize">{bestMonthByCount.label}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-indigo-400">{bestMonthByCount.count} дог.</span>
                      <span className="text-xs font-medium text-indigo-600">{fmt(bestMonthByCount.revenue)}</span>
                    </div>
                  </div>
                )}
                {bestMonthByRevenue && bestMonthByRevenue.label !== bestMonthByCount?.label && (
                  <div className="bg-green-50 rounded-xl px-3.5 py-3">
                    <p className="text-xs text-green-500 font-semibold mb-0.5">Лучшая выручка</p>
                    <p className="text-sm font-bold text-green-700 capitalize">{bestMonthByRevenue.label}</p>
                    <div className="flex items-center justify-between mt-1">
                      <span className="text-xs text-green-400">{bestMonthByRevenue.count} дог.</span>
                      <span className="text-xs font-medium text-green-600">{fmt(bestMonthByRevenue.revenue)}</span>
                    </div>
                  </div>
                )}
                <div className="border-t border-gray-50 pt-2 mt-1">
                  <p className="text-xs text-gray-400 mb-1.5">Все месяцы</p>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {[...monthlyStats].reverse().map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 capitalize truncate max-w-[120px]">{m.label}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">{m.count} дог.</span>
                          <span className="font-medium text-gray-700">{fmt(m.revenue)}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </motion.div>

          {/* Рассрочка */}
          <motion.div variants={cardVariants}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(20,184,166,0.10)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-teal-100 flex items-center justify-center">
                <span className="text-base">💳</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Рассрочка</p>
                <p className="text-xs text-gray-400">Анализ платежей</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="bg-teal-50 rounded-xl px-3.5 py-3">
                <p className="text-xs text-teal-500 font-semibold mb-0.5">Лучшая (медианная)</p>
                <p className="text-2xl font-bold text-teal-700">{fmt(bestInstallment)}</p>
                <p className="text-xs text-teal-400 mt-0.5">в месяц — самая комфортная</p>
              </div>
              <div className="space-y-2 border-t border-gray-50 pt-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Средний платёж</span>
                  <span className="font-medium text-gray-700">{fmt(avgInstallment)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Средняя сумма договора</span>
                  <span className="font-medium text-gray-700">{fmt(avgContractSum)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Средний срок</span>
                  <span className="font-medium text-gray-700">{avgMonths} мес</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-500">Всего договоров</span>
                  <span className="font-medium text-gray-700">{contracts.length}</span>
                </div>
              </div>
              {monthlyStats.length > 0 && (
                <div className="border-t border-gray-50 pt-2">
                  <p className="text-xs text-gray-400 mb-1.5">Ср. платёж по месяцам</p>
                  <div className="space-y-1 max-h-24 overflow-y-auto pr-1">
                    {[...monthlyStats].reverse().slice(0, 5).map((m, i) => (
                      <div key={i} className="flex items-center justify-between text-xs">
                        <span className="text-gray-500 capitalize truncate max-w-[120px]">{m.label}</span>
                        <span className="font-medium text-gray-700">{m.avgInstallment > 0 ? fmt(m.avgInstallment) : '—'}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </motion.div>

          {/* Топ товаров */}
          <motion.div variants={cardVariants}
            className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5"
            whileHover={{ y: -3, boxShadow: '0 8px 24px rgba(59,130,246,0.10)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          >
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center">
                <span className="text-base">🏆</span>
              </div>
              <div>
                <p className="text-xs font-bold text-gray-800 uppercase tracking-wide">Топ товаров</p>
                <p className="text-xs text-gray-400">Что лучше продаётся</p>
              </div>
            </div>
            {topProducts.length === 0 ? (
              <p className="text-xs text-gray-400 text-center py-4">Нет данных</p>
            ) : (
              <div className="space-y-2">
                {topProducts.map((p, i) => {
                  const maxCount = topProducts[0].count;
                  const pct = Math.round((p.count / maxCount) * 100);
                  const colors = ['bg-blue-500', 'bg-indigo-400', 'bg-purple-400', 'bg-teal-400', 'bg-green-400'];
                  const badges = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];
                  return (
                    <div key={p.name} className="group">
                      <div className="flex items-center justify-between mb-0.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm">{badges[i]}</span>
                          <span className="text-xs font-medium text-gray-700 truncate max-w-[120px]">{p.name}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-gray-800">{p.count} раз</span>
                        </div>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: i * 0.1, ease: 'easeOut' }}
                          className={`h-1.5 rounded-full ${colors[i]}`}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-400">
                        <span>Выручка: {fmt(p.revenue)}</span>
                        <span>Ср: {fmt(p.avgCost)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        </motion.div>

          {/* 3D Charts */}
        <motion.div
          variants={containerVariants} initial="hidden" animate="show"
          className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4"
        >
        {/* Income 3D bar */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          whileHover={{ boxShadow: '0 8px 32px rgba(34,197,94,0.10)' }}
          style={{ perspective: 600 }}
        >
          <h2 className="text-base font-bold text-gray-900 mb-1">Динамика доходов</h2>
          <p className="text-xs text-gray-400 mb-4">Поступления по месяцам</p>
          <MountainChart data={monthlyChartData} dataKey="income" color="#22c55e" />
        </motion.div>

        {/* Expenses 3D bar */}
        <motion.div variants={cardVariants}
          className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6"
          whileHover={{ boxShadow: '0 8px 32px rgba(239,68,68,0.10)' }}
          style={{ perspective: 600 }}
        >
          <h2 className="text-base font-bold text-gray-900 mb-1">Динамика расходов</h2>
          <p className="text-xs text-gray-400 mb-4">Списания по месяцам</p>
          <MountainChart data={monthlyChartData} dataKey="expenses" color="#ef4444" />
        </motion.div>
      </motion.div>

      {/* Operations Modal */}
      <AnimatePresence>
        {showOpsModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={() => setShowOpsModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 20 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col"
              onClick={e => e.stopPropagation()}
            >
              <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                <h2 className="font-bold text-gray-900">
                  {showOpsModal === 'income' ? 'Операции — Доходы' : 'Операции — Расходы'}
                </h2>
                <button onClick={() => setShowOpsModal(false)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
              </div>
              <div className="overflow-y-auto flex-1">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-gray-400 text-xs">
                      <th className="text-left px-5 py-3 font-medium">Дата</th>
                      <th className="text-left px-5 py-3 font-medium">Операция</th>
                      <th className="text-left px-5 py-3 font-medium">Примечание</th>
                      <th className="text-right px-5 py-3 font-medium">Сумма</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(showOpsModal === 'income' ? incomeOps : expenseOps).length === 0 ? (
                      <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Нет операций за период</td></tr>
                    ) : (showOpsModal === 'income' ? incomeOps : expenseOps).map(op => (
                      <tr key={op.id} className="border-b border-gray-50 hover:bg-gray-50/50">
                        <td className="px-5 py-3 text-gray-500 whitespace-nowrap">{op.date}</td>
                        <td className="px-5 py-3 text-gray-700">{op.operation}</td>
                        <td className="px-5 py-3 text-gray-500 text-xs max-w-xs truncate">{op.note}</td>
                        <td className="px-5 py-3 text-right font-medium text-gray-900">{fmt(op.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </motion.div>
          </motion.div>
        )}
        </AnimatePresence>
      </>
    </div>
  );
}
