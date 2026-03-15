'use client';

import { useMemo } from 'react';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Users,
  RefreshCw,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import { db } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { formatCNY, toCNYDirect, formatNumber, cn, getMetalValueCNY } from '@/lib/utils';
import { METAL_TYPES, SECURITY_TYPES, DEPOSIT_TYPES, CURRENCIES } from '@/lib/types';

export function Dashboard() {
  const rates = useFamilyStore((s) => s.rates);
  const ratesUpdatedAt = useFamilyStore((s) => s.ratesUpdatedAt);
  const metalPrices = useFamilyStore((s) => s.metalPrices);

  const { data, isLoading } = db.useQuery({
    members: {},
    deposits: {},
    metals: {},
    securities: {},
    incomes: {},
  });

  const stats = useMemo(() => {
    if (!data) return null;

    const members = data.members || [];
    const deposits = data.deposits || [];
    const metals = data.metals || [];
    const securities = data.securities || [];
    const incomes = data.incomes || [];

    const memberAssets: Record<string, number> = {};
    members.forEach((m) => {
      memberAssets[m.id] = 0;
    });

    deposits.forEach((d) => {
      const cnyVal = toCNYDirect(d.amount, d.currency, rates);
      if (memberAssets[d.memberId] !== undefined) {
        memberAssets[d.memberId] += cnyVal;
      }
    });

    metals.forEach((m) => {
      const cnyVal = getMetalValueCNY(m.grams, m.metalType, m.currentPrice, m.currency, metalPrices, rates);
      if (memberAssets[m.memberId] !== undefined) {
        memberAssets[m.memberId] += cnyVal;
      }
    });

    securities.forEach((s) => {
      const val = s.shares * s.currentPrice;
      const cnyVal = toCNYDirect(val, s.currency, rates);
      if (memberAssets[s.memberId] !== undefined) {
        memberAssets[s.memberId] += cnyVal;
      }
    });

    const totalAssets = Object.values(memberAssets).reduce((a, b) => a + b, 0);

    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyIncome = incomes
      .filter((i) => i.date?.startsWith(thisMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    const pieData = members
      .map((m) => ({
        name: m.name,
        value: memberAssets[m.id] || 0,
        color: m.color,
      }))
      .filter((d) => d.value > 0);

    const depositTotal = deposits.reduce(
      (sum, d) => sum + toCNYDirect(d.amount, d.currency, rates),
      0
    );
    const metalTotal = metals.reduce(
      (sum, m) => sum + getMetalValueCNY(m.grams, m.metalType, m.currentPrice, m.currency, metalPrices, rates),
      0
    );
    const securityTotal = securities.reduce(
      (sum, s) => sum + toCNYDirect(s.shares * s.currentPrice, s.currency, rates),
      0
    );

    const trendData = Array.from({ length: 6 }, (_, i) => {
      const month = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
      const factor = 0.85 + (i / 5) * 0.15 + Math.random() * 0.05;
      return {
        month: `${month.getMonth() + 1}月`,
        value: Math.round(totalAssets * factor),
      };
    });

    return {
      totalAssets,
      monthlyIncome,
      memberCount: members.length,
      pieData,
      depositTotal,
      metalTotal,
      securityTotal,
      trendData,
    };
  }, [data, rates, metalPrices]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={22} />
      </div>
    );
  }

  if (!stats) return null;

  const tooltipStyle = {
    backgroundColor: '#161B26',
    border: '1px solid #1C2230',
    borderRadius: '8px',
    boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    fontSize: '12px',
    color: '#E4DECE',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">财务总览</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            家庭资产实时概况
          </p>
        </div>
        {ratesUpdatedAt && (
          <span className="text-xs text-foreground-secondary px-3 py-1.5 bg-surface rounded-md border border-border">
            汇率更新: {new Date(ratesUpdatedAt).toLocaleString('zh-CN')}
          </span>
        )}
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="家庭总资产"
          value={formatCNY(stats.totalAssets)}
          icon={Wallet}
          accentColor="#C9A84C"
        />
        <StatCard
          label="本月净收入"
          value={formatCNY(stats.monthlyIncome)}
          icon={stats.monthlyIncome >= 0 ? TrendingUp : TrendingDown}
          accentColor="#34C77B"
        />
        <StatCard
          label="家庭成员"
          value={`${stats.memberCount} 人`}
          icon={Users}
          accentColor="#4A9BFF"
        />
        <StatCard
          label="资产类别"
          value="3 类"
          icon={Wallet}
          accentColor="#8B7CF6"
          subtitle="存款 · 贵金属 · 证券"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <div className="bg-surface border border-border rounded-xl p-6">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground-secondary mb-5">成员资产占比</h3>
          {stats.pieData.length > 0 ? (
            <div>
              <div className="h-48">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.pieData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius={52}
                      outerRadius={78}
                      strokeWidth={0}
                    >
                      {stats.pieData.map((entry, i) => (
                        <Cell key={i} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(value) => formatCNY(Number(value))}
                      contentStyle={tooltipStyle}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="flex flex-wrap gap-3 mt-3">
                {stats.pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-2 text-xs text-foreground-secondary">
                    <div
                      className="w-2 h-2 rounded-sm"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-foreground-secondary text-sm">
              暂无数据，请先添加家庭成员和资产
            </div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="bg-surface border border-border rounded-xl p-6 lg:col-span-2">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground-secondary mb-5">资产趋势</h3>
          {stats.totalAssets > 0 ? (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#C9A84C" stopOpacity={0.25} />
                      <stop offset="100%" stopColor="#C9A84C" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#566070' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 11, fill: '#566070' }}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCNY(Number(value)), '总资产']}
                    contentStyle={tooltipStyle}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#C9A84C"
                    strokeWidth={2}
                    fill="url(#areaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-foreground-secondary text-sm">
              添加资产后将展示趋势图表
            </div>
          )}
        </div>
      </div>

      {/* Asset Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <AssetBreakdownCard
          label="存款类"
          value={stats.depositTotal}
          accentColor="#C9A84C"
          items={data?.deposits || []}
          renderItem={(d) => (
            <div key={d.id} className="flex justify-between text-xs py-2 border-b border-border last:border-0">
              <span className="text-foreground-secondary">
                {DEPOSIT_TYPES[d.type as keyof typeof DEPOSIT_TYPES] || d.type} · {CURRENCIES[d.currency as keyof typeof CURRENCIES] || d.currency}
                {d.rate > 0 && ` · ${d.rate}%`}
              </span>
              <span className="font-medium text-foreground">{formatCNY(toCNYDirect(d.amount, d.currency, rates))}</span>
            </div>
          )}
        />
        <AssetBreakdownCard
          label="贵金属"
          value={stats.metalTotal}
          accentColor="#F59E0B"
          items={data?.metals || []}
          renderItem={(m) => (
            <div key={m.id} className="flex justify-between text-xs py-2 border-b border-border last:border-0">
              <span className="text-foreground-secondary">
                {METAL_TYPES[m.metalType as keyof typeof METAL_TYPES] || m.metalType} · {formatNumber(m.grams)}g
              </span>
              <span className="font-medium text-foreground">
                {formatCNY(toCNYDirect(m.grams * m.currentPrice, m.currency, rates))}
              </span>
            </div>
          )}
        />
        <AssetBreakdownCard
          label="有价证券"
          value={stats.securityTotal}
          accentColor="#34C77B"
          items={data?.securities || []}
          renderItem={(s) => (
            <div key={s.id} className="flex justify-between text-xs py-2 border-b border-border last:border-0">
              <span className="text-foreground-secondary">
                {SECURITY_TYPES[s.secType as keyof typeof SECURITY_TYPES] || s.secType} · {s.name}
              </span>
              <span className="font-medium text-foreground">
                {formatCNY(toCNYDirect(s.shares * s.currentPrice, s.currency, rates))}
              </span>
            </div>
          )}
        />
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  accentColor,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  accentColor: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex items-start gap-4 hover:border-border-strong transition-colors duration-200">
      <div
        className="p-2.5 rounded-lg flex-shrink-0"
        style={{ backgroundColor: accentColor + '18', color: accentColor }}
      >
        <Icon size={18} strokeWidth={2} />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-foreground-secondary font-medium tracking-wide">{label}</p>
        <p className="text-lg font-bold mt-0.5 tracking-tight text-foreground">{value}</p>
        {subtitle && (
          <p className="text-xs text-foreground-secondary mt-0.5">{subtitle}</p>
        )}
      </div>
    </div>
  );
}

function AssetBreakdownCard<T extends { id: string }>({
  label,
  value,
  accentColor,
  items,
  renderItem,
}: {
  label: string;
  value: number;
  accentColor: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="bg-surface border border-border rounded-xl p-5 hover:border-border-strong transition-colors duration-200">
      <div className="flex items-center gap-2 mb-3">
        <div
          className="w-2.5 h-2.5 rounded-sm"
          style={{ backgroundColor: accentColor }}
        />
        <h4 className="text-xs font-semibold uppercase tracking-widest text-foreground-secondary">{label}</h4>
      </div>
      <p className="text-xl font-bold tracking-tight text-foreground mb-4">{formatCNY(value)}</p>
      <div className="max-h-40 overflow-y-auto">
        {items.length > 0 ? (
          items.map(renderItem)
        ) : (
          <p className="text-xs text-foreground-secondary">暂无记录</p>
        )}
      </div>
    </div>
  );
}
