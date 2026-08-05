'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Client, Contract } from '@/lib/types';
import { Trash2, Camera, X, ZoomIn, ChevronLeft, ChevronRight, Upload, Pencil, User, FileText, CreditCard, FileSpreadsheet } from 'lucide-react';

// ── Passport hover preview ──────────────────────────────────────────────────
function PassportPreview({ photos, anchorRef }: { photos: string[]; anchorRef: React.RefObject<HTMLSpanElement | null> }) {
  const [idx, setIdx] = useState(0);
  const rect = anchorRef.current?.getBoundingClientRect();
  const style: React.CSSProperties = rect ? {
    position: 'fixed', zIndex: 50,
    left: rect.left, top: rect.top - 8,
    transform: 'translateY(-100%)',
  } : { position: 'absolute', zIndex: 50, bottom: '100%', left: 0 };

  if (!photos || photos.length === 0) {
    return (
      <div style={style} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-56 text-center">
        <div className="text-gray-300 text-4xl mb-2">📄</div>
        <p className="text-xs text-gray-400">Фото паспорта не загружено</p>
      </div>
    );
  }
  return (
    <div style={style} className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden w-64">
      <div className="relative">
        <img src={photos[idx]} alt={`Паспорт ${idx + 1}`} className="w-full h-44 object-cover" />
        {photos.length > 1 && (
          <>
            <button
              onMouseDown={e => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onMouseDown={e => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5"
            >
              <ChevronRight size={16} />
            </button>
            <span className="absolute bottom-1 right-2 text-xs text-white bg-black/50 rounded px-1">
              {idx + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center py-2">Фото паспорта</p>
    </div>
  );
}

// ── Client profile modal (payment history + debt) ───────────────────────────
interface PaymentRow {
  id: string;
  date: string;
  amount: number;
  operation: string;
  note: string;
  paidForMonth?: string;
  paymentComment?: string;
}

function EditPaymentDialog({ payment, contract, onClose, onSave }: {
  payment: PaymentRow;
  contract?: Contract;
  onClose: () => void;
  onSave: (updates: { date: string; paidForMonth?: string; paymentComment?: string }, newAmount: number) => void;
}) {
  const [amount, setAmount] = useState(String(payment.amount));
  const [date, setDate] = useState(payment.date);
  const [paidForMonth, setPaidForMonth] = useState(payment.paidForMonth ?? '');
  const [paymentComment, setPaymentComment] = useState(payment.paymentComment ?? '');

  // Build the same month options as PaymentModal
  const monthOptions = useMemo(() => {
    if (!contract) return [{ key: 'внеочередно', label: 'Внеочередной платёж' }];
    const parseStartDate = (s: string): Date => {
      const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
      if (!m) return new Date();
      return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    };
    const base = parseStartDate(contract.startDate || contract.createdAt);
    const payDay = contract.payDay || 1;
    const total = contract.effectiveMonths || contract.months || 1;
    const items: { key: string; label: string }[] = [];
    for (let i = 0; i < total; i++) {
      const d = new Date(base.getFullYear(), base.getMonth() + i + 1, payDay);
      items.push({
        key: String(i + 1),
        label: `${i + 1}-й (${d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })})`,
      });
    }
    items.push({ key: 'внеочередно', label: 'Внеочередной платёж' });
    // If current paidForMonth doesn't match any option, keep it as an extra choice
    if (paidForMonth && !items.some(i => i.label === paidForMonth)) {
      items.push({ key: 'custom', label: paidForMonth });
    }
    return items;
  }, [contract, paidForMonth]);

  const amountNum = parseFloat(amount) || 0;
  const canSave = amountNum > 0 && !!date.match(/^\d{2}\.\d{2}\.\d{4}/);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-6 pt-5 pb-3 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">Редактировать платёж</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="px-6 py-4 space-y-3">
          <div className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
            {payment.note}
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Сумма</label>
            <input
              value={amount}
              onChange={e => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
              type="text"
              inputMode="numeric"
              autoFocus
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">За месяц</label>
              <select
                value={paidForMonth}
                onChange={e => setPaidForMonth(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] bg-white"
              >
                <option value="">—</option>
                {monthOptions.map(m => (
                  <option key={m.key} value={m.label}>{m.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Дата</label>
              <input
                value={date}
                onChange={e => {
                  const d = e.target.value.replace(/\D/g, '').slice(0, 8);
                  let out = d;
                  if (d.length > 2) out = d.slice(0, 2) + '.' + d.slice(2);
                  if (d.length > 4) out = d.slice(0, 2) + '.' + d.slice(2, 4) + '.' + d.slice(4);
                  setDate(out);
                }}
                placeholder="ДД.ММ.ГГГГ"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Комментарий</label>
            <textarea
              value={paymentComment}
              onChange={e => setPaymentComment(e.target.value)}
              rows={2}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6] resize-none"
            />
          </div>

          <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Если сумма изменена, остаток долга по договору и баланс кассы пересчитаются автоматически.
          </div>
        </div>

        <div className="flex gap-3 px-6 pb-5">
          <button
            onClick={() => canSave && onSave({ date, paidForMonth: paidForMonth || undefined, paymentComment: paymentComment || undefined }, amountNum)}
            disabled={!canSave}
            className="flex-1 bg-[#5B5BD6] text-white rounded-lg py-2.5 text-sm font-semibold hover:bg-[#4a4ac4] transition disabled:opacity-50"
          >
            Сохранить
          </button>
          <button onClick={onClose}
            className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition">
            Отмена
          </button>
        </div>
      </div>
    </div>
  );
}

function ClientProfileModal({ client, contracts, ledger, onClose, onEditContract, onPayContract, isViewer }: {
  client: Client;
  contracts: Contract[];
  ledger: PaymentRow[];
  onClose: () => void;
  onEditContract?: (c: Contract) => void;
  onPayContract?: (c: Contract) => void;
  isViewer?: boolean;
}) {
  const { updateLedgerEntry, deleteLedgerEntry, updateContract, depositAccount, withdrawAccount, addAuditEntry } = useApp();
  const fullName = `${client.lastName || ''} ${client.firstName || ''} ${client.middleName || ''}`.trim() || client.phone || 'Без имени';
  const clientContracts = contracts.filter(c => c.clientId === client.id);
  const [passportPhotos, setPassportPhotos] = useState<{ id: string; url: string }[]>([]);
  const [photosLoading, setPhotosLoading] = useState(true);
  const [photoLightbox, setPhotoLightbox] = useState<number | null>(null);
  const [editingPayment, setEditingPayment] = useState<PaymentRow | null>(null);
  const [deletingPayment, setDeletingPayment] = useState<PaymentRow | null>(null);

  // Extract "#N" from note or clientContract to find the linked contract
  const findContractForPayment = (p: PaymentRow): Contract | undefined => {
    const match = p.note?.match(/#(\d+)/);
    if (!match) return undefined;
    const number = parseInt(match[1], 10);
    return clientContracts.find(c => c.number === number);
  };

  useEffect(() => {
    fetch(`/api/upload?clientId=${encodeURIComponent(client.id)}`)
      .then(r => r.json())
      .then((data: { photos: { id: string; url: string }[] }) => {
        if (data.photos?.length > 0) setPassportPhotos(data.photos);
      })
      .catch(() => {})
      .finally(() => setPhotosLoading(false));
  }, [client.id]);
  const totalDebt = clientContracts.reduce((s, c) => s + c.remainingDebt, 0);
  const totalPaid = clientContracts.reduce((s, c) => s + (c.cost + c.markup - c.remainingDebt), 0);

  // Get payment entries from ledger for this client
  const clientPayments = ledger.filter(e =>
    e.operation === 'Платёж клиента' && (e.note?.includes(fullName) || e.note?.includes(client.phone) || clientContracts.some(c => e.note?.includes(`#${c.number}`)))
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[85vh] overflow-hidden flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center">
              <User size={18} className="text-[#5B5BD6]" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-gray-900">{fullName}</h2>
              <p className="text-sm text-gray-500">{client.phone}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-6 space-y-5">
          {/* Summary cards */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-green-50 rounded-xl p-4 text-center">
              <p className="text-xs text-green-600 mb-1">Оплачено</p>
              <p className="text-lg font-bold text-green-700">{totalPaid.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="bg-red-50 rounded-xl p-4 text-center">
              <p className="text-xs text-red-500 mb-1">Остаток долга</p>
              <p className="text-lg font-bold text-red-600">{totalDebt.toLocaleString('ru-RU')} ₽</p>
            </div>
            <div className="bg-[#EEF0FF] rounded-xl p-4 text-center">
              <p className="text-xs text-[#5B5BD6] mb-1">Договоров</p>
              <p className="text-lg font-bold text-[#5B5BD6]">{clientContracts.length}</p>
            </div>
          </div>

          {/* Contracts */}
          {clientContracts.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                <FileText size={14} className="text-[#5B5BD6]" /> Договоры
              </h3>
              <div className="space-y-2">
                {clientContracts.map(c => (
                  <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex items-center justify-between mb-1 gap-2">
                      <span className="text-sm font-medium text-gray-800">Договор #{c.number} — {c.product}</span>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                          c.status === 'Погашен' || c.status === 'Досрочно погашен' ? 'bg-green-100 text-green-700' :
                          c.status === 'Просрочен' ? 'bg-red-100 text-red-700' :
                          c.status === 'Списан' ? 'bg-gray-100 text-gray-500' :
                          'bg-blue-100 text-blue-700'
                        }`}>{c.status}</span>
                        {onPayContract && c.remainingDebt > 0 && c.status !== 'Погашен' && c.status !== 'Досрочно погашен' && c.status !== 'Списан' && (
                          <button
                            onClick={() => onPayContract(c)}
                            title="Внести оплату"
                            className="flex items-center gap-1 text-xs text-[#5B5BD6] border border-[#5B5BD6]/30 rounded-lg px-2 py-1 hover:bg-[#EEF0FF] transition"
                          >
                            <CreditCard size={12} /> Погасить
                          </button>
                        )}
                        {onEditContract && (
                          <button
                            onClick={() => onEditContract(c)}
                            title="Редактировать договор"
                            className="text-gray-400 hover:text-[#5B5BD6] transition"
                          >
                            <Pencil size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs text-gray-500 mt-2">
                      <div>Сумма: <span className="font-medium text-gray-700">{c.cost.toLocaleString('ru-RU')} ₽</span></div>
                      <div>Взнос: <span className="font-medium text-gray-700">{c.firstPayment.toLocaleString('ru-RU')} ₽</span></div>
                      <div>Ежемес.: <span className="font-medium text-gray-700">{c.monthlyPayment.toLocaleString('ru-RU')} ₽</span></div>
                      <div>Долг: <span className="font-medium text-red-600">{c.remainingDebt.toLocaleString('ru-RU')} ₽</span></div>
                    </div>
                    <div className="text-xs text-gray-400 mt-1">{c.createdAt} — {c.endDate}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Payment history from ledger */}
          {clientPayments.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-700">История платежей</h3>
                <button
                  onClick={() => {
                    // Export as CSV (Excel-friendly). Simple, no extra deps.
                    const rows: string[][] = [['Дата', 'За месяц', 'Сумма (₽)', 'Комментарий', 'Назначение']];
                    for (const p of clientPayments) {
                      rows.push([
                        p.date,
                        p.paidForMonth ?? '',
                        String(p.amount),
                        p.paymentComment ?? '',
                        p.note,
                      ]);
                    }
                    const csv = rows.map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(',')).join('\n');
                    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' });
                    const url = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = url;
                    a.download = `Платежи_${fullName.replace(/\s+/g, '_')}.csv`;
                    document.body.appendChild(a);
                    a.click();
                    document.body.removeChild(a);
                    URL.revokeObjectURL(url);
                  }}
                  className="flex items-center gap-1.5 text-xs text-green-600 border border-green-300 rounded-lg px-3 py-1.5 hover:bg-green-50 transition"
                >
                  <FileSpreadsheet size={13} /> Excel
                </button>
              </div>
              <div className="border border-gray-100 rounded-lg overflow-hidden overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-xs text-gray-500">
                      <th className="text-left px-3 py-2 font-medium">Дата</th>
                      <th className="text-left px-3 py-2 font-medium">За месяц</th>
                      <th className="text-left px-3 py-2 font-medium">Назначение / комментарий</th>
                      <th className="text-right px-3 py-2 font-medium">Сумма</th>
                      {!isViewer && <th className="text-right px-3 py-2 font-medium">Действия</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {clientPayments.map(p => (
                      <tr key={p.id} className="border-t border-gray-50">
                        <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{p.date}</td>
                        <td className="px-3 py-2 text-gray-700 text-xs whitespace-nowrap">{p.paidForMonth || '—'}</td>
                        <td className="px-3 py-2 text-gray-500 text-xs">
                          {p.paymentComment ? <span className="block font-medium text-gray-700">{p.paymentComment}</span> : null}
                          <span className="text-gray-400">{p.note}</span>
                        </td>
                        <td className="px-3 py-2 text-right text-green-600 font-medium whitespace-nowrap">{p.amount.toLocaleString('ru-RU')} ₽</td>
                        {!isViewer && (
                          <td className="px-3 py-2 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => setEditingPayment(p)}
                                title="Редактировать платёж"
                                className="text-gray-400 hover:text-[#5B5BD6] transition p-1"
                              >
                                <Pencil size={14} />
                              </button>
                              <button
                                onClick={() => setDeletingPayment(p)}
                                title="Удалить платёж"
                                className="text-gray-400 hover:text-red-500 transition p-1"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {clientContracts.length === 0 && (
            <p className="text-center text-gray-400 text-sm py-4">У клиента нет договоров</p>
          )}

          {/* Passport photos */}
          <div>
            <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
              <Camera size={14} className="text-[#5B5BD6]" /> Фото паспорта
            </h3>
            {photosLoading ? (
              <p className="text-sm text-gray-400 text-center py-4">Загрузка фото...</p>
            ) : passportPhotos.length > 0 ? (
              <div className="grid grid-cols-3 gap-3">
                {passportPhotos.map((photo, i) => (
                  <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-[4/3] cursor-pointer"
                    onClick={() => setPhotoLightbox(i)}>
                    <img src={photo.url} alt={`Паспорт ${i + 1}`} className="w-full h-full object-cover" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                      <ZoomIn size={18} className="text-white drop-shadow" />
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 text-center py-3 bg-gray-50 rounded-lg">Фото не загружены</p>
            )}
          </div>
        </div>

        {/* Photo lightbox */}
        {photoLightbox !== null && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setPhotoLightbox(null)}>
            <img src={passportPhotos[photoLightbox]?.url} alt="Паспорт" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
            <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/40" onClick={() => setPhotoLightbox(null)}>
              <X size={20} />
            </button>
            {passportPhotos.length > 1 && (
              <>
                <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                  onClick={e => { e.stopPropagation(); setPhotoLightbox(i => ((i ?? 0) - 1 + passportPhotos.length) % passportPhotos.length); }}>
                  <ChevronLeft size={22} />
                </button>
                <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                  onClick={e => { e.stopPropagation(); setPhotoLightbox(i => ((i ?? 0) + 1) % passportPhotos.length); }}>
                  <ChevronRight size={22} />
                </button>
              </>
            )}
          </div>
        )}

        {editingPayment && (
          <EditPaymentDialog
            payment={editingPayment}
            contract={findContractForPayment(editingPayment)}
            onClose={() => setEditingPayment(null)}
            onSave={(updates, newAmount) => {
              const oldAmount = editingPayment.amount;
              const linkedContract = findContractForPayment(editingPayment);
              // Update the ledger row itself (metadata + amount)
              updateLedgerEntry(editingPayment.id, { ...updates, amount: newAmount });
              // If the amount changed, rebalance the linked contract + cash
              const delta = newAmount - oldAmount;
              if (delta !== 0) {
                if (linkedContract) {
                  const newDebt = Math.max(0, linkedContract.remainingDebt - delta);
                  const wasPaid = linkedContract.status === 'Погашен' || linkedContract.status === 'Досрочно погашен';
                  updateContract(linkedContract.id, {
                    remainingDebt: newDebt,
                    ...(newDebt === 0 && !wasPaid ? { status: 'Погашен' as const } : {}),
                    ...(newDebt > 0 && wasPaid ? { status: 'В процессе' as const } : {}),
                  });
                }
                // Rebalance cash: use dedicated deposit/withdraw so the ledger entry is coherent
                const correctionNote = `Корректировка платежа ${editingPayment.note}`;
                if (delta > 0) {
                  depositAccount('cash', delta, correctionNote);
                } else {
                  withdrawAccount('cash', -delta, correctionNote, false);
                }
              }
              addAuditEntry({
                action: 'Редактирование',
                section: 'Платежи',
                entity: `Платёж ${oldAmount.toLocaleString('ru-RU')} → ${newAmount.toLocaleString('ru-RU')} ₽`,
                details: `${editingPayment.note}${updates.paidForMonth !== editingPayment.paidForMonth ? ` · Месяц: ${editingPayment.paidForMonth ?? '—'} → ${updates.paidForMonth ?? '—'}` : ''}${updates.date !== editingPayment.date ? ` · Дата: ${editingPayment.date} → ${updates.date}` : ''}`,
              });
              setEditingPayment(null);
            }}
          />
        )}

        {deletingPayment && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50 p-4" onClick={() => setDeletingPayment(null)}>
            <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                  <Trash2 size={18} className="text-red-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900">Удалить платёж?</h3>
              </div>
              <p className="text-sm text-gray-600 mb-2">
                Дата: <strong>{deletingPayment.date}</strong>
              </p>
              <p className="text-sm text-gray-600 mb-2">
                Сумма: <strong className="text-green-600">{deletingPayment.amount.toLocaleString('ru-RU')} ₽</strong>
                {deletingPayment.paidForMonth ? ` (${deletingPayment.paidForMonth})` : ''}
              </p>
              <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-4">
                Остаток долга по договору будет увеличен на эту сумму, а баланс кассы уменьшен. Действие записывается в аудит.
              </p>
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setDeletingPayment(null)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition"
                >
                  Отмена
                </button>
                <button
                  onClick={() => {
                    const linkedContract = findContractForPayment(deletingPayment);
                    if (linkedContract) {
                      const newDebt = linkedContract.remainingDebt + deletingPayment.amount;
                      const wasPaid = linkedContract.status === 'Погашен' || linkedContract.status === 'Досрочно погашен';
                      updateContract(linkedContract.id, {
                        remainingDebt: newDebt,
                        ...(wasPaid ? { status: 'В процессе' as const } : {}),
                      });
                    }
                    // deleteLedgerEntry now debits the cash account for a customer payment,
                    // so we don't need a manual withdraw here — that would double-book.
                    deleteLedgerEntry(deletingPayment.id);
                    addAuditEntry({
                      action: 'Удаление',
                      section: 'Платежи',
                      entity: `Платёж ${deletingPayment.amount.toLocaleString('ru-RU')} ₽`,
                      details: `${deletingPayment.note}${deletingPayment.paidForMonth ? ` · за ${deletingPayment.paidForMonth}` : ''} · от ${deletingPayment.date}`,
                    });
                    setDeletingPayment(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition"
                >
                  Удалить
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="border-t border-gray-100 px-6 py-4">
          <button onClick={onClose}
            className="w-full border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition">
            Закрыть
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Edit client modal ────────────────────────────────────────────────────────
function EditClientModal({ client, onClose, onSave }: {
  client: Client;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Client>) => void;
}) {
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [middleName, setMiddleName] = useState(client.middleName);
  const [phone, setPhone] = useState(client.phone);
  const [address, setAddress] = useState(client.address ?? '');

  const handleSubmit = () => {
    if (!firstName.trim() || !phone.trim()) return;
    onSave(client.id, { firstName: firstName.trim(), lastName: lastName.trim(), middleName: middleName.trim(), phone: phone.trim(), address: address.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center">
            <Pencil size={18} className="text-[#5B5BD6]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Редактировать клиента</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Фамилия</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Имя <span className="text-red-400">*</span></label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Отчество</label>
            <input value={middleName} onChange={e => setMiddleName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Телефон <span className="text-red-400">*</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Адрес</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Отмена
          </button>
          <button onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5B5BD6] rounded-lg hover:bg-[#4a4ac4] transition">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Passport manage modal ───────────────────────────────────────────────────
function PassportModal({ client, onClose, isViewer }: {
  client: Client;
  onClose: () => void;
  isViewer: boolean;
}) {
  const [photos, setPhotos] = useState<{ id: string; url: string }[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 3;

  // Fetch photos from server on mount
  useEffect(() => {
    fetch(`/api/upload?clientId=${encodeURIComponent(client.id)}`)
      .then(r => r.json())
      .then((data: { photos: { id: string; url: string }[] }) => {
        if (data.photos?.length > 0) {
          setPhotos(data.photos);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [client.id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const allowed = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('clientId', client.id);
      allowed.forEach(f => fd.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json() as { photos: { id: string; url: string }[] };
        setPhotos(prev => [...prev, ...data.photos]);
      }
    } catch {} finally {
      setUploading(false);
    }
  };

  const removePhoto = async (i: number) => {
    const photo = photos[i];
    if (photo.id) {
      try { await fetch(`/api/upload?id=${encodeURIComponent(photo.id)}`, { method: 'DELETE' }); } catch {}
    }
    setPhotos(prev => prev.filter((_, idx) => idx !== i));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {lightbox !== null ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <img src={photos[lightbox]?.url} alt="Паспорт" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/40" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setLightbox(i => ((i ?? 0) - 1 + photos.length) % photos.length); }}>
                <ChevronLeft size={22} />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setLightbox(i => ((i ?? 0) + 1) % photos.length); }}>
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Фото паспорта</h2>
            <p className="text-sm text-gray-500">{`${client.lastName} ${client.firstName} ${client.middleName}`.trim()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6">
          {/* Upload zone — hidden for viewer */}
          {!isViewer && (
          <div>
            {photos.length < MAX_PHOTOS ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#5B5BD6] hover:bg-[#F5F5FF] transition mb-5"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              >
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-600">{uploading ? 'Загрузка...' : 'Нажмите или перетащите фото'}</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · максимум {MAX_PHOTOS} фото · осталось {MAX_PHOTOS - photos.length}</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center mb-5 bg-gray-50">
                <p className="text-sm text-gray-400">Достигнут лимит — {MAX_PHOTOS} из {MAX_PHOTOS} фото</p>
                <p className="text-xs text-gray-300 mt-0.5">Удалите фото чтобы добавить новое</p>
              </div>
            )}
          </div>
          )}

          {/* Photos grid */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Загрузка фото...</div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {photos.map((photo, i) => (
                <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-[4/3]">
                  <img src={photo.url} alt={`Паспорт ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setLightbox(i)} className="bg-white/90 rounded-full p-1.5 hover:bg-white">
                      <ZoomIn size={14} className="text-gray-700" />
                    </button>
                    {!isViewer && (
                    <button onClick={() => removePhoto(i)} className="bg-red-500 rounded-full p-1.5 hover:bg-red-600">
                      <Trash2 size={14} className="text-white" />
                    </button>
                    )}
                  </div>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white rounded px-1">{i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm mb-5">Фото не загружены</p>
          )}

          <div className="flex gap-3">
            <button onClick={onClose}
              className="flex-1 border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition">
              Закрыть
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Row with hover preview ──────────────────────────────────────────────────
function ClientRow({ client, contractsCount, isViewer, onManagePhotos, onEdit, onProfile }: {
  client: Client;
  contractsCount: number;
  isViewer: boolean;
  onManagePhotos: (c: Client) => void;
  onEdit: (c: Client) => void;
  onProfile: (c: Client) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const nameRef = useRef<HTMLSpanElement>(null);
  const rawName = `${client.lastName || ''} ${client.firstName || ''} ${client.middleName || ''}`.trim();
  const fullName = rawName || client.phone || 'Без имени';

  return (
    <>
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      {/* ФИО — click opens profile, hover shows passport */}
      <td className="px-4 py-3">
        <div className="relative inline-block">
          <span
            ref={nameRef}
            className="font-medium text-[#5B5BD6] cursor-pointer underline decoration-dotted underline-offset-2"
            onClick={() => onProfile(client)}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onTouchStart={() => onProfile(client)}
          >
            {fullName}
          </span>
          {hovered && <PassportPreview photos={client.passportPhotos ?? []} anchorRef={nameRef} />}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700">{client.phone}</td>
      <td className="px-4 py-3 text-gray-500">{client.address || '-'}</td>
      <td className="px-4 py-3 text-gray-700">{contractsCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {!isViewer && (
            <button
              onClick={() => onEdit(client)}
              title="Редактировать"
              className="bg-[#EEF0FF] text-[#5B5BD6] hover:bg-[#dddeff] rounded-lg p-2 transition"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => onManagePhotos(client)}
            title="Фото паспорта"
            className={`rounded-lg p-2 transition ${(client.passportPhotos?.length ?? 0) > 0
              ? 'bg-[#EEF0FF] text-[#5B5BD6] hover:bg-[#dddeff]'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            <Camera size={14} />
          </button>
        </div>
      </td>
    </tr>
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { clients, contracts, ledger, updateClient, currentUser } = useApp();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isViewer = currentUser?.role === 'viewer';
  const [search, setSearch] = useState('');
  const [passportClient, setPassportClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [profileClient, setProfileClient] = useState<Client | null>(null);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string[]>>({});

  // Auto-open profile modal when ?openClient=<id> is present in URL
  useEffect(() => {
    const openId = searchParams?.get('openClient');
    if (!openId) return;
    const found = clients.find(c => c.id === openId);
    if (found) setProfileClient(found);
  }, [searchParams, clients]);

  // Load all client photos from server in one request
  useEffect(() => {
    fetch('/api/upload')
      .then(r => r.json())
      .then((data: { byClient: Record<string, { id: string; url: string }[]> }) => {
        if (data.byClient) {
          const map: Record<string, string[]> = {};
          for (const [cid, photos] of Object.entries(data.byClient)) {
            map[cid] = photos.map(p => p.url);
          }
          setClientPhotos(map);
        }
      })
      .catch(() => {});
  }, []);

  // Merge server photos into client data for display
  const clientsWithPhotos = useMemo(() =>
    clients.map(c => ({
      ...c,
      passportPhotos: clientPhotos[c.id] ?? c.passportPhotos ?? [],
    })),
    [clients, clientPhotos]
  );

  const filtered = useMemo(() => {
    if (!search) return clientsWithPhotos;
    const q = search.toLowerCase();
    return clientsWithPhotos.filter(c =>
      `${c.firstName} ${c.lastName} ${c.middleName}`.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  }, [clientsWithPhotos, search]);

  // Refresh client photos after passport modal closes
  const refreshPhotos = () => {
    fetch('/api/upload')
      .then(r => r.json())
      .then((data: { byClient: Record<string, { id: string; url: string }[]> }) => {
        if (data.byClient) {
          const map: Record<string, string[]> = {};
          for (const [cid, photos] of Object.entries(data.byClient)) {
            map[cid] = photos.map(p => p.url);
          }
          setClientPhotos(map);
        }
      })
      .catch(() => {});
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление клиентами</h1>
        <p className="text-sm text-gray-500 mt-1">Нажмите на имя клиента для просмотра профиля и платежей</p>
      </div>

      <div className="mb-5 max-w-full sm:max-w-sm">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['ФИО', 'ТЕЛЕФОН', 'АДРЕС', 'КОЛИЧЕСТВО ДОГОВОРОВ', 'ДЕЙСТВИЯ'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <ClientRow
                key={c.id}
                client={c}
                contractsCount={contracts.filter(ct => ct.clientId === c.id).length}
                isViewer={isViewer}
                onManagePhotos={setPassportClient}
                onEdit={setEditClient}
                onProfile={setProfileClient}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Нет клиентов</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {passportClient && (
        <PassportModal
          client={passportClient}
          onClose={() => { setPassportClient(null); refreshPhotos(); }}
          isViewer={isViewer}
        />
      )}

      {editClient && (
        <EditClientModal
          client={editClient}
          onClose={() => setEditClient(null)}
          onSave={(id, updates) => { updateClient(id, updates); setEditClient(null); }}
        />
      )}

      {profileClient && (
        <ClientProfileModal
          client={profileClient}
          contracts={contracts}
          ledger={ledger}
          isViewer={isViewer}
          onClose={() => setProfileClient(null)}
          onEditContract={isViewer ? undefined : (c) => {
            setProfileClient(null);
            router.push(`/dashboard/contracts?edit=${encodeURIComponent(c.id)}`);
          }}
          onPayContract={isViewer ? undefined : (c) => {
            setProfileClient(null);
            router.push(`/dashboard/contracts?pay=${encodeURIComponent(c.id)}`);
          }}
        />
      )}
    </div>
  );
}
