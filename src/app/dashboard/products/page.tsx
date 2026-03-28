'use client';
import { useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Plus, Trash2, X, Package } from 'lucide-react';

export default function ProductsPage() {
  const { products, addProduct, deleteProduct, currentUser } = useApp();
  const isViewer = currentUser?.role === 'viewer';

  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!name.trim()) return;
    addProduct({
      id: String(Date.now()),
      name: name.trim(),
      category: category.trim(),
      price: parseFloat(price) || 0,
    });
    setName('');
    setCategory('');
    setPrice('');
    setShowModal(false);
  };

  const handleDelete = (id: string) => {
    deleteProduct(id);
    setDeleteId(null);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 mb-1">Продукты</h1>
          <p className="text-sm text-gray-500">Каталог товаров ({products.length})</p>
        </div>
        {!isViewer && (
          <button onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 border border-[#5B5BD6] text-[#5B5BD6] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#EEF0FF] transition-colors">
            <Plus size={15} /> Добавить товар
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        {products.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            <Package size={40} className="mx-auto mb-3 text-gray-300" />
            Товары не найдены
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Название', 'Категория', 'Цена', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {products.map(p => (
                <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-900 font-medium">{p.name}</td>
                  <td className="px-4 py-3 text-gray-600">{p.category || '—'}</td>
                  <td className="px-4 py-3 text-gray-700">{p.price > 0 ? `${p.price.toLocaleString('ru-RU')} ₽` : '—'}</td>
                  <td className="px-4 py-3 text-right">
                    {!isViewer && (
                      <button onClick={() => setDeleteId(p.id)}
                        className="text-gray-400 hover:text-red-500 transition-colors">
                        <Trash2 size={15} />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add product modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowModal(false)}>
          <div className="bg-white rounded-2xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-bold text-gray-900">Новый товар</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-700 mb-1">Название <span className="text-red-500">*</span></label>
                <input value={name} onChange={e => setName(e.target.value)} placeholder="Введите название товара"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" autoFocus />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Категория</label>
                <input value={category} onChange={e => setCategory(e.target.value)} placeholder="Электроника, Мебель и т.д."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
              <div>
                <label className="block text-sm text-gray-700 mb-1">Цена (₽)</label>
                <input value={price} onChange={e => setPrice(e.target.value.replace(/[^\d.]/g, ''))}
                  placeholder="0" type="text" inputMode="numeric"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-[#5B5BD6]" />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={handleCreate} disabled={!name.trim()}
                className="flex-1 bg-[#5B5BD6] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-[#4A4AC4] transition-colors disabled:opacity-50">
                Создать
              </button>
              <button onClick={() => setShowModal(false)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation */}
      {deleteId && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="text-4xl mb-3">🗑️</div>
            <h3 className="font-bold text-gray-900 mb-2">Удалить товар?</h3>
            <p className="text-sm text-gray-500 mb-5">Это действие нельзя отменить</p>
            <div className="flex gap-3">
              <button onClick={() => handleDelete(deleteId)}
                className="flex-1 bg-red-500 text-white rounded-lg py-2.5 text-sm font-medium hover:bg-red-600 transition-colors">
                Удалить
              </button>
              <button onClick={() => setDeleteId(null)}
                className="flex-1 border border-gray-200 text-gray-700 rounded-lg py-2.5 text-sm font-medium hover:bg-gray-50 transition-colors">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
