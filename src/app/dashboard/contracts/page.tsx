'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Contract, ContractStatus } from '@/lib/types';
import { MessageCircle, Trash2, ChevronDown, ChevronUp, AlignJustify, FileText, FileSpreadsheet } from 'lucide-react';
import Link from 'next/link';
import { downloadContractPdf, downloadContractExcel } from '@/lib/contractPdf';

const STATUS_COLORS: Record<string, string> = {
  'Погашен': 'text-green-500',
  'Досрочно погашен': 'text-green-500',
  'В процессе': 'text-blue-500',
  'Просрочен': 'text-red-500',
  'Списан': 'text-red-400',
  'На проверке': 'text-yellow-500',
};

const STATUSES: ContractStatus[] = ['В процессе', 'Погашен', 'Досрочно погашен', 'Просрочен', 'Списан', 'На проверке'];
const PAYMENT_STATUSES = ['Погашен', 'Не оплачено', 'Оплачено', 'Новый договор'];
const SOURCES = ['Баланс', 'Инвестиции'];

type Column = { key: string; label: string; visible: boolean };

const DEFAULT_COLUMNS: Column[] = [
  { key: 'number', label: '#', visible: true },
  { key: 'createdAt', label: 'Дата создания', visible: true },
  { key: 'endDate', label: 'Дата окончания', visible: true },
  { key: 'clientName', label: 'ФИО', visible: true },
  { key: 'product', label: 'Продукт', visible: true },
  { key: 'phone', label: 'Номер (WhatsApp)', visible: true },
  { key: 'status', label: 'Статус', visible: true },
  { key: 'remainingDebt', label: 'Остаток долга', visible: true },
  { key: 'monthlyPayment', label: 'Ежемесячная оплата', visible: true },
  { key: 'paymentStatus', label: 'Статус платежа', visible: true },
];

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '.' + digits.slice(2);
  return digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
}

