'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import Sidebar from '@/components/Sidebar';

interface DiskInfo {
  freeGB: number | null;
  totalGB: number;
  usedPercent: number;
  warning: boolean;
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { isLoggedIn } = useApp();
  const router = useRouter();
  const [disk, setDisk] = useState<DiskInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!isLoggedIn) {
      router.replace('/login');
    }
  }, [isLoggedIn, router]);

  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/disk-space')
      .then(r => r.json())
      .then((d: DiskInfo) => setDisk(d))
      .catch(() => {});
  }, [isLoggedIn]);

  if (!isLoggedIn) return null;

  const showWarning = !dismissed && disk?.warning;

  return (
    <div className="flex min-h-screen bg-[#f3f4f6]">
      <Sidebar />
      <main className="flex-1 overflow-auto">
        {showWarning && disk && (
          <div className="sticky top-0 z-50 flex items-center gap-3 bg-amber-500 text-white px-5 py-3 shadow-lg animate-pulse-once">
            <svg className="w-6 h-6 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
            <div className="flex-1">
              <span className="font-bold text-base">Внимание! Мало места на диске</span>
              <span className="ml-2 text-amber-100 text-sm">
                Свободно: <strong>{disk.freeGB} ГБ</strong> из {disk.totalGB} ГБ ({disk.usedPercent}% занято).
                Рекомендуется освободить место.
              </span>
            </div>
            <button
              onClick={() => setDismissed(true)}
              className="ml-auto p-1 rounded hover:bg-amber-600 transition"
              title="Закрыть"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}
        {children}
      </main>
    </div>
  );
}
