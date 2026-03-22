'use client';

import { useState } from 'react';
import { Landmark, Gem, BarChart3, RefreshCw } from 'lucide-react';
import { db } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { cn } from '@/lib/utils';
import { DepositsTab } from '@/components/assets/deposits-tab';
import { MetalsTab } from '@/components/assets/metals-tab';
import { SecuritiesTab } from '@/components/assets/securities-tab';

type Tab = 'deposits' | 'metals' | 'securities';

const TABS: { key: Tab; label: string; icon: typeof Landmark }[] = [
  { key: 'deposits', label: '存款', icon: Landmark },
  { key: 'metals', label: '贵金属', icon: Gem },
  { key: 'securities', label: '有价证券', icon: BarChart3 },
];

export function AssetManager() {
  const [activeTab, setActiveTab] = useState<Tab>('deposits');
  const rates = useFamilyStore((s) => s.rates);
  const metalPrices = useFamilyStore((s) => s.metalPrices);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const { user } = db.useAuth();
  const userId = user?.id ?? '';

  const { data, isLoading } = db.useQuery({
    members: { $: { where: { userId } } },
  });

  const members: { id: string; name: string; color: string }[] = data?.members || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">资产管理</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          管理存款、贵金属与有价证券
        </p>
      </div>

      {members.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => useFamilyStore.getState().setActiveMember(null)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
              !activeMemberId
                ? 'bg-surface-elevated text-foreground border border-border-strong'
                : 'bg-surface text-foreground-secondary border border-border hover:border-border-strong hover:text-foreground'
            )}
          >
            全部
          </button>
          {members.map((m) => (
            <button
              key={m.id}
              onClick={() =>
                useFamilyStore
                  .getState()
                  .setActiveMember(activeMemberId === m.id ? null : m.id)
              }
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200"
              style={
                activeMemberId === m.id
                  ? { backgroundColor: m.color, color: '#fff' }
                  : { backgroundColor: m.color + '18', color: m.color }
              }
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-200',
              activeTab === key
                ? 'border-primary text-primary-light'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            )}
          >
            <Icon size={15} strokeWidth={activeTab === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'deposits' && (
        <DepositsTab members={members} rates={rates} activeMemberId={activeMemberId} userId={userId} />
      )}
      {activeTab === 'metals' && (
        <MetalsTab members={members} rates={rates} metalPrices={metalPrices} activeMemberId={activeMemberId} userId={userId} />
      )}
      {activeTab === 'securities' && (
        <SecuritiesTab members={members} rates={rates} activeMemberId={activeMemberId} userId={userId} />
      )}
    </div>
  );
}
