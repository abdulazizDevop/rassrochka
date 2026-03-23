'use client';
import { useState, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Client } from '@/lib/types';
import { ChevronDown, Download, Plus, Trash2, Search, Calculator, Camera, X, ZoomIn, FileText, FileSpreadsheet, AlertCircle } from 'lucide-react';
import { downloadContractPdf, downloadContractExcel } from '@/lib/contractPdf';

const TARIFFS = ['стандарт', 'премиум', 'эконом'];
const SOURCES = ['Баланс', 'Инвестиции'];
const ACCOUNTS = ['общий (Доступно: 3 945 563 ₽)'];

export default function CreateContractPage() {
  const router = useRouter();
  const { clients, products, addContract, addClient, contracts, currentUser, depositAccount, addAuditEntry } = useApp();
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
  const [months, setMonths] = useState(6);
  const [source, setSource] = useState('Баланс');
  const [tariff, setTariff] = useState('стандарт');
  const [account, setAccount] = useState(ACCOUNTS[0]);
  const [markup, setMarkup] = useState(0);
  const [productName, setProductName] = useState('');
  const [startDate, setStartDate] = useState(new Date().toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }).replace(/\//g, '.'));
  const [payDay, setPayDay] = useState(5);
  const [comment, setComment] = useState('');
  const [clientSearch, setClientSearch] = useState('');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [showClientResults, setShowClientResults] = useState(false);
  const [showNewClient, setShowNewClient] = useState(false);
  const [newClientFirst, setNewClientFirst] = useState('');
  const [newClientLast, setNewClientLast] = useState('');
  const [newClientMiddle, setNewClientMiddle] = useState('');
  const [newClientPhone, setNewClientPhone] = useState('');
  const [newClientPhotos, setNewClientPhotos] = useState<string[]>([]);
  const [photoLightbox, setPhotoLightbox] = useState<number | null>(null);
  const photoFileRef = useRef<HTMLInputElement>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [alertMsg, setAlertMsg] = useState('');

  const costNum = parseFloat(cost) || 0;
  const firstPaymentNum = parseFloat(firstPayment) || 0;
  const markupPercent = costNum > 0 ? (markup / costNum) * 100 : 0;
  const totalWithMarkup = costNum + markup;
  const amountAfterFirst = totalWithMarkup - firstPaymentNum;
  const monthly = months > 0 ? Math.ceil(amountAfterFirst / months) : 0;
  const total = firstPaymentNum + monthly * months;
  const remainingDebt = amountAfterFirst;

  const paymentSchedule = useMemo(() => {
    const schedule = [];
    const [d, m, y] = startDate.split('.').map(Number);
    let current = new Date(y, m - 1, d);
    for (let i = 0; i < months; i++) {
      current = new Date(current);
      current.setMonth(current.getMonth() + 1);
      schedule.push({
        month: i + 1,
        date: current.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' }),
        amount: monthly,
      });
    }
    return schedule;
  }, [startDate, months, monthly]);

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
    // optimistic base64 preview first
    Array.from(files).forEach(file => {
      const reader = new FileReader();
      reader.onload = e => { setNewClientPhotos(prev => [...prev, e.target?.result as string]); };
      reader.readAsDataURL(file);
    });
    // then upload and replace with server URLs once client is created (handled on save)
  };

  const handleCreateNewClient = () => {
    if (!newClientFirst || !newClientPhone) return;
    const newClient: Client = {
      id: Date.now().toString(),
      firstName: newClientFirst,
      lastName: newClientLast,
      middleName: newClientMiddle,
      phone: newClientPhone,
      contractsCount: 0,
      passportPhotos: newClientPhotos,
    };
    addClient(newClient);
    setSelectedClient(newClient);
    setShowNewClient(false);
    setNewClientFirst(''); setNewClientLast(''); setNewClientMiddle(''); setNewClientPhone('');
    setNewClientPhotos([]);
  };

  const handleSubmit = () => {
    if (!selectedClient || !productName || !cost) {
      setAlertMsg('Заполните все обязательные поля');
      return;
    }
    const newContract = {
      id: Date.now().toString(),
      number: contracts.length + 1,
      createdAt: startDate,
      endDate: paymentSchedule[paymentSchedule.length - 1]?.date ?? startDate,
      clientId: selectedClient.id,
      clientName: `${selectedClient.lastName} ${selectedClient.firstName} ${selectedClient.middleName}`.trim(),
      product: productName,
      phone: selectedClient.phone,
      status: 'На проверке' as const,
      remainingDebt: amountAfterFirst,
      monthlyPayment: monthly,
      paymentStatus: 'Новый договор' as const,
      cost: costNum,
      purchaseCost: parseFloat(purchaseCost) || 0,
      markup,
      firstPayment: firstPaymentNum,
      months,
      source,
      tariff,
      account: 'общий',
      startDate,
      payDay,
      comment,
      approved: false,
    };
    addContract(newContract);
    // Process first payment if any
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Создание договора</h1>
        <p className="text-sm text-gray-500 mt-1">Заполните форму для создания нового договора</p>
      </div>

      <div className="flex gap-6">
        {/* Left form */}
        <div className="flex-1 space-y-6">
          {/* General settings */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-5 pb-3 border-b border-gray-100">
              <span className="text-[#5B5BD6]">$</span> Общие настройки
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Стоимость <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input value={cost} onChange={e => setCost(e.target.value)} type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] pr-8" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col text-gray-300 text-xs leading-none">
                    <span>▲</span><span>▼</span>
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Закупочная стоимость</label>
                <div className="relative">
                  <input value={purchaseCost} onChange={e => setPurchaseCost(e.target.value)} type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] pr-8" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col text-gray-300 text-xs leading-none">
                    <span>▲</span><span>▼</span>
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Первый взнос</label>
                <div className="relative">
                  <input value={firstPayment} onChange={e => setFirstPayment(e.target.value)} type="number"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] pr-8" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col text-gray-300 text-xs leading-none">
                    <span>▲</span><span>▼</span>
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Количество месяцев <span className="text-red-500">*</span></label>
                <div className="relative">
                  <input value={months} onChange={e => setMonths(parseInt(e.target.value) || 1)} type="number" min={1} max={60}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] pr-8" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col text-gray-300 text-xs leading-none">
                    <span>▲</span><span>▼</span>
                  </span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Источник финансирования</label>
                <div className="relative">
                  <select value={source} onChange={e => setSource(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] appearance-none bg-white">
                    {SOURCES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Тариф <span className="text-red-500">*</span></label>
                <div className="relative">
                  <select value={tariff} onChange={e => setTariff(e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] appearance-none bg-white">
                    {TARIFFS.map(t => <option key={t}>{t}</option>)}
                  </select>
                  <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-sm text-gray-700 mb-1">Денежный счет <span className="text-red-500">*</span></label>
                <div className="flex gap-3">
                  <div className="relative flex-1">
                    <select value={account} onChange={e => setAccount(e.target.value)}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] appearance-none bg-white">
                      {ACCOUNTS.map(a => <option key={a}>{a}</option>)}
                    </select>
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                  </div>
                  <div className="border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-400 whitespace-nowrap">
                    Доступно: <span className="text-green-600 font-medium">0 ₽</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Client section */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-5 pb-3 border-b border-gray-100">
              <span className="text-[#5B5BD6]">👤</span> Клиент<span className="text-red-500">*</span>
            </h2>

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
            ) : (
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
            )}

            {showNewClient ? (
              <div className="border border-gray-200 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input value={newClientFirst} onChange={e => setNewClientFirst(e.target.value)} placeholder="Имя *"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                  <input value={newClientLast} onChange={e => setNewClientLast(e.target.value)} placeholder="Фамилия"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                  <input value={newClientMiddle} onChange={e => setNewClientMiddle(e.target.value)} placeholder="Отчество"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                  <input value={newClientPhone} onChange={e => setNewClientPhone(e.target.value)} placeholder="Телефон *"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
                </div>

                {/* Passport photos */}
                <div>
                  <label className="block text-sm text-gray-600 mb-2 flex items-center gap-1.5">
                    <Camera size={14} className="text-[#5B5BD6]" /> Фото паспорта
                    <span className="text-gray-400 font-normal text-xs">(необязательно)</span>
                  </label>

                  {/* Upload button */}
                  <div
                    className="border-2 border-dashed border-gray-200 rounded-xl p-4 text-center cursor-pointer hover:border-[#5B5BD6] hover:bg-[#F5F5FF] transition"
                    onClick={() => photoFileRef.current?.click()}
                    onDragOver={e => e.preventDefault()}
                    onDrop={e => { e.preventDefault(); handlePhotoFiles(e.dataTransfer.files); }}
                  >
                    <input
                      ref={photoFileRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={e => handlePhotoFiles(e.target.files)}
                    />
                    <Camera size={20} className="mx-auto text-gray-300 mb-1" />
                    <p className="text-xs text-gray-500 font-medium">Нажмите или перетащите фото паспорта</p>
                    <p className="text-xs text-gray-400 mt-0.5">JPG, PNG, WEBP · можно несколько</p>
                  </div>

                  {/* Thumbnails */}
                  {newClientPhotos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-3">
                      {newClientPhotos.map((src, i) => (
                        <div key={i} className="relative group w-16 h-16 rounded-lg overflow-hidden border border-gray-200">
                          <img src={src} alt={`Паспорт ${i + 1}`} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setPhotoLightbox(i); }}
                              className="bg-white/90 rounded-full p-1 hover:bg-white"
                            >
                              <ZoomIn size={11} className="text-gray-700" />
                            </button>
                            <button
                              type="button"
                              onClick={e => { e.stopPropagation(); setNewClientPhotos(prev => prev.filter((_, idx) => idx !== i)); }}
                              className="bg-red-500 rounded-full p-1 hover:bg-red-600"
                            >
                              <X size={11} className="text-white" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button onClick={handleCreateNewClient} className="bg-[#5B5BD6] text-white rounded-lg px-4 py-2 text-sm hover:bg-[#4a4ac4]">
                    Создать
                  </button>
                  <button onClick={() => setShowNewClient(false)} className="border border-gray-200 rounded-lg px-4 py-2 text-sm hover:bg-gray-50">
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <button onClick={() => setShowNewClient(true)}
                className="flex items-center gap-2 border border-[#5B5BD6] text-[#5B5BD6] rounded-lg px-4 py-2 text-sm hover:bg-[#EEF0FF] transition">
                <Plus size={16} /> Создать нового клиента
              </button>
            )}
          </div>

          {/* Products section */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <h2 className="flex items-center gap-2 font-semibold text-gray-900 mb-5 pb-3 border-b border-gray-100">
              <span className="text-[#5B5BD6]">🛒</span> Товары<span className="text-red-500">*</span>
            </h2>
            <div>
              <label className="block text-sm text-gray-700 mb-1">Название товара</label>
              <div className="flex gap-2">
                <input
                  value={productName}
                  onChange={e => setProductName(e.target.value)}
                  placeholder="Введите название или выберите товар"
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
                />
                <button className="text-red-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
              <button className="flex items-center gap-2 border border-[#5B5BD6] text-[#5B5BD6] rounded-lg px-4 py-2 text-sm hover:bg-[#EEF0FF] transition mt-3">
                <Plus size={16} /> Добавить позицию
              </button>
            </div>
          </div>

          {/* Dates */}
          <div className="bg-white rounded-xl p-6 border border-gray-100">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Дата начала договора</label>
                <input value={startDate} onChange={e => setStartDate(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Число оплаты</label>
                <div className="relative">
                  <input value={payDay} onChange={e => setPayDay(parseInt(e.target.value) || 1)} type="number" min={1} max={31}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6] pr-8" />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col text-gray-300 text-xs leading-none">
                    <span>▲</span><span>▼</span>
                  </span>
                </div>
              </div>
            </div>
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
            ✓ Создать договор
          </button>
        </div>

        {/* Right calculator */}
        <div className="w-72 shrink-0">
          <div className="bg-[#5B5BD6] rounded-xl p-5 text-white sticky top-6">
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
              <div className="flex justify-between items-center text-sm">
                <span className="text-white/80">Наценка</span>
                <div className="flex items-center gap-1">
                  <input
                    value={markup}
                    onChange={e => setMarkup(parseFloat(e.target.value) || 0)}
                    type="number"
                    className="w-20 bg-white/20 border border-white/30 rounded-lg px-2 py-1 text-white text-right text-sm outline-none focus:border-white"
                  />
                  <span className="text-white/80">₽</span>
                </div>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Процент наценки</span>
                <span className="font-medium">{markupPercent.toFixed(2)} %</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Количество месяцев</span>
                <span className="font-medium">{months}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Первый взнос</span>
                <span className="font-medium">{firstPaymentNum.toLocaleString('ru-RU')} ₽</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-white/80">Ежемесячно</span>
                <span className="font-medium">{monthly.toLocaleString('ru-RU')} ₽</span>
              </div>

              {/* Payment schedule toggle */}
              <button onClick={() => setShowSchedule(v => !v)}
                className="flex items-center gap-1 text-white/80 text-xs hover:text-white transition">
                <ChevronDown size={14} className={showSchedule ? 'rotate-180' : ''} />
                График платежей
              </button>

              {showSchedule && (
                <div className="bg-white/10 rounded-lg p-3 space-y-1.5 max-h-40 overflow-y-auto">
                  {paymentSchedule.map(p => (
                    <div key={p.month} className="flex justify-between text-xs">
                      <span className="text-white/70">{p.date}</span>
                      <span className="font-medium">{p.amount.toLocaleString('ru-RU')} ₽</span>
                    </div>
                  ))}
                </div>
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
                    if (!selectedClient || !productName || !cost) { setAlertMsg('Заполните все поля'); return; }
                    const draftContract = {
                      id: 'draft', number: contracts.length + 1, createdAt: startDate,
                      endDate: paymentSchedule[paymentSchedule.length - 1]?.date ?? startDate,
                      clientId: selectedClient.id, clientName: `${selectedClient.lastName} ${selectedClient.firstName} ${selectedClient.middleName}`.trim(),
                      product: productName, phone: selectedClient.phone, status: 'На проверке' as const,
                      remainingDebt: amountAfterFirst, monthlyPayment: monthly, paymentStatus: 'Новый договор' as const,
                      cost: costNum, purchaseCost: parseFloat(purchaseCost) || 0, markup, firstPayment: firstPaymentNum,
                      months, source, tariff, account: 'общий', startDate, payDay, comment, approved: false,
                    };
                    await downloadContractPdf(draftContract, selectedClient);
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 border border-white/30 rounded-lg py-2.5 text-sm hover:bg-white/10 transition">
                  <FileText size={15} /> PDF
                </button>
                <button
                  onClick={() => {
                    if (!selectedClient || !productName || !cost) { setAlertMsg('Заполните все поля'); return; }
                    const draftContract = {
                      id: 'draft', number: contracts.length + 1, createdAt: startDate,
                      endDate: paymentSchedule[paymentSchedule.length - 1]?.date ?? startDate,
                      clientId: selectedClient.id, clientName: `${selectedClient.lastName} ${selectedClient.firstName} ${selectedClient.middleName}`.trim(),
                      product: productName, phone: selectedClient.phone, status: 'На проверке' as const,
                      remainingDebt: amountAfterFirst, monthlyPayment: monthly, paymentStatus: 'Новый договор' as const,
                      cost: costNum, purchaseCost: parseFloat(purchaseCost) || 0, markup, firstPayment: firstPaymentNum,
                      months, source, tariff, account: 'общий', startDate, payDay, comment, approved: false,
                    };
                    downloadContractExcel(draftContract, selectedClient);
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/90"
          onClick={() => setPhotoLightbox(null)}
        >
          <img
            src={newClientPhotos[photoLightbox]}
            alt="Паспорт"
            className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain"
            onClick={e => e.stopPropagation()}
          />
          <button
            className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/40"
            onClick={() => setPhotoLightbox(null)}
          >
            <X size={20} />
          </button>
          {newClientPhotos.length > 1 && (
            <>
              <button
                className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setPhotoLightbox(i => ((i ?? 0) - 1 + newClientPhotos.length) % newClientPhotos.length); }}
              >
                <ChevronDown size={22} className="rotate-90" />
              </button>
              <button
                className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setPhotoLightbox(i => ((i ?? 0) + 1) % newClientPhotos.length); }}
              >
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
