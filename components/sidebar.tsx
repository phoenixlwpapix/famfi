'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  Menu,
  X,
} from 'lucide-react';
import { useFamilyStore } from '@/lib/store';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/', label: '总览', icon: LayoutDashboard },
  { href: '/members', label: '家庭成员', icon: Users },
  { href: '/assets', label: '资产管理', icon: Wallet },
  { href: '/income', label: '收入管理', icon: TrendingUp },
];

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useFamilyStore((s) => s.sidebarOpen);
  const toggleSidebar = useFamilyStore((s) => s.toggleSidebar);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-foreground text-white rounded-md lg:hidden"
      >
        {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/20 z-30 lg:hidden"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-60 bg-white border-r-2 border-gray-100 flex flex-col transition-transform duration-200',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b-2 border-gray-100">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            <span className="text-primary">Fam</span>Fi
          </h1>
          <p className="text-xs text-foreground-secondary mt-0.5">
            家庭财务管理
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href;
            return (
              <Link
                key={href}
                href={href}
                onClick={() => {
                  if (window.innerWidth < 1024) toggleSidebar();
                }}
                className={cn(
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200',
                  isActive
                    ? 'bg-primary text-white'
                    : 'text-foreground-secondary hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon size={18} strokeWidth={2.2} />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-6 py-4 border-t-2 border-gray-100">
          <p className="text-xs text-foreground-secondary">
            汇率每小时自动更新
          </p>
        </div>
      </aside>
    </>
  );
}
