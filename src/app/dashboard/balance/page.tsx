'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { Wallet, CreditCard, Plus, Minus, ArrowRightLeft, BookOpen, BarChart2, ChevronDown, RotateCcw, Download, HelpCircle, Trash2, X } from 'lucide-react';

function fmt(n: number) {
  return n.toLocaleString('ru-RU') + ' ₽';
}

function todayStr() {
  const d = new Date();
  return `${String(d.getDate()).padStart(2,'0')}.${String(d.getMonth()+1).padStart(2,'0')}.${d.getFullYear()}`;
}

const OPERATION_TYPES = ['Все типы', 'Пополнение', 'Списание', 'Перевод между счетами', 'Платёж клиента', 'Новый договор'];

export default function BalancePage() {
  const { accounts, ledger, depositAccount, withdrawAccount, transferBetweenAccounts, addAccount, deleteAccount, currentUser } = useApp();
  const isViewer = currentUser?.role === 'viewer';
  const [tab, setTab] = useState<'accounts' | 'operations' | 'ledger'>('accounts');

  // Add account modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newName, setNewName] = useState('');
  const [newType, setNewType] = useState<'нал' | 'безнал'>('нал');
  const [newBalance, setNewBalance] = useState('');
  const [addError, setAddError] = useState('');

  function handleAddAccount() {
    setAddError('');
    if (!newName.trim()) { setAddError('Введите название счёта'); return; }
    addAccount({
      id: String(Date.now()),
      name: newName.trim(),
      type: newType,
      balance: parseInt(newBalance) || 0,
      orgBalance: 0,
      investorsBalance: 0,
      investPoolBalance: 0,
    });
    setNewName(''); setNewType('нал'); setNewBalance('');
    setShowAddModal(false);
  }

  // Accounts tab state
  const totalBalance = accounts.reduce((s, a) => s + a.balance, 0);
  const cashAccount = accounts.find(a => a.type === 'нал');
  const bankAccount = accounts.find(a => a.type === 'безнал');

  // Operations tab state
  const [depAccountId, setDepAccountId] = useState(accounts[0]?.id ?? '');
  const [depAmount, setDepAmount] = useState('');
  const [depNote, setDepNote] = useState('');
  const [depMsg, setDepMsg] = useState('');

  const [wdAccountId, setWdAccountId] = useState(accounts[0]?.id ?? '');
  const [wdAmount, setWdAmount] = useState('');
  const [wdNote, setWdNote] = useState('');
  const [wdOperational, setWdOperational] = useState(false);
  const [wdMsg, setWdMsg] = useState('');

  const [trFromId, setTrFromId] = useState(accounts[0]?.id ?? '');
  const [trToId, setTrToId] = useState(accounts[1]?.id ?? accounts[0]?.id ?? '');
  const [trAmount, setTrAmount] = useState('');
  const [trComment, setTrComment] = useState('');
  const [trMsg, setTrMsg] = useState('');

  // Ledger tab state
  const [ledgerAccountId, setLedgerAccountId] = useState('all');
  const [ledgerFromDate, setLedgerFromDate] = useState('');
  const [ledgerToDate, setLedgerToDate] = useState('');
  const [ledgerUser, setLedgerUser] = useState('Все пользователи');
  const [ledgerOpType, setLedgerOpType] = useState('Все типы');

  const ledgerAccount = ledgerAccountId === 'all' ? null : accounts.find(a => a.id === ledgerAccountId);
  const ledgerBalance = ledgerAccount ? ledgerAccount.balance : totalBalance;

  const filteredLedger = useMemo(() => {
    return ledger.filter(e => {
      if (ledgerAccountId !== 'all' && e.accountId !== ledgerAccountId) return false;
      if (ledgerOpType !== 'Все типы' && e.operation !== ledgerOpType) return false;
      return true;
    });
  }, [ledger, ledgerAccountId, ledgerOpType]);

  function handleDeposit() {
    setDepMsg('');
    const amt = parseInt(depAmount, 10);
    if (!amt || amt <= 0) { setDepMsg('Введите корректную сумму'); return; }
    depositAccount(depAccountId, amt, depNote);
    setDepAmount(''); setDepNote('');
    setDepMsg('Счёт пополнен на ' + fmt(amt));
    setTimeout(() => setDepMsg(''), 2500);
  }

  function handleWithdraw() {
    setWdMsg('');
    const amt = parseInt(wdAmount, 10);
    if (!amt || amt <= 0) { setWdMsg('Введите корректную сумму'); return; }
    const ok = withdrawAccount(wdAccountId, amt, wdNote, wdOperational);
    if (!ok) { setWdMsg('Недостаточно средств'); return; }
    setWdAmount(''); setWdNote('');
    setWdMsg('Списано ' + fmt(amt));
    setTimeout(() => setWdMsg(''), 2500);
  }

  function handleTransfer() {
    setTrMsg('');
    const amt = parseInt(trAmount, 10);
    if (!amt || amt <= 0) { setTrMsg('Введите корректную сумму'); return; }
    if (trFromId === trToId) { setTrMsg('Нельзя переводить на тот же счёт'); return; }
    const ok = transferBetweenAccounts(trFromId, trToId, amt, trComment);
    if (!ok) { setTrMsg('Недостаточно средств'); return; }
    setTrAmount(''); setTrComment('');
    setTrMsg('Перевод выполнен');
    setTimeout(() => setTrMsg(''), 2500);
  }

  return (
    <div className="p-8 max-w-7xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Баланс</h1>
        <p className="text-gray-500 text-sm mt-1">Управление счетами и история операций</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-200 mb-6 gap-1">
        {([
          { key: 'accounts', label: 'Счета', icon: <Wallet size={16} /> },
          { key: 'operations', label: 'Операции', icon: <BarChart2 size={16} /> },
          { key: 'ledger', label: 'Бух. книга', icon: <BookOpen size={16} /> },
        ] as const).map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition -mb-px ${
              tab === t.key
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.icon}{t.label}
          </button>
        ))}
      </div>

      {/* === СЧЕТА TAB === */}
      {tab === 'accounts' && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-sm text-gray-500">
              {new Date().toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            {!isViewer && (
              <button
                onClick={() => setShowAddModal(true)}
                className="flex items-center gap-1.5 text-sm text-indigo-600 border border-indigo-200 rounded-lg px-3 py-1.5 hover:bg-indigo-50 transition"
              >
                <Plus size={14} /> Добавить счёт
              </button>
            )}
          </div>

            {/* Top cards */}
            <div className="grid grid-cols-3 gap-4 mb-6">
              <div className="bg-indigo-600 rounded-2xl p-6 text-white relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-400/40">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-indigo-200 text-sm">Общий капитал</p>
                  <div className="w-9 h-9 rounded-full bg-white/20 flex items-center justify-center">
                    <ArrowRightLeft size={16} className="text-white" />
                  </div>
                </div>
                <p className="text-3xl font-bold">{fmt(totalBalance)}</p>
                <div className="absolute -bottom-6 -right-6 w-32 h-32 rounded-full bg-white/10" />
                <div className="absolute -bottom-10 -right-10 w-44 h-44 rounded-full bg-white/5" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-200/60">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-500 text-sm">Наличные средства</p>
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
                    <Wallet size={16} className="text-indigo-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-indigo-600">{fmt(cashAccount?.balance ?? 0)}</p>
                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-indigo-50/50" />
              </div>
              <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-sm relative overflow-hidden cursor-pointer transition-all duration-300 ease-out hover:-translate-y-2 hover:scale-[1.03] hover:shadow-2xl hover:shadow-indigo-200/60">
                <div className="flex items-center justify-between mb-4">
                  <p className="text-gray-500 text-sm">Средства в банке</p>
                  <div className="w-9 h-9 rounded-full bg-indigo-50 flex items-center justify-center">
                    <CreditCard size={16} className="text-indigo-600" />
                  </div>
                </div>
                <p className="text-3xl font-bold text-indigo-600">{fmt(bankAccount?.balance ?? 0)}</p>
                <div className="absolute -bottom-8 -right-8 w-32 h-32 rounded-full bg-indigo-50/50" />
              </div>
            </div>

          {/* Account list + right panel */}
          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-2">
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
                <h2 className="font-semibold text-gray-800 mb-5">Счета</h2>
                <div className="space-y-4">
                  {accounts.map(acc => (
                    <div key={acc.id} className="border border-gray-100 rounded-xl p-5">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          {acc.type === 'нал'
                            ? <Wallet size={15} className="text-gray-400" />
                            : <CreditCard size={15} className="text-gray-400" />
                          }
                          <span className="text-xs text-gray-400">{acc.type === 'нал' ? 'Наличные' : 'Безналичные'}</span>
                        </div>
                        {!isViewer && (
                          <button
                            onClick={() => deleteAccount(acc.id)}
                            className="text-gray-300 hover:text-red-400 transition p-1 rounded"
                            title="Удалить счёт"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                      <p className="font-bold text-gray-900 mt-1">{acc.name}</p>
                      <p className="text-2xl font-bold text-indigo-600 mb-4 mt-2">{fmt(acc.balance)}</p>
                      <div className="space-y-1.5 text-sm border-t border-gray-50 pt-3">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Организация</span>
                          <span className="text-indigo-600 font-medium">{fmt(acc.orgBalance ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Инвесторы</span>
                          <span className="text-gray-800">{fmt(acc.investorsBalance ?? 0)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Инвест. пулы</span>
                          <span className="text-gray-800">{fmt(acc.investPoolBalance ?? 0)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {accounts.length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-8">Нет счетов. Нажмите «Добавить счёт»</p>
                  )}
                </div>
              </div>
            </div>

            {/* Right panel */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center">
                  <Wallet size={18} className="text-white" />
                </div>
              </div>
              <p className="font-semibold text-gray-800">Операционные расходы</p>
              <p className="text-xs text-gray-400 mb-4">Март 2026</p>
              <div className="h-24 flex items-end gap-1 mb-3">
                {[2,3,2,4,3,5,4,6,5,7,6,5,8,7,6,9,8,7,6,5,4,5,6,7,8,7,6,5,4,3].map((v, i) => (
                  <div key={i} className="flex-1 bg-indigo-100 rounded-sm" style={{ height: `${v * 8}px` }} />
                ))}
              </div>
              <div className="flex justify-between text-xs text-gray-400 mb-4">
                <span>февр. 2026</span><span>март 2026</span>
              </div>
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">ИТОГО</p>
                <p className="text-xl font-bold text-gray-900">0 ₽</p>
                <p className="text-xs text-gray-400 mt-3 uppercase tracking-wide">ДЕТАЛИЗАЦИЯ</p>
                <p className="text-xs text-gray-400 mt-1">Нет операционных расходов</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === ОПЕРАЦИИ TAB === */}
      {tab === 'operations' && isViewer && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center text-yellow-700">
          <p className="font-medium">Только просмотр</p>
          <p className="text-sm mt-1">Операции доступны только администратору.</p>
        </div>
      )}
      {tab === 'operations' && !isViewer && (
        <div className="grid grid-cols-3 gap-5">
          {/* Пополнение */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Пополнение счета</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Счет</label>
              <div className="relative">
                <select value={depAccountId} onChange={e => setDepAccountId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Сумма</label>
              <div className="flex">
                <input type="number" min="1" value={depAmount} onChange={e => setDepAmount(e.target.value)} placeholder="0" className="flex-1 border border-gray-200 border-r-0 rounded-l-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <span className="border border-gray-200 border-l-0 rounded-r-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">₽</span>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm text-gray-600 mb-1.5">Назначение</label>
              <textarea value={depNote} onChange={e => setDepNote(e.target.value)} placeholder="Например: Пополнение оборотных средств" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            {depMsg && <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${depMsg.includes('корр') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{depMsg}</p>}
            <button onClick={handleDeposit} className="w-full flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600 rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-50 transition">
              <Plus size={15} /> Пополнить
            </button>
          </div>

          {/* Списание */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Списание счета</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Счет</label>
              <div className="relative">
                <select value={wdAccountId} onChange={e => setWdAccountId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Сумма</label>
              <div className="flex">
                <input type="number" min="1" value={wdAmount} onChange={e => setWdAmount(e.target.value)} placeholder="0" className="flex-1 border border-gray-200 border-r-0 rounded-l-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <span className="border border-gray-200 border-l-0 rounded-r-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">₽</span>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Назначение</label>
              <textarea value={wdNote} onChange={e => setWdNote(e.target.value)} placeholder="Например: Аренда офиса" rows={3} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 resize-none" />
            </div>
            <div className="flex items-center gap-2 mb-5">
              <button onClick={() => setWdOperational(!wdOperational)} className={`relative w-10 h-5 rounded-full transition ${wdOperational ? 'bg-indigo-600' : 'bg-gray-200'}`}>
                <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${wdOperational ? 'left-5' : 'left-0.5'}`} />
              </button>
              <span className="text-sm text-gray-600">Операционные расходы</span>
              <HelpCircle size={14} className="text-gray-400" />
            </div>
            {wdMsg && <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${wdMsg.includes('Недост') || wdMsg.includes('корр') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{wdMsg}</p>}
            <button onClick={handleWithdraw} className="w-full flex items-center justify-center gap-2 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">
              <Minus size={15} /> Списать
            </button>
          </div>

          {/* Перевод */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
            <h2 className="font-semibold text-gray-800 mb-5">Перевод между счетами</h2>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Со счета</label>
              <div className="relative">
                <select value={trFromId} onChange={e => setTrFromId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">На счет</label>
              <div className="relative">
                <select value={trToId} onChange={e => setTrToId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name} ({fmt(a.balance)})</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Сумма</label>
              <div className="flex">
                <input type="number" min="1" value={trAmount} onChange={e => setTrAmount(e.target.value)} placeholder="0" className="flex-1 border border-gray-200 border-r-0 rounded-l-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
                <span className="border border-gray-200 border-l-0 rounded-r-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">₽</span>
              </div>
            </div>
            <div className="mb-5">
              <label className="block text-sm text-gray-600 mb-1.5">Комментарий</label>
              <input type="text" value={trComment} onChange={e => setTrComment(e.target.value)} placeholder="Необязательно" className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400" />
            </div>
            {trMsg && <p className={`text-xs mb-3 px-3 py-2 rounded-lg ${trMsg.includes('Недост') || trMsg.includes('тот') || trMsg.includes('корр') ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-600'}`}>{trMsg}</p>}
            <button onClick={handleTransfer} className="w-full flex items-center justify-center gap-2 border border-indigo-200 text-indigo-600 rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-50 transition">
              <ArrowRightLeft size={15} /> Перевести
            </button>
          </div>
        </div>
      )}

      {/* === БУХ. КНИГА TAB === */}
      {tab === 'ledger' && (
        <div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <p className="text-sm text-gray-500 mb-2">Выберите счет для просмотра истории</p>
            <div className="flex items-center gap-4">
              <div className="relative w-72">
                <select value={ledgerAccountId} onChange={e => setLedgerAccountId(e.target.value)} className="w-full border border-gray-200 rounded-lg px-3 py-2.5 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                  <option value="all">Все счета</option>
                  {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                </select>
                <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
              <p className="text-xl font-bold text-gray-900">{fmt(ledgerBalance)}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-5">
            <div className="flex flex-wrap items-end gap-3">
              <div>
                <label className="block text-xs text-gray-500 mb-1">С даты</label>
                <input type="text" value={ledgerFromDate} onChange={e => setLedgerFromDate(e.target.value)} placeholder={todayStr()} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">По дату</label>
                <input type="text" value={ledgerToDate} onChange={e => setLedgerToDate(e.target.value)} placeholder={todayStr()} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-36 focus:outline-none focus:ring-2 focus:ring-indigo-400" />
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Пользователь</label>
                <div className="relative">
                  <select value={ledgerUser} onChange={e => setLedgerUser(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    <option>Все пользователи</option><option>Админ</option>
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">Тип операции</label>
                <div className="relative">
                  <select value={ledgerOpType} onChange={e => setLedgerOpType(e.target.value)} className="border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm appearance-none focus:outline-none focus:ring-2 focus:ring-indigo-400">
                    {OPERATION_TYPES.map(o => <option key={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <button onClick={() => { setLedgerFromDate(''); setLedgerToDate(''); setLedgerUser('Все пользователи'); setLedgerOpType('Все типы'); }} className="flex items-center gap-1.5 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition">
                <RotateCcw size={13} /> Сбросить
              </button>
              <button className="flex items-center gap-1.5 border border-gray-200 text-gray-500 rounded-lg px-3 py-2 text-sm hover:bg-gray-50 transition">
                <Download size={13} /> Excel
              </button>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 text-gray-500 text-xs">
                    <th className="text-left px-4 py-3 font-medium w-8">№</th>
                    <th className="text-left px-4 py-3 font-medium">Дата</th>
                    <th className="text-left px-4 py-3 font-medium">Пользователь</th>
                    <th className="text-left px-4 py-3 font-medium">Операция</th>
                    <th className="text-left px-4 py-3 font-medium">Клиент / Договор</th>
                    <th className="text-right px-4 py-3 font-medium border-l border-gray-100" colSpan={3}>Куда (поступило)</th>
                  </tr>
                  <tr className="border-b border-gray-100 text-gray-400 text-xs bg-gray-50">
                    <th className="px-4 py-2" colSpan={5} />
                    <th className="text-right px-4 py-2 border-l border-gray-100 font-medium">Сумма</th>
                    <th className="text-left px-4 py-2 font-medium">Счет</th>
                    <th className="text-left px-4 py-2 font-medium">Назначение</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLedger.length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-10 text-center text-gray-400">Нет записей</td></tr>
                  ) : filteredLedger.map((e, i) => (
                    <tr key={e.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition">
                      <td className="px-4 py-3 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.date}</td>
                      <td className="px-4 py-3 font-medium text-gray-800">{e.user}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block border border-gray-200 text-gray-600 text-xs rounded px-2 py-0.5 whitespace-nowrap">{e.operation}</span>
                      </td>
                      <td className="px-4 py-3">
                        {e.clientContract && (
                          <>
                            <p className="text-indigo-600 text-xs">{e.clientContract}</p>
                            {e.product && <p className="text-gray-400 text-xs">{e.product}</p>}
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right border-l border-gray-100 font-medium text-green-600 whitespace-nowrap">{e.amount === 0 ? '0 ₽' : fmt(e.amount)}</td>
                      <td className="px-4 py-3 text-gray-600 whitespace-nowrap">{e.accountName}</td>
                      <td className="px-4 py-3 text-gray-500 text-xs max-w-xs truncate">{e.note}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* === ADD ACCOUNT MODAL === */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-900">Добавить счёт</h2>
              <button onClick={() => { setShowAddModal(false); setAddError(''); }} className="text-gray-400 hover:text-gray-600 transition">
                <X size={20} />
              </button>
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-1.5">Название счёта <span className="text-red-400">*</span></label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="Например: Касса, Сбербанк, Тинькофф..."
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm text-gray-600 mb-2">Тип счёта</label>
              <div className="flex gap-2">
                <button
                  onClick={() => setNewType('нал')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${newType === 'нал' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <Wallet size={15} /> Наличные
                </button>
                <button
                  onClick={() => setNewType('безнал')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg border text-sm font-medium transition ${newType === 'безнал' ? 'border-indigo-500 bg-indigo-50 text-indigo-700' : 'border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                >
                  <CreditCard size={15} /> Безналичные
                </button>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm text-gray-600 mb-1.5">Начальный баланс</label>
              <div className="flex">
                <input
                  type="number"
                  min="0"
                  value={newBalance}
                  onChange={e => setNewBalance(e.target.value)}
                  placeholder="0"
                  className="flex-1 border border-gray-200 border-r-0 rounded-l-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
                />
                <span className="border border-gray-200 border-l-0 rounded-r-lg px-3 py-2.5 text-sm text-gray-400 bg-gray-50">₽</span>
              </div>
            </div>

            {addError && <p className="text-xs text-red-500 bg-red-50 rounded-lg px-3 py-2 mb-4">{addError}</p>}

            <div className="flex gap-3">
              <button
                onClick={() => { setShowAddModal(false); setAddError(''); }}
                className="flex-1 border border-gray-200 text-gray-600 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition"
              >
                Отмена
              </button>
              <button
                onClick={handleAddAccount}
                className="flex-1 bg-indigo-600 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-indigo-700 transition"
              >
                Создать счёт
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
