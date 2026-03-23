'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import {
  Plus, Trash2, Users, Layers, Phone,
  Building2, X, TrendingUp, Calendar, Percent, ChevronRight, Wallet
} from 'lucide-react';
import { Investor } from '@/lib/types';

function fmt(n: number) {
  return n.toLocaleString('ru-RU', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + ' ₽';
}

function calcProfit(inv: Investor): {
  perMonth: number;
  total: number;
  orgShare: number;
  label: string;
} {
  const pct = inv.profitPercent ?? 0;
  const months = inv.periodMonths ?? 1;
  const perMonth = inv.invested * pct / 100;
  const total = perMonth * months;
  const label = inv.periodMonths && inv.periodMonths > 1
    ? `за ${inv.periodMonths} мес.`
    : 'в месяц';
  return { perMonth, total, orgShare: inv.invested - total, label };
}

// ─── Partner Card Modal ───────────────────────────────────────────────────────
function PartnerCard({ inv, onClose, onDelete, isViewer }: {
  inv: Investor;
  onClose: () => void;
  onDelete: () => void;
  isViewer: boolean;
}) {
  const { perMonth, total, label } = useMemo(() => calcProfit(inv), [inv]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-lg"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-gray-100">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{inv.name}</h2>
            {inv.phone && (
              <span className="flex items-center gap-1.5 text-sm text-gray-500 mt-1">
                <Phone size={13} /> {inv.phone}
              </span>
            )}
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4">
          {/* Account */}
          {inv.accountName && (
            <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3">
              <span className="flex items-center gap-2 text-sm text-gray-600">
                <Building2 size={15} className="text-indigo-400" /> Счёт
              </span>
              <span className="font-medium text-gray-900 text-sm flex items-center gap-1.5">
                {inv.accountName}
                {inv.accountType && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${inv.accountType === 'нал' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {inv.accountType === 'нал' ? 'нал.' : 'безнал.'}
                  </span>
                )}
              </span>
            </div>
          )}

          {/* Invested */}
          <div className="flex items-center justify-between bg-indigo-50 rounded-xl px-4 py-3">
            <span className="flex items-center gap-2 text-sm text-indigo-700">
              <Wallet size={15} /> Сумма вложений
            </span>
            <span className="font-bold text-indigo-700 text-base">{fmt(inv.invested)}</span>
          </div>

          {/* Percent & period */}
          {(inv.profitPercent !== undefined || inv.periodMonths !== undefined) && (
            <div className="grid grid-cols-2 gap-3">
              {inv.profitPercent !== undefined && (
                <div className="bg-emerald-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 mb-1">
                    <Percent size={12} /> Процент
                  </div>
                  <div className="font-bold text-emerald-700 text-lg">{inv.profitPercent}%</div>
                  <div className="text-xs text-emerald-500">{label}</div>
                </div>
              )}
              {inv.periodMonths !== undefined && (
                <div className="bg-amber-50 rounded-xl px-4 py-3">
                  <div className="flex items-center gap-1.5 text-xs text-amber-600 mb-1">
                    <Calendar size={12} /> Период
                  </div>
                  <div className="font-bold text-amber-700 text-lg">{inv.periodMonths} мес.</div>
                  <div className="text-xs text-amber-500">срок действия</div>
                </div>
              )}
            </div>
          )}

          {/* Profit breakdown */}
          {inv.profitPercent !== undefined && inv.profitPercent > 0 && (
            <div className="border border-gray-100 rounded-xl overflow-hidden">
              <div className="bg-gray-50 px-4 py-2.5 flex items-center gap-2 text-xs font-semibold text-gray-500 uppercase tracking-wide">
                <TrendingUp size={12} /> Расчёт прибыли
              </div>
              <div className="divide-y divide-gray-50">
                <div className="flex justify-between items-center px-4 py-3">
                  <span className="text-sm text-gray-600">Прибыль в месяц</span>
                  <span className="font-semibold text-gray-900 text-sm">{fmt(perMonth)}</span>
                </div>
                {inv.periodMonths && inv.periodMonths > 1 && (
                  <div className="flex justify-between items-center px-4 py-3">
                    <span className="text-sm text-gray-600">Прибыль за {inv.periodMonths} мес.</span>
                    <span className="font-bold text-green-700 text-sm">{fmt(total)}</span>
                  </div>
                )}
                <div className="flex justify-between items-center px-4 py-3 bg-green-50">
                  <span className="text-sm font-semibold text-green-700">
                    Итого партнёр получит
                  </span>
                  <span className="font-bold text-green-700 text-base">
                    {fmt(inv.invested + (inv.periodMonths && inv.periodMonths > 1 ? total : perMonth))}
                  </span>
                </div>
                <div className="flex justify-between items-center px-4 py-3 bg-indigo-50">
                  <span className="text-sm font-semibold text-indigo-700">Остаток организации</span>
                  <span className="font-bold text-indigo-700 text-base">
                    {fmt(inv.invested - (inv.periodMonths && inv.periodMonths > 1 ? total : perMonth))}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        {!isViewer && (
          <div className="px-6 pb-6">
            <button
              onClick={() => { onDelete(); onClose(); }}
              className="w-full flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 rounded-xl py-2.5 text-sm font-medium transition border border-red-100"
            >
              <Trash2 size={15} /> Удалить партнёра
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function InvestmentsPage() {
  const { investors, investPools, accounts, addInvestor, deleteInvestor, currentUser } = useApp();
  const isViewer = currentUser?.role === 'viewer';

  if (isViewer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Доступ ограничен</h2>
        <p className="text-gray-500">У вас нет доступа к разделу «Инвестиции».<br/>Обратитесь к администратору.</p>
      </div>
    );
  }

  const [tab, setTab] = useState<'investors' | 'pools'>('investors');
  const [search, setSearch] = useState('');
  const [selectedInv, setSelectedInv] = useState<Investor | null>(null);

  // Add modal
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newInvested, setNewInvested] = useState('');
  const [newAccountId, setNewAccountId] = useState('');
  const [newPercent, setNewPercent] = useState('');
  const [newPeriodMonths, setNewPeriodMonths] = useState('');

  const filtered = investors.filter(i =>
    i.name.toLowerCase().includes(search.toLowerCase()) ||
    (i.phone ?? '').includes(search)
  );

  function resetForm() {
    setNewName(''); setNewPhone(''); setNewInvested('');
    setNewAccountId('');
    setNewPercent(''); setNewPeriodMonths('');
  }

  function handleAdd() {
    if (!newName.trim() || !newInvested) return;
    const amt = parseFloat(newInvested.replace(/\s/g, '').replace(',', '.')) || 0;
    if (amt <= 0) return;
    const pct = newPercent ? parseFloat(newPercent) : undefined;
    const months = newPeriodMonths ? parseInt(newPeriodMonths) : undefined;
    const selectedAccount = accounts.find(a => a.id === newAccountId);

    const perMonth = pct ? amt * pct / 100 : 0;
    const total = pct && months ? perMonth * months : perMonth;

    addInvestor({
      id: String(Date.now()),
      name: newName.trim(),
      phone: newPhone.trim() || undefined,
      invested: amt,
      available: 0,
      orgProfit: amt - total,
      investorProfit: total,
      accountId: selectedAccount?.id,
      accountName: selectedAccount?.name,
      accountType: selectedAccount?.type,
      profitPercent: pct,
      periodMonths: months,
      periodLabel: months && months > 1 ? `за ${months} мес.` : 'в месяц',
    }, amt);
    resetForm();
    setShowAdd(false);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Управление инвесторами</h1>
          <p className="text-sm text-gray-500 mt-1">Ищите, просматривайте и управляйте партнёрами и пулами</p>
        </div>
        {!isViewer && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 text-sm text-indigo-600 border border-indigo-200 rounded-lg px-4 py-2 hover:bg-indigo-50 transition font-medium"
          >
            <Plus size={15} /> Добавить партнёра
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        <button
          onClick={() => setTab('investors')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === 'investors' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Users size={15} /> Партнёры / Инвесторы
        </button>
        <button
          onClick={() => setTab('pools')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${tab === 'pools' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          <Layers size={15} /> Инвест. пулы
        </button>
      </div>

      {tab === 'investors' && (
        <>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по имени или телефону..."
            className="border border-gray-200 rounded-lg px-4 py-2.5 text-sm w-full sm:w-80 mb-5 focus:outline-none focus:ring-2 focus:ring-indigo-400"
          />
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-gray-500 text-xs">
                  <th className="text-left px-5 py-3 font-medium">Имя</th>
                  <th className="text-left px-5 py-3 font-medium">Телефон</th>
                  <th className="text-left px-5 py-3 font-medium">Счёт</th>
                  <th className="text-right px-5 py-3 font-medium">Вложено</th>
                  <th className="text-right px-5 py-3 font-medium">% / Период</th>
                  <th className="text-right px-5 py-3 font-medium">Прибыль партнёра</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr><td colSpan={7} className="px-5 py-10 text-center text-gray-400">Нет партнёров / инвесторов</td></tr>
                ) : filtered.map(inv => {
                  const { perMonth, total } = calcProfit(inv);
                  const profit = inv.periodMonths && inv.periodMonths > 1 ? total : perMonth;
                  return (
                    <tr
                      key={inv.id}
                      className="border-b border-gray-50 hover:bg-indigo-50/30 transition cursor-pointer"
                      onClick={() => setSelectedInv(inv)}
                    >
                      <td className="px-5 py-4 font-medium text-gray-900">{inv.name}</td>
                      <td className="px-5 py-4 text-gray-500">
                        {inv.phone
                          ? <span className="flex items-center gap-1"><Phone size={12} className="text-gray-400" />{inv.phone}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-gray-700">
                        {inv.accountName
                          ? <span className="flex items-center gap-1.5"><Building2 size={12} className="text-indigo-400" />{inv.accountName}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right font-semibold text-gray-900">{fmt(inv.invested)}</td>
                      <td className="px-5 py-4 text-right">
                        {inv.profitPercent !== undefined ? (
                          <div className="flex flex-col items-end gap-0.5">
                            <span className="font-semibold text-emerald-700">{inv.profitPercent}%</span>
                            <span className="text-xs text-gray-400">
                              {inv.periodMonths && inv.periodMonths > 1 ? `за ${inv.periodMonths} мес.` : 'в месяц'}
                            </span>
                          </div>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        {inv.profitPercent !== undefined && inv.profitPercent > 0
                          ? <span className="font-bold text-green-600">{fmt(profit)}</span>
                          : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <ChevronRight size={16} className="text-gray-300 ml-auto" />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'pools' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-gray-500 text-xs">
                <th className="text-left px-5 py-3 font-medium">Название</th>
                <th className="text-right px-5 py-3 font-medium">Общая сумма</th>
                <th className="text-right px-5 py-3 font-medium">Доступно</th>
                <th className="text-left px-5 py-3 font-medium">Инвесторы</th>
              </tr>
            </thead>
            <tbody>
              {investPools.length === 0 ? (
                <tr><td colSpan={4} className="px-5 py-10 text-center text-gray-400">Нет пулов</td></tr>
              ) : investPools.map(pool => (
                <tr key={pool.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                  <td className="px-5 py-4 font-medium text-gray-900">{pool.name}</td>
                  <td className="px-5 py-4 text-right text-gray-700">{fmt(pool.totalAmount)}</td>
                  <td className="px-5 py-4 text-right text-indigo-600 font-medium">{fmt(pool.available)}</td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-1">
                      {pool.investors.map(inv => (
                        <span key={inv} className="text-xs bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-2 py-0.5">{inv}</span>
                      ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add partner modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => { resetForm(); setShowAdd(false); }}>
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-bold text-gray-900 text-lg">Добавить партнёра</h2>
              <button onClick={() => { resetForm(); setShowAdd(false); }} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center">
                <X size={16} />
              </button>
            </div>

            {/* Name */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">ФИО <span className="text-red-400">*</span></label>
              <input
                autoFocus
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Введите полное имя"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Phone */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">Телефон</label>
              <div className="relative">
                <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="tel"
                  value={newPhone}
                  onChange={e => setNewPhone(e.target.value)}
                  placeholder="+7 (___) ___-__-__"
                  className="w-full border border-gray-200 rounded-lg pl-9 pr-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Amount */}
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5 font-medium">Сумма вложений (₽) <span className="text-red-400">*</span></label>
              <input
                type="number"
                min="0"
                value={newInvested}
                onChange={e => setNewInvested(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
            </div>

            {/* Percent + period */}
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="block text-sm text-gray-600 mb-1.5 font-medium flex items-center gap-1">
                  <Percent size={13} className="text-emerald-500" /> Процент (%)
                </label>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={newPercent}
                  onChange={e => setNewPercent(e.target.value)}
                  placeholder="напр. 5"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-600 mb-1.5 font-medium flex items-center gap-1">
                  <Calendar size={13} className="text-amber-500" /> Период (мес.)
                </label>
                <input
                  type="number"
                  min="1"
                  value={newPeriodMonths}
                  onChange={e => setNewPeriodMonths(e.target.value)}
                  placeholder="1 = в месяц"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
              </div>
            </div>

            {/* Live preview */}
            {newPercent && newInvested && parseFloat(newInvested) > 0 && (
              <div className="mb-4 bg-emerald-50 border border-emerald-100 rounded-xl p-4 text-sm">
                <div className="text-emerald-700 font-semibold mb-2 flex items-center gap-1.5">
                  <TrendingUp size={14} /> Предварительный расчёт
                </div>
                {(() => {
                  const amt = parseFloat(newInvested) || 0;
                  const pct = parseFloat(newPercent) || 0;
                  const months = parseInt(newPeriodMonths) || 1;
                  const perMonth = amt * pct / 100;
                  const total = perMonth * months;
                  return (
                    <div className="space-y-1 text-emerald-800">
                      <div className="flex justify-between">
                        <span>Прибыль в месяц:</span>
                        <span className="font-semibold">{fmt(perMonth)}</span>
                      </div>
                      {months > 1 && (
                        <div className="flex justify-between">
                          <span>За {months} мес.:</span>
                          <span className="font-bold">{fmt(total)}</span>
                        </div>
                      )}
                      <div className="flex justify-between border-t border-emerald-200 pt-1 mt-1">
                        <span>Партнёр получит итого:</span>
                        <span className="font-bold">{fmt(amt + (months > 1 ? total : perMonth))}</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}

              {/* Account */}
              <div className="mb-6">
                <label className="block text-sm text-gray-600 mb-1.5 font-medium">
                  Счёт <span className="text-gray-400 font-normal">(необязательно)</span>
                </label>
                {accounts.length === 0 ? (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-700">
                    Нет счетов. Создайте счёт в разделе <strong>Баланс → Счета</strong>.
                  </div>
                ) : (
                  <>
                    <select
                      value={newAccountId}
                      onChange={e => setNewAccountId(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
                    >
                      <option value="">— Без счёта —</option>
                      {accounts.map(acc => (
                        <option key={acc.id} value={acc.id}>
                          {acc.name} · {acc.type === 'нал' ? 'нал.' : 'безнал.'} · {acc.balance.toLocaleString('ru-RU')} ₽
                        </option>
                      ))}
                    </select>
                    {newAccountId && (
                      <p className="text-xs text-indigo-600 mt-1.5 flex items-center gap-1">
                        <Building2 size={12} /> Сумма вложений будет добавлена к балансу этого счёта
                      </p>
                    )}
                  </>
                )}
              </div>

            <div className="flex gap-3">
              <button
                onClick={() => { resetForm(); setShowAdd(false); }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm hover:bg-gray-50 transition"
              >
                Отмена
              </button>
              <button
                  onClick={handleAdd}
                  disabled={!newName.trim() || !newInvested || parseFloat(newInvested) <= 0}
                  className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
                >
                Добавить
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Partner card modal */}
      {selectedInv && (
        <PartnerCard
          inv={selectedInv}
          onClose={() => setSelectedInv(null)}
          onDelete={() => { deleteInvestor(selectedInv.id); setSelectedInv(null); }}
          isViewer={isViewer}
        />
      )}
    </div>
  );
}
