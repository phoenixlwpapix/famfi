'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { Modal } from '@/components/modal';
import { FormInput, FormSelect, EmptyState } from '@/components/ui/form-fields';
import {
  SECURITY_TYPES,
  CURRENCIES,
  type SecurityType,
  type Currency,
} from '@/lib/types';
import { formatCNY, formatNumber, toCNYDirect } from '@/lib/utils';

const SECURITY_EMPTY = {
  secType: 'fund' as SecurityType,
  name: '',
  symbol: '',
  shares: '',
  purchasePrice: '',
  currentPrice: '',
  currency: 'CNY' as Currency,
  purchaseDate: '',
  memberId: '',
};

export function SecuritiesTab({
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
  const [form, setForm] = useState(SECURITY_EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data } = db.useQuery({ securities: { $: { where: { userId } } } });
  const securities = useMemo(() => {
    const all = data?.securities || [];
    return activeMemberId ? all.filter((s) => s.memberId === activeMemberId) : all;
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
    setForm({ ...SECURITY_EMPTY, memberId: activeMemberId || members[0]?.id || '' });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(s: (typeof securities)[number]) {
    setEditingId(s.id);
    setForm({
      secType: (s.secType as SecurityType) || 'fund',
      name: s.name || '',
      symbol: s.symbol || '',
      shares: String(s.shares),
      purchasePrice: s.purchasePrice ? String(s.purchasePrice) : '',
      currentPrice: String(s.currentPrice),
      currency: (s.currency as Currency) || 'CNY',
      purchaseDate: s.purchaseDate || '',
      memberId: s.memberId,
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!form.memberId) newErrors.memberId = '请选择成员';
    if (!form.name.trim()) newErrors.name = '请输入名称';
    if (!form.shares) newErrors.shares = '请输入持仓量';
    else if (parseFloat(form.shares) <= 0) newErrors.shares = '持仓量必须大于 0';
    if (!form.currentPrice) newErrors.currentPrice = '请输入当前单价';
    else if (parseFloat(form.currentPrice) <= 0) newErrors.currentPrice = '单价必须大于 0';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const payload = {
      secType: form.secType,
      name: form.name,
      symbol: form.symbol,
      shares: parseFloat(form.shares),
      purchasePrice: parseFloat(form.purchasePrice) || 0,
      currentPrice: parseFloat(form.currentPrice),
      currency: form.currency,
      purchaseDate: form.purchaseDate,
      memberId: form.memberId,
      userId,
    };
    db.transact(
      editingId
        ? db.tx.securities[editingId].update(payload)
        : db.tx.securities[id()].update(payload)
    );
    setModalOpen(false);
    setEditingId(null);
    setForm(SECURITY_EMPTY);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-foreground-secondary">共 {securities.length} 笔持仓</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-secondary/15 text-secondary border border-secondary/30 rounded-md text-xs font-medium hover:bg-secondary/25 transition-colors duration-200"
        >
          <Plus size={14} strokeWidth={2.5} />
          添加证券
        </button>
      </div>

      {securities.length === 0 ? (
        <EmptyState text="暂无证券持仓" />
      ) : (
        <div className="space-y-2">
          {securities.map((s) => {
            const member = members.find((mb) => mb.id === s.memberId);
            const totalValue = s.shares * s.currentPrice;
            const totalCNY = toCNYDirect(totalValue, s.currency, rates);
            const costBasis = s.shares * s.purchasePrice;
            const pnl = totalValue - costBasis;
            return (
              <div key={s.id} className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-strong transition-colors duration-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-md font-medium">
                      {SECURITY_TYPES[s.secType as SecurityType] || s.secType}
                    </span>
                    {member && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ backgroundColor: member.color + '22', color: member.color }}
                      >
                        {member.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    {s.symbol && <span>{s.symbol}</span>}
                    <span>{formatNumber(s.shares)} 份</span>
                    <span>现价 {formatNumber(s.currentPrice)}</span>
                    {s.purchasePrice > 0 && (
                      <span className={pnl >= 0 ? 'text-secondary' : 'text-danger'}>
                        盈亏 {pnl >= 0 ? '+' : ''}{formatNumber(pnl)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold mr-1">{formatCNY(totalCNY)}</span>
                  <button
                    onClick={() => openEdit(s)}
                    className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                  >
                    <Pencil size={14} className="text-foreground-secondary" />
                  </button>
                  <button
                    onClick={() => db.transact(db.tx.securities[s.id].delete())}
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
        title={editingId ? '编辑证券' : '添加证券'}
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
              label="证券类型"
              value={form.secType}
              onChange={(v) => setForm((f) => ({ ...f, secType: v as SecurityType }))}
              options={Object.entries(SECURITY_TYPES).map(([k, v]) => ({ value: k, label: v }))}
            />
            <FormSelect
              label="币种"
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
              options={Object.entries(CURRENCIES).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="名称"
              value={form.name}
              onChange={(v) => { setForm((f) => ({ ...f, name: v })); clearError('name'); }}
              placeholder="如 沪深300ETF"
              error={errors.name}
            />
            <FormInput label="代码 (可选)" value={form.symbol} onChange={(v) => setForm((f) => ({ ...f, symbol: v }))} placeholder="如 510300" />
          </div>
          <FormInput
            label="持仓量 (份/股/个)"
            value={form.shares}
            onChange={(v) => { setForm((f) => ({ ...f, shares: v })); clearError('shares'); }}
            type="number"
            placeholder="数量"
            error={errors.shares}
            min={0}
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="买入单价" value={form.purchasePrice} onChange={(v) => setForm((f) => ({ ...f, purchasePrice: v }))} type="number" placeholder="买入价" />
            <FormInput
              label="当前单价"
              value={form.currentPrice}
              onChange={(v) => { setForm((f) => ({ ...f, currentPrice: v })); clearError('currentPrice'); }}
              type="number"
              placeholder="现价"
              error={errors.currentPrice}
            />
          </div>
          <FormInput label="买入日期" value={form.purchaseDate} onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))} type="date" />
          <button
            onClick={handleSave}
            className="w-full py-3 bg-secondary text-bg rounded-md font-semibold text-sm hover:bg-secondary-dark disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
