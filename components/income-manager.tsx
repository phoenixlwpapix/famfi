'use client';

import { useState, useMemo, useCallback } from 'react';
import { Plus, Trash2, Pencil, RefreshCw, Briefcase, Gift } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { Modal } from '@/components/modal';
import { useRecurringAutoGen } from '@/hooks/use-recurring-auto-gen';
import {
  INCOME_TYPES,
  CURRENCIES,
  type IncomeType,
  type Currency,
} from '@/lib/types';
import { cn, formatCNY, toCNYDirect, formatDate } from '@/lib/utils';

type FormMode = 'salary' | 'oneoff';

const currentYearStart = () => `${new Date().getFullYear()}-01`;

function formatMonth(ym: string) {
  if (!ym) return '';
  const [y, m] = ym.split('-');
  return `${y}年${parseInt(m)}月`;
}

export function IncomeManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [mode, setMode] = useState<FormMode>('salary');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [form, setForm] = useState({
    type: 'salary' as IncomeType,
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
    incomes: { $: { where: { userId } } },
  });

  const allIncomes = data?.incomes;

  const buildIncomePayload = useCallback(
    (
      template: typeof allIncomes extends (infer T)[] | undefined ? T : never,
      dateStr: string,
      uid: string
    ) => ({
      type: template.type,
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

  useRecurringAutoGen(allIncomes, userId, 'incomes', buildIncomePayload);

  const members: { id: string; name: string; color: string }[] = data?.members || [];

  const { templates, oneoffRecords, statsRecords } = useMemo(() => {
    const all = data?.incomes || [];
    const byMember = (i: (typeof all)[number]) =>
      activeMemberId ? i.memberId === activeMemberId : true;

    const t = all
      .filter((i) => i.recurring)
      .filter(byMember)
      .sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));

    const o = all
      .filter((i) => !i.recurring && !i.recurringSourceId)
      .filter(byMember)
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''));

    const stats = all.filter((i) => !i.recurring).filter(byMember);

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
      .filter((i) => i.date?.startsWith(thisMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    const lastMonthTotal = statsRecords
      .filter((i) => i.date?.startsWith(lastMonth))
      .reduce((sum, i) => sum + toCNYDirect(i.amount, i.currency, rates), 0);

    return { thisMonthTotal, lastMonthTotal };
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
      type: 'salary',
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

  function openAddSalary() {
    setMode('salary');
    setEditingId(null);
    resetForm();
    setForm((f) => ({
      ...f,
      type: 'salary',
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
      type: 'bonus',
      memberId: activeMemberId || members[0]?.id || '',
      date: new Date().toISOString().split('T')[0],
    }));
    setModalOpen(true);
  }

  function openEditTemplate(t: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    description?: string;
    memberId: string;
    dayOfMonth: number;
    startDate?: string;
    endDate?: string;
  }) {
    setMode('salary');
    setEditingId(t.id);
    setForm({
      type: (t.type as IncomeType) || 'salary',
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

  function openEditOneoff(i: {
    id: string;
    type: string;
    amount: number;
    currency: string;
    description?: string;
    date: string;
    memberId: string;
  }) {
    setMode('oneoff');
    setEditingId(i.id);
    setForm({
      type: (i.type as IncomeType) || 'bonus',
      amount: String(i.amount),
      currency: (i.currency as Currency) || 'CNY',
      description: i.description || '',
      date: i.date || '',
      memberId: i.memberId,
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

    if (mode === 'salary') {
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
      mode === 'salary'
        ? {
            type: 'salary',
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
            type: form.type,
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
        ? db.tx.incomes[editingId].update(payload)
        : db.tx.incomes[id()].update(payload)
    );

    setModalOpen(false);
    setEditingId(null);
    resetForm();
  }

  function deleteTemplate(templateId: string) {
    const all = data?.incomes || [];
    const generated = all.filter((i) => i.recurringSourceId === templateId);
    db.transact([
      db.tx.incomes[templateId].delete(),
      ...generated.map((g) => db.tx.incomes[g.id].delete()),
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">收入管理</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            管理工资周期与一次性收入
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={openAddOneoff}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-surface border border-border rounded-md text-sm font-medium text-foreground-secondary hover:border-border-strong hover:text-foreground transition-colors duration-200"
          >
            <Gift size={14} />
            记一笔
          </button>
          <button
            onClick={openAddSalary}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-primary/15 text-primary-light border border-primary/30 rounded-md text-sm font-medium hover:bg-primary/25 transition-colors duration-200"
          >
            <Plus size={16} strokeWidth={2.5} />
            添加工资
          </button>
        </div>
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

      {/* Salary templates */}
      <div>
        <h2 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
          <Briefcase size={14} className="text-primary" />
          工资周期
          <span className="text-xs text-foreground-secondary font-normal">
            （按月自动生成）
          </span>
        </h2>
        {templates.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-8 text-center">
            <p className="text-sm text-foreground-secondary">
              暂无工资周期，点击&ldquo;添加工资&rdquo;开始
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {templates.map((t) => {
              const member = members.find((m) => m.id === t.memberId);
              const generatedCount = (data?.incomes || []).filter(
                (i) => i.recurringSourceId === t.id
              ).length;
              const isConfirming = confirmDeleteId === t.id;
              return (
                <div
                  key={t.id}
                  className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between border-l-2 border-l-primary hover:border-border-strong transition-colors duration-200"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      {member && (
                        <span
                          className="text-xs px-2 py-0.5 rounded-md font-medium"
                          style={{ backgroundColor: member.color + '22', color: member.color }}
                        >
                          {member.name}
                        </span>
                      )}
                      <span className="text-sm font-semibold">{templateRangeLabel(t)}</span>
                      <span className="text-xs px-2 py-0.5 bg-primary/10 text-primary rounded-md font-medium">
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
                    <span className="text-sm font-bold text-secondary mr-1">
                      +{formatCNY(toCNYDirect(t.amount, t.currency, rates))}
                    </span>
                    <button
                      onClick={() =>
                        openEditTemplate({
                          id: t.id,
                          type: t.type,
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
          <Gift size={14} className="text-secondary" />
          一次性收入
        </h2>
        {oneoffRecords.length === 0 ? (
          <div className="bg-surface border border-border border-dashed rounded-xl p-8 text-center">
            <p className="text-sm text-foreground-secondary">暂无一次性收入</p>
          </div>
        ) : (
          <div className="space-y-2">
            {oneoffRecords.map((income) => {
              const member = members.find((m) => m.id === income.memberId);
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
                      onClick={() =>
                        openEditOneoff({
                          id: income.id,
                          type: income.type,
                          amount: income.amount,
                          currency: income.currency,
                          description: income.description || '',
                          date: income.date || '',
                          memberId: income.memberId,
                        })
                      }
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
            ? mode === 'salary'
              ? '编辑工资周期'
              : '编辑收入'
            : mode === 'salary'
            ? '添加工资周期'
            : '记录收入'
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

          {mode === 'oneoff' && (
            <div>
              <label className="text-xs font-medium block mb-1">收入类型</label>
              <div className="grid grid-cols-2 gap-2">
                {(['bonus', 'extra'] as IncomeType[]).map((key) => (
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
                    {INCOME_TYPES[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium block mb-1">
                {mode === 'salary' ? '月薪' : '金额'}
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

          {mode === 'salary' ? (
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
              placeholder={mode === 'salary' ? '如 某公司研发岗' : '如 年终奖'}
              className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
            />
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary text-bg rounded-md font-semibold text-sm hover:bg-primary-light disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
