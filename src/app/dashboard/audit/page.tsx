'use client';
import { useState, useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { AuditSection } from '@/lib/types';

const SECTIONS: AuditSection[] = ['Договоры', 'Клиенты', 'Платежи', 'Баланс', 'Инвестиции', 'Настройки', 'Сотрудники', 'Продукты'];

function parseDMY(str: string): Date | null {
  // accepts "DD.MM.YYYY" or "DD.MM.YYYY HH:MM:SS"
  const parts = str.split(' ')[0].split('.');
  if (parts.length !== 3) return null;
  return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0]));
}

function formatDateInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 2) return digits;
  if (digits.length <= 4) return digits.slice(0, 2) + '.' + digits.slice(2);
  return digits.slice(0, 2) + '.' + digits.slice(2, 4) + '.' + digits.slice(4);
}

const ACTION_COLORS: Record<string, string> = {
  'Создание': 'bg-green-100 text-green-700',
  'Редактирование': 'bg-blue-100 text-blue-700',
  'Удаление': 'bg-red-100 text-red-700',
};

export default function AuditPage() {
  const { auditLog, currentUser } = useApp();

  if (currentUser?.role === 'viewer') {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Доступ ограничен</h2>
        <p className="text-gray-500">У вас нет доступа к разделу «Аудит».<br/>Обратитесь к администратору.</p>
      </div>
    );
  }

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sectionFilter, setSectionFilter] = useState('');
  const [employeeFilter, setEmployeeFilter] = useState('');

  const employees = useMemo(() => {
    const set = new Set(auditLog.map(e => e.employee));
    return Array.from(set);
  }, [auditLog]);

  const filtered = useMemo(() => {
    return auditLog.filter(entry => {
      const entryDate = parseDMY(entry.timestamp);
      if (dateFrom) {
        const from = parseDMY(dateFrom);
        if (from && entryDate && entryDate < from) return false;
      }
      if (dateTo) {
        const to = parseDMY(dateTo);
        if (to && entryDate && entryDate > to) return false;
      }
      if (sectionFilter && entry.section !== sectionFilter) return false;
      if (employeeFilter && entry.employee !== employeeFilter) return false;
      return true;
    });
  }, [auditLog, dateFrom, dateTo, sectionFilter, employeeFilter]);

  // Format date input placeholder like 15.03.2026
  const today = new Date();
  const todayStr = `${String(today.getDate()).padStart(2,'0')}.${String(today.getMonth()+1).padStart(2,'0')}.${today.getFullYear()}`;

  return (
    <div className="p-4 md:p-8 max-w-7xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1">История действий сотрудников</h1>
      <p className="text-sm text-gray-400 mb-8">Просматривайте все действия сотрудников в системе</p>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
        <div className="font-semibold text-gray-700 mb-4">Фильтры</div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Период с</label>
            <input
              type="text"
              value={dateFrom}
              onChange={e => setDateFrom(formatDateInput(e.target.value))}
              maxLength={10}
              placeholder={todayStr}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30 focus:border-[#5B5BD6]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Период по</label>
            <input
              type="text"
              value={dateTo}
              onChange={e => setDateTo(formatDateInput(e.target.value))}
              maxLength={10}
              placeholder={todayStr}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30 focus:border-[#5B5BD6]"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Раздел</label>
            <select
              value={sectionFilter}
              onChange={e => setSectionFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30 focus:border-[#5B5BD6]"
            >
              <option value="">Все разделы</option>
              {SECTIONS.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1.5">Сотрудник</label>
            <select
              value={employeeFilter}
              onChange={e => setEmployeeFilter(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-[#5B5BD6]/30 focus:border-[#5B5BD6]"
            >
              <option value="">Все сотрудники</option>
              {employees.map(emp => <option key={emp} value={emp}>{emp}</option>)}
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        {filtered.length === 0 ? (
          <div className="p-12 text-center text-gray-400 text-sm">
            {auditLog.length === 0
              ? 'Записи появятся после первых действий в системе'
              : 'Нет записей по выбранным фильтрам'}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-40">Дата и время</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-28">Сотрудник</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-36">Действие</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-32">Раздел</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Сущность</th>
                <th className="text-left px-4 py-3.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Детали</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry, idx) => (
                <tr
                  key={entry.id}
                  className={`border-b border-gray-50 hover:bg-gray-50/60 transition-colors ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                >
                  <td className="px-5 py-3.5 text-gray-600 whitespace-nowrap font-mono text-xs">
                    {entry.timestamp.replace(' ', '\n').split('\n').map((line, i) => (
                      <div key={i}>{line}</div>
                    ))}
                  </td>
                  <td className="px-4 py-3.5">
                    <span className="text-[#5B5BD6] font-medium">{entry.employee}</span>
                  </td>
                  <td className="px-4 py-3.5">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${ACTION_COLORS[entry.action] ?? 'bg-gray-100 text-gray-600'}`}>
                      {entry.action}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-gray-700 font-medium">{entry.section}</td>
                  <td className="px-4 py-3.5 text-gray-800">{entry.entity}</td>
                  <td className="px-4 py-3.5 text-gray-400 text-xs">{entry.details}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {filtered.length > 0 && (
        <div className="mt-3 text-xs text-gray-400">
          Показано записей: {filtered.length}{auditLog.length !== filtered.length ? ` из ${auditLog.length}` : ''}
        </div>
      )}
    </div>
  );
}
