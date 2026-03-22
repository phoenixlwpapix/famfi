'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, RefreshCw, Target, CheckCircle, Pause, Play } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { Modal } from '@/components/modal';
import {
  GOAL_CATEGORIES,
  CURRENCIES,
  type GoalCategory,
  type GoalStatus,
  type Currency,
} from '@/lib/types';
import { cn, formatCNY, toCNYDirect, formatDate } from '@/lib/utils';
import { useFamilyStore } from '@/lib/store';

export function GoalManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '',
    targetAmount: '',
    currentAmount: '',
    currency: 'CNY' as Currency,
    deadline: '',
    category: 'savings' as GoalCategory,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const rates = useFamilyStore((s) => s.rates);
  const { user } = db.useAuth();
  const userId = user?.id ?? '';

  const { data, isLoading } = db.useQuery({
    goals: { $: { where: { userId } } },
  });

  const goals = useMemo(() => {
    const all = data?.goals || [];
    return all.sort((a, b) => {
      // Active first, then completed, then paused
      const statusOrder: Record<string, number> = { active: 0, completed: 1, paused: 2 };
      const diff = (statusOrder[a.status] ?? 3) - (statusOrder[b.status] ?? 3);
      if (diff !== 0) return diff;
      return (b.createdAt || 0) - (a.createdAt || 0);
    });
  }, [data]);

  const summary = useMemo(() => {
    const active = goals.filter((g) => g.status === 'active');
    const completed = goals.filter((g) => g.status === 'completed');
    const totalTarget = active.reduce((sum, g) => sum + toCNYDirect(g.targetAmount, g.currency, rates), 0);
    const totalCurrent = active.reduce((sum, g) => sum + toCNYDirect(g.currentAmount, g.currency, rates), 0);
    const overallProgress = totalTarget > 0 ? (totalCurrent / totalTarget) * 100 : 0;
    return { activeCount: active.length, completedCount: completed.length, totalTarget, totalCurrent, overallProgress };
  }, [goals, rates]);

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  function openAdd() {
    setEditingId(null);
    setForm({
      name: '',
      targetAmount: '',
      currentAmount: '',
      currency: 'CNY',
      deadline: '',
      category: 'savings',
    });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(goal: { id: string; name: string; targetAmount: number; currentAmount: number; currency: string; deadline: string; category: string }) {
    setEditingId(goal.id);
    setForm({
      name: goal.name,
      targetAmount: String(goal.targetAmount),
      currentAmount: String(goal.currentAmount),
      currency: (goal.currency as Currency) || 'CNY',
      deadline: goal.deadline || '',
      category: (goal.category as GoalCategory) || 'savings',
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!form.name.trim()) newErrors.name = '请输入目标名称';
    if (!form.targetAmount) newErrors.targetAmount = '请输入目标金额';
    else if (parseFloat(form.targetAmount) <= 0) newErrors.targetAmount = '目标金额必须大于 0';
    if (form.currentAmount && parseFloat(form.currentAmount) < 0) newErrors.currentAmount = '当前金额不能为负数';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const currentAmount = parseFloat(form.currentAmount) || 0;
    const targetAmount = parseFloat(form.targetAmount);
    const status: GoalStatus = currentAmount >= targetAmount ? 'completed' : 'active';

    const payload = {
      name: form.name,
      targetAmount,
      currentAmount,
      currency: form.currency,
      deadline: form.deadline,
      category: form.category,
      status,
      createdAt: editingId ? (data?.goals?.find(g => g.id === editingId)?.createdAt || Date.now()) : Date.now(),
      userId,
    };

    db.transact(
      editingId
        ? db.tx.goals[editingId].update(payload)
        : db.tx.goals[id()].update(payload)
    );

    setModalOpen(false);
    setEditingId(null);
  }

  function toggleStatus(goalId: string, currentStatus: string) {
    const newStatus: GoalStatus = currentStatus === 'paused' ? 'active' : 'paused';
    db.transact(db.tx.goals[goalId].update({ status: newStatus }));
  }

  function updateProgress(goalId: string, amount: string, targetAmount: number) {
    const currentAmount = parseFloat(amount) || 0;
    const status: GoalStatus = currentAmount >= targetAmount ? 'completed' : 'active';
    db.transact(db.tx.goals[goalId].update({ currentAmount, status }));
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  const GOAL_COLORS: Record<string, string> = {
    savings: '#C9A84C',
    investment: '#34C77B',
    education: '#3B82F6',
    housing: '#8B5CF6',
    travel: '#F59E0B',
    retirement: '#EC4899',
    other: '#6B7280',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">财务目标</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            设定目标，追踪进度
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-primary/15 text-primary-light border border-primary/30 rounded-md text-sm font-medium hover:bg-primary/25 transition-colors duration-200"
        >
          <Plus size={16} strokeWidth={2.5} />
          新建目标
        </button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">进行中</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-primary">
            {summary.activeCount} <span className="text-sm font-normal text-foreground-secondary">个目标</span>
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">已完成</p>
          <p className="text-2xl font-bold tracking-tight mt-1 text-secondary">
            {summary.completedCount} <span className="text-sm font-normal text-foreground-secondary">个目标</span>
          </p>
        </div>
        <div className="bg-surface border border-border rounded-xl p-5">
          <p className="text-xs text-foreground-secondary font-medium tracking-wide">总体进度</p>
          <div className="flex items-center gap-3 mt-2">
            <div className="flex-1 h-2.5 bg-bg rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, summary.overallProgress)}%` }}
              />
            </div>
            <span className="text-sm font-bold text-primary">
              {summary.overallProgress.toFixed(0)}%
            </span>
          </div>
        </div>
      </div>

      {/* Goal Cards */}
      {goals.length === 0 ? (
        <div className="bg-surface border border-border rounded-xl p-12 text-center">
          <Target size={40} className="text-foreground-secondary/30 mx-auto mb-3" />
          <p className="text-sm text-foreground-secondary">暂无财务目标</p>
          <p className="text-xs text-foreground-secondary/60 mt-1">点击"新建目标"开始规划你的财务目标</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {goals.map((goal) => {
            const progress = goal.targetAmount > 0 ? (goal.currentAmount / goal.targetAmount) * 100 : 0;
            const isCompleted = goal.status === 'completed';
            const isPaused = goal.status === 'paused';
            const catColor = GOAL_COLORS[goal.category] || '#6B7280';
            const remaining = Math.max(0, goal.targetAmount - goal.currentAmount);
            const deadlineDate = goal.deadline ? new Date(goal.deadline) : null;
            const isOverdue = deadlineDate && deadlineDate < new Date() && !isCompleted;

            return (
              <div
                key={goal.id}
                className={cn(
                  'bg-surface border rounded-xl p-5 transition-colors duration-200',
                  isCompleted ? 'border-secondary/30' : isPaused ? 'border-border opacity-60' : 'border-border hover:border-border-strong'
                )}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-2.5 h-2.5 rounded-sm shrink-0"
                      style={{ backgroundColor: catColor }}
                    />
                    <h3 className={cn('text-sm font-semibold', isCompleted && 'line-through text-foreground-secondary')}>
                      {goal.name}
                    </h3>
                    {isCompleted && (
                      <CheckCircle size={14} className="text-secondary" />
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <span className="text-xs px-2 py-0.5 rounded-md font-medium" style={{ backgroundColor: catColor + '22', color: catColor }}>
                      {GOAL_CATEGORIES[goal.category as GoalCategory] || goal.category}
                    </span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-foreground-secondary">
                      {formatCNY(toCNYDirect(goal.currentAmount, goal.currency, rates))}
                    </span>
                    <span className="text-foreground-secondary">
                      {formatCNY(toCNYDirect(goal.targetAmount, goal.currency, rates))}
                    </span>
                  </div>
                  <div className="h-2 bg-bg rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, progress)}%`,
                        backgroundColor: isCompleted ? '#34C77B' : catColor,
                      }}
                    />
                  </div>
                  <div className="flex justify-between mt-1.5">
                    <span className="text-xs font-medium" style={{ color: isCompleted ? '#34C77B' : catColor }}>
                      {progress.toFixed(1)}%
                    </span>
                    {!isCompleted && remaining > 0 && (
                      <span className="text-xs text-foreground-secondary">
                        还差 {formatCNY(toCNYDirect(remaining, goal.currency, rates))}
                      </span>
                    )}
                  </div>
                </div>

                {/* Quick update + deadline */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs text-foreground-secondary">
                    {deadlineDate && (
                      <span className={cn(isOverdue && 'text-danger font-medium')}>
                        {isOverdue ? '已逾期' : '截止'} {formatDate(goal.deadline)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    {!isCompleted && (
                      <button
                        onClick={() => toggleStatus(goal.id, goal.status)}
                        className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                        title={isPaused ? '恢复' : '暂停'}
                      >
                        {isPaused ? <Play size={14} className="text-secondary" /> : <Pause size={14} className="text-foreground-secondary" />}
                      </button>
                    )}
                    <button
                      onClick={() => openEdit({ id: goal.id, name: goal.name, targetAmount: goal.targetAmount, currentAmount: goal.currentAmount, currency: goal.currency, deadline: goal.deadline || '', category: goal.category })}
                      className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                      <Pencil size={14} className="text-foreground-secondary" />
                    </button>
                    <button
                      onClick={() => db.transact(db.tx.goals[goal.id].delete())}
                      className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                    >
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditingId(null); }} title={editingId ? '编辑目标' : '新建目标'}>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium block mb-1">目标名称</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => { setForm((f) => ({ ...f, name: e.target.value })); clearError('name'); }}
              placeholder="如 买房首付、子女教育基金"
              className={cn(
                'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all placeholder:text-foreground-secondary/40',
                errors.name ? 'border-danger' : 'border-border focus:border-primary'
              )}
            />
            {errors.name && <p className="text-xs text-danger mt-1">{errors.name}</p>}
          </div>
          <div>
            <label className="text-xs font-medium block mb-1">目标类别</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(GOAL_CATEGORIES) as [GoalCategory, string][]).map(
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
              <label className="text-xs font-medium block mb-1">目标金额</label>
              <input
                type="number"
                min={0}
                value={form.targetAmount}
                onChange={(e) => { setForm((f) => ({ ...f, targetAmount: e.target.value })); clearError('targetAmount'); }}
                placeholder="目标金额"
                className={cn(
                  'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all placeholder:text-foreground-secondary/40',
                  errors.targetAmount ? 'border-danger' : 'border-border focus:border-primary'
                )}
              />
              {errors.targetAmount && <p className="text-xs text-danger mt-1">{errors.targetAmount}</p>}
            </div>
            <div>
              <label className="text-xs font-medium block mb-1">当前已存</label>
              <input
                type="number"
                min={0}
                value={form.currentAmount}
                onChange={(e) => { setForm((f) => ({ ...f, currentAmount: e.target.value })); clearError('currentAmount'); }}
                placeholder="当前金额"
                className={cn(
                  'w-full px-3 py-2 bg-bg border rounded-md text-sm text-foreground outline-none transition-all placeholder:text-foreground-secondary/40',
                  errors.currentAmount ? 'border-danger' : 'border-border focus:border-primary'
                )}
              />
              {errors.currentAmount && <p className="text-xs text-danger mt-1">{errors.currentAmount}</p>}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            <div>
              <label className="text-xs font-medium block mb-1">截止日期 (可选)</label>
              <input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))}
                className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            className="w-full py-3 bg-primary text-bg rounded-md font-semibold text-sm hover:bg-primary-light disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '创建'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
