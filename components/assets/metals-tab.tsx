'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { Modal } from '@/components/modal';
import { FormInput, FormSelect, EmptyState } from '@/components/ui/form-fields';
import {
  METAL_TYPES,
  CURRENCIES,
  type MetalType,
  type Currency,
} from '@/lib/types';
import { formatCNY, formatNumber, formatDate, getMetalValueCNY, getLivePricePerGram, TROY_OZ_TO_GRAMS } from '@/lib/utils';

const METAL_EMPTY = {
  metalType: 'gold' as MetalType,
  grams: '',
  purchasePrice: '',
  currentPrice: '',
  currency: 'CNY' as Currency,
  purchaseDate: '',
  memberId: '',
};

export function MetalsTab({
  members,
  rates,
  metalPrices,
  activeMemberId,
  userId,
}: {
  members: { id: string; name: string; color: string }[];
  rates: Record<string, number>;
  metalPrices: { gold: number; silver: number };
  activeMemberId: string | null;
  userId: string;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(METAL_EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { data } = db.useQuery({ metals: { $: { where: { userId } } } });
  const metals = useMemo(() => {
    const all = data?.metals || [];
    return activeMemberId ? all.filter((m) => m.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function clearError(field: string) {
    setErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }

  const isAutoType = (type: string) => type === 'gold' || type === 'silver';
  const hasLivePrice = (type: string) => getLivePricePerGram(type, metalPrices) > 0;

  function openAdd() {
    setEditingId(null);
    setForm({ ...METAL_EMPTY, memberId: activeMemberId || members[0]?.id || '' });
    setErrors({});
    setModalOpen(true);
  }

  function openEdit(m: (typeof metals)[number]) {
    const auto = isAutoType((m.metalType as MetalType) || 'gold');
    setEditingId(m.id);
    setForm({
      metalType: (m.metalType as MetalType) || 'gold',
      grams: String(m.grams),
      purchasePrice: m.purchasePrice
        ? String(auto ? parseFloat((m.purchasePrice * TROY_OZ_TO_GRAMS).toFixed(2)) : m.purchasePrice)
        : '',
      currentPrice: String(m.currentPrice),
      currency: (m.currency as Currency) || 'CNY',
      purchaseDate: m.purchaseDate || '',
      memberId: m.memberId,
    });
    setErrors({});
    setModalOpen(true);
  }

  function handleSave() {
    const newErrors: Record<string, string> = {};
    if (!form.memberId) newErrors.memberId = '请选择成员';
    if (!form.grams) newErrors.grams = '请输入克数';
    else if (parseFloat(form.grams) <= 0) newErrors.grams = '克数必须大于 0';
    if (isAutoType(form.metalType) && !hasLivePrice(form.metalType)) newErrors.grams = '实时价格尚未加载';
    if (!isAutoType(form.metalType) && !form.currentPrice) newErrors.currentPrice = '请输入当前单价';
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    const livePrice = getLivePricePerGram(form.metalType, metalPrices);
    const rawPurchase = parseFloat(form.purchasePrice) || 0;
    const payload = {
      metalType: form.metalType,
      grams: parseFloat(form.grams),
      purchasePrice: isAutoType(form.metalType) ? rawPurchase / TROY_OZ_TO_GRAMS : rawPurchase,
      currentPrice: isAutoType(form.metalType) ? livePrice : parseFloat(form.currentPrice),
      currency: isAutoType(form.metalType) ? 'USD' : form.currency,
      purchaseDate: form.purchaseDate,
      memberId: form.memberId,
      userId,
    };
    db.transact(
      editingId
        ? db.tx.metals[editingId].update(payload)
        : db.tx.metals[id()].update(payload)
    );
    setModalOpen(false);
    setEditingId(null);
    setForm(METAL_EMPTY);
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-foreground-secondary">共 {metals.length} 笔持仓</p>
        <button
          onClick={openAdd}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent/15 text-accent border border-accent/30 rounded-md text-xs font-medium hover:bg-accent/25 transition-colors duration-200"
        >
          <Plus size={14} strokeWidth={2.5} />
          添加贵金属
        </button>
      </div>

      {metals.length === 0 ? (
        <EmptyState text="暂无贵金属持仓" />
      ) : (
        <div className="space-y-2">
          {metals.map((m) => {
            const member = members.find((mb) => mb.id === m.memberId);
            const auto = isAutoType(m.metalType);
            const totalCNY = getMetalValueCNY(m.grams, m.metalType, m.currentPrice, m.currency, metalPrices, rates);
            const livePerGram = getLivePricePerGram(m.metalType, metalPrices);
            const effectivePrice = auto ? livePerGram : m.currentPrice;
            const pnl = m.purchasePrice > 0 ? (effectivePrice - m.purchasePrice) * m.grams : 0;
            const liveOzUSD = m.metalType === 'gold' ? metalPrices.gold : metalPrices.silver;
            return (
              <div key={m.id} className="bg-surface border border-border rounded-xl p-4 flex items-center justify-between hover:border-border-strong transition-colors duration-200">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {METAL_TYPES[m.metalType as MetalType] || m.metalType}
                    </span>
                    {member && (
                      <span
                        className="text-xs px-2 py-0.5 rounded-md font-medium"
                        style={{ backgroundColor: member.color + '22', color: member.color }}
                      >
                        {member.name}
                      </span>
                    )}
                    {auto && (
                      <span className="text-xs px-2 py-0.5 bg-accent/10 text-accent-dark rounded-md font-medium">
                        实时价
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    <span>{formatNumber(m.grams)}g</span>
                    {auto
                      ? <span>现价 {liveOzUSD > 0 ? `$${formatNumber(liveOzUSD, 2)}/oz` : '价格加载中...'}</span>
                      : <span>现价 {formatNumber(m.currentPrice)}/{CURRENCIES[m.currency as Currency] || m.currency}</span>
                    }
                    {m.purchaseDate && <span>买入 {formatDate(m.purchaseDate)}</span>}
                    {m.purchasePrice > 0 && (
                      <span className={pnl >= 0 ? 'text-secondary' : 'text-danger'}>
                        盈亏 {pnl >= 0 ? '+' : ''}{formatNumber(pnl)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold mr-1">{formatCNY(totalCNY)}</span>
                  <button
                    onClick={() => openEdit(m)}
                    className="p-1.5 rounded-md hover:bg-surface-elevated transition-colors"
                  >
                    <Pencil size={14} className="text-foreground-secondary" />
                  </button>
                  <button
                    onClick={() => db.transact(db.tx.metals[m.id].delete())}
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
        title={editingId ? '编辑贵金属' : '添加贵金属'}
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
              label="金属类型"
              value={form.metalType}
              onChange={(v) => setForm((f) => ({ ...f, metalType: v as MetalType }))}
              options={Object.entries(METAL_TYPES).map(([k, v]) => ({ value: k, label: v }))}
            />
            {isAutoType(form.metalType) ? (
              <div>
                <label className="text-xs font-medium block mb-1">币种</label>
                <div className="px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground-secondary">
                  USD（自动）
                </div>
              </div>
            ) : (
              <FormSelect
                label="币种"
                value={form.currency}
                onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
                options={Object.entries(CURRENCIES).map(([k, v]) => ({ value: k, label: v }))}
              />
            )}
          </div>
          <div>
            <FormInput
              label="克数"
              value={form.grams}
              onChange={(v) => { setForm((f) => ({ ...f, grams: v })); clearError('grams'); }}
              type="number"
              placeholder="持仓克数"
              error={errors.grams}
              min={0}
            />
            {isAutoType(form.metalType) && parseFloat(form.grams) > 0 && (
              <p className="text-xs text-foreground-secondary mt-1">
                ≈ {formatNumber(parseFloat(form.grams) / TROY_OZ_TO_GRAMS, 4)} oz
              </p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label={isAutoType(form.metalType) ? '买入单价 (USD/oz)' : '买入单价 (每克)'}
              value={form.purchasePrice}
              onChange={(v) => setForm((f) => ({ ...f, purchasePrice: v }))}
              type="number"
              placeholder={isAutoType(form.metalType) ? '如 2800' : '买入价'}
            />
            {isAutoType(form.metalType) ? (
              <div>
                <label className="text-xs font-medium block mb-1">当前单价</label>
                <div className="px-3 py-2 bg-accent/10 border border-accent/20 rounded-md text-sm text-accent font-medium">
                  ${formatNumber(form.metalType === 'gold' ? metalPrices.gold : metalPrices.silver, 2)}/oz
                  <span className="text-xs font-normal ml-1 text-foreground-secondary">自动获取</span>
                </div>
              </div>
            ) : (
              <FormInput
                label="当前单价 (每克)"
                value={form.currentPrice}
                onChange={(v) => { setForm((f) => ({ ...f, currentPrice: v })); clearError('currentPrice'); }}
                type="number"
                placeholder="现价"
                error={errors.currentPrice}
              />
            )}
          </div>
          <FormInput label="买入日期" value={form.purchaseDate} onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))} type="date" />
          <button
            onClick={handleSave}
            className="w-full py-3 bg-accent text-bg rounded-md font-semibold text-sm hover:bg-accent-dark disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
