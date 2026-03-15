'use client';

import { useState, useMemo, useEffect, useRef } from 'react';
import { Plus, Trash2, Pencil, RefreshCw, Repeat } from 'lucide-react';
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
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'salary' as IncomeType,
    amount: '',
    currency: 'CNY' as Currency,
    description: '',
    date: '',
    memberId: '',
    recurring: false,
    dayOfMonth: 1,
  });

  const rates = useFamilyStore((s) => s.rates);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const autoGenDone = useRef(false);
  const { user } = db.useAuth();
  const userId = user?.id ?? '';

  const { data, isLoading } = db.useQuery({
    members: { $: { where: { userId } } },
    incomes: { $: { where: { userId } } },
  });

  // Auto-generate recurring incomes for current month
  useEffect(() => {
    if (!data || !userId || autoGenDone.current) return;
    autoGenDone.current = true;

    const allIncomes = data.incomes || [];
    const templates = allIncomes.filter((i) => i.recurring);
    if (templates.length === 0) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const txns = templates
      .filter((template) => {
        // Check if already generated for this month
        return !allIncomes.some(
          (i) =>
            i.recurringSourceId === template.id &&
            i.date?.startsWith(currentMonth)
        );
      })
      .map((template) => {
        const day = Math.min(template.dayOfMonth || 1, 28);
        const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
        return db.tx.incomes[id()].update({
          type: template.type,
          amount: template.amount,
          currency: template.currency,
          description: template.description || '',
          date: dateStr,
          memberId: template.memberId,
          recurring: false,
          dayOfMonth: 0,
          recurringSourceId: template.id,
          userId: template.userId || userId,
        });
      });

    if (txns.length > 0) {
      db.transact(txns);
    }
  }, [data]);

  const members: { id: string; name: string; color: string }[] = data?.members || [];

  // Split incomes: templates vs records
  const { templates, records } = useMemo(() => {
    const all = data?.incomes || [];
    const t = all.filter((i) => i.recurring);
    const r = all
      .filter((i) => !i.recurring)
      .filter((i) =>
        activeMemberId ? i.memberId === activeMemberId : true
      )
      .sort((a, b) => {
        if (!a.date || !b.date) return 0;
        return b.date.localeCompare(a.date);
      });
    return { templates: t, records: r };
  }, [data, activeMemberId]);

  // Monthly summary (from records only, not templates)
  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth =
      now.getMonth() === 0
        ? `${now.getFullYear() - 1}-12`
        : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const thisMonthTotal = records
      .filter((i) => i.date?.startsWith(thisMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    const lastMonthTotal = records
      .filter((i) => i.date?.startsWith(lastMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    return { thisMonthTotal, lastMonthTotal };
  }, [records, rates]);

  function openAdd() {
    setEditingId(null);
    setForm({
      type: 'salary',
      amount: '',
      currency: 'CNY',
      description: '',
      date: new Date().toISOString().split('T')[0],
      memberId: activeMemberId || members[0]?.id || '',
      recurring: false,
      dayOfMonth: 1,
    });
    setModalOpen(true);
  }

  function openEdit(income: { id: string; type: string; amount: number; currency: string; description: string; date: string; memberId: string; recurring: boolean; dayOfMonth: number }) {
    setEditingId(income.id);
    setForm({
      type: (income.type as IncomeType) || 'salary',
      amount: String(income.amount),
      currency: (income.currency as Currency) || 'CNY',
      description: income.description || '',
      date: income.date || '',
      memberId: income.memberId,
      recurring: income.recurring || false,
      dayOfMonth: income.dayOfMonth || 1,
    });
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.amount || !form.memberId) return;

    const payload = form.recurring
      ? {
          type: form.type,
          amount: parseFloat(form.amount),
          currency: form.currency,
          description: form.description,
          date: '',
          memberId: form.memberId,
          recurring: true,
          dayOfMonth: form.dayOfMonth,
          recurringSourceId: '',
          userId,
        }
      : {
          type: form.type,
          amount: parseFloat(form.amount),
          currency: form.currency,
          description: form.description,
          date: form.date,
          memberId: form.memberId,
          recurring: false,
          dayOfMonth: 0,
          recurringSourceId: editingId ? (data?.incomes?.find(i => i.id === editingId)?.recurringSourceId || '') : '',
          userId,
        };

    db.transact(
      editingId
        ? db.tx.incomes[editingId].update(payload)
        : db.tx.incomes[id()].update(payload)
    );

    setModalOpen(false);
    setEditingId(null);
    setForm({ type: 'salary', amount: '', currency: 'CNY', description: '', date: '', memberId: '', recurring: false, dayOfMonth: 1 });
    autoGenDone.current = false;
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
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/15 text-primary-light border border-primary/30 rounded-md text-sm font-medium hover:bg-primary/25 transition-colors duration-200"
        >
          <Plus size={16} strokeWidth={2.5} />
          记录收入
        </button>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">本月收入</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-secondary">
            {formatCNY(monthlyStats.thisMonthTotal)}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">上月收入</p>
          <p className="text-2xl font-bold tracking-tight mt-1">
            {formatCNY(monthlyStats.lastMonthTotal)}
          </p>
        </div>
      </div>

      {/* Recurring Templates */}
      {templates.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Repeat size={14} className="text-primary" />
            周期收入
          </h2>
          <div className="space-y-2">
            {templates.map((t) => {
              const member = members.find((m) => m.id === t.memberId);
              return (
                <div
                  key={t.id}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between border-l-2 border-l-primary hover:border-border-strong transition-colors duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        {INCOME_TYPES[t.type as IncomeType] || t.type}
                      </span>
                      {member && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ backgroundColor: member.color + '22', color: member.color }}
                        >
                          {member.name}
                        </span>
                      )}
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
                        每月 {t.dayOfMonth} 号
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-foreground-secondary mt-0.5">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-secondary mr-1">
                      +{formatCNY(toCNYDirect(t.amount, t.currency, rates))}
                    </span>
                    <button
                      onClick={() => openEdit({ id: t.id, type: t.type, amount: t.amount, currency: t.currency, description: t.description || '', date: t.date || '', memberId: t.memberId, recurring: true, dayOfMonth: t.dayOfMonth || 1 })}
                      className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                      <Pencil size={14} className="text-foreground-secondary" />
                    </button>
                    <button
                      onClick={() => db.transact(db.tx.incomes[t.id].delete())}
                      className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Member Filter */}
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

      {/* Income Records */}
      {records.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <p className="text-sm text-foreground-secondary">暂无收入记录</p>
        </div>
      ) : (
        <div className="space-y-2">
          {records.map((income) => {
            const member = members.find((m) => m.id === income.memberId);
            const isAutoGenerated = !!income.recurringSourceId;
            return (
              <div
                key={income.id}
                className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-strong transition-colors duration-200"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {INCOME_TYPES[income.type as IncomeType] || income.type}
                    </span>
                    {member && (
                      <span className="text-xs px-2 py-0.5 bg-surface-elevated border border-border rounded-md text-foreground-secondary">
                        {member.name}
                      </span>
                    )}
                    {isAutoGenerated && (
                      <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-md font-medium flex items-center gap-1">
                        <Repeat size={10} />
                        自动
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    {income.date && <span>{formatDate(income.date)}</span>}
                    {income.description && <span>{income.description}</span>}
                    {income.currency !== 'CNY' && (
                      <span>
                        {CURRENCIES[income.currency as Currency]} {income.amount}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-secondary mr-1">
                    +{formatCNY(toCNYDirect(income.amount, income.currency, rates))}
                  </span>
                  <button
                    onClick={() => openEdit({ id: income.id, type: income.type, amount: income.amount, currency: income.currency, description: income.description || '', date: income.date || '', memberId: income.memberId, recurring: false, dayOfMonth: 0 })}
                    className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                  >
                    <Pencil size={14} className="text-foreground-secondary" />
                  </button>
                  <button
                    onClick={() => db.transact(db.tx.incomes[income.id].delete())}
                    className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
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
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} title={editingId ? '编辑收入' : '记录收入'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">所属成员</label>
            <select
              value={form.memberId}
              onChange={(e) => setForm((f) => ({ ...f, memberId: e.target.value }))}
              className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all appearance-none"
            >
              <option value="">请选择</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
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
                        ? 'bg-surface-elevated text-foreground border border-border-strong'
                        : 'bg-bg text-foreground-secondary border border-border hover:border-border-strong hover:text-foreground'
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
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
              />
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">币种</label>
              <select
                value={form.currency}
                onChange={(e) =>
                  setForm((f) => ({ ...f, currency: e.target.value as Currency }))
                }
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all appearance-none"
              >
                {Object.entries(CURRENCIES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Recurring toggle */}
          <div className="flex items-center justify-between p-3 bg-bg border border-border rounded-md">
            <div className="flex items-center gap-2">
              <Repeat size={14} className="text-primary" />
              <span className="text-sm font-medium">每月自动重复</span>
            </div>
            <button
              onClick={() => setForm((f) => ({ ...f, recurring: !f.recurring }))}
              className={cn(
                'w-10 h-6 rounded-full transition-colors duration-200 relative',
                form.recurring ? 'bg-primary' : 'bg-surface-elevated border border-border-strong'
              )}
            >
              <span
                className={cn(
                  'absolute top-1 w-4 h-4 bg-foreground rounded-full shadow transition-transform duration-200',
                  form.recurring ? 'translate-x-5' : 'translate-x-1'
                )}
              />
            </button>
          </div>

          {form.recurring ? (
            <div>
              <label className="text-xs font-medium block mb-1">每月几号发放</label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min={1}
                  max={28}
                  value={form.dayOfMonth}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      dayOfMonth: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)),
                    }))
                  }
                  className="w-24 px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all"
                />
                <span className="text-sm text-foreground-secondary">号（1–28）</span>
              </div>
            </div>
          ) : (
            <div>
              <label className="text-xs font-medium block mb-1">日期</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
              />
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1">备注 (可选)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="如 年终奖"
              className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
            />
          </div>
          <button
            onClick={handleSave}
            disabled={!form.amount || !form.memberId}
            className="w-full py-3 bg-primary text-bg rounded-md font-semibold text-sm hover:bg-primary-light disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
