'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Client } from '@/lib/types';
import { ChevronDown, Download, Plus, Trash2, Search, Calculator, Camera, X, ZoomIn, FileText, FileSpreadsheet, AlertCircle, UserPlus, Users } from 'lucide-react';
import { downloadContractPdf, downloadContractExcel } from '@/lib/contractPdf';

function formatDate(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 8);
  if (digits.length === 0) return '';
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return `${digits.slice(0, 2)}.${digits.slice(2)}`;
  return `${digits.slice(0, 2)}.${digits.slice(2, 4)}.${digits.slice(4)}`;
}

function formatRuPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  let d = digits;
  if (d.startsWith('8')) d = '7' + d.slice(1);
  if (!d.startsWith('7') && d.length > 0) d = '7' + d;
  d = d.slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 1) return '+7';
  if (d.length <= 4) return `+7 (${d.slice(1)}`;
  if (d.length <= 7) return `+7 (${d.slice(1, 4)}) ${d.slice(4)}`;
  if (d.length <= 9) return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return `+7 (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
}

export default function CreateContractPage() {
  const router = useRouter();
  const { clients, products, accounts: appAccounts, addContract, addClient, contracts, currentUser, depositAccount, addAuditEntry, settings } = useApp();
  const paymentMethods = settings.paymentMethods ?? ['Наличка', 'Сбербанк', 'Тинькофф'];
  const isViewer = currentUser?.role === 'viewer';

  if (isViewer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Доступ ограничен</h2>
        <p className="text-gray-500">У вас нет прав для создания договоров.<br/>Обратитесь к администратору.</p>
      </div>
    );
  }

  // Form state
  const [cost, setCost] = useState('');
  const [purchaseCost, setPurchaseCost] = useState('');
  const [firstPayment, setFirstPayment] = useState('');
  const [months, setMonths] = useState('');
  const [source, setSource] = useState(paymentMethods[0] ?? '');
  useEffect(() => {
    if (paymentMethods.length > 0) {
      setSource(prev => paymentMethods.includes(prev) ? prev : paymentMethods[0]);
    }
  }, [paymentMethods]);
  // Live account options based on real balances from context
  const accountOptions = useMemo(
    () => appAccounts.map(a => `${a.name} (Доступно: ${a.balance.toLocaleString('ru-RU')} ₽)`),
    [appAccounts]
  );
  const [account, setAccount] = useState('');
  useEffect(() => {
    if (accountOptions.length === 0) { setAccount(''); return; }
    setAccount(prev => accountOptions.includes(prev) ? prev : accountOptions[0]);
  }, [accountOptions]);
  const [markup, setMarkup] = useState('');
  const [productName, setProductName] = useState('');
  const [startDate, setStartDate] = useState(() => {
    const n = new Date();
    return `${String(n.getDate()).padStart(2,'0')}.${String(n.getMonth()+1).padStart(2,'0')}.${n.getFullYear()}`;
  });
  const [payDay, setPayDay] = useState('');
  const [comment, setComment] = useState('');
  // Custom total override for discount
  const [customTotal, setCustomTotal] = useState('');
  // "Время учитывать" — for existing partial debts
  const [useEffectiveTerm, setUseEffectiveTerm] = useState(false);
  const [effectiveUnit, setEffectiveUnit] = useState<'months' | 'days'>('months');
  const [effectiveValue, setEffectiveValue] = useState('');

  // Client mode: 'search' (existing) or 'new'
  const [clientMode, setClientMode] = useState<'search' | 'new'>('search');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientResults, setShowClientResults] = useState(false);
  const [newClientFirst, setNewClientFirst] = useState('');
  const [newClientLast, setNewClientLast] = useState('');
  const [newClientMiddle, setNewClientMiddle] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPhotos, setNewClientPhotos] = useState<string[]>([]);
  const [photoLightbox, setPhotoLightbox] = useState<number | null>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  // Calculations — markup applies to remainder after first payment
  const costNum = parseFloat(cost) || 0;
  const firstPaymentNum = parseFloat(firstPayment) || 0;
  const markupNum = parseFloat(markup) || 0;
  const monthsNum = parseInt(months) || 0;
  const payDayNum = parseInt(payDay) || 1;

  const baseForMarkup = costNum - firstPaymentNum; // remainder after first payment
  const markupAmount = baseForMarkup > 0 ? baseForMarkup * markupNum / 100 : 0;
  const systemTotal = costNum + markupAmount; // system-calculated total (cost + markup on remainder)
  const amountAfterFirst = systemTotal - firstPaymentNum; // what's left to pay in installments

  // Custom total logic — use the manually entered total as-is when set (works for both discount & increase)
  const customTotalNum = parseFloat(customTotal) || 0;
  const hasCustomTotal = customTotal !== '' && customTotalNum > 0;
  const effectiveTotal = hasCustomTotal ? customTotalNum : systemTotal;
  const effectiveAfterFirst = effectiveTotal - firstPaymentNum;
  const hasDiscount = hasCustomTotal && customTotalNum < systemTotal;
  const discountAmount = hasDiscount ? systemTotal - customTotalNum : 0;

  // Effective term values — for "Время учитывать" feature
  const effectiveValueNum = parseInt(effectiveValue) || 0;
  // Number of effective payment installments (in months) for monthly calc
  const effectiveInstallments = useEffectiveTerm
    ? (effectiveUnit === 'months' ? effectiveValueNum : Math.max(1, Math.ceil(effectiveValueNum / 30)))
    : monthsNum;

  const monthly = effectiveInstallments > 0 ? Math.ceil(effectiveAfterFirst / effectiveInstallments) : 0;
  // Итого = actual amount the customer owes (matches manual total when set, no rounding overpay)
  const total = firstPaymentNum + effectiveAfterFirst;
  const remainingDebt = effectiveAfterFirst;
  // Last installment is adjusted so the sum of all payments equals effectiveAfterFirst exactly
  const lastMonthly = effectiveInstallments > 0
    ? effectiveAfterFirst - monthly * (effectiveInstallments - 1)
    : 0;

  // Reset custom total when inputs change
  useEffect(() => {
    setCustomTotal('');
  }, [cost, firstPayment, markup]);

  // Parse startDate (DD.MM.YYYY) into Date — used for schedule base
  function parseStartDate(s: string): Date {
    const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
    if (!m) return new Date();
    return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
  }

  const paymentSchedule = useMemo(() => {
    const baseDate = parseStartDate(startDate);
    // Days-based schedule (only when useEffectiveTerm + days)
    if (useEffectiveTerm && effectiveUnit === 'days' && effectiveValueNum > 0) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + effectiveValueNum);
      return [{
        month: 1,
        date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        amount: monthly,
      }];
    }
    if (effectiveInstallments <= 0) return [];
    const schedule = [];
    for (let i = 0; i < effectiveInstallments; i++) {
      // First payment is 1 month after startDate
      const d = new Date(baseDate.getFullYear(), baseDate.getMonth() + i + 1, payDayNum);
      const isLast = i === effectiveInstallments - 1;
      schedule.push({
        month: i + 1,
        date: d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        amount: isLast ? lastMonthly : monthly,
      });
    }
    return schedule;
  }, [effectiveInstallments, monthly, lastMonthly, payDayNum, startDate, useEffectiveTerm, effectiveUnit, effectiveValueNum]);

  const clientResults = useMemo(() => {
    if (!clientSearch) return [];
    const q = clientSearch.toLowerCase();
    return clients.filter(c =>
      `${c.firstName} ${c.lastName} ${c.middleName}`.toLowerCase().includes(q) ||
      c.phone.includes(q)
    ).slice(0, 8);
  }, [clients, clientSearch]);

  const handlePhotoFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => { setNewClientPhotos(prev => [...prev, e.target?.result as string]); };
      reader.readAsDataURL(file);
    });
  };

  const handleCreateNewClient = async () => {
    if (!newClientFirst || !newClientPhone) {
      setAlertMsg('Укажите имя и телефон клиента');
      return;
    }
    const newClient: Client = {
      id: Date.now().toString(),
      firstName: newClientFirst,
      lastName: newClientLast,
      middleName: newClientMiddle,
      phone: newClientPhone,
      contractsCount: 0,
      passportPhotos: newClientPhotos,
    };
    const ok = await addClient(newClient);
    if (!ok) {
      setAlertMsg('Не удалось сохранить клиента. Попробуйте ещё раз.');
      return;
    }
    setSelectedClient(newClient);
    setClientMode('search');
    setNewClientFirst(''); setNewClientLast(''); setNewClientMiddle(''); setNewClientPhone('');
    setNewClientPhotos([]);
  };

  const [submitting, setSubmitting] = useState(false);
  const handleSubmit = async () => {
    if (submitting) return;
    if (!selectedClient || !selectedClient.id) {
      setAlertMsg('Выберите клиента или создайте нового перед оформлением договора');
      return;
    }
    if (!cost || !firstPayment || !months || !startDate) {
      setAlertMsg('Заполните обязательные поля: Стоимость, Первый взнос, Количество месяцев, Дата начала');
      return;
    }
    const finalDebt = effectiveAfterFirst;
    const newContract = {
      id: Date.now().toString(),
      number: contracts.length + 1,
      createdAt: startDate,
      endDate: paymentSchedule[paymentSchedule.length - 1]?.date ?? startDate,
      clientId: selectedClient?.id ?? '',
      clientName: selectedClient ? `${selectedClient.lastName} ${selectedClient.firstName} ${selectedClient.middleName}`.trim() : '',
      product: productName || '',
      phone: selectedClient?.phone ?? '',
      status: 'В процессе' as const,
      remainingDebt: finalDebt,
      monthlyPayment: monthly,
      paymentStatus: 'Новый договор' as const,
      cost: costNum,
      purchaseCost: parseFloat(purchaseCost) || 0,
      markup: markupAmount,
      firstPayment: firstPaymentNum,
      months: monthsNum,
      source,
      tariff: '',
      account: 'общий',
      startDate,
      payDay: payDayNum,
      comment,
      approved: true,
      useEffectiveTerm,
      effectiveMonths: useEffectiveTerm && effectiveUnit === 'months' ? effectiveValueNum : undefined,
      effectiveDays: useEffectiveTerm && effectiveUnit === 'days' ? effectiveValueNum : undefined,
    };
    setSubmitting(true);
    const ok = await addContract(newContract);
    if (!ok) {
      setSubmitting(false);
      setAlertMsg('Не удалось сохранить договор. Проверьте подключение и попробуйте ещё раз.');
      return;
    }
    if (firstPaymentNum > 0) {
      depositAccount('cash', firstPaymentNum, `Первый взнос по договору ${newContract.clientName} (#${newContract.number}) · ${productName}`);
      addAuditEntry({
        action: 'Создание',
        section: 'Платежи',
        entity: `Первый взнос ${firstPaymentNum.toLocaleString('ru-RU')} ₽`,
        details: `Договор #${newContract.number} (${newContract.clientName}) · ${productName}`,
      });
    }
    router.push('/dashboard/contracts');
  };

  const buildDraft = () => ({
    id: 'draft', number: contracts.length + 1, createdAt: startDate,
    endDate: paymentSchedule[paymentSchedule.length - 1]?.date ?? startDate,
    clientId: selectedClient?.id ?? '', clientName: selectedClient ? `${selectedClient.lastName} ${selectedClient.firstName} ${selectedClient.middleName}`.trim() : '',
    product: productName || '', phone: selectedClient?.phone ?? '', status: 'В процессе' as const,
    remainingDebt: effectiveAfterFirst, monthlyPayment: monthly, paymentStatus: 'Новый договор' as const,
    cost: costNum, purchaseCost: parseFloat(purchaseCost) || 0, markup: markupAmount, firstPayment: firstPaymentNum,
    months: monthsNum, source, tariff: '', account: 'общий', startDate, payDay: payDayNum, comment, approved: true,
    useEffectiveTerm,
    effectiveMonths: useEffectiveTerm && effectiveUnit === 'months' ? effectiveValueNum : undefined,
    effectiveDays: useEffectiveTerm && effectiveUnit === 'days' ? effectiveValueNum : undefined,
  });

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Создание договора</h1>
        <p className="text-sm text-gray-500 mt-1">Заполните форму для создания нового договора</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        {/* Left form */}
        <div className="flex-1 min-w-0 space-y-6">
          {/* Client section */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-4 pb-3 border-b border-gray-100">
              <span className="text-[#5B5BD6]">👤</span> Клиент
            </h2>

            {/* Toggle: existing / new client */}
            {!selectedClient && (
              <div className="flex gap-2 mb-4">
                <button
                  onClick={() => setClientMode('search')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    clientMode === 'search'
                      ? 'bg-[#5B5BD6] text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <Users size={15} /> Из базы
                </button>
                <button
                  onClick={() => setClientMode('new')}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                    clientMode === 'new'
                      ? 'bg-[#22c55e] text-white'
                      : 'border border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <UserPlus size={15} /> Новый клиент
                </button>
              </div>
            )}

            {/* Selected client badge */}
            {selectedClient ? (
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg mb-3">
                <div>
                  <p className="font-medium text-gray-900">{`${selectedClient.lastName} ${selectedClient.firstName} ${selectedClient.middleName}`.trim()}</p>
                  <p className="text-sm text-gray-500">{selectedClient.phone}</p>
                </div>
                <button onClick={() => setSelectedClient(null)} className="text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ) : clientMode === 'search' ? (
              /* Search existing client */
              <div className="relative mb-3">
                <div className="flex items-center border border-gray-200 rounded-lg px-3 py-2.5">
                  <Search size={16} className="text-gray-400 mr-2" />
                  <input
                    value={clientSearch}
                    onChange={e => { setClientSearch(e.target.value); setShowClientResults(true); }}
                    onFocus={() => setShowClientResults(true)}
                    placeholder="Введите ФИО или номер телефона..."
                    className="flex-1 text-sm outline-none"
                  />
                </div>
                {showClientResults && clientResults.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg">
                    {clientResults.map(c => (
                      <button key={c.id} onClick={() => { setSelectedClient(c); setClientSearch(''); setShowClientResults(false); }}
                        className="w-full text-left px-4 py-2.5 hover:bg-gray-50 text-sm">
                        <span className="font-medium">{`${c.lastName} ${c.firstName} ${c.middleName}`.trim()}</span>
                        <span className="text-gray-500 ml-2">{c.phone}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              /* New client form */
              <div className="border border-gray-200 rounded-lg p-4 space-y-3 mb-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input value={newClientFirst} onChange={e => setNewClientFirst(e.target.value)} placeholder="Имя *"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                  <input value={newClientLast} onChange={e => setNewClientLast(e.target.value)} placeholder="Фамилия"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                  <input value={newClientMiddle} onChange={e => setNewClientMiddle(e.target.value)} placeholder="Отчество"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                  <input value={newClientPhone} onChange={e => setNewClientPhone(formatRuPhone(e.target.value))} placeholder="+7 (___) ___-__-__"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                </div>

                {/* Passport photos */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2 flex items-center gap-1.5">
                    <Camera size={14} className="text-[#5B5BD6]" /> Фото паспорта
                    <span className="text-gray-400 font-normal text-xs">(необязательно)</span>
                  </label>
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#5B5BD6] hover:bg-[#F5F5FF] transition"
                    onClick={() => photoFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files); }}
                  >
                    <input ref={photoFileRef} type="file" accept="image/*" multiple className="hidden"
                      onChange={e => handlePhotoFiles(e.target.files)} />
                    <Camera size={20} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-xs text-gray-500 font-medium">Нажмите или перетащите фото паспорта</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP</p>
                  </div>
                  {newClientPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {newClientPhotos.map((src, i) => (
                        <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <img src={src} alt={`Паспорт ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <button type="button" onClick={e => { e.stopPropagation(); setPhotoLightbox(i); }}
                              className="bg-white/90 rounded-full p-1 hover:bg-white">
                              <ZoomIn size={11} className="text-gray-700" />
                            </button>
                            <button type="button" onClick={e => { e.stopPropagation(); setNewClientPhotos(prev => prev.filter((_, idx) => idx !== i)); }}
                              className="bg-red-500 rounded-full p-1 hover:bg-red-600">
                              <X size={11} className="text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateNewClient} disabled={!newClientFirst || !newClientPhone}
                    className="bg-[#5B5BD6] text-white rounded-lg px-4 py-2 text-sm hover:bg-[#4a4ac4] disabled:opacity-50">
                    Создать
                  </button>
                  <button onClick={() => setClientMode('search')} className="border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                    Отмена
                  </button>
                </div>
              </div>
            )}

            {/* Product name — always visible */}
            <div>
              <label className="block text-sm text-gray-700 mb-1">Название товара</label>
              <input
                value={productName}
                onChange={e => setProductName(e.target.value)}
                placeholder="Введите название товара (необязательно)"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
              />
            </div>
          </div>

          {/* General settings */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-5 pb-3 border-b border-gray-100">
              <span className="text-[#5B5BD6]">$</span> Общие настройки
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Стоимость <span className="text-red-500">*</span></label>
                <input value={cost} onChange={e => setCost(e.target.value.replace(/[^\d.]/g, ''))}
                  type="text" inputMode="numeric" placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Закупочная стоимость</label>
                <input value={purchaseCost} onChange={e => setPurchaseCost(e.target.value.replace(/[^\d.]/g, ''))}
                  type="text" inputMode="numeric" placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Первый взнос <span className="text-red-500">*</span></label>
                <input value={firstPayment} onChange={e => setFirstPayment(e.target.value.replace(/[^\d.]/g, ''))}
                  type="text" inputMode="numeric" placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Количество месяцев <span className="text-red-500">*</span></label>
                <input value={months} onChange={e => setMonths(e.target.value.replace(/\D/g, ''))}
                  type="text" inputMode="numeric" placeholder="0"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Способ оплаты</label>
                <div className="relative">
                  <select value={source} onChange={e => setSource(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] appearance-none bg-white">
                    {paymentMethods.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Денежный счет</label>
                <div className="relative">
                  <select value={account} onChange={e => setAccount(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] appearance-none bg-white">
                    {accountOptions.length === 0
                      ? <option value="">Нет счетов</option>
                      : accountOptions.map(a => <option key={a}>{a}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Дата начала договора</label>
                <input value={startDate} onChange={e => setStartDate(formatDate(e.target.value))}
                  placeholder="ДД.ММ.ГГГГ" type="text" inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Число оплаты</label>
                <input value={payDay} onChange={e => {
                  const v = e.target.value.replace(/\D/g, '');
                  const n = parseInt(v);
                  if (v === '') setPayDay('');
                  else if (n >= 1 && n <= 31) setPayDay(v);
                }} type="text" inputMode="numeric" placeholder="1"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
            </div>
          </div>

          {/* Время учитывать — for existing partial debts */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={useEffectiveTerm}
                onChange={e => setUseEffectiveTerm(e.target.checked)}
                className="mt-1 w-4 h-4 accent-[#5B5BD6] cursor-pointer"
              />
              <div className="flex-1">
                <div className="text-sm font-medium text-gray-800">Время учитывать</div>
                <div className="text-xs text-gray-500 mt-0.5">
                  Для существующих договоров: укажите фактически оставшийся срок. Срок рассрочки сохраняется как есть (для истории), а расчёт идёт по оставшемуся времени.
                </div>
              </div>
            </label>
            {useEffectiveTerm && (
              <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Единица</label>
                  <div className="relative">
                    <select
                      value={effectiveUnit}
                      onChange={e => setEffectiveUnit(e.target.value as 'months' | 'days')}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] appearance-none bg-white"
                    >
                      <option value="months">Месяцы</option>
                      <option value="days">Дни</option>
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">
                    Осталось {effectiveUnit === 'months' ? 'месяцев' : 'дней'}
                  </label>
                  <input
                    value={effectiveValue}
                    onChange={e => setEffectiveValue(e.target.value.replace(/\D/g, ''))}
                    type="text" inputMode="numeric"
                    placeholder={effectiveUnit === 'months' ? 'напр. 2' : 'напр. 30'}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Comment */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <label className="block text-sm font-medium text-gray-700 mb-2">Комментарий</label>
            <textarea value={comment} onChange={e => setComment(e.target.value)}
              placeholder="Введите комментарий к договору..."
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] resize-none" />
          </div>

          <button onClick={handleSubmit}
            className="flex items-center gap-2 bg-[#5B5BD6] text-white rounded-xl px-6 py-3 font-semibold hover:bg-[#4a4ac4] transition">
            Создать договор
          </button>
        </div>

        {/* Right calculator */}
        <div className="w-full lg:w-72 shrink-0">
          <div className="bg-[#5B5BD6] rounded-xl p-5 text-white lg:sticky lg:top-6">
            <div className="flex items-center gap-2 mb-5">
              <div className="bg-white/20 rounded-lg p-2">
                <Calculator size={20} />
              </div>
              <span className="font-semibold text-lg">Подсчет</span>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Стоимость</span>
                <span className="font-medium">{costNum.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Первый взнос</span>
                <span className="font-medium">{firstPaymentNum.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">База для наценки</span>
                <span className="font-medium">{(baseForMarkup > 0 ? baseForMarkup : 0).toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/80">Наценка (%)</span>
                <div className="flex items-center gap-1">
                  <input
                    value={markup}
                    onChange={e => setMarkup(e.target.value)}
                    type="number"
                    placeholder="0"
                    className="w-20 bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-right text-sm outline-none focus:border-white [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <span className="text-white/80">%</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Сумма наценки</span>
                <span className="font-medium">{markupAmount.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Итого (система)</span>
                <span className="font-medium">{systemTotal.toLocaleString('ru-RU')} ₽</span>
              </div>

              {/* Editable total */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/80">Итого (ручной)</span>
                <input
                  value={customTotal}
                  onChange={e => setCustomTotal(e.target.value.replace(/[^\d.]/g, ''))}
                  type="text"
                  inputMode="numeric"
                  placeholder={systemTotal.toLocaleString('ru-RU')}
                  className="w-28 bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-right text-sm outline-none focus:border-white placeholder:text-white/50"
                />
              </div>

              {/* Discount badge */}
              {hasDiscount && (
                <div className="bg-green-500/30 border border-green-400/40 rounded-lg px-3 py-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-green-200">Скидка</span>
                    <span className="font-medium text-green-200">-{discountAmount.toLocaleString('ru-RU')} ₽</span>
                  </div>
                  <div className="flex justify-between text-xs mt-1">
                    <span className="text-green-300/70 line-through">{systemTotal.toLocaleString('ru-RU')} ₽</span>
                    <span className="font-bold text-green-100">{customTotalNum.toLocaleString('ru-RU')} ₽</span>
                  </div>
                </div>
              )}

              <div className="flex justify-between text-sm">
                <span className="text-white/80">Количество месяцев</span>
                <span className="font-medium">{monthsNum}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Ежемесячно</span>
                <span className="font-medium">{monthly.toLocaleString('ru-RU')} ₽</span>
              </div>

              {/* Payment schedule */}
              {paymentSchedule.length > 0 && (
                <>
                  <button onClick={() => setShowSchedule(v => !v)}
                    className="flex items-center gap-1 text-white/80 text-xs hover:text-white transition">
                    <ChevronDown size={14} className={showSchedule ? 'rotate-180' : ''} />
                    График платежей ({paymentSchedule.length} мес.)
                  </button>
                  {showSchedule && (
                    <div className="space-y-0">
                      {paymentSchedule.map(p => (
                        <div key={p.month} className="flex justify-between text-xs py-1.5 border-b border-white/10 last:border-0">
                          <span className="text-white/60">{p.month}. {p.date}</span>
                          <span className="font-medium">{p.amount.toLocaleString('ru-RU')} ₽</span>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              <div className="border-t border-white/20 pt-3 mt-2">
                <div className="flex justify-between font-semibold">
                  <span>Итого</span>
                  <span>{total.toLocaleString('ru-RU')} ₽</span>
                </div>
                <div className="flex justify-between text-sm mt-2">
                  <span className="text-white/80">Остаток долга</span>
                  <span className="font-medium">{remainingDebt.toLocaleString('ru-RU')} ₽</span>
                </div>
              </div>
            </div>

            <div className="flex gap-2 mt-5">
              <button
                onClick={async () => {
                  if (!cost || !months) { setAlertMsg('Заполните обязательные поля'); return; }
                  await downloadContractPdf(buildDraft(), selectedClient ?? undefined);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 border border-white/30 rounded-lg py-2.5 text-sm hover:bg-white/10 transition">
                <FileText size={15} /> PDF
              </button>
              <button
                onClick={() => {
                  if (!cost || !months) { setAlertMsg('Заполните обязательные поля'); return; }
                  downloadContractExcel(buildDraft(), selectedClient ?? undefined);
                }}
                className="flex-1 flex items-center justify-center gap-1.5 border border-white/30 rounded-lg py-2.5 text-sm hover:bg-white/10 transition">
                <FileSpreadsheet size={15} /> Excel
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox for passport photos */}
      {photoLightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90" onClick={() => setPhotoLightbox(null)}>
          <img src={newClientPhotos[photoLightbox]} alt="Паспорт"
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/40"
            onClick={() => setPhotoLightbox(null)}>
            <X size={20} />
          </button>
          {newClientPhotos.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setPhotoLightbox(i => ((i ?? 0) - 1 + newClientPhotos.length) % newClientPhotos.length); }}>
                <ChevronDown size={22} className="rotate-90" />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setPhotoLightbox(i => ((i ?? 0) + 1) % newClientPhotos.length); }}>
                <ChevronDown size={22} className="-rotate-90" />
              </button>
            </>
          )}
        </div>
      )}

      {alertMsg && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setAlertMsg('')}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <AlertCircle size={20} className="text-amber-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Внимание</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">{alertMsg}</p>
            <div className="flex justify-end">
              <button onClick={() => setAlertMsg('')}
                className="px-4 py-2 text-sm font-medium text-white bg-[#5B5BD6] rounded-lg hover:bg-[#4a4ac4] transition">
                Понятно
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
