'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Pencil, Landmark, Gem, BarChart3, RefreshCw } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { Modal } from '@/components/modal';
import {
  DEPOSIT_TYPES,
  METAL_TYPES,
  SECURITY_TYPES,
  CURRENCIES,
  type DepositType,
  type MetalType,
  type SecurityType,
  type Currency,
} from '@/lib/types';
import { cn, formatCNY, formatNumber, toCNYDirect, formatDate, getMetalValueCNY, getLivePricePerGram, TROY_OZ_TO_GRAMS } from '@/lib/utils';

type Tab = 'deposits' | 'metals' | 'securities';

const TABS: { key: Tab; label: string; icon: typeof Landmark }[] = [
  { key: 'deposits', label: '存款', icon: Landmark },
  { key: 'metals', label: '贵金属', icon: Gem },
  { key: 'securities', label: '有价证券', icon: BarChart3 },
];

export function AssetManager() {
  const [activeTab, setActiveTab] = useState<Tab>('deposits');
  const rates = useFamilyStore((s) => s.rates);
  const metalPrices = useFamilyStore((s) => s.metalPrices);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const { user } = db.useAuth();
  const userId = user?.id ?? '';

  const { data, isLoading } = db.useQuery({
    members: { $: { where: { userId } } },
    deposits: { $: { where: { userId } } },
    metals: { $: { where: { userId } } },
    securities: { $: { where: { userId } } },
  });

  const members: { id: string; name: string; color: string }[] = data?.members || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">资产管理</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          管理存款、贵金属与有价证券
        </p>
      </div>

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

      <div className="flex border-b border-border">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors duration-200',
              activeTab === key
                ? 'border-primary text-primary-light'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            )}
          >
            <Icon size={15} strokeWidth={activeTab === key ? 2.5 : 2} />
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'deposits' && (
        <DepositsTab members={members} rates={rates} activeMemberId={activeMemberId} userId={userId} />
      )}
      {activeTab === 'metals' && (
        <MetalsTab members={members} rates={rates} metalPrices={metalPrices} activeMemberId={activeMemberId} userId={userId} />
      )}
      {activeTab === 'securities' && (
        <SecuritiesTab members={members} rates={rates} activeMemberId={activeMemberId} userId={userId} />
      )}
    </div>
  );
}

// ---- Deposits Tab ----
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