function parseRuDate(s: string): Date | null {
  const parts = s.split('.');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function getOverdueDays(endDate: string): number {
  const end = parseRuDate(endDate);
  if (!end) return 0;
  const now = new Date();
  const diff = now.getTime() - end.getTime();
  return diff > 0 ? Math.floor(diff / (1000 * 60 * 60 * 24)) : 0;
}

function LabeledSelect({
  label, value, options, onChange,
}: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);
  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(v => !v)}
        className="flex items-center gap-1.5 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white hover:bg-gray-50 whitespace-nowrap"
      >
        <span className="text-gray-500">{label}:</span>
        <span className="font-medium text-gray-800">{value}</span>
        <ChevronDown size={14} className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-full left-0">
          <button onClick={() => { onChange('Все'); setOpen(false); }}
            className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === 'Все' ? 'text-[#5B5BD6] font-medium' : 'text-gray-700'}`}>
            Все
          </button>
          {options.map(o => (
            <button key={o} onClick={() => { onChange(o); setOpen(false); }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${value === o ? 'text-[#5B5BD6] font-medium' : 'text-gray-700'}`}>
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ContractsPage() {
  const { contracts, deleteContract, updateContract, currentUser, clients, depositAccount, addAuditEntry } = useApp();
  const isViewer = currentUser?.role === 'viewer';
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('Все');
  const [paymentFilter, setPaymentFilter] = useState('Все');
  const [sourceFilter, setSourceFilter] = useState('Все');
  const [showColumns, setShowColumns] = useState(false);
  const [columns, setColumns] = useState<Column[]>(DEFAULT_COLUMNS);
  const [sortKey, setSortKey] = useState<string>('createdAt');
  const [sortAsc, setSortAsc] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const colRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function h(e: MouseEvent) { if (colRef.current && !colRef.current.contains(e.target as Node)) setShowColumns(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const toggleColumn = (key: string) => setColumns(prev => prev.map(c => c.key === key ? { ...c, visible: !c.visible } : c));
  const handleSort = (key: string) => { if (sortKey === key) setSortAsc(a => !a); else { setSortKey(key); setSortAsc(true); } };

  const filtered = useMemo(() => {
    let result = contracts;
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(c =>
        c.clientName.toLowerCase().includes(q) || String(c.number).includes(q) ||
        c.product.toLowerCase().includes(q) || c.phone.includes(q)
      );
    }
    if (statusFilter !== 'Все') result = result.filter(c => c.status === statusFilter);
    if (paymentFilter !== 'Все') result = result.filter(c => c.paymentStatus === paymentFilter);
    if (sourceFilter !== 'Все') result = result.filter(c => c.source === sourceFilter);
    if (dateFrom) { const f = parseRuDate(dateFrom); if (f) result = result.filter(c => { const d = parseRuDate(c.createdAt); return d && d >= f; }); }
    if (dateTo) { const t = parseRuDate(dateTo); if (t) result = result.filter(c => { const d = parseRuDate(c.createdAt); return d && d <= t; }); }
    return [...result].sort((a, b) => {
        const av = (a as unknown as Record<string, unknown>)[sortKey] as string | number ?? '';
        const bv = (b as unknown as Record<string, unknown>)[sortKey] as string | number ?? '';
      if (typeof av === 'string' && typeof bv === 'string') return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av);
      return sortAsc ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
  }, [contracts, search, statusFilter, paymentFilter, sourceFilter, sortKey, sortAsc, dateFrom, dateTo]);

  const visibleCols = columns.filter(c => c.visible);

  const getPaymentStatusColor = (s: string) => {
    if (s === 'Погашен') return 'text-green-500';
    if (s === 'Не оплачено') return 'text-gray-500';
    return 'text-gray-700';
  };

  const handlePay = (c: Contract) => {
    const payment = c.monthlyPayment;
    const newDebt = Math.max(0, c.remainingDebt - payment);
    const isPaid = newDebt === 0;
    updateContract(c.id, {
      paymentStatus: 'Оплачено',
      remainingDebt: newDebt,
      ...(isPaid ? { status: 'Погашен' } : {}),
    });
    // Add payment to account balance + ledger
    depositAccount('cash', payment, `Платеж по договору ${c.clientName} (#${c.number}) · ${c.product}`);
    addAuditEntry({
      action: 'Создание',
      section: 'Платежи',
      entity: `Платёж ${payment.toLocaleString('ru-RU')} ₽`,
      details: `Договор #${c.number} (${c.clientName}) · ${c.product}`,
    });
  };

  const renderStatus = (c: Contract) => {
    if (c.status === 'Просрочен') {
      const days = getOverdueDays(c.endDate);
      return <span className="text-red-500 font-medium">{days > 0 ? `Просрочен на ${days} день` : 'Просрочен'}</span>;
    }
    return <span className={`font-medium ${STATUS_COLORS[c.status] || 'text-gray-700'}`}>{c.status}</span>;
  };

  const today = new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' });

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление договорами</h1>
        <p className="text-sm text-gray-500 mt-1">Фильтруйте, просматривайте и управляйте договорами</p>
      </div>

      <div className="mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Поиск по ФИО, номеру или товару"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
      </div>

      <div className="flex flex-wrap gap-3 mb-4 items-center">
        <div className="relative" ref={colRef}>
          <button onClick={() => setShowColumns(v => !v)}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white hover:bg-gray-50">
            <AlignJustify size={14} /> Колонки <ChevronDown size={14} />
          </button>
          {showColumns && (
            <div className="absolute z-20 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg p-3 min-w-[200px]">
              {columns.map(col => (
                <label key={col.key} className="flex items-center gap-2 py-1 cursor-pointer text-sm">
                  <input type="checkbox" checked={col.visible} onChange={() => toggleColumn(col.key)} />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <span className="text-sm text-gray-600">С</span>
        <input type="text" placeholder={today} value={dateFrom} onChange={e => setDateFrom(formatDateInput(e.target.value))} maxLength={10}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 outline-none focus:border-[#5B5BD6] text-gray-500 placeholder:text-gray-300" />
        <span className="text-sm text-gray-600">До</span>
        <input type="text" placeholder={today} value={dateTo} onChange={e => setDateTo(formatDateInput(e.target.value))} maxLength={10}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-32 outline-none focus:border-[#5B5BD6] text-gray-500 placeholder:text-gray-300" />

        <LabeledSelect label="Статусы" value={statusFilter} options={STATUSES} onChange={setStatusFilter} />
        <LabeledSelect label="Платеж" value={paymentFilter} options={PAYMENT_STATUSES} onChange={setPaymentFilter} />
        <LabeledSelect label="Источники" value={sourceFilter} options={SOURCES} onChange={setSourceFilter} />
      </div>



      <p className="text-sm text-gray-500 mb-3">Показано {filtered.length} из {contracts.length} записей</p>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {visibleCols.map(col => (
                <th key={col.key} onClick={() => handleSort(col.key)}
                  className="text-left px-4 py-3 text-gray-600 font-medium cursor-pointer select-none whitespace-nowrap hover:text-gray-900">
                  <span className="flex items-center gap-1">
                    {col.label}
                    {sortKey === col.key ? (sortAsc ? <ChevronUp size={12} /> : <ChevronDown size={12} />) : null}
                  </span>
                </th>
              ))}
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                {visibleCols.map(col => (
                  <td key={col.key} className="px-4 py-3 whitespace-nowrap">
                    {col.key === 'number' && <span className="text-gray-700">{c.number}</span>}
                    {col.key === 'createdAt' && <span className="text-gray-700">{c.createdAt}</span>}
                    {col.key === 'endDate' && <span className="text-gray-700">{c.endDate}</span>}
                    {col.key === 'clientName' && <Link href="/dashboard/clients" className="text-[#5B5BD6] hover:underline">{c.clientName}</Link>}
                    {col.key === 'product' && <span className="text-gray-700">{c.product}</span>}
                    {col.key === 'phone' && <span className="text-gray-700">{c.phone}</span>}
                    {col.key === 'status' && renderStatus(c)}
                    {col.key === 'remainingDebt' && <span className="text-gray-700">{c.remainingDebt.toLocaleString('ru-RU')}</span>}
                    {col.key === 'monthlyPayment' && <span className="text-gray-700">{c.monthlyPayment.toLocaleString('ru-RU')}</span>}
                    {col.key === 'paymentStatus' && <span className={getPaymentStatusColor(c.paymentStatus)}>{c.paymentStatus}</span>}
                  </td>
                ))}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      {!isViewer && (c.status === 'Просрочен' || c.status === 'В процессе') && (
                        <button onClick={() => handlePay(c)}
                          className={`border rounded-lg px-3 py-1 text-xs font-medium transition ${
                            c.status === 'Просрочен' ? 'border-red-300 text-red-500 hover:bg-red-50' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                          }`}>
                          Оплатить
                        </button>
                      )}
                      <button onClick={() => { const msg = encodeURIComponent(`Договор №${c.number} — ${c.clientName}\nПродукт: ${c.product}\nОстаток: ${c.remainingDebt.toLocaleString('ru-RU')} ₽`); window.open(`https://wa.me/${c.phone.replace(/\D/g,'')}?text=${msg}`, '_blank'); }}
                        className="text-gray-400 hover:text-green-500 transition">
                        <MessageCircle size={16} />
                      </button>
                        <button
                          title="Скачать PDF"
                          onClick={async () => {
                            const client = clients.find(cl => cl.id === c.clientId);
                            await downloadContractPdf(c, client);
                          }}
                          className="text-gray-400 hover:text-red-500 transition">
                          <FileText size={16} />
                        </button>
                        <button
                          title="Скачать Excel"
                          onClick={() => {
                            const client = clients.find(cl => cl.id === c.clientId);
                            downloadContractExcel(c, client);
                          }}
                          className="text-gray-400 hover:text-green-600 transition">
                          <FileSpreadsheet size={16} />
                        </button>
                      {!isViewer && (
                        <button onClick={() => setDeleteId(c.id)}
                          className="text-gray-400 hover:text-red-500 transition">
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={visibleCols.length + 1} className="px-4 py-8 text-center text-gray-400">Нет договоров</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Удалить договор?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Это действие нельзя отменить. Договор будет удалён навсегда.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Отмена
              </button>
              <button onClick={() => { deleteContract(deleteId); setDeleteId(null); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
