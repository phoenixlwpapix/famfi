'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { Modal } from '@/components/modal';
import { FormInput, FormSelect, EmptyState } from '@/components/ui/form-fields';
import {
  DEPOSIT_TYPES,
  CURRENCIES,
  type DepositType,
  type Currency,
} from '@/lib/types';
import { formatCNY, formatNumber, toCNYDirect, formatDate } from '@/lib/utils';

const DEPOSIT_EMPTY = {
  type: 'current' as DepositType,
  amount: '',
  currency: 'CNY' as Currency,
  rate: '',
  startDate: '',
  endDate: '',
  bank: '',
  memberId: '',
};

export function DepositsTab({
  members,
  rates,
  activeMemberId,
  userId,
}: {
  members: { id: string; name: string; color: string }[];
  rates: Record<string, number>;
  activeMemberId: string | null;
  userId: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(DEPOSIT_EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data } = db.useQuery({ deposits: { $: { where: { userId } } } });
  const deposits = useMemo(() => {
    const all = data?.deposits || [];
    return activeMemberId ? all.filter((d) => d.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

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
    setForm({ ...DEPOSIT_EMPTY, memberId: activeMemberId || members[0]?.id || '' });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(d: (typeof deposits)[number]) {
    setEditingId(d.id);
    setForm({
      type: (d.type as DepositType) || 'current',
      amount: String(d.amount),
      currency: (d.currency as Currency) || 'CNY',
      rate: d.rate ? String(d.rate) : '',
      startDate: d.startDate || '',
      endDate: d.endDate || '',
      bank: d.bank || '',
      memberId: d.memberId,
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!form.memberId) newErrors.memberId = '请选择成员';
    if (!form.amount) newErrors.amount = '请输入金额';
    else if (parseFloat(form.amount) <= 0) newErrors.amount = '金额必须大于 0';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      type: form.type,
      amount: parseFloat(form.amount),
      currency: form.currency,
      rate: parseFloat(form.rate) || 0,
      startDate: form.startDate,
      endDate: form.endDate,
      bank: form.bank,
      memberId: form.memberId,
      userId,
    };
    db.transact(
      editingId
        ? db.tx.deposits[editingId].update(payload)
        : db.tx.deposits[id()].update(payload)
    );
    setModalOpen(false);
    setEditingId(null);
    setForm(DEPOSIT_EMPTY);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-foreground-secondary">共 {deposits.length} 笔存款</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary/15 text-primary-light border border-primary/30 rounded-md text-xs font-medium hover:bg-primary/25 transition-colors duration-200"
        >
          <Plus size={14} strokeWidth={2.5} />
          添加存款
        </button>
      </div>

      {deposits.length === 0 ? (
        <EmptyState text="暂无存款记录" />
      ) : (
        <div className="space-y-2">
          {deposits.map((d) => {
            const member = members.find((m) => m.id === d.memberId);
            return (
              <div key={d.id} className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-strong transition-colors duration-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {DEPOSIT_TYPES[d.type as DepositType] || d.type}
                    </span>
                    {member && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ backgroundColor: member.color + '22', color: member.color }}
                      >
                        {member.name}
                      </span>
                    )}
                    {d.bank && (
                      <span className="text-xs text-foreground-secondary">{d.bank}</span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    <span>{CURRENCIES[d.currency as Currency] || d.currency} {formatNumber(d.amount)}</span>
                    {d.rate > 0 && <span>利率 {d.rate}%</span>}
                    {d.startDate && <span>存入 {formatDate(d.startDate)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold mr-1">
                    {formatCNY(toCNYDirect(d.amount, d.currency, rates))}
                  </span>
                  <button
                    onClick={() => openEdit(d)}
                    className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                  >
                    <Pencil size={14} className="text-foreground-secondary" />
                  </button>
                  <button
                    onClick={() => db.transact(db.tx.deposits[d.id].delete())}
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

      <Modal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setEditingId(null); }}
        title={editingId ? '编辑存款' : '添加存款'}
      >
        <div className="space-y-3">
          <FormSelect
            label="所属成员"
            value={form.memberId}
            onChange={(v) => { setForm((f) => ({ ...f, memberId: v })); clearError('memberId'); }}
            options={members.map((m) => ({ value: m.id, label: m.name }))}
            error={errors.memberId}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormSelect
              label="存款类型"
              value={form.type}
              onChange={(v) => setForm((f) => ({ ...f, type: v as DepositType }))}
              options={Object.entries(DEPOSIT_TYPES).map(([k, v]) => ({ value: k, label: v }))}
            />
            <FormSelect
              label="币种"
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
              options={Object.entries(CURRENCIES).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
          <FormInput
            label="金额"
            value={form.amount}
            onChange={(v) => { setForm((f) => ({ ...f, amount: v })); clearError('amount'); }}
            type="number"
            placeholder="请输入金额"
            error={errors.amount}
            min={0}
          />
          <FormInput label="年利率 (%)" value={form.rate} onChange={(v) => setForm((f) => ({ ...f, rate: v }))} type="number" placeholder="如 2.5" />
          <FormInput label="银行" value={form.bank} onChange={(v) => setForm((f) => ({ ...f, bank: v }))} placeholder="如 中国银行" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="存入日期" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} type="date" />
            <FormInput label="到期日期" value={form.endDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} type="date" />
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
