'use client';
import { useState, useMemo, useRef, useEffect } from 'react';
import { useApp } from '@/context/AppContext';
import { Client } from '@/lib/types';
import { Trash2, Camera, X, ZoomIn, ChevronLeft, ChevronRight, Upload, Pencil } from 'lucide-react';

// ── Passport hover preview ──────────────────────────────────────────────────
function PassportPreview({ photos, anchorRef }: { photos: string[]; anchorRef: React.RefObject<HTMLSpanElement | null> }) {
  const [idx, setIdx] = useState(0);
  const rect = anchorRef.current?.getBoundingClientRect();
  const style: React.CSSProperties = rect ? {
    position: 'fixed', zIndex: 50,
    left: rect.left, top: rect.top - 8,
    transform: 'translateY(-100%)',
  } : { position: 'absolute', zIndex: 50, bottom: '100%', left: 0 };

  if (!photos || photos.length === 0) {
    return (
      <div style={style} className="bg-white border border-gray-200 rounded-xl shadow-2xl p-4 w-56 text-center">
        <div className="text-gray-300 text-4xl mb-2">📄</div>
        <p className="text-xs text-gray-400">Фото паспорта не загружено</p>
      </div>
    );
  }
  return (
    <div style={style} className="bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden w-64">
      <div className="relative">
        <img src={photos[idx]} alt={`Паспорт ${idx + 1}`} className="w-full h-44 object-cover" />
        {photos.length > 1 && (
          <>
            <button
              onMouseDown={e => { e.stopPropagation(); setIdx(i => (i - 1 + photos.length) % photos.length); }}
              className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onMouseDown={e => { e.stopPropagation(); setIdx(i => (i + 1) % photos.length) }}
              className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/40 hover:bg-black/60 text-white rounded-full p-0.5"
            >
              <ChevronRight size={16} />
            </button>
            <span className="absolute bottom-1 right-2 text-xs text-white bg-black/50 rounded px-1">
              {idx + 1}/{photos.length}
            </span>
          </>
        )}
      </div>
      <p className="text-xs text-gray-500 text-center py-2">Фото паспорта</p>
    </div>
  );
}

