'use client';
import { useApp } from '@/context/AppContext';
import { Check, X } from 'lucide-react';

export default function SecurityPage() {
  const { contracts, updateContract } = useApp();
  const pending = contracts.filter(c => c.approved === false);

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Отдел безопасности</h1>
        <p className="text-sm text-gray-500 mt-1">Договоры, ожидающие утверждения</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['№', 'Создан', 'Дата начала', 'Дата окончания', 'Срок (мес)', 'ФИО', 'Продукт', 'Стоимость', 'Наценка', 'Первый взнос', 'Действия'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {pending.length === 0 ? (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-gray-400">Нет договоров на проверке</td>
              </tr>
            ) : pending.map(c => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3">{c.number}</td>
                <td className="px-4 py-3">{c.createdAt}</td>
                <td className="px-4 py-3">{c.startDate}</td>
                <td className="px-4 py-3">{c.endDate}</td>
                <td className="px-4 py-3">{c.months}</td>
                <td className="px-4 py-3">{c.clientName}</td>
                <td className="px-4 py-3">{c.product}</td>
                <td className="px-4 py-3">{c.cost.toLocaleString('ru-RU')}</td>
                <td className="px-4 py-3">{c.markup.toLocaleString('ru-RU')}</td>
                <td className="px-4 py-3">{c.firstPayment.toLocaleString('ru-RU')}</td>
                <td className="px-4 py-3">
                  <div className="flex gap-2">
                    <button onClick={() => updateContract(c.id, { status: 'В процессе', approved: true })}
                      className="flex items-center gap-1 bg-green-50 text-green-600 border border-green-200 rounded-lg px-3 py-1 text-xs hover:bg-green-100 transition">
                      <Check size={12} /> Утвердить
                    </button>
                    <button onClick={() => updateContract(c.id, { status: 'Списан' })}
                      className="flex items-center gap-1 bg-red-50 text-red-500 border border-red-200 rounded-lg px-3 py-1 text-xs hover:bg-red-100 transition">
                      <X size={12} /> Отклонить
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
