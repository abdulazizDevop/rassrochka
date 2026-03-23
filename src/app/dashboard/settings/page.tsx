'use client';
import { useState, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { DollarSign, Paperclip, List, Lock, Printer, Plus, Trash2, Check, Info, Users, Eye, EyeOff, Download, FileText, UserPlus, Pencil } from 'lucide-react';

type Template = { id: string; filename: string; original_name: string; url: string; created_at: string };

const ADMIN_TABS = [
  { id: 'general', label: 'Общие настройки', icon: DollarSign },
  { id: 'files', label: 'Файлы', icon: Paperclip },
  { id: 'tariffs', label: 'Тарифы', icon: List },
  { id: 'password', label: 'Пароль', icon: Lock },
  { id: 'users', label: 'Сотрудники', icon: Users },
] as const;

const VIEWER_TABS = [
  { id: 'general', label: 'Общие настройки', icon: DollarSign },
  { id: 'files', label: 'Файлы', icon: Paperclip },
  { id: 'tariffs', label: 'Тарифы', icon: List },
] as const;

type TabId = 'general' | 'files' | 'tariffs' | 'password' | 'users';

const TEMPLATE_VARS: [string, string][] = [
  ['{fio}', 'ФИО клиента'],
  ['{passport_series_number}', 'Паспорт: серия и номер'],
  ['{passport_issued_by}', 'Паспорт: кем выдан'],
  ['{passport_issued_date}', 'Паспорт: дата выдачи (дд.мм.гггг)'],
  ['{address}', 'Фактический адрес'],
  ['{registration_address}', 'Адрес регистрации'],
  ['{phone}', 'Номер телефона (WhatsApp)'],
  ['{secondary_phone}', 'Дополнительный номер телефона'],
  ['{contract_number}', 'Номер договора'],
  ['{total}', 'Общая стоимость (цена + наценка)'],
  ['{price}', 'Стоимость товаров (без наценки)'],
  ['{markup}', 'Наценка'],
  ['{first_payment}', 'Первый взнос'],
  ['{contract_date}', 'Дата заключения договора (дд.мм.гггг)'],
  ['{end_date}', 'Дата завершения договора (дд.мм.гггг)'],
  ['{months}', 'Количество месяцев'],
  ['{payment_day}', 'Число оплаты (день месяца)'],
  ['{items}', 'Список товаров с количеством и стоимостью\n(каждая позиция с новой строки)'],
  ['{schedule}', 'График платежей (каждый платёж с новой строки)'],
];

function NumberInput({ label, value, onChange, hint }: { label: string; value: number; onChange: (v: number) => void; hint?: string }) {
  return (
    <div className="mb-5">
      <label className="block text-sm text-gray-700 mb-1.5">{label}</label>
      <div className="relative w-80">
        <input
          type="number"
          value={value}
          onChange={e => onChange(Number(e.target.value))}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-8 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30"
        />
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5">
          <button onClick={() => onChange(value + 1)} className="text-gray-400 hover:text-gray-600 leading-none text-xs">▲</button>
          <button onClick={() => onChange(Math.max(0, value - 1))} className="text-gray-400 hover:text-gray-600 leading-none text-xs">▼</button>
        </div>
      </div>
      {hint && <p className="text-xs text-gray-400 mt-1 max-w-sm">{hint}</p>}
    </div>
  );
}

function PasswordField({ label, value, onChange, show, onToggle, placeholder }: {
  label: string; value: string; onChange: (v: string) => void; show: boolean; onToggle: () => void; placeholder?: string;
}) {
  return (
    <div>
      <label className="text-sm text-gray-600 block mb-1.5">{label}</label>
      <div className="relative">
        <input
          type={show ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30"
        />
        <button type="button" onClick={onToggle} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
          {show ? <EyeOff size={16}/> : <Eye size={16}/>}
        </button>
      </div>
    </div>
  );
}

export default function SettingsPage() {
  const { settings, updateSettings, tariffs, addTariff, updateTariff, deleteTariff, currentUser, users, updateUserFull, addUserViaApi, deleteUserViaApi, refreshUsers } = useApp();
  const isAdmin = currentUser?.role === 'admin';
  const isViewer = currentUser?.role === 'viewer';

  if (isViewer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Доступ ограничен</h2>
        <p className="text-gray-500">У вас нет доступа к настройкам.<br/>Обратитесь к администратору.</p>
      </div>
    );
  }

  const TABS = isAdmin ? ADMIN_TABS : VIEWER_TABS;

  const [tab, setTab] = useState<TabId>('general');
  const [saved, setSaved] = useState(false);
  const [local, setLocal] = useState({ ...settings });

  // Templates state
  const [templates, setTemplates] = useState<Template[]>([]);
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [uploadingTemplate, setUploadingTemplate] = useState(false);
  const [templateError, setTemplateError] = useState('');
  const templateFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (tab === 'files') {
      setTemplatesLoading(true);
      fetch('/api/templates')
        .then(r => r.json())
        .then((d: { templates: Template[] }) => setTemplates(d.templates ?? []))
        .catch(() => setTemplates([]))
        .finally(() => setTemplatesLoading(false));
    }
  }, [tab]);

  const handleUploadTemplate = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setTemplateError('');
    setUploadingTemplate(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        const res = await fetch('/api/templates', { method: 'POST', body: fd });
        const data = await res.json() as Template & { error?: string };
        if (!res.ok) { setTemplateError(data.error ?? 'Ошибка загрузки'); continue; }
        setTemplates(prev => [data, ...prev]);
      }
    } finally {
      setUploadingTemplate(false);
      if (templateFileRef.current) templateFileRef.current.value = '';
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    await fetch(`/api/templates?id=${id}`, { method: 'DELETE' });
    setTemplates(prev => prev.filter(t => t.id !== id));
    setDeleteTemplateId(null);
  };

  const [deleteTemplateId, setDeleteTemplateId] = useState<string | null>(null);

  const [newTariffName, setNewTariffName] = useState('');
  const [newTariffMarkup, setNewTariffMarkup] = useState(0);

  // Own credentials change
  const [ownOldPass, setOwnOldPass] = useState('');
  const [ownNewLogin, setOwnNewLogin] = useState(currentUser?.login ?? '');
  const [ownNewPass, setOwnNewPass] = useState('');
  const [ownConfirmPass, setOwnConfirmPass] = useState('');
  const [ownMsg, setOwnMsg] = useState('');
  const [showOwnOld, setShowOwnOld] = useState(false);
  const [showOwnNew, setShowOwnNew] = useState(false);
  const [showOwnConfirm, setShowOwnConfirm] = useState(false);
  const [ownSaving, setOwnSaving] = useState(false);

  // User management (admin only)
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editLogin, setEditLogin] = useState('');
  const [editPass, setEditPass] = useState('');
  const [editConfirm, setEditConfirm] = useState('');
  const [editName, setEditName] = useState('');
  const [editMsg, setEditMsg] = useState('');
  const [showEditPass, setShowEditPass] = useState(false);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteUserLogin, setDeleteUserLogin] = useState<string | null>(null);
  const [deleteUserSaving, setDeleteUserSaving] = useState(false);
  // Add user form
  const [showAddUser, setShowAddUser] = useState(false);
  const [newUserLogin, setNewUserLogin] = useState('');
  const [newUserPass, setNewUserPass] = useState('');
  const [newUserName, setNewUserName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'viewer'>('viewer');
  const [newUserMsg, setNewUserMsg] = useState('');
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [newUserSaving, setNewUserSaving] = useState(false);

  // Refresh users when switching to users tab
  useEffect(() => {
    if (tab === 'users' && isAdmin) { refreshUsers(); }
  }, [tab, isAdmin, refreshUsers]);

  const handleSave = () => {
    updateSettings(local);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleAddTariff = () => {
    if (!newTariffName.trim()) return;
    addTariff({ id: String(Date.now()), name: newTariffName.trim(), markup: newTariffMarkup, isDefault: false });
    setNewTariffName('');
    setNewTariffMarkup(0);
  };

  const handleChangeOwnCredentials = async () => {
    if (!currentUser) return;
    if (ownOldPass !== currentUser.password) { setOwnMsg('Неверный текущий пароль'); return; }
    if (!ownNewLogin.trim()) { setOwnMsg('Логин не может быть пустым'); return; }
    if (ownNewPass && ownNewPass.length < 4) { setOwnMsg('Новый пароль слишком короткий (мин. 4 символа)'); return; }
    if (ownNewPass && ownNewPass !== ownConfirmPass) { setOwnMsg('Пароли не совпадают'); return; }

    const loginChanged = ownNewLogin.trim() !== currentUser.login;
    const passChanged = ownNewPass.length > 0;
    if (!loginChanged && !passChanged) { setOwnMsg('Нет изменений для сохранения'); return; }

    setOwnSaving(true);
    const result = await updateUserFull(
      currentUser.login,
      loginChanged ? ownNewLogin.trim() : undefined,
      passChanged ? ownNewPass : undefined,
      ownOldPass,
    );
    setOwnSaving(false);

    if (result.ok) {
      setOwnMsg('Данные успешно сохранены');
      setOwnOldPass(''); setOwnNewPass(''); setOwnConfirmPass('');
      setOwnNewLogin(result.newLogin ?? ownNewLogin.trim());
      setTimeout(() => setOwnMsg(''), 3000);
    } else {
      setOwnMsg(result.error ?? 'Ошибка сохранения');
    }
  };

  const startEditUser = (u: { login: string; name: string }) => {
    setEditingUser(u.login);
    setEditLogin(u.login);
    setEditName(u.name);
    setEditPass('');
    setEditConfirm('');
    setEditMsg('');
    setShowEditPass(false);
  };

  const handleSaveEditUser = async () => {
    if (!editingUser) return;
    const loginChanged = editLogin.trim() !== editingUser;
    const passChanged = editPass.length > 0;
    const user = users.find(u => u.login === editingUser);
    const nameChanged = editName.trim() !== (user?.name ?? '');
    if (!loginChanged && !passChanged && !nameChanged) { setEditMsg('Нет изменений для сохранения'); return; }
    if (editPass && editPass.length < 4) { setEditMsg('Пароль слишком короткий (мин. 4 символа)'); return; }
    if (editPass && editPass !== editConfirm) { setEditMsg('Пароли не совпадают'); return; }
    if (!editLogin.trim() || editLogin.trim().length < 3) { setEditMsg('Логин слишком короткий (мин. 3 символа)'); return; }
    setEditSaving(true);
    const result = await updateUserFull(
      editingUser,
      loginChanged ? editLogin.trim() : undefined,
      passChanged ? editPass : undefined,
      undefined,
      true,
    );
    // Update name separately if needed
    if (result.ok && nameChanged) {
      await fetch('/api/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login: result.newLogin ?? editingUser, newName: editName.trim(), skipCurrentPasswordCheck: true }),
      });
      await refreshUsers();
    }
    setEditSaving(false);
    if (result.ok) {
      setEditMsg('Данные сохранены');
      setEditPass(''); setEditConfirm('');
      setTimeout(() => { setEditMsg(''); setEditingUser(null); }, 1500);
    } else {
      setEditMsg(result.error ?? 'Ошибка сохранения');
    }
  };

  const handleAddUser = async () => {
    if (!newUserLogin.trim() || newUserLogin.trim().length < 3) { setNewUserMsg('Логин слишком короткий (мин. 3 символа)'); return; }
    if (!newUserPass || newUserPass.length < 4) { setNewUserMsg('Пароль слишком короткий (мин. 4 символа)'); return; }
    if (!newUserName.trim()) { setNewUserMsg('Укажите имя сотрудника'); return; }
    setNewUserSaving(true);
    const result = await addUserViaApi(newUserLogin.trim(), newUserPass, newUserName.trim(), newUserRole);
    setNewUserSaving(false);
    if (result.ok) {
      setNewUserMsg('Сотрудник добавлен');
      setNewUserLogin(''); setNewUserPass(''); setNewUserName(''); setNewUserRole('viewer');
      setTimeout(() => { setNewUserMsg(''); setShowAddUser(false); }, 1500);
    } else {
      setNewUserMsg(result.error ?? 'Ошибка создания');
    }
  };

  const handleDeleteUser = async () => {
    if (!deleteUserLogin) return;
    setDeleteUserSaving(true);
    const result = await deleteUserViaApi(deleteUserLogin);
    setDeleteUserSaving(false);
    if (result.ok) {
      setDeleteUserLogin(null);
    } else {
      setDeleteUserLogin(null);
    }
  };

  return (
    <div className="p-6 max-w-5xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">Настройки приложения</h1>
      <p className="text-sm text-gray-500 mb-6">Управляйте настройками приложения и тарифами</p>

      {/* Tabs */}
      <div className="bg-white rounded-xl border border-gray-100 mb-6">
        <div className="flex border-b border-gray-100 px-2 overflow-x-auto">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === id
                  ? 'border-[#5B5BD6] text-[#5B5BD6]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon size={15} />
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* General */}
      {tab === 'general' && (
        <div className="flex gap-6 flex-wrap">
          <div className="flex-1 min-w-80 bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
              <DollarSign size={16} className="text-gray-500" />
              <h2 className="font-semibold text-gray-800">Общие настройки</h2>
              {isViewer && <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">только просмотр</span>}
            </div>
            {[
              { label: 'Минимальный процент первого взноса (%)', value: local.minFirstPaymentPercent },
              { label: 'Минимальная сумма первого взноса', value: local.minFirstPaymentAmount },
              { label: 'Минимальное количество месяцев', value: local.minMonths },
              { label: 'Максимальное количество месяцев', value: local.maxMonths },
              { label: 'Дней до просрочки', value: local.daysUntilOverdue },
            ].map(({ label, value }) => isViewer ? (
              <div key={label} className="mb-5">
                <label className="block text-sm text-gray-500 mb-1">{label}</label>
                <div className="w-80 border border-gray-100 bg-gray-50 rounded-lg px-3 py-2.5 text-sm text-gray-700">{value}</div>
              </div>
            ) : null)}
            {!isViewer && <>
              <NumberInput label="Минимальный процент первого взноса (%)" value={local.minFirstPaymentPercent} onChange={v => setLocal(s => ({ ...s, minFirstPaymentPercent: v }))} />
              <NumberInput label="Минимальная сумма первого взноса" value={local.minFirstPaymentAmount} onChange={v => setLocal(s => ({ ...s, minFirstPaymentAmount: v }))} />
              <NumberInput label="Минимальное количество месяцев" value={local.minMonths} onChange={v => setLocal(s => ({ ...s, minMonths: v }))} />
              <NumberInput label="Максимальное количество месяцев" value={local.maxMonths} onChange={v => setLocal(s => ({ ...s, maxMonths: v }))} />
              <NumberInput label="Дней до просрочки" value={local.daysUntilOverdue} onChange={v => setLocal(s => ({ ...s, daysUntilOverdue: v }))} hint="Количество дней до наступления статуса Просрочен, после дня оплаты." />
              <div className="flex items-center gap-3 mt-2">
                <button
                  onClick={() => setLocal(s => ({ ...s, enableSecurityDepartment: !s.enableSecurityDepartment }))}
                  className={`relative w-10 h-5 rounded-full transition-colors shrink-0 ${local.enableSecurityDepartment ? 'bg-[#5B5BD6]' : 'bg-gray-300'}`}
                >
                  <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${local.enableSecurityDepartment ? 'translate-x-5' : ''}`} />
                </button>
                <span className="font-semibold text-sm text-gray-800">Включить отдел безопасности</span>
              </div>
              <p className="text-xs text-gray-400 mt-1.5 max-w-sm">Если выключено, новые договоры сразу создаются в статусе &quot;В процессе&quot; без этапа проверки.</p>
            </>}
          </div>

          <div className="w-72">
            <div className="bg-white rounded-xl border border-gray-100 p-5">
              <div className="flex items-center gap-3 mb-4 pb-3 border-b border-gray-100">
                <div className="w-10 h-10 bg-blue-50 rounded-xl flex items-center justify-center">
                  <Printer size={18} className="text-blue-500" />
                </div>
                <div>
                  <p className="font-semibold text-sm text-gray-800">Печать чека</p>
                  <p className="text-xs text-gray-400">Формат и оформление чеков при оплате</p>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-2">Формат печати</p>
              <div className="flex gap-2 mb-4">
                {(['A4', 'Терминал'] as const).map(fmt => (
                  <button key={fmt}
                    onClick={() => !isViewer && setLocal(s => ({ ...s, printFormat: fmt }))}
                    disabled={isViewer}
                    className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${local.printFormat === fmt ? 'border-[#5B5BD6] text-[#5B5BD6] bg-[#EEF0FF]' : 'border-gray-200 text-gray-600'} ${isViewer ? 'opacity-60 cursor-default' : 'hover:border-gray-300'}`}>
                    {fmt}
                  </button>
                ))}
              </div>
              <p className="text-sm text-gray-600 mb-1.5">Название компании в чеке</p>
              <input type="text" value={local.companyName}
                onChange={e => !isViewer && setLocal(s => ({ ...s, companyName: e.target.value }))}
                readOnly={isViewer}
                className={`w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none ${isViewer ? 'bg-gray-50 text-gray-600 cursor-default' : 'focus:ring-2 focus:ring-[#5B5BD6]/30'}`} />
            </div>
          </div>
        </div>
      )}

      {/* Files */}
      {tab === 'files' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Paperclip size={16} className="text-gray-500" />
                <h2 className="font-semibold text-gray-800">Договор с клиентами</h2>
                {isViewer && <span className="ml-2 text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">только просмотр</span>}
              </div>
              {isAdmin && (
                <button
                  onClick={() => templateFileRef.current?.click()}
                  className="flex items-center gap-1.5 text-[#5B5BD6] text-sm font-medium hover:opacity-80"
                >
                  <Plus size={15} />{uploadingTemplate ? 'Загрузка...' : 'Добавить'}
                </button>
              )}
              <input ref={templateFileRef} type="file" accept=".docx" multiple className="hidden"
                onChange={e => handleUploadTemplate(e.target.files)} />
            </div>
            <p className="text-xs text-gray-400 mb-4">Можете загрузить несколько .docx шаблонов договора</p>
            {templateError && <p className="text-sm text-red-500 mb-3">{templateError}</p>}
            {templatesLoading ? (
              <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Загрузка...</div>
            ) : templates.length > 0 ? (
              <div className="space-y-2">
                {templates.map(t => (
                  <div key={t.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-4 py-3">
                    <FileText size={18} className="text-[#5B5BD6] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800 truncate">{t.original_name}</p>
                      <p className="text-xs text-gray-400">{t.created_at}</p>
                    </div>
                    <a href={t.url} download={t.original_name}
                      className="text-gray-400 hover:text-[#5B5BD6] transition p-1.5 rounded-lg hover:bg-[#EEF0FF]" title="Скачать">
                      <Download size={15} />
                    </a>
                    {isAdmin && (
                      <button onClick={() => setDeleteTemplateId(t.id)}
                        className="text-gray-400 hover:text-red-500 transition p-1.5 rounded-lg hover:bg-red-50" title="Удалить">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              isAdmin ? (
                <div
                  className="border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-12 text-gray-400 cursor-pointer hover:border-[#5B5BD6] hover:bg-[#F5F5FF] transition"
                  onClick={() => templateFileRef.current?.click()}
                >
                  <Paperclip size={36} className="mb-2 text-gray-300" />
                  <p className="text-sm font-medium text-gray-500">Нажмите для загрузки шаблона</p>
                  <p className="text-xs text-gray-400 mt-1">Только .docx файлы</p>
                </div>
              ) : (
                <div className="border border-dashed border-gray-200 rounded-xl flex flex-col items-center justify-center py-12 text-gray-400">
                  <Paperclip size={36} className="mb-2 text-gray-300" />
                  <p className="text-sm">Шаблоны не загружены</p>
                </div>
              )
            )}
          </div>
          <div className="bg-white rounded-xl border border-[#5B5BD6]/20 p-6">
            <div className="flex items-center gap-2 mb-1">
              <Info size={16} className="text-[#5B5BD6]" />
              <h2 className="font-semibold text-[#5B5BD6]">Доступные переменные для шаблона</h2>
            </div>
            <p className="text-sm text-gray-500 mb-4">В вашем документе Word используйте переменные в фигурных скобках, например: {'{fio}'}</p>
            <p className="text-sm text-gray-600 mb-3">Список всех доступных переменных:</p>
            <div className="grid grid-cols-2 gap-2">
              {TEMPLATE_VARS.map(([varName, desc]) => (
                <div key={varName} className="flex items-start gap-3 border-l-2 border-gray-100 pl-3 py-2">
                  <code className="bg-gray-100 text-gray-700 text-xs px-2 py-0.5 rounded font-mono whitespace-nowrap shrink-0">{varName}</code>
                  <span className="text-sm text-gray-600 whitespace-pre-line">{desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Tariffs */}
      {tab === 'tariffs' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <List size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Тарифы</h2>
            {isViewer && <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">только просмотр</span>}
          </div>
          <div className="space-y-2 mb-6">
            {tariffs.map(t => (
              <div key={t.id} className="flex items-center gap-3 border border-gray-100 rounded-lg px-4 py-3">
                <div className="flex-1">
                  <span className="font-medium text-sm text-gray-800">{t.name}</span>
                  {t.isDefault && <span className="ml-2 text-xs text-[#5B5BD6] bg-[#EEF0FF] px-2 py-0.5 rounded-full">по умолчанию</span>}
                </div>
                <span className="text-sm text-gray-500">Наценка:</span>
                {isViewer ? (
                  <span className="w-20 border border-gray-100 bg-gray-50 rounded-lg px-2 py-1 text-sm text-gray-700 text-center">{t.markup}</span>
                ) : (
                  <input type="number" value={t.markup} onChange={e => updateTariff(t.id, { markup: Number(e.target.value) })}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                )}
                <span className="text-sm text-gray-400">%</span>
                {!t.isDefault && !isViewer && (
                  <button onClick={() => deleteTariff(t.id)} className="text-red-400 hover:text-red-600"><Trash2 size={15} /></button>
                )}
              </div>
            ))}
          </div>
          {!isViewer && (
            <div className="border border-dashed border-gray-200 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-700 mb-3">Добавить тариф</p>
              <div className="flex gap-3 items-end flex-wrap">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Название</label>
                  <input type="text" value={newTariffName} onChange={e => setNewTariffName(e.target.value)} placeholder="Название тарифа"
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-44 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Наценка (%)</label>
                  <input type="number" value={newTariffMarkup} onChange={e => setNewTariffMarkup(Number(e.target.value))}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-24 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                </div>
                <button onClick={handleAddTariff}
                  className="flex items-center gap-1.5 bg-[#5B5BD6] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#4a4ab5] transition-colors">
                  <Plus size={15} />Добавить
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Password — available to ALL users (own credentials) */}
      {tab === 'password' && (
        <div className="bg-white rounded-xl border border-gray-100 p-6 max-w-md">
          <div className="flex items-center gap-2 mb-5 pb-3 border-b border-gray-100">
            <Lock size={16} className="text-gray-500" />
            <h2 className="font-semibold text-gray-800">Смена логина и пароля</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-sm text-gray-600 block mb-1.5">Текущий пароль <span className="text-red-400">*</span></label>
              <div className="relative">
                <input
                  type={showOwnOld ? 'text' : 'password'}
                  value={ownOldPass}
                  onChange={e => setOwnOldPass(e.target.value)}
                  placeholder="Введите текущий пароль"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30"
                />
                <button type="button" onClick={() => setShowOwnOld(v => !v)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showOwnOld ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            <div className="border-t border-gray-100 pt-4">
              <p className="text-xs text-gray-400 mb-3">Оставьте поля пустыми, если не хотите менять логин или пароль</p>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 block mb-1.5">Новый логин</label>
                  <input
                    type="text"
                    value={ownNewLogin}
                    onChange={e => setOwnNewLogin(e.target.value)}
                    placeholder={currentUser?.login}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30"
                  />
                  <p className="text-xs text-gray-400 mt-1">Текущий: <span className="font-medium text-gray-600">{currentUser?.login}</span></p>
                </div>
                <PasswordField
                  label="Новый пароль"
                  value={ownNewPass}
                  onChange={setOwnNewPass}
                  show={showOwnNew}
                  onToggle={() => setShowOwnNew(v => !v)}
                  placeholder="Введите новый пароль"
                />
                <PasswordField
                  label="Подтвердите новый пароль"
                  value={ownConfirmPass}
                  onChange={setOwnConfirmPass}
                  show={showOwnConfirm}
                  onToggle={() => setShowOwnConfirm(v => !v)}
                  placeholder="Повторите новый пароль"
                />
              </div>
            </div>

            {ownMsg && (
              <p className={`text-sm ${ownMsg.includes('успешно') || ownMsg.includes('сохранен') ? 'text-green-600' : 'text-red-500'}`}>{ownMsg}</p>
            )}
            <button
              onClick={handleChangeOwnCredentials}
              disabled={ownSaving || !ownOldPass}
              className="flex items-center gap-2 bg-[#5B5BD6] text-white text-sm px-5 py-2.5 rounded-lg hover:bg-[#4a4ab5] transition-colors disabled:opacity-50"
            >
              <Lock size={15} />
              {ownSaving ? 'Сохранение...' : 'Сохранить изменения'}
            </button>
          </div>
        </div>
      )}

      {/* Users — admin only: full user management */}
      {tab === 'users' && isAdmin && (
        <div className="space-y-4 max-w-2xl">
          <div className="bg-white rounded-xl border border-gray-100">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Users size={17} className="text-gray-500" />
                <span className="font-semibold text-gray-800">Сотрудники</span>
                <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">{users.length}</span>
              </div>
              <button
                onClick={() => { setShowAddUser(true); setNewUserMsg(''); setNewUserLogin(''); setNewUserPass(''); setNewUserName(''); setNewUserRole('viewer'); }}
                className="flex items-center gap-1.5 border border-[#5B5BD6] text-[#5B5BD6] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#EEF0FF] transition-colors"
              >
                <UserPlus size={15} />
                Добавить сотрудника
              </button>
            </div>

            {/* User list */}
            <div className="divide-y divide-gray-50">
              {users.map(u => (
                <div key={u.login}>
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${u.role === 'admin' ? 'bg-[#EEF0FF]' : 'bg-gray-50'}`}>
                      <Users size={16} className={u.role === 'admin' ? 'text-[#5B5BD6]' : 'text-gray-400'} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-800">{u.name || u.login}</p>
                      <p className="text-xs text-gray-400">
                        Логин: <span className="text-gray-600">{u.login}</span>
                        {' · '}
                        <span className={u.role === 'admin' ? 'text-[#5B5BD6]' : 'text-amber-600'}>
                          {u.role === 'admin' ? 'Администратор' : 'Менеджер (просмотр)'}
                        </span>
                        {u.login === currentUser?.login && <span className="ml-1 text-green-600">(вы)</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {u.login !== currentUser?.login && (
                        <>
                          <button
                            onClick={() => startEditUser(u)}
                            title="Редактировать"
                            className="text-gray-400 hover:text-[#5B5BD6] p-1.5 rounded-lg hover:bg-[#EEF0FF] transition-colors"
                          >
                            <Pencil size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteUserLogin(u.login)}
                            title="Удалить"
                            className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={15} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Inline edit form */}
                  {editingUser === u.login && (
                    <div className="px-5 pb-4 pt-1 bg-gray-50/50 border-t border-gray-100">
                      <div className="max-w-md space-y-3">
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Имя</label>
                          <input type="text" value={editName} onChange={e => setEditName(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-500 block mb-1">Логин</label>
                          <input type="text" value={editLogin} onChange={e => setEditLogin(e.target.value)}
                            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                        </div>
                        <PasswordField
                          label="Новый пароль"
                          value={editPass}
                          onChange={setEditPass}
                          show={showEditPass}
                          onToggle={() => setShowEditPass(v => !v)}
                          placeholder="Оставьте пустым, чтобы не менять"
                        />
                        {editPass && (
                          <PasswordField
                            label="Подтвердите пароль"
                            value={editConfirm}
                            onChange={setEditConfirm}
                            show={showEditPass}
                            onToggle={() => setShowEditPass(v => !v)}
                            placeholder="Повторите пароль"
                          />
                        )}
                        {editMsg && (
                          <p className={`text-sm ${editMsg.includes('сохранен') ? 'text-green-600' : 'text-red-500'}`}>{editMsg}</p>
                        )}
                        <div className="flex gap-2 pt-1">
                          <button onClick={handleSaveEditUser} disabled={editSaving}
                            className="flex items-center gap-1.5 bg-[#5B5BD6] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#4a4ab5] transition-colors disabled:opacity-50">
                            <Check size={14} />
                            {editSaving ? 'Сохранение...' : 'Сохранить'}
                          </button>
                          <button onClick={() => setEditingUser(null)}
                            className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                            Отмена
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {users.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">Сотрудники не найдены</div>
            )}
          </div>

          {/* Add user form modal */}
          {showAddUser && (
            <div className="bg-white rounded-xl border border-[#5B5BD6]/20 p-6">
              <div className="flex items-center gap-2 mb-4 pb-3 border-b border-gray-100">
                <UserPlus size={16} className="text-[#5B5BD6]" />
                <h2 className="font-semibold text-gray-800">Добавить сотрудника</h2>
              </div>
              <div className="max-w-md space-y-3">
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Имя сотрудника <span className="text-red-400">*</span></label>
                  <input type="text" value={newUserName} onChange={e => setNewUserName(e.target.value)} placeholder="Например: Иван Петров"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 block mb-1">Логин <span className="text-red-400">*</span></label>
                  <input type="text" value={newUserLogin} onChange={e => setNewUserLogin(e.target.value)} placeholder="Мин. 3 символа"
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30" />
                </div>
                <PasswordField
                  label="Пароль *"
                  value={newUserPass}
                  onChange={setNewUserPass}
                  show={showNewUserPass}
                  onToggle={() => setShowNewUserPass(v => !v)}
                  placeholder="Мин. 4 символа"
                />
                <div>
                  <label className="text-xs text-gray-500 block mb-1.5">Роль</label>
                  <div className="flex gap-2">
                    {([['viewer', 'Менеджер (просмотр)'], ['admin', 'Администратор']] as const).map(([r, label]) => (
                      <button key={r} onClick={() => setNewUserRole(r)}
                        className={`px-4 py-1.5 rounded-lg text-sm font-medium border transition-colors ${newUserRole === r ? 'border-[#5B5BD6] text-[#5B5BD6] bg-[#EEF0FF]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>
                        {label}
                      </button>
                    ))}
                  </div>
                </div>
                {newUserMsg && (
                  <p className={`text-sm ${newUserMsg.includes('добавлен') ? 'text-green-600' : 'text-red-500'}`}>{newUserMsg}</p>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={handleAddUser} disabled={newUserSaving}
                    className="flex items-center gap-1.5 bg-[#5B5BD6] text-white text-sm px-4 py-2 rounded-lg hover:bg-[#4a4ab5] transition-colors disabled:opacity-50">
                    <Plus size={14} />
                    {newUserSaving ? 'Создание...' : 'Добавить'}
                  </button>
                  <button onClick={() => setShowAddUser(false)}
                    className="text-sm text-gray-500 px-4 py-2 rounded-lg hover:bg-gray-100 transition-colors">
                    Отмена
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
            <Info size={16} className="text-blue-500 shrink-0 mt-0.5" />
            <p className="text-sm text-blue-700">
              <strong>Администратор</strong> — полный доступ ко всем функциям.
              <strong className="ml-1">Менеджер</strong> — видит все данные, но не может редактировать.
              Каждый сотрудник может сменить свой пароль через вкладку «Пароль».
            </p>
          </div>
        </div>
      )}

      {/* Delete user confirmation modal */}
      {deleteUserLogin && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteUserLogin(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Удалить сотрудника?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-1">Логин: <span className="font-medium text-gray-700">{deleteUserLogin}</span></p>
            <p className="text-sm text-gray-500 mb-6">Это действие нельзя отменить. Аккаунт будет удалён навсегда.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteUserLogin(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Отмена
              </button>
              <button onClick={handleDeleteUser} disabled={deleteUserSaving}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition disabled:opacity-50">
                {deleteUserSaving ? 'Удаление...' : 'Удалить'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save bar */}
      {tab === 'general' && !isViewer && (
        <div className="mt-6 flex items-center gap-3 border-t border-gray-100 pt-4">
          <button onClick={handleSave}
            className="flex items-center gap-2 text-[#5B5BD6] font-medium text-sm hover:opacity-80 transition-opacity">
            <Check size={16} />
            {saved ? 'Сохранено!' : 'Сохранить настройки'}
          </button>
        </div>
      )}

      {deleteTemplateId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteTemplateId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Удалить шаблон?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Шаблон будет удалён навсегда. Это действие нельзя отменить.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteTemplateId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Отмена
              </button>
              <button onClick={() => handleDeleteTemplate(deleteTemplateId)}
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
