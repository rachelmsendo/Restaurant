'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useSelector, useDispatch } from 'react-redux';
import type { RootState } from '@/store';
import { logout } from '@/store/slices/authSlice';
import { cn } from '@/lib/utils';

const NAV = [
  { href: '/admin', label: 'Dashboard', icon: '📊', exact: true },
  { href: '/admin/orders', label: 'Orders', icon: '🧾' },
  { href: '/admin/menu', label: 'Menu Items', icon: '🍽️' },
  { href: '/admin/categories', label: 'Categories', icon: '📂' },
  { href: '/admin/tables', label: 'Tables & QR', icon: '🪑' },
  { href: '/admin/analytics', label: 'Analytics', icon: '📈' },
  { href: '/admin/staff', label: 'Staff', icon: '👥' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const dispatch = useDispatch();

  const { user, token } = useSelector((s: RootState) => s.auth);

  // 🔥 FIX HYDRATION
  const [mounted, setMounted] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (mounted && (!token || !user)) {
      router.replace('/login');
    }
  }, [mounted, token, user, router]);

  // 🔥 PREVENT HYDRATION MISMATCH
  if (!mounted) return null;

  return (
    <div className="min-h-screen bg-surface-100 flex">

      {/* MOBILE OVERLAY */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside
        className={cn(
          "w-60 bg-white border-r border-stone-200 flex flex-col fixed left-0 top-0 h-full z-30 transition-transform",
          sidebarOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        )}
      >
        {/* Logo */}
        <div className="px-5 py-5 border-b border-stone-100">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-brand-500 rounded-xl flex items-center justify-center text-lg">🍽️</div>
            <div>
              <p className="font-bold text-stone-900 text-sm">RestaurantOS</p>
              <p className="text-xs text-stone-400">Admin</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(item => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all',
                  isActive
                    ? 'bg-brand-50 text-brand-700 font-semibold'
                    : 'text-stone-600 hover:bg-stone-50'
                )}
              >
                <span>{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* User */}
        <div className="px-3 py-4 border-t border-stone-100">
          <div className="px-3 py-2 mb-2">
            <p className="text-sm font-medium truncate">{user?.name}</p>
            <p className="text-xs text-stone-400 capitalize">{user?.role}</p>
          </div>

          <button
            onClick={() => {
              dispatch(logout());
              router.push('/login');
            }}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-stone-500 hover:text-red-600 hover:bg-red-50 rounded-xl"
          >
            🚪 Sign out
          </button>
        </div>
      </aside>

      {/* MAIN */}
      <main className="flex-1 md:ml-60 p-4 md:p-6 min-h-screen">

        {/* MOBILE TOP BAR */}
        <div className="md:hidden flex items-center justify-between mb-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 rounded-lg bg-white border"
          >
            ☰
          </button>
          <h1 className="font-semibold">Admin</h1>
        </div>

        {children}
      </main>
    </div>
  );
}