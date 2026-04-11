'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Pencil, RefreshCw, Repeat, Receipt } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { Modal } from '@/components/modal';
import { useRecurringAutoGen } from '@/hooks/use-recurring-auto-gen';
import {
  EXPENSE_CATEGORIES,
  CURRENCIES,
  type ExpenseCategory,
  type Currency,
} from '@/lib/types';
import { cn, formatCNY, toCNYDirect, formatDate } from '@/lib/utils';

type FormMode = 'recurring' | 'oneoff';

const currentYearStart = () => `${new Date().getFullYear()}-01`;

function formatMonth(ym: string) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

export function ExpenseManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>('oneoff');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    category: 'food' as ExpenseCategory,
    amount: '',
    currency: 'CNY' as Currency,
    description: '',
    date: '',
    memberId: '',
    dayOfMonth: 1,
    startDate: '',
    endDate: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rates = useFamilyStore((s) => s.rates);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const { user } = db.useAuth();
  const userId = user?.id ?? '';

  const { data, isLoading } = db.useQuery({
    members: { $: { where: { userId } } },
    expenses: { $: { where: { userId } } },
  });

  const allExpenses = data?.expenses;

  const buildExpensePayload = useCallback(
    (
      template: typeof allExpenses extends (infer T)[] | undefined ? T : never,
      dateStr: string,
      uid: string
    ) => ({
      category: template.category,
      amount: template.amount,
      currency: template.currency,
      description: template.description || '',
      date: dateStr,
      memberId: template.memberId,
      recurring: false,
      dayOfMonth: 0,
      recurringSourceId: template.id,
      startDate: '',
      endDate: '',
      userId: template.userId || uid,
    }),
    []
  );

  useRecurringAutoGen(allExpenses, userId, 'expenses', buildExpensePayload);

  const members: { id: string; name: string; color: string }[] = data?.members || [];

  const { templates, oneoffRecords, statsRecords } = useMemo(() => {
    const all = data?.expenses || [];
    const byMember = (e: (typeof all)[number]) =>
      activeMemberId ? e.memberId === activeMemberId : true;

    const t = all
      .filter((e) => e.recurring)
      .filter(byMember)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

    const o = all
      .filter((e) => !e.recurring && !e.recurringSourceId)
      .filter(byMember)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const stats = all.filter((e) => !e.recurring).filter(byMember);

    return { templates: t, oneoffRecords: o, statsRecords: stats };
  }, [data, activeMemberId]);

  const monthlyStats = useMemo(() => {
    const now = new Date();
    const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const lastMonth =
      now.getMonth() === 0
        ? `${now.getFullYear() - 1}-12`
        : `${now.getFullYear()}-${String(now.getMonth()).padStart(2, '0')}`;

    const thisMonthTotal = statsRecords
      .filter((e) => e.date?.startsWith(thisMonth))
      .reduce((sum, e) => sum + toCNYDirect(e.amount, e.currency, rates), 0);

    const lastMonthTotal = statsRecords
      .filter((e) => e.date?.startsWith(lastMonth))
      .reduce((sum, e) => sum + toCNYDirect(e.amount, e.currency, rates), 0);

    const categoryBreakdown: Record<string, number> = {};
    statsRecords
      .filter((e) => e.date?.startsWith(thisMonth))
      .forEach((e) => {
        const cat = e.category || 'other';
        categoryBreakdown[cat] =
          (categoryBreakdown[cat] || 0) + toCNYDirect(e.amount, e.currency, rates);
      });

    return { thisMonthTotal, lastMonthTotal, categoryBreakdown };
  }, [statsRecords, rates]);

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function resetForm() {
    setForm({
      category: 'food',
      amount: '',
      currency: 'CNY',
      description: '',
      date: '',
      memberId: '',
      dayOfMonth: 1,
      startDate: '',
      endDate: '',
    });
    setErrors({});
  }

  function openAddRecurring() {
    setMode('recurring');
    setEditingId(null);
    resetForm();
    setForm((f) => ({
      ...f,
      category: 'housing',
      memberId: activeMemberId || members[0]?.id || '',
      startDate: currentYearStart(),
    }));
    setModalOpen(true);
  }

  function openAddOneoff() {
    setMode('oneoff');
    setEditingId(null);
    resetForm();
    setForm((f) => ({
      ...f,
      category: 'food',
      memberId: activeMemberId || members[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
    }));
    setModalOpen(true);
  }

  function openEditTemplate(t: {
    id: string;
    category: string;
    amount: number;
    currency: string;
    description?: string;
    memberId: string;
    dayOfMonth: number;
    startDate?: string;
    endDate?: string;
  }) {
    setMode('recurring');
    setEditingId(t.id);
    setForm({
      category: (t.category as ExpenseCategory) || 'other',
      amount: String(t.amount),
      currency: (t.currency as Currency) || 'CNY',
      description: t.description || '',
      date: '',
      memberId: t.memberId,
      dayOfMonth: t.dayOfMonth || 1,
      startDate: (t.startDate || '').slice(0, 7) || currentYearStart(),
      endDate: (t.endDate || '').slice(0, 7),
    });
    setErrors({});
    setModalOpen(true);
  }

  function openEditOneoff(e: {
    id: string;
    category: string;
    amount: number;
    currency: string;
    description?: string;
    date: string;
    memberId: string;
  }) {
    setMode('oneoff');
    setEditingId(e.id);
    setForm({
      category: (e.category as ExpenseCategory) || 'other',
      amount: String(e.amount),
      currency: (e.currency as Currency) || 'CNY',
      description: e.description || '',
      date: e.date || '',
      memberId: e.memberId,
      dayOfMonth: 0,
      startDate: '',
      endDate: '',
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!form.memberId) newErrors.memberId = '请选择成员';
    if (!form.amount) newErrors.amount = '请输入金额';
    else if (parseFloat(form.amount) <= 0) newErrors.amount = '金额必须大于 0';

    if (mode === 'recurring') {
      if (!form.startDate) newErrors.startDate = '请选择起始月';
      if (form.endDate && form.startDate && form.endDate < form.startDate)
        newErrors.endDate = '结束月不能早于起始月';
    } else if (!form.date) {
      newErrors.date = '请选择日期';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload =
      mode === 'recurring'
        ? {
            category: form.category,
            amount: parseFloat(form.amount),
            currency: form.currency,
            description: form.description,
            date: '',
            memberId: form.memberId,
            recurring: true,
            dayOfMonth: form.dayOfMonth,
            recurringSourceId: '',
            startDate: form.startDate,
            endDate: form.endDate || '',
            userId,
          }
        : {
            category: form.category,
            amount: parseFloat(form.amount),
            currency: form.currency,
            description: form.description,
            date: form.date,
            memberId: form.memberId,
            recurring: false,
            dayOfMonth: 0,
            recurringSourceId: '',
            startDate: '',
            endDate: '',
            userId,
          };

    db.transact(
      editingId
        ? db.tx.expenses[editingId].update(payload)
        : db.tx.expenses[id()].update(payload)
    );

    setModalOpen(false);
    setEditingId(null);
    resetForm();
  }

  function deleteTemplate(templateId: string) {
    const all = data?.expenses || [];
    const generated = all.filter((e) => e.recurringSourceId === templateId);
    db.transact([
      db.tx.expenses[templateId].delete(),
      ...generated.map((g) => db.tx.expenses[g.id].delete()),
    ]);
    setConfirmDeleteId(null);
  }

  function templateRangeLabel(t: { startDate?: string; endDate?: string }) {
    const s = (t.startDate || '').slice(0, 7);
    const e = (t.endDate || '').slice(0, 7);
    if (!s) return '持续中';
    if (!e) return `${formatMonth(s)} 至今`;
    return `${formatMonth(s)} – ${formatMonth(e)}`;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const CATEGORY_COLORS: Record<string, string> = {
    housing: '#8B5CF6',
    food: '#F59E0B',
    transport: '#3B82F6',
    education: '#10B981',
    healthcare: '#EF4444',
    entertainment: '#EC4899',
    shopping: '#F97316',
    other: '#6B7280',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">支出管理</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            管理固定支出周期与一次性支出
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAddOneoff}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-surface border border-border rounded-md text-sm font-medium text-foreground-secondary hover:border-border-strong hover:text-foreground transition-colors duration-200"
          >
            <Receipt size={14} />
            记一笔
          </button>
          <button
            onClick={openAddRecurring}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-danger/15 text-danger border border-danger/30 rounded-md text-sm font-medium hover:bg-danger/25 transition-colors duration-200"
          >
            <Plus size={16} strokeWidth={2.5} />
            添加固定支出
          </button>
        </div>
      </div>

      {/* Monthly Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">本月支出</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-danger">
            {formatCNY(monthlyStats.thisMonthTotal)}
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">上月支出</p>
          <p className="text-2xl font-bold tracking-tight mt-1">
            {formatCNY(monthlyStats.lastMonthTotal)}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      {Object.keys(monthlyStats.categoryBreakdown).length > 0 && (
        <div className="bg-surface border border-border rounded-xl p-5">
          <h3 className="text-xs font-semibold uppercase tracking-widest text-foreground-secondary mb-4">
            本月分类支出
          </h3>
          <div className="space-y-3">
            {Object.entries(monthlyStats.categoryBreakdown)
              .sort(([, a], [, b]) => b - a)
              .map(([cat, amount]) => {
                const maxAmount = Math.max(...Object.values(monthlyStats.categoryBreakdown));
                const percentage = maxAmount > 0 ? (amount / maxAmount) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <span className="text-xs w-12 text-foreground-secondary shrink-0">
                      {EXPENSE_CATEGORIES[cat as ExpenseCategory] || cat}
                    </span>
                    <div className="flex-1 h-2 bg-bg rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: CATEGORY_COLORS[cat] || '#6B7280',
                        }}
                      />
                    </div>
                    <span className="text-xs font-medium text-foreground w-24 text-right shrink-0">
                      {formatCNY(amount)}
                    </span>
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

      {/* Recurring templates */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Repeat size={14} className="text-danger" />
          固定支出周期
          <span className="text-xs text-foreground-secondary font-normal">
            （按月自动生成）
          </span>
        </h2>
        {templates.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-8 text-center">
            <p className="text-sm text-foreground-secondary">
              暂无固定支出，点击&ldquo;添加固定支出&rdquo;开始
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => {
              const member = members.find((m) => m.id === t.memberId);
              const generatedCount = (data?.expenses || []).filter(
                (e) => e.recurringSourceId === t.id
              ).length;
              const isConfirming = confirmDeleteId === t.id;
              return (
                <div
                  key={t.id}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between border-l-2 border-l-danger hover:border-border-strong transition-colors duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold">
                        {EXPENSE_CATEGORIES[t.category as ExpenseCategory] || t.category}
                      </span>
                      {member && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ backgroundColor: member.color + '22', color: member.color }}
                        >
                          {member.name}
                        </span>
                      )}
                      <span className="text-xs text-foreground-secondary">
                        {templateRangeLabel(t)}
                      </span>
                      <span className="text-xs px-2 py-0.5 bg-danger/10 text-danger rounded-md font-medium">
                        每月 {t.dayOfMonth} 号
                      </span>
                      <span className="text-xs text-foreground-secondary">
                        已生成 {generatedCount} 条
                      </span>
                    </div>
                    {t.description && (
                      <p className="text-xs text-foreground-secondary mt-1">{t.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    <span className="text-sm font-bold text-danger mr-1">
                      -{formatCNY(toCNYDirect(t.amount, t.currency, rates))}
                    </span>
                    <button
                      onClick={() =>
                        openEditTemplate({
                          id: t.id,
                          category: t.category,
                          amount: t.amount,
                          currency: t.currency,
                          description: t.description || '',
                          memberId: t.memberId,
                          dayOfMonth: t.dayOfMonth || 1,
                          startDate: t.startDate,
                          endDate: t.endDate,
                        })
                      }
                      className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                      <Pencil size={14} className="text-foreground-secondary" />
                    </button>
                    {isConfirming ? (
                      <button
                        onClick={() => deleteTemplate(t.id)}
                        className="px-2 py-1 rounded-md bg-danger/15 text-danger text-xs font-medium hover:bg-danger/25 transition-colors whitespace-nowrap"
                      >
                        确认删除
                      </button>
                    ) : (
                      <button
                        onClick={() => setConfirmDeleteId(t.id)}
                        className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                      >
                        <Trash2 size={14} className="text-danger" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* One-off records */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Receipt size={14} className="text-foreground-secondary" />
          一次性支出
        </h2>
        {oneoffRecords.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-8 text-center">
            <p className="text-sm text-foreground-secondary">暂无一次性支出</p>
          </div>
        ) : (
          <div className="space-y-2">
            {oneoffRecords.map((expense) => {
              const member = members.find((m) => m.id === expense.memberId);
              const catColor = CATEGORY_COLORS[expense.category] || '#6B7280';
              return (
                <div
                  key={expense.id}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-strong transition-colors duration-200"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{ backgroundColor: catColor }}
                      />
                      <span className="text-sm font-semibold">
                        {EXPENSE_CATEGORIES[expense.category as ExpenseCategory] || expense.category}
                      </span>
                      {member && (
                        <span className="text-xs px-2 py-0.5 bg-surface-elevated border border-border rounded-md text-foreground-secondary">
                          {member.name}
                        </span>
                      )}
                    </div>
                    <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                      {expense.date && <span>{formatDate(expense.date)}</span>}
                      {expense.description && <span>{expense.description}</span>}
                      {expense.currency !== 'CNY' && (
                        <span>
                          {CURRENCIES[expense.currency as Currency]} {expense.amount}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-danger mr-1">
                      -{formatCNY(toCNYDirect(expense.amount, expense.currency, rates))}
                    </span>
                    <button
                      onClick={() =>
                        openEditOneoff({
                          id: expense.id,
                          category: expense.category,
                          amount: expense.amount,
                          currency: expense.currency,
                          description: expense.description || '',
                          date: expense.date || '',
                          memberId: expense.memberId,
                        })
                      }
                      className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                      <Pencil size={14} className="text-foreground-secondary" />
                    </button>
                    <button
                      onClick={() => db.transact(db.tx.expenses[expense.id].delete())}
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
      </div>

      {/* Modal */}
      <Modal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingId(null);
        }}
        title={
          editingId
            ? mode === 'recurring'
              ? '编辑固定支出'
              : '编辑支出'
            : mode === 'recurring'
            ? '添加固定支出'
            : '记录支出'
        }
      >
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">所属成员</label>
            <select
              value={form.memberId}
              onChange={(e) => {
                setForm((f) => ({ ...f, memberId: e.target.value }));
                clearError('memberId');
              }}
              className={cn(
                'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all appearance-none',
                errors.memberId ? 'border-danger' : 'border-border focus:border-primary'
              )}
            >
              <option value="">请选择</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            {errors.memberId && <p className="text-xs text-danger mt-1">{errors.memberId}</p>}
          </div>

          <div>
            <label className="text-xs font-medium block mb-1">支出类别</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(EXPENSE_CATEGORIES) as [ExpenseCategory, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setForm((f) => ({ ...f, category: key }))}
                    className={cn(
                      'px-2 py-2 rounded-md text-xs font-medium transition-all duration-200',
                      form.category === key
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
              <label className="text-xs font-medium block mb-1">
                {mode === 'recurring' ? '月支出' : '金额'}
              </label>
              <input
                type="number"
                min={0}
                value={form.amount}
                onChange={(e) => {
                  setForm((f) => ({ ...f, amount: e.target.value }));
                  clearError('amount');
                }}
                placeholder="金额"
                className={cn(
                  'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all placeholder:text-foreground-secondary/40',
                  errors.amount ? 'border-danger' : 'border-border focus:border-primary'
                )}
              />
              {errors.amount && <p className="text-xs text-danger mt-1">{errors.amount}</p>}
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

          {mode === 'recurring' ? (
            <>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium block mb-1">起始月</label>
                  <input
                    type="month"
                    value={form.startDate}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, startDate: e.target.value }));
                      clearError('startDate');
                    }}
                    className={cn(
                      'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all',
                      errors.startDate ? 'border-danger' : 'border-border focus:border-primary'
                    )}
                  />
                  {errors.startDate && (
                    <p className="text-xs text-danger mt-1">{errors.startDate}</p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-medium block mb-1">
                    结束月 <span className="text-foreground-secondary">(可选)</span>
                  </label>
                  <input
                    type="month"
                    value={form.endDate}
                    onChange={(e) => {
                      setForm((f) => ({ ...f, endDate: e.target.value }));
                      clearError('endDate');
                    }}
                    className={cn(
                      'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all',
                      errors.endDate ? 'border-danger' : 'border-border focus:border-primary'
                    )}
                  />
                  {errors.endDate && <p className="text-xs text-danger mt-1">{errors.endDate}</p>}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium block mb-1">每月几号扣款</label>
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
            </>
          ) : (
            <div>
              <label className="text-xs font-medium block mb-1">日期</label>
              <input
                type="date"
                value={form.date}
                onChange={(e) => {
                  setForm((f) => ({ ...f, date: e.target.value }));
                  clearError('date');
                }}
                className={cn(
                  'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all',
                  errors.date ? 'border-danger' : 'border-border focus:border-primary'
                )}
              />
              {errors.date && <p className="text-xs text-danger mt-1">{errors.date}</p>}
            </div>
          )}

          <div>
            <label className="text-xs font-medium block mb-1">备注 (可选)</label>
            <input
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder={mode === 'recurring' ? '如 房租、宽带' : '如 周末聚餐'}
              className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-danger text-white rounded-md font-semibold text-sm hover:bg-danger/90 disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
