'use client';

import { usePathname } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

const pageTitles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/users': 'Users',
  '/products': 'Products',
  '/categories': 'Categories',
  '/orders': 'Orders',
  '/offers': 'Offers',
};

export default function Header() {
  const pathname = usePathname();
  const { user } = useAuth();

  const title = Object.entries(pageTitles).find(([key]) =>
    pathname === key || pathname.startsWith(key + '/')
  )?.[1] ?? 'Admin';

  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-6">
      <h1 className="text-lg font-semibold text-slate-800">{title}</h1>
      <div className="flex items-center gap-4">
        <button className="relative rounded-full p-2 text-slate-500 hover:bg-slate-100 transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {user?.fullName?.charAt(0).toUpperCase()}
          </div>
          <span className="text-sm font-medium text-slate-700 hidden sm:block">
            {user?.fullName}
          </span>
        </div>
      </div>
    </header>
  );
}