// ── Edit client modal ────────────────────────────────────────────────────────
function EditClientModal({ client, onClose, onSave }: {
  client: Client;
  onClose: () => void;
  onSave: (id: string, updates: Partial<Client>) => void;
}) {
  const [firstName, setFirstName] = useState(client.firstName);
  const [lastName, setLastName] = useState(client.lastName);
  const [middleName, setMiddleName] = useState(client.middleName);
  const [phone, setPhone] = useState(client.phone);
  const [address, setAddress] = useState(client.address ?? '');

  const handleSubmit = () => {
    if (!firstName.trim() || !phone.trim()) return;
    onSave(client.id, { firstName: firstName.trim(), lastName: lastName.trim(), middleName: middleName.trim(), phone: phone.trim(), address: address.trim() || undefined });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-md mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-5">
          <div className="w-10 h-10 rounded-full bg-[#EEF0FF] flex items-center justify-center">
            <Pencil size={18} className="text-[#5B5BD6]" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900">Редактировать клиента</h3>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Фамилия</label>
            <input value={lastName} onChange={e => setLastName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Имя <span className="text-red-400">*</span></label>
            <input value={firstName} onChange={e => setFirstName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Отчество</label>
            <input value={middleName} onChange={e => setMiddleName(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Телефон <span className="text-red-400">*</span></label>
            <input value={phone} onChange={e => setPhone(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Адрес</label>
            <input value={address} onChange={e => setAddress(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-[#5B5BD6]" />
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-6">
          <button onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
            Отмена
          </button>
          <button onClick={handleSubmit}
            className="px-4 py-2 text-sm font-medium text-white bg-[#5B5BD6] rounded-lg hover:bg-[#4a4ac4] transition">
            Сохранить
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Passport manage modal ───────────────────────────────────────────────────
function PassportModal({ client, onClose, onSave, isViewer }: {
  client: Client;
  onClose: () => void;
  onSave: (photos: string[]) => void;
  isViewer: boolean;
}) {
  const [photos, setPhotos] = useState<string[]>(client.passportPhotos ?? []);
  const [lightbox, setLightbox] = useState<number | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const MAX_PHOTOS = 3;

  // Fetch photos from server on mount
  useEffect(() => {
    fetch(`/api/upload?clientId=${encodeURIComponent(client.id)}`)
      .then(r => r.json())
      .then((data: { photos: { id: string; url: string }[] }) => {
        if (data.photos?.length > 0) {
          setPhotos(data.photos.map(p => p.url));
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [client.id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    if (remaining <= 0) return;
    const allowed = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('clientId', client.id);
      allowed.forEach(f => fd.append('files', f));
      const res = await fetch('/api/upload', { method: 'POST', body: fd });
      if (res.ok) {
        const data = await res.json() as { photos: { id: string; url: string }[] };
        setPhotos(prev => [...prev, ...data.photos.map(p => p.url)]);
      }
    } catch {
      allowed.forEach(file => {
        const reader = new FileReader();
        reader.onload = e => { setPhotos(prev => [...prev, e.target?.result as string]); };
        reader.readAsDataURL(file);
      });
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = (i: number) => setPhotos(prev => prev.filter((_, idx) => idx !== i));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      {lightbox !== null ? (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-black/90" onClick={() => setLightbox(null)}>
          <img src={photos[lightbox]} alt="Паспорт" className="max-w-[90vw] max-h-[90vh] rounded-xl object-contain" onClick={e => e.stopPropagation()} />
          <button className="absolute top-4 right-4 text-white bg-white/20 rounded-full p-2 hover:bg-white/40" onClick={() => setLightbox(null)}>
            <X size={20} />
          </button>
          {photos.length > 1 && (
            <>
              <button className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setLightbox(i => ((i ?? 0) - 1 + photos.length) % photos.length); }}>
                <ChevronLeft size={22} />
              </button>
              <button className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/20 hover:bg-white/40 text-white rounded-full p-2"
                onClick={e => { e.stopPropagation(); setLightbox(i => ((i ?? 0) + 1) % photos.length); }}>
                <ChevronRight size={22} />
              </button>
            </>
          )}
        </div>
      ) : null}

      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div>
            <h2 className="text-lg font-bold text-gray-900">Фото паспорта</h2>
            <p className="text-sm text-gray-500">{`${client.lastName} ${client.firstName} ${client.middleName}`.trim()}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="p-6">
          {/* Upload zone — hidden for viewer */}
          {!isViewer && (
          <div>
            {photos.length < MAX_PHOTOS ? (
              <div
                className="border-2 border-dashed border-gray-200 rounded-xl p-6 text-center cursor-pointer hover:border-[#5B5BD6] hover:bg-[#F5F5FF] transition mb-5"
                onClick={() => fileRef.current?.click()}
                onDragOver={e => e.preventDefault()}
                onDrop={e => { e.preventDefault(); handleFiles(e.dataTransfer.files); }}
              >
                <input ref={fileRef} type="file" accept="image/*" multiple className="hidden" onChange={e => handleFiles(e.target.files)} />
                <Upload size={28} className="mx-auto text-gray-300 mb-2" />
                <p className="text-sm font-medium text-gray-600">{uploading ? 'Загрузка...' : 'Нажмите или перетащите фото'}</p>
                <p className="text-xs text-gray-400 mt-1">JPG, PNG, WEBP · максимум {MAX_PHOTOS} фото · осталось {MAX_PHOTOS - photos.length}</p>
              </div>
            ) : (
              <div className="border-2 border-dashed border-gray-100 rounded-xl p-4 text-center mb-5 bg-gray-50">
                <p className="text-sm text-gray-400">Достигнут лимит — {MAX_PHOTOS} из {MAX_PHOTOS} фото</p>
                <p className="text-xs text-gray-300 mt-0.5">Удалите фото чтобы добавить новое</p>
              </div>
            )}
          </div>
          )}

          {/* Photos grid */}
          {loading ? (
            <div className="flex items-center justify-center py-10 text-gray-400 text-sm">Загрузка фото...</div>
          ) : photos.length > 0 ? (
            <div className="grid grid-cols-3 gap-3 mb-5">
              {photos.map((src, i) => (
                <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-100 aspect-[4/3]">
                  <img src={src} alt={`Паспорт ${i + 1}`} className="w-full h-full object-cover" />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition flex items-center justify-center gap-2 opacity-0 group-hover:opacity-100">
                    <button onClick={() => setLightbox(i)} className="bg-white/90 rounded-full p-1.5 hover:bg-white">
                      <ZoomIn size={14} className="text-gray-700" />
                    </button>
                    {!isViewer && (
                    <button onClick={() => removePhoto(i)} className="bg-red-500 rounded-full p-1.5 hover:bg-red-600">
                      <Trash2 size={14} className="text-white" />
                    </button>
                    )}
                  </div>
                  <span className="absolute bottom-1 left-1 text-[10px] bg-black/50 text-white rounded px-1">{i + 1}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-400 text-sm mb-5">Фото не загружены</p>
          )}

          <div className="flex gap-3">
            {!isViewer && (
              <button onClick={() => onSave(photos)}
                className="flex-1 bg-[#5B5BD6] hover:bg-[#4a4ac4] text-white rounded-xl py-2.5 text-sm font-semibold transition">
                Сохранить
              </button>
            )}
            <button onClick={onClose}
              className="flex-1 border border-gray-200 hover:bg-gray-50 rounded-xl py-2.5 text-sm font-medium transition">
              {isViewer ? 'Закрыть' : 'Отмена'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Row with hover preview ──────────────────────────────────────────────────
function ClientRow({ client, isViewer, onManagePhotos, onDelete, onEdit }: {
  client: Client;
  isViewer: boolean;
  onManagePhotos: (c: Client) => void;
  onDelete: (id: string) => void;
  onEdit: (c: Client) => void;
}) {
  const [hovered, setHovered] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const nameRef = useRef<HTMLSpanElement>(null);
  const fullName = `${client.lastName} ${client.firstName} ${client.middleName}`.trim() || `${client.firstName} ${client.middleName}`.trim();

  return (
    <>
    <tr className="border-b border-gray-50 hover:bg-gray-50">
      {/* ФИО with passport preview */}
      <td className="px-4 py-3">
        <div className="relative inline-block">
          <span
            ref={nameRef}
            className="font-medium text-[#5B5BD6] cursor-pointer underline decoration-dotted underline-offset-2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
            onTouchStart={() => setHovered(v => !v)}
          >
            {fullName}
          </span>
          {hovered && <PassportPreview photos={client.passportPhotos ?? []} anchorRef={nameRef} />}
        </div>
      </td>
      <td className="px-4 py-3 text-gray-700">{client.phone}</td>
      <td className="px-4 py-3 text-gray-500">{client.address || '-'}</td>
      <td className="px-4 py-3 text-gray-700">{client.contractsCount}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-2">
          {!isViewer && (
            <button
              onClick={() => onEdit(client)}
              title="Редактировать"
              className="bg-[#EEF0FF] text-[#5B5BD6] hover:bg-[#dddeff] rounded-lg p-2 transition"
            >
              <Pencil size={14} />
            </button>
          )}
          <button
            onClick={() => onManagePhotos(client)}
            title="Фото паспорта"
            className={`rounded-lg p-2 transition ${(client.passportPhotos?.length ?? 0) > 0
              ? 'bg-[#EEF0FF] text-[#5B5BD6] hover:bg-[#dddeff]'
              : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
          >
            <Camera size={14} />
          </button>
          {!isViewer && (
            <button
              onClick={() => setShowDeleteModal(true)}
              className="bg-red-500 hover:bg-red-600 text-white rounded-lg p-2 transition"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </td>
    </tr>
    {showDeleteModal && (
      <tr><td colSpan={5} className="p-0 border-none">
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setShowDeleteModal(false)}>
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
                <Trash2 size={20} className="text-red-500" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Удалить клиента?</h3>
            </div>
            <p className="text-sm text-gray-500 mb-6">Клиент <strong>{fullName}</strong> будет удалён навсегда.</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setShowDeleteModal(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition">
                Отмена
              </button>
              <button onClick={() => { onDelete(client.id); setShowDeleteModal(false); }}
                className="px-4 py-2 text-sm font-medium text-white bg-red-500 rounded-lg hover:bg-red-600 transition">
                Удалить
              </button>
            </div>
          </div>
        </div>
      </td></tr>
    )}
    </>
  );
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ClientsPage() {
  const { clients, deleteClient, updateClient, currentUser } = useApp();
  const isViewer = currentUser?.role === 'viewer';
  const [search, setSearch] = useState('');
  const [passportClient, setPassportClient] = useState<Client | null>(null);
  const [editClient, setEditClient] = useState<Client | null>(null);
  const [clientPhotos, setClientPhotos] = useState<Record<string, string[]>>({});

  // Load all client photos from server in one request
  useEffect(() => {
    fetch('/api/upload')
      .then(r => r.json())
      .then((data: { byClient: Record<string, { id: string; url: string }[]> }) => {
        if (data.byClient) {
          const map: Record<string, string[]> = {};
          for (const [cid, photos] of Object.entries(data.byClient)) {
            map[cid] = photos.map(p => p.url);
          }
          setClientPhotos(map);
        }
      })
      .catch(() => {});
  }, []);

  // Merge server photos into client data for display
  const clientsWithPhotos = useMemo(() =>
    clients.map(c => ({
      ...c,
      passportPhotos: clientPhotos[c.id] ?? c.passportPhotos ?? [],
    })),
    [clients, clientPhotos]
  );

  const filtered = useMemo(() => {
    if (!search) return clientsWithPhotos;
    const q = search.toLowerCase();
    return clientsWithPhotos.filter(c =>
      `${c.firstName} ${c.lastName} ${c.middleName}`.toLowerCase().includes(q) ||
      c.phone.includes(q)
    );
  }, [clientsWithPhotos, search]);

  const handleSavePhotos = (photos: string[]) => {
    if (!passportClient) return;
    updateClient(passportClient.id, { passportPhotos: photos });
    setClientPhotos(prev => ({ ...prev, [passportClient.id]: photos }));
    setPassportClient(null);
  };

  return (
    <div className="p-4 md:p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Управление клиентами</h1>
        <p className="text-sm text-gray-500 mt-1">Наведите на имя клиента для просмотра фото паспорта</p>
      </div>

      <div className="mb-5 max-w-full sm:max-w-sm">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Поиск"
          className="w-full border border-gray-200 rounded-lg px-4 py-2.5 text-sm outline-none focus:border-[#5B5BD6]"
        />
      </div>

      <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200">
              {['ФИО', 'ТЕЛЕФОН', 'АДРЕС', 'КОЛИЧЕСТВО ДОГОВОРОВ', 'ДЕЙСТВИЯ'].map(h => (
                <th key={h} className="text-left px-4 py-3 text-gray-500 font-medium text-xs uppercase tracking-wide whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map(c => (
              <ClientRow
                key={c.id}
                client={c}
                isViewer={isViewer}
                onManagePhotos={setPassportClient}
                onDelete={deleteClient}
                onEdit={setEditClient}
              />
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-gray-400">Нет клиентов</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {passportClient && (
        <PassportModal
          client={passportClient}
          onClose={() => setPassportClient(null)}
          onSave={handleSavePhotos}
          isViewer={isViewer}
        />
      )}

      {editClient && (
        <EditClientModal
          client={editClient}
          onClose={() => setEditClient(null)}
          onSave={(id, updates) => { updateClient(id, updates); setEditClient(null); }}
        />
      )}
    </div>
  );
}
