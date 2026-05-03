'use client';
import { useEffect, useRef, useState } from 'react';
import { useApp } from '@/context/AppContext';
import { Archive, Plus, Trash2, Download, FileSpreadsheet, Clock, CheckCircle2, RotateCcw, Upload } from 'lucide-react';

interface BackupRow {
  id: string;
  createdAt: string;
  filename: string;
  note: string;
  size: string;
}

export default function BackupsPage() {
  const { currentUser } = useApp();
  const isViewer = currentUser?.role === 'viewer';
  const [backups, setBackups] = useState<BackupRow[]>([]);
  const [creating, setCreating] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [restoreId, setRestoreId] = useState<string | null>(null);
  const [restoring, setRestoring] = useState(false);
  const [restoreMsg, setRestoreMsg] = useState<string | null>(null);
  const [restoreError, setRestoreError] = useState<string | null>(null);
  const uploadRef = useRef<HTMLInputElement>(null);
  const [lastAuto, setLastAuto] = useState<string | null>(null);
  const [nextBackupIn, setNextBackupIn] = useState('');

  // Countdown to 23:50
  useEffect(() => {
    const update = () => {
      const now = new Date();
      const target = new Date();
      target.setHours(23, 50, 0, 0);
      if (target <= now) target.setDate(target.getDate() + 1);
      const diff = target.getTime() - now.getTime();
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setNextBackupIn(`${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`);
    };
    update();
    const timer = setInterval(update, 1000);
    return () => clearInterval(timer);
  }, []);

  // Load last auto backup info
  useEffect(() => {
    fetch('/api/backups/auto')
      .then(r => r.json())
      .then((d: { lastAuto?: { createdAt: string } | null }) => {
        if (d.lastAuto) setLastAuto(d.lastAuto.createdAt);
      })
      .catch(() => {});
  }, []);

  const loadBackups = async () => {
    try {
      const res = await fetch('/api/backups');
      if (res.ok) {
        const data = await res.json() as { backups: BackupRow[] };
        setBackups(data.backups);
      }
    } catch {
      // API not available yet, silently ignore
    }
  };

  useEffect(() => { loadBackups(); }, []);

  if (isViewer) {
    return (
      <div className="p-6 flex flex-col items-center justify-center min-h-[60vh] text-center">
        <div className="text-5xl mb-4">🔒</div>
        <h2 className="text-xl font-bold text-gray-800 mb-2">Доступ ограничен</h2>
        <p className="text-gray-500">У вас нет доступа к разделу «Резервные копии».<br/>Обратитесь к администратору.</p>
      </div>
    );
  }

  const handleCreate = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/backups', { method: 'POST' });
      if (res.ok) {
        const row = await res.json() as BackupRow;
        setBackups(prev => [row, ...prev]);
      }
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (id: string) => {
    setRestoring(true);
    setRestoreError(null);
    setRestoreMsg(null);
    try {
      const res = await fetch(`/api/backups/restore?id=${id}`, { method: 'POST' });
      const data = await res.json() as { ok?: boolean; restored?: Record<string, number>; error?: string };
      if (!res.ok || !data.ok) {
        setRestoreError(data.error ?? 'Не удалось восстановить');
        return;
      }
      setRestoreMsg('База восстановлена. Страница будет перезагружена.');
      setRestoreId(null);
      await loadBackups();
      setTimeout(() => window.location.reload(), 1500);
    } finally {
      setRestoring(false);
    }
  };

  const handleUploadRestore = async (file: File) => {
    setRestoring(true);
    setRestoreError(null);
    setRestoreMsg(null);
    try {
      const text = await file.text();
      let json: unknown;
      try { json = JSON.parse(text); } catch {
        setRestoreError('Файл не является валидным JSON');
        return;
      }
      const res = await fetch('/api/backups/restore', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(json),
      });
      const data = await res.json() as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setRestoreError(data.error ?? 'Не удалось восстановить');
        return;
      }
      setRestoreMsg('База восстановлена из загруженного файла. Страница будет перезагружена.');
      await loadBackups();
      setTimeout(() => window.location.reload(), 1500);
    } finally {
      setRestoring(false);
      if (uploadRef.current) uploadRef.current.value = '';
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/backups?id=${id}`, { method: 'DELETE' });
    if (res.ok) setBackups(prev => prev.filter(b => b.id !== id));
    setDeleteId(null);
  };

    const handleDownload = (id: string) => {
      const a = document.createElement('a');
      a.href = `/api/backups/download?id=${id}`;
      a.click();
    };

    const handleDownloadExcel = (id: string) => {
      const a = document.createElement('a');
      a.href = `/api/backups/excel?id=${id}`;
      a.click();
    };

    return (
      <div className="p-4 md:p-6 max-w-3xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-1">Резервные копии</h1>
        <p className="text-sm text-gray-500 mb-4">Резервные копии сохраняются в папке <code className="bg-gray-100 px-1 rounded text-xs">/backups</code> проекта</p>

        {/* Auto-backup info banner */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">
          <div className="flex items-center gap-3 bg-[#EEF0FF] border border-[#5B5BD6]/20 rounded-xl px-4 py-3 flex-1">
            <Clock size={16} className="text-[#5B5BD6] shrink-0" />
            <div>
              <p className="text-xs text-[#5B5BD6] font-medium">Следующий авто-бэкап в 23:50</p>
              <p className="text-lg font-bold text-[#5B5BD6] tabular-nums">{nextBackupIn}</p>
            </div>
          </div>
          {lastAuto && (
            <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex-1">
              <CheckCircle2 size={16} className="text-green-600 shrink-0" />
              <div>
                <p className="text-xs text-green-700 font-medium">Последний авто-бэкап</p>
                <p className="text-sm font-semibold text-green-800">{lastAuto}</p>
              </div>
            </div>
          )}
        </div>

      <div className="bg-white rounded-xl border border-gray-100">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Archive size={17} className="text-gray-500" />
            <span className="font-semibold text-gray-800">Список резервных копий</span>
          </div>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              ref={uploadRef}
              type="file"
              accept="application/json,.json"
              className="hidden"
              onChange={e => {
                const f = e.target.files?.[0];
                if (f) handleUploadRestore(f);
              }}
            />
            <button
              onClick={() => uploadRef.current?.click()}
              disabled={restoring}
              className="flex items-center gap-1.5 border border-amber-500 text-amber-600 text-sm font-medium px-4 py-2 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
            >
              <Upload size={15} />
              Загрузить и восстановить
            </button>
            <button
              onClick={handleCreate}
              disabled={creating}
              className="flex items-center gap-1.5 border border-[#5B5BD6] text-[#5B5BD6] text-sm font-medium px-4 py-2 rounded-lg hover:bg-[#EEF0FF] transition-colors disabled:opacity-50"
            >
              <Plus size={15} />
              {creating ? 'Создание...' : 'Создать резервную копию'}
            </button>
          </div>
        </div>

        {restoreMsg && (
          <div className="mx-5 mt-3 px-3 py-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700">{restoreMsg}</div>
        )}
        {restoreError && (
          <div className="mx-5 mt-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">Ошибка: {restoreError}</div>
        )}

        {/* List */}
        {backups.length === 0 ? (
          <div className="py-16 text-center text-gray-400 text-sm">
            Резервные копии не найдены
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {backups.map(b => (
              <div key={b.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="w-9 h-9 bg-gray-50 rounded-lg flex items-center justify-center shrink-0">
                  <Archive size={16} className="text-gray-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{b.filename}</p>
                  <p className="text-xs text-gray-400">{b.createdAt} · {b.note} · {b.size}</p>
                </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleDownload(b.id)}
                      title="Скачать JSON"
                      className="flex items-center gap-1.5 text-xs text-[#5B5BD6] border border-[#5B5BD6]/30 px-3 py-1.5 rounded-lg hover:bg-[#EEF0FF] transition-colors"
                    >
                      <Download size={13} />
                      JSON
                    </button>
                    <button
                      onClick={() => handleDownloadExcel(b.id)}
                      title="Скачать Excel"
                      className="flex items-center gap-1.5 text-xs text-green-600 border border-green-300 px-3 py-1.5 rounded-lg hover:bg-green-50 transition-colors"
                    >
                      <FileSpreadsheet size={13} />
                      Excel
                    </button>
                    <button
                      onClick={() => setRestoreId(b.id)}
                      disabled={restoring}
                      title="Восстановить из этой копии"
                      className="flex items-center gap-1.5 text-xs text-amber-600 border border-amber-300 px-3 py-1.5 rounded-lg hover:bg-amber-50 transition-colors disabled:opacity-50"
                    >
                      <RotateCcw size={13} />
                      Восстановить
                    </button>
                  <button
                    onClick={() => setDeleteId(b.id)}
                    title="Удалить"
                    className="text-red-400 hover:text-red-600 p-1.5 rounded-lg hover:bg-red-50 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDeleteId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Удалить резервную копию?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Это действие нельзя отменить. Копия будет удалена навсегда.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setDeleteId(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Отмена
              </button>
              <button onClick={() => handleDelete(deleteId)}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition">
                Удалить
              </button>
            </div>
          </div>
        </div>
      )}

      {restoreId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => !restoring && setRestoreId(null)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
                <RotateCcw size={20} className="text-amber-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Восстановить базу?</h3>
            </div>
            <p className="text-sm text-gray-600 mb-2">Все текущие данные будут заменены содержимым выбранной копии.</p>
            <p className="text-xs text-gray-500 mb-6">Перед восстановлением будет автоматически создана копия текущей базы (с пометкой «Перед восстановлением»), чтобы вы могли откатиться обратно.</p>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setRestoreId(null)}
                disabled={restoring}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition disabled:opacity-50">
                Отмена
              </button>
              <button
                onClick={() => handleRestore(restoreId)}
                disabled={restoring}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 transition disabled:opacity-50">
                {restoring ? 'Восстановление...' : 'Восстановить'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
