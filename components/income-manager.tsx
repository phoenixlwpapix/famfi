'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { Modal } from '@/components/modal';
import {
  INCOME_TYPES,
  CURRENCIES,
  type IncomeType,
  type Currency,
} from '@/lib/types';
import { cn, formatCNY, toCNYDirect, formatDate } from '@/lib/utils';

export function IncomeManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'salary' as IncomeType,
    amount: '',
    currency: 'CNY' as Currency,
    description: '',
    date: '',
    memberId: '',
  });

  const rates = useFamilyStore((s) => s.rates);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const { data, isLoading } = db.useQuery({
    members: {},
    incomes: {},
  });

  const members = data?.members || [];
  const incomes = useMemo(() => {
    const all = data?.incomes || [];
    const filtered = activeMemberId
      ? all.filter((i) => i.memberId === activeMemberId)
      : all;
    return [...filtered].sort((a, b) => {
      if (!a.date || !b.date) return 0;
      return b.date.localeCompare(a.date);
    });
  }, [data, activeMemberId]);

  // Monthly summary
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth = now.getMonth() === 0
      ? `${now.getFullYear() - 1}-12`
      : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const thisMonthTotal = incomes
      .filter((i) => i.date?.startsWith(thisMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    const lastMonthTotal = incomes
      .filter((i) => i.date?.startsWith(lastMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    return { thisMonthTotal, lastMonthTotal };
  }, [incomes, rates]);

  function handleAdd() {
    if (!form.amount || !form.memberId) return;
    db.transact(
      db.tx.incomes[id()].update({
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency,
        description: form.description,
        date: form.date,
        memberId: form.memberId,
      })
    );
    setModalOpen(false);
    setForm({ type: 'salary', amount: '', currency: 'CNY', description: '', date: '', memberId: '' });
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">收入管理</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            记录与追踪家庭收入来源
          </p>
        </div>
        <button
          onClick={() => {
            setForm((f) => ({
              ...f,
              memberId: activeMemberId || members[0]?.id || '',
              date: new Date().toISOString().split('T')[0],
            }));
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-md text-sm font-medium hover:scale-105 transition-transform duration-200"
        >
          <Plus size={16} strokeWidth={2.5} />
          记录收入
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-muted rounded-lg p-5">
          <p className="text-xs text-foreground-secondary font-medium">本月收入</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-secondary">
            {formatCNY(monthlyStats.thisMonthTotal)}
          </p>
        </div>
        <div className="bg-muted rounded-lg p-5">
          <p className="text-xs text-foreground-secondary font-medium">上月收入</p>
          <p className="text-2xl font-bold tracking-tight mt-1">
            {formatCNY(monthlyStats.lastMonthTotal)}
          </p>
        </div>
      </div>

      {/* Member Filter */}
      {members.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => useFamilyStore.getState().setActiveMember(null)}
            className={cn(
              'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
              !activeMemberId
                ? 'bg-foreground text-white'
                : 'bg-muted text-foreground-secondary hover:bg-gray-200'
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
              className={cn(
                'px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200',
                activeMemberId === m.id
                  ? 'bg-foreground text-white'
                  : 'bg-muted text-foreground-secondary hover:bg-gray-200'
              )}
            >
              {m.name}
            </button>
          ))}
        </div>
      )}

      {/* Income List */}
      {incomes.length === 0 ? (
        <div className="bg-muted rounded-lg p-12 text-center">
          <p className="text-sm text-foreground-secondary">暂无收入记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {incomes.map((income) => {
            const member = members.find((m) => m.id === income.memberId);
            return (
              <div
                key={income.id}
                className="bg-muted rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {INCOME_TYPES[income.type as IncomeType] || income.type}
                    </span>
                    {member && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-md">
                        {member.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    {income.date && <span>{formatDate(income.date)}</span>}
                    {income.description && <span>{income.description}</span>}
                    {income.currency !== 'CNY' && (
                      <span>{CURRENCIES[income.currency as Currency]} {income.amount}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold text-secondary">
                    +{formatCNY(toCNYDirect(income.amount, income.currency, rates))}
                  </span>
                  <button
                    onClick={() => db.transact(db.tx.incomes[income.id].delete())}
                    className="p-1.5 rounded-md hover:bg-white transition-colors"
                  >
                    <Trash2 size={14} className="text-danger" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Modal */}
      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="记录收入">
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">所属成员</label>
            <select
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all appearance-none"
            >
              <option value="">请选择</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">收入类型</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.entries(INCOME_TYPES) as [IncomeType, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setForm((f) => ({ ...f, type: key }))}
                    className={cn(
                      'px-3 py-2 rounded-md text-xs font-medium transition-all duration-200',
                      form.type === key
                        ? 'bg-foreground text-white'
                        : 'bg-gray-100 text-foreground-secondary hover:bg-gray-200'
                    )}
                  >
                    {label}
                  </button>
                )
              )}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">金额</label>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                placeholder="金额"
                className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">币种</label>
              <select
                value={form.currency}
                onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value as Currency }))}
                className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all appearance-none"
              >
                {Object.entries(CURRENCIES).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">日期</label>
            <input
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all"
            />
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">备注 (可选)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="如 年终奖"
              className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all"
            />
          </div>
          <button
            onClick={handleAdd}
            disabled={!form.amount || !form.memberId}
            className="w-full py-3 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary-dark disabled:opacity-40 transition-colors duration-200"
          >
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
}
