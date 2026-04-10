'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import {
  LayoutDashboard,
  Users,
  Wallet,
  TrendingUp,
  TrendingDown,
  Target,
  Menu,
  X,
  LogOut,
  Download,
  Check,
  AlertCircle,
} from 'lucide-react';
import { useFamilyStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { db } from '@/lib/instant';

const NAV_ITEMS = [
  { href: '/', label: '总览', icon: LayoutDashboard },
  { href: '/members', label: '家庭成员', icon: Users },
  { href: '/assets', label: '资产管理', icon: Wallet },
  { href: '/income', label: '收入管理', icon: TrendingUp },
  { href: '/expenses', label: '支出管理', icon: TrendingDown },
  { href: '/goals', label: '财务目标', icon: Target },
];

type ExportState = 'idle' | 'busy' | 'done' | 'error';

export function Sidebar() {
  const pathname = usePathname();
  const sidebarOpen = useFamilyStore((s) => s.sidebarOpen);
  const toggleSidebar = useFamilyStore((s) => s.toggleSidebar);
  const { user } = db.useAuth();
  const [exportState, setExportState] = useState<ExportState>('idle');

  async function handleExport() {
    if (!user || exportState === 'busy') return;
    setExportState('busy');
    try {
      const where = { userId: user.id };
      const result = await db.queryOnce({
        members: { $: { where } },
        incomes: { $: { where } },
        expenses: { $: { where } },
        deposits: { $: { where } },
        metals: { $: { where } },
        securities: { $: { where } },
        goals: { $: { where } },
      });

      const payload = {
        version: 1,
        exportedAt: new Date().toISOString(),
        userId: user.id,
        userEmail: user.email,
        data: result.data,
      };

      const blob = new Blob([JSON.stringify(payload, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const date = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `famfi-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setExportState('done');
      setTimeout(() => setExportState('idle'), 2000);
    } catch (e) {
      console.error('Export failed:', e);
      setExportState('error');
      setTimeout(() => setExportState('idle'), 3000);
    }
  }

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={toggleSidebar}
        className="fixed top-4 left-4 z-50 p-2 bg-surface-elevated border border-border text-foreground rounded-md lg:hidden transition-colors hover:border-border-strong"
      >
        {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-30 lg:hidden backdrop-blur-sm"
          onClick={toggleSidebar}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-60 flex flex-col transition-transform duration-300',
          'bg-surface border-r border-border',
          'lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="px-6 py-6 border-b border-border">
          <h1 className="text-xl font-bold tracking-tight text-foreground">
            <span className="text-primary">Fam</span>
            <span className="text-foreground-secondary font-light">Fi</span>
          </h1>
          <p className="text-xs text-foreground-secondary mt-0.5 tracking-wide">
            家庭财务管理
          </p>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-5 space-y-0.5">
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
                  'flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-all duration-200 relative group',
                  isActive
                    ? 'bg-primary/10 text-primary-light'
                    : 'text-foreground-secondary hover:bg-surface-elevated hover:text-foreground'
                )}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 bg-primary rounded-r-full" />
                )}
                <Icon
                  size={17}
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? 'text-primary' : ''}
                />
                {label}
              </Link>
            );
          })}
        </nav>

        {/* User + actions */}
        {user && (
          <div className="px-4 py-3 border-t border-border">
            <div className="flex items-center justify-between gap-2 px-2 py-2 rounded-md hover:bg-surface-elevated transition-colors group">
              <div className="min-w-0">
                <p className="text-xs text-foreground truncate">{user.email}</p>
              </div>
              <div className="flex items-center gap-0.5 flex-shrink-0">
                <button
                  onClick={handleExport}
                  disabled={exportState === 'busy'}
                  title={
                    exportState === 'done'
                      ? '已导出'
                      : exportState === 'error'
                      ? '导出失败'
                      : '导出备份 (JSON)'
                  }
                  className={cn(
                    'p-1.5 rounded-md transition-colors disabled:opacity-60',
                    exportState === 'done'
                      ? 'text-secondary'
                      : exportState === 'error'
                      ? 'text-danger'
                      : 'text-foreground-secondary hover:text-primary'
                  )}
                >
                  {exportState === 'done' ? (
                    <Check size={14} />
                  ) : exportState === 'error' ? (
                    <AlertCircle size={14} />
                  ) : (
                    <Download size={14} className={exportState === 'busy' ? 'animate-pulse' : ''} />
                  )}
                </button>
                <button
                  onClick={() => db.auth.signOut()}
                  title="退出登录"
                  className="p-1.5 rounded-md text-foreground-secondary hover:text-danger transition-colors"
                >
                  <LogOut size={14} />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-3 border-t border-border">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-secondary animate-pulse" />
            <p className="text-xs text-foreground-secondary">
              汇率每小时自动更新
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
