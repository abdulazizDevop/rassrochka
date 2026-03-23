'use client';
import { useApp } from '@/context/AppContext';

export default function ProductsPage() {
  const { products } = useApp();
  return (
    <div className="p-4 md:p-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Продукты</h1>
      <p className="text-sm text-gray-500 mb-6">Каталог товаров</p>
      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              {['Название', 'Категория', 'Цена'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-600 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {products.map(p => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-900">{p.name}</td>
                <td className="px-4 py-3 text-gray-600">{p.category}</td>
                <td className="px-4 py-3 text-gray-700">{p.price.toLocaleString('ru-RU')} ₽</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