function DepositsTab({
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

  const { data } = db.useQuery({ deposits: { $: { where: { userId } } } });
  const deposits = useMemo(() => {
    const all = data?.deposits || [];
    return activeMemberId ? all.filter((d) => d.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...DEPOSIT_EMPTY, memberId: activeMemberId || members[0]?.id || '' });
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
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.amount || !form.memberId) return;
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
            onChange={(v) => setForm((f) => ({ ...f, memberId: v }))}
            options={members.map((m) => ({ value: m.id, label: m.name }))}
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
          <FormInput label="金额" value={form.amount} onChange={(v) => setForm((f) => ({ ...f, amount: v }))} type="number" placeholder="请输入金额" />
          <FormInput label="年利率 (%)" value={form.rate} onChange={(v) => setForm((f) => ({ ...f, rate: v }))} type="number" placeholder="如 2.5" />
          <FormInput label="银行" value={form.bank} onChange={(v) => setForm((f) => ({ ...f, bank: v }))} placeholder="如 中国银行" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="存入日期" value={form.startDate} onChange={(v) => setForm((f) => ({ ...f, startDate: v }))} type="date" />
            <FormInput label="到期日期" value={form.endDate} onChange={(v) => setForm((f) => ({ ...f, endDate: v }))} type="date" />
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

// ---- Metals Tab ----
const METAL_EMPTY = {
  metalType: 'gold' as MetalType,
  grams: '',
  purchasePrice: '',
  currentPrice: '',
  currency: 'CNY' as Currency,
  purchaseDate: '',
  memberId: '',
};

function MetalsTab({
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

  const { data } = db.useQuery({ metals: { $: { where: { userId } } } });
  const metals = useMemo(() => {
    const all = data?.metals || [];
    return activeMemberId ? all.filter((m) => m.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...METAL_EMPTY, memberId: activeMemberId || members[0]?.id || '' });
    setModalOpen(true);
  }

  function openEdit(m: (typeof metals)[number]) {
    const auto = isAutoType((m.metalType as MetalType) || 'gold');
    setEditingId(m.id);
    setForm({
      metalType: (m.metalType as MetalType) || 'gold',
      grams: String(m.grams),
      // auto types store USD/gram → display as USD/oz
      purchasePrice: m.purchasePrice
        ? String(auto ? parseFloat((m.purchasePrice * TROY_OZ_TO_GRAMS).toFixed(2)) : m.purchasePrice)
        : '',
      currentPrice: String(m.currentPrice),
      currency: (m.currency as Currency) || 'CNY',
      purchaseDate: m.purchaseDate || '',
      memberId: m.memberId,
    });
    setModalOpen(true);
  }

  // Always auto for gold/silver (UI), regardless of whether price has loaded yet
  const isAutoType = (type: string) => type === 'gold' || type === 'silver';
  const hasLivePrice = (type: string) => getLivePricePerGram(type, metalPrices) > 0;

  function handleSave() {
    if (!form.grams || !form.memberId) return;
    if (isAutoType(form.metalType) && !hasLivePrice(form.metalType)) return;
    if (!isAutoType(form.metalType) && !form.currentPrice) return;

    const livePrice = getLivePricePerGram(form.metalType, metalPrices);
    const rawPurchase = parseFloat(form.purchasePrice) || 0;
    const payload = {
      metalType: form.metalType,
      grams: parseFloat(form.grams),
      // auto types: user inputs USD/oz → store as USD/gram
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
            // Display live price in USD/oz
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
            onChange={(v) => setForm((f) => ({ ...f, memberId: v }))}
            options={members.map((m) => ({ value: m.id, label: m.name }))}
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
            <FormInput label="克数" value={form.grams} onChange={(v) => setForm((f) => ({ ...f, grams: v }))} type="number" placeholder="持仓克数" />
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
              <FormInput label="当前单价 (每克)" value={form.currentPrice} onChange={(v) => setForm((f) => ({ ...f, currentPrice: v }))} type="number" placeholder="现价" />
            )}
          </div>
          <FormInput label="买入日期" value={form.purchaseDate} onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))} type="date" />
          <button
            onClick={handleSave}
            disabled={
              !form.grams || !form.memberId ||
              (isAutoType(form.metalType) ? !hasLivePrice(form.metalType) : !form.currentPrice)
            }
            className="w-full py-3 bg-accent text-bg rounded-md font-semibold text-sm hover:bg-accent-dark disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Securities Tab ----
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

function SecuritiesTab({
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

  const { data } = db.useQuery({ securities: { $: { where: { userId } } } });
  const securities = useMemo(() => {
    const all = data?.securities || [];
    return activeMemberId ? all.filter((s) => s.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function openAdd() {
    setEditingId(null);
    setForm({ ...SECURITY_EMPTY, memberId: activeMemberId || members[0]?.id || '' });
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
    setModalOpen(true);
  }

  function handleSave() {
    if (!form.shares || !form.currentPrice || !form.name || !form.memberId) return;
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
            onChange={(v) => setForm((f) => ({ ...f, memberId: v }))}
            options={members.map((m) => ({ value: m.id, label: m.name }))}
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
            <FormInput label="名称" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} placeholder="如 沪深300ETF" />
            <FormInput label="代码 (可选)" value={form.symbol} onChange={(v) => setForm((f) => ({ ...f, symbol: v }))} placeholder="如 510300" />
          </div>
          <FormInput label="持仓量 (份/股/个)" value={form.shares} onChange={(v) => setForm((f) => ({ ...f, shares: v }))} type="number" placeholder="数量" />
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="买入单价" value={form.purchasePrice} onChange={(v) => setForm((f) => ({ ...f, purchasePrice: v }))} type="number" placeholder="买入价" />
            <FormInput label="当前单价" value={form.currentPrice} onChange={(v) => setForm((f) => ({ ...f, currentPrice: v }))} type="number" placeholder="现价" />
          </div>
          <FormInput label="买入日期" value={form.purchaseDate} onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))} type="date" />
          <button
            onClick={handleSave}
            disabled={!form.shares || !form.currentPrice || !form.name || !form.memberId}
            className="w-full py-3 bg-secondary text-bg rounded-md font-semibold text-sm hover:bg-secondary-dark disabled:opacity-30 transition-colors duration-200"
          >
            {editingId ? '保存' : '添加'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Shared Components ----
function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-surface border border-border rounded-xl p-10 text-center">
      <p className="text-sm text-foreground-secondary">{text}</p>
    </div>
  );
}

function FormInput({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all placeholder:text-foreground-secondary/40"
      />
    </div>
  );
}

function FormSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <div>
      <label className="text-xs font-medium block mb-1">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-bg border border-border rounded-md text-sm text-foreground focus:border-primary outline-none transition-all appearance-none"
      >
        <option value="">请选择</option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}
