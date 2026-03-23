'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { loginWithApi } = useApp();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const ok = await loginWithApi(username, password);
    setLoading(false);
    if (ok) {
      router.replace('/dashboard/contracts');
    } else {
      setError('Неверный логин или пароль');
    }
  };

  return (
    <div className="min-h-screen bg-[#f3f4f6] flex flex-col items-center justify-center">
      {/* Logo */}
      <div className="mb-10 flex items-center gap-3">
        <svg width="60" height="56" viewBox="0 0 60 56" fill="none" xmlns="http://www.w3.org/2000/svg">
          {/* Main A shape */}
          <path d="M24 4L2 52H16L20 40H40L44 52H58L36 4H24Z" fill="#5B5BD6"/>
          {/* White cutout inner triangle */}
          <path d="M30 14L36 34H24L30 14Z" fill="white"/>
          {/* Diagonal stripe lines across the A */}
          <clipPath id="aclip"><path d="M24 4L2 52H16L20 40H40L44 52H58L36 4H24Z"/></clipPath>
          <g clipPath="url(#aclip)" opacity="0.35">
            <line x1="8" y1="0" x2="36" y2="56" stroke="white" strokeWidth="5"/>
            <line x1="18" y1="0" x2="46" y2="56" stroke="white" strokeWidth="5"/>
          </g>
        </svg>
        <span className="text-3xl font-bold text-[#5B5BD6]">BestPay</span>
      </div>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md p-10 w-full max-w-md">
        <h1 className="text-2xl font-bold text-center text-gray-900 mb-8">Вход</h1>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm text-gray-700 mb-1">Логин</label>
            <input
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#5B5BD6] transition"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm text-gray-700 mb-1">Пароль</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-[#5B5BD6] transition"
              placeholder=""
            />
          </div>

          {error && <p className="text-red-500 text-sm text-center">{error}</p>}

          <button
            type="submit"
              disabled={loading}
              className="w-full bg-[#5B5BD6] text-white rounded-xl py-3.5 font-semibold text-base hover:bg-[#4a4ac4] transition disabled:opacity-60"
            >
              {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>


      </div>
    </div>
  );
}
