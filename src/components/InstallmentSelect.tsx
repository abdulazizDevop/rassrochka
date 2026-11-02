'use client';
import { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown } from 'lucide-react';
import { EXTRA_PAYMENT_LABEL, Installment } from '@/lib/installments';

/** A custom list because browsers ignore line-through on a native <option>. */
export default function InstallmentSelect({ installments, value, monthlyPayment, onChange, allowPaid = false, extraOptions = [EXTRA_PAYMENT_LABEL] }: {
  installments: Installment[];
  value: string;
  monthlyPayment: number;
  onChange: (label: string) => void;
  /** Fixing an existing payment may still need to point at a closed month. */
  allowPaid?: boolean;
  extraOptions?: string[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function h(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  const pick = (label: string) => { onChange(label); setOpen(false); };
  const isPaidValue = installments.some(i => i.label === value && i.status === 'paid');

  return (
    <div className="relative" ref={ref} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}>
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-2 border border-gray-200 rounded-lg px-3 py-2.5 text-sm bg-white outline-none focus:border-[#5B5BD6]"
      >
        <span className={`truncate ${isPaidValue ? 'line-through text-gray-400' : 'text-gray-800'}`}>{value || '—'}</span>
        <ChevronDown size={14} className={`text-gray-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div role="listbox" className="absolute z-20 mt-1 left-0 min-w-full w-64 max-h-72 overflow-y-auto bg-white border border-gray-200 rounded-lg shadow-lg py-1">
          {installments.map(i => {
            const paid = i.status === 'paid';
            return (
              <button
                key={i.index}
                type="button"
                role="option"
                aria-selected={i.label === value}
                disabled={paid && !allowPaid}
                onClick={() => pick(i.label)}
                className={`w-full text-left px-3 py-2 text-sm ${paid && !allowPaid ? 'cursor-not-allowed' : 'hover:bg-gray-50'} ${i.label === value ? 'bg-[#EEF0FF]' : ''}`}
              >
                <span className="flex items-center justify-between gap-2">
                  <span className={paid ? 'line-through text-gray-400' : i.label === value ? 'text-[#5B5BD6] font-medium' : 'text-gray-700'}>{i.label}</span>
                  {paid && <span className="flex items-center gap-1 text-xs text-green-600 shrink-0"><Check size={12} /> оплачен</span>}
                </span>
                {i.status === 'partial' && (
                  <span className="block text-xs text-amber-600 mt-0.5">
                    Оплачено {i.paid.toLocaleString('ru-RU')} из {monthlyPayment.toLocaleString('ru-RU')} ₽
                  </span>
                )}
              </button>
            );
          })}
          {extraOptions.map(option => (
            <button
              key={option}
              type="button"
              role="option"
              aria-selected={option === value}
              onClick={() => pick(option)}
              className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-50 ${option === value ? 'bg-[#EEF0FF] text-[#5B5BD6] font-medium' : 'text-gray-700'}`}
            >
              {option || '—'}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
