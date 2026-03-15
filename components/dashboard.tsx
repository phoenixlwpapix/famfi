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
import { formatCNY, toCNYDirect, formatNumber, cn } from '@/lib/utils';
import { METAL_TYPES, SECURITY_TYPES, DEPOSIT_TYPES, CURRENCIES } from '@/lib/types';

export function Dashboard() {
  const rates = useFamilyStore((s) => s.rates);
  const ratesUpdatedAt = useFamilyStore((s) => s.ratesUpdatedAt);

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

    // Calculate total assets per member
    const memberAssets: Record<string, number> = {};
    members.forEach((m) => {
      memberAssets[m.id] = 0;
    });

    // Deposits
    deposits.forEach((d) => {
      const cnyVal = toCNYDirect(d.amount, d.currency, rates);
      if (memberAssets[d.memberId] !== undefined) {
        memberAssets[d.memberId] += cnyVal;
      }
    });

    // Metals
    metals.forEach((m) => {
      const val = m.grams * m.currentPrice;
      const cnyVal = toCNYDirect(val, m.currency, rates);
      if (memberAssets[m.memberId] !== undefined) {
        memberAssets[m.memberId] += cnyVal;
      }
    });

    // Securities
    securities.forEach((s) => {
      const val = s.shares * s.currentPrice;
      const cnyVal = toCNYDirect(val, s.currency, rates);
      if (memberAssets[s.memberId] !== undefined) {
        memberAssets[s.memberId] += cnyVal;
      }
    });

    const totalAssets = Object.values(memberAssets).reduce((a, b) => a + b, 0);

    // Monthly income
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const monthlyIncome = incomes
      .filter((i) => i.date?.startsWith(thisMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    // Pie chart data
    const pieData = members
      .map((m) => ({
        name: m.name,
        value: memberAssets[m.id] || 0,
        color: m.color,
      }))
      .filter((d) => d.value > 0);

    // Asset breakdown
    const depositTotal = deposits.reduce(
      (sum, d) => sum + toCNYDirect(d.amount, d.currency, rates),
      0
    );
    const metalTotal = metals.reduce(
      (sum, m) => sum + toCNYDirect(m.grams * m.currentPrice, m.currency, rates),
      0
    );
    const securityTotal = securities.reduce(
      (sum, s) => sum + toCNYDirect(s.shares * s.currentPrice, s.currency, rates),
      0
    );

    // Trend data (mock monthly data based on current)
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
  }, [data, rates]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">财务总览</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            家庭资产实时概况
          </p>
        </div>
        {ratesUpdatedAt && (
          <span className="text-xs text-foreground-secondary">
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
          color="bg-primary"
        />
        <StatCard
          label="本月净收入"
          value={formatCNY(stats.monthlyIncome)}
          icon={stats.monthlyIncome >= 0 ? TrendingUp : TrendingDown}
          color="bg-secondary"
        />
        <StatCard
          label="家庭成员"
          value={`${stats.memberCount} 人`}
          icon={Users}
          color="bg-accent"
        />
        <StatCard
          label="资产类别"
          value="3 类"
          icon={Wallet}
          color="bg-foreground"
          subtitle={`存款 · 贵金属 · 证券`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pie Chart */}
        <div className="bg-muted rounded-lg p-6">
          <h3 className="text-sm font-semibold mb-4">成员资产占比</h3>
          {stats.pieData.length > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    strokeWidth={0}
                  >
                    {stats.pieData.map((entry, i) => (
                      <Cell key={i} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCNY(Number(value))}
                    contentStyle={{
                      border: '2px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: 'none',
                      fontSize: '13px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap gap-3 mt-2">
                {stats.pieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5 text-xs">
                    <div
                      className="w-2.5 h-2.5 rounded-sm"
                      style={{ backgroundColor: d.color }}
                    />
                    {d.name}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-foreground-secondary text-sm">
              暂无数据，请先添加家庭成员和资产
            </div>
          )}
        </div>

        {/* Trend Chart */}
        <div className="bg-muted rounded-lg p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold mb-4">资产趋势</h3>
          {stats.totalAssets > 0 ? (
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={stats.trendData}>
                  <defs>
                    <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="month"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 12, fill: '#6B7280' }}
                    tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
                  />
                  <Tooltip
                    formatter={(value) => [formatCNY(Number(value)), '总资产']}
                    contentStyle={{
                      border: '2px solid #E5E7EB',
                      borderRadius: '6px',
                      boxShadow: 'none',
                      fontSize: '13px',
                    }}
                  />
                  <Area
                    type="monotone"
                    dataKey="value"
                    stroke="#3B82F6"
                    strokeWidth={2.5}
                    fill="url(#areaGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="h-52 flex items-center justify-center text-foreground-secondary text-sm">
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
          color="bg-primary"
          items={data?.deposits || []}
          renderItem={(d) => (
            <div key={d.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span className="text-foreground-secondary">
                {DEPOSIT_TYPES[d.type as keyof typeof DEPOSIT_TYPES] || d.type} · {CURRENCIES[d.currency as keyof typeof CURRENCIES] || d.currency}
                {d.rate > 0 && ` · ${d.rate}%`}
              </span>
              <span className="font-medium">{formatCNY(toCNYDirect(d.amount, d.currency, rates))}</span>
            </div>
          )}
        />
        <AssetBreakdownCard
          label="贵金属"
          value={stats.metalTotal}
          color="bg-accent"
          items={data?.metals || []}
          renderItem={(m) => (
            <div key={m.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span className="text-foreground-secondary">
                {METAL_TYPES[m.metalType as keyof typeof METAL_TYPES] || m.metalType} · {formatNumber(m.grams)}g
              </span>
              <span className="font-medium">
                {formatCNY(toCNYDirect(m.grams * m.currentPrice, m.currency, rates))}
              </span>
            </div>
          )}
        />
        <AssetBreakdownCard
          label="有价证券"
          value={stats.securityTotal}
          color="bg-secondary"
          items={data?.securities || []}
          renderItem={(s) => (
            <div key={s.id} className="flex justify-between text-sm py-2 border-b border-gray-100 last:border-0">
              <span className="text-foreground-secondary">
                {SECURITY_TYPES[s.secType as keyof typeof SECURITY_TYPES] || s.secType} · {s.name}
              </span>
              <span className="font-medium">
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
  color,
  subtitle,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ size?: number; strokeWidth?: number }>;
  color: string;
  subtitle?: string;
}) {
  return (
    <div className="bg-muted rounded-lg p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-md text-white', color)}>
        <Icon size={20} strokeWidth={2.2} />
      </div>
      <div>
        <p className="text-xs text-foreground-secondary font-medium">{label}</p>
        <p className="text-lg font-bold mt-0.5 tracking-tight">{value}</p>
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
  color,
  items,
  renderItem,
}: {
  label: string;
  value: number;
  color: string;
  items: T[];
  renderItem: (item: T) => React.ReactNode;
}) {
  return (
    <div className="bg-muted rounded-lg p-5">
      <div className="flex items-center gap-2 mb-3">
        <div className={cn('w-3 h-3 rounded-sm', color)} />
        <h4 className="text-sm font-semibold">{label}</h4>
      </div>
      <p className="text-xl font-bold tracking-tight mb-3">{formatCNY(value)}</p>
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
