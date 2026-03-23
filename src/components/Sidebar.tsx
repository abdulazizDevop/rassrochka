'use client';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import {
  FileText, PlusCircle, ShieldCheck, Users,
  Wallet, TrendingUp, BarChart2,
  ClipboardList, Archive, Settings, LogOut
} from 'lucide-react';

const navItems = [
  { href: '/dashboard/contracts', label: 'Договоры', icon: FileText },
  { href: '/dashboard/create', label: 'Создать', icon: PlusCircle },
  { href: '/dashboard/security', label: 'Отд. безопасности', icon: ShieldCheck },
  { href: '/dashboard/clients', label: 'Клиенты', icon: Users },
  { href: '/dashboard/balance', label: 'Баланс', icon: Wallet },
  { href: '/dashboard/investments', label: 'Инвестиции', icon: TrendingUp },
  { href: '/dashboard/analytics', label: 'Аналитика', icon: BarChart2 },

  { href: '/dashboard/audit', label: 'Аудит', icon: ClipboardList },
  { href: '/dashboard/backups', label: 'Резервные копии', icon: Archive },
  { href: '/dashboard/settings', label: 'Настройки', icon: Settings },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { logout, currentUser } = useApp();
  const isViewer = currentUser?.role === 'viewer';

  const handleLogout = () => {
    logout();
    router.replace('/login');
  };

  return (
    <aside className="w-[240px] min-h-screen bg-white border-r border-gray-100 flex flex-col">
      {/* Logo */}
      <div className="px-5 py-5 flex items-center gap-2.5">
          <svg width="32" height="30" viewBox="0 0 60 56" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M24 4L2 52H16L20 40H40L44 52H58L36 4H24Z" fill="#5B5BD6"/>
            <path d="M30 14L36 34H24L30 14Z" fill="white"/>
            <clipPath id="sclip"><path d="M24 4L2 52H16L20 40H40L44 52H58L36 4H24Z"/></clipPath>
            <g clipPath="url(#sclip)" opacity="0.3">
              <line x1="8" y1="0" x2="36" y2="56" stroke="white" strokeWidth="5"/>
              <line x1="18" y1="0" x2="46" y2="56" stroke="white" strokeWidth="5"/>
            </g>
          </svg>
        <span className="text-xl font-bold text-[#5B5BD6]">AkhmadPay</span>
      </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto px-3 py-2">
          {navItems.map(({ href, label, icon: Icon }) => {
            // Viewers only see: contracts, security, clients, analytics
            if (isViewer && (
              href === '/dashboard/create' ||
              href === '/dashboard/balance' ||
              href === '/dashboard/investments' ||
              href === '/dashboard/audit' ||
              href === '/dashboard/backups' ||
              href === '/dashboard/settings'
            )) return null;
            const isActive = pathname === href || pathname.startsWith(href + '/');
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg mb-0.5 text-sm transition-colors ${
                  isActive
                    ? 'bg-[#EEF0FF] text-[#5B5BD6] font-medium'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                }`}
              >
                <Icon size={16} className={isActive ? 'text-[#5B5BD6]' : 'text-gray-400'} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User info + Logout */}
        <div className="px-3 py-4 border-t border-gray-100">
          {currentUser && (
            <div className="px-3 py-2 mb-1">
              <p className="text-sm font-medium text-gray-800">{currentUser.name}</p>
              <p className="text-xs text-gray-400">{isViewer ? 'Только просмотр' : 'Администратор'}</p>
            </div>
          )}
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm text-gray-500 hover:bg-red-50 hover:text-red-500 transition-colors"
          >
            <LogOut size={16} />
            Выйти
          </button>
        </div>
      </aside>
    );
}
