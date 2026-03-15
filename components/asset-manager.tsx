'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, Landmark, Gem, BarChart3, RefreshCw } from 'lucide-react';
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
import { cn, formatCNY, formatNumber, toCNYDirect, formatDate } from '@/lib/utils';

type Tab = 'deposits' | 'metals' | 'securities';

const TABS: { key: Tab; label: string; icon: typeof Landmark }[] = [
  { key: 'deposits', label: '存款', icon: Landmark },
  { key: 'metals', label: '贵金属', icon: Gem },
  { key: 'securities', label: '有价证券', icon: BarChart3 },
];

export function AssetManager() {
  const [activeTab, setActiveTab] = useState<Tab>('deposits');
  const rates = useFamilyStore((s) => s.rates);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);

  const { data, isLoading } = db.useQuery({
    members: {},
    deposits: {},
    metals: {},
    securities: {},
  });

  const members = data?.members || [];

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
      <div>
        <h1 className="text-2xl font-bold tracking-tight">资产管理</h1>
        <p className="text-sm text-foreground-secondary mt-1">
          管理存款、贵金属与有价证券
        </p>
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

      {/* Tabs */}
      <div className="flex border-b-2 border-gray-100">
        {TABS.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={cn(
              'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-[2px] transition-colors duration-200',
              activeTab === key
                ? 'border-primary text-primary'
                : 'border-transparent text-foreground-secondary hover:text-foreground'
            )}
          >
            <Icon size={16} strokeWidth={2.2} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'deposits' && (
        <DepositsTab members={members} rates={rates} activeMemberId={activeMemberId} />
      )}
      {activeTab === 'metals' && (
        <MetalsTab members={members} rates={rates} activeMemberId={activeMemberId} />
      )}
      {activeTab === 'securities' && (
        <SecuritiesTab members={members} rates={rates} activeMemberId={activeMemberId} />
      )}
    </div>
  );
}

// ---- Deposits Tab ----
function DepositsTab({
  members,
  rates,
  activeMemberId,
}: {
  members: { id: string; name: string }[];
  rates: Record<string, number>;
  activeMemberId: string | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    type: 'current' as DepositType,
    amount: '',
    currency: 'CNY' as Currency,
    rate: '',
    startDate: '',
    endDate: '',
    bank: '',
    memberId: '',
  });

  const { data } = db.useQuery({ deposits: {} });
  const deposits = useMemo(() => {
    const all = data?.deposits || [];
    return activeMemberId ? all.filter((d) => d.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function handleAdd() {
    if (!form.amount || !form.memberId) return;
    db.transact(
      db.tx.deposits[id()].update({
        type: form.type,
        amount: parseFloat(form.amount),
        currency: form.currency,
        rate: parseFloat(form.rate) || 0,
        startDate: form.startDate,
        endDate: form.endDate,
        bank: form.bank,
        memberId: form.memberId,
      })
    );
    setModalOpen(false);
    setForm({ type: 'current', amount: '', currency: 'CNY', rate: '', startDate: '', endDate: '', bank: '', memberId: '' });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-foreground-secondary">
          共 {deposits.length} 笔存款
        </p>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, memberId: activeMemberId || members[0]?.id || '' }));
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-md text-xs font-medium hover:scale-105 transition-transform duration-200"
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
              <div
                key={d.id}
                className="bg-muted rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {DEPOSIT_TYPES[d.type as DepositType] || d.type}
                    </span>
                    {member && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-md">
                        {member.name}
                      </span>
                    )}
                    {d.bank && (
                      <span className="text-xs text-foreground-secondary">
                        {d.bank}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    <span>{CURRENCIES[d.currency as Currency] || d.currency} {formatNumber(d.amount)}</span>
                    {d.rate > 0 && <span>利率 {d.rate}%</span>}
                    {d.startDate && <span>存入 {formatDate(d.startDate)}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">
                    {formatCNY(toCNYDirect(d.amount, d.currency, rates))}
                  </span>
                  <button
                    onClick={() => db.transact(db.tx.deposits[d.id].delete())}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="添加存款">
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
          <FormInput
            label="金额"
            value={form.amount}
            onChange={(v) => setForm((f) => ({ ...f, amount: v }))}
            type="number"
            placeholder="请输入金额"
          />
          <FormInput
            label="年利率 (%)"
            value={form.rate}
            onChange={(v) => setForm((f) => ({ ...f, rate: v }))}
            type="number"
            placeholder="如 2.5"
          />
          <FormInput
            label="银行"
            value={form.bank}
            onChange={(v) => setForm((f) => ({ ...f, bank: v }))}
            placeholder="如 中国银行"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="存入日期"
              value={form.startDate}
              onChange={(v) => setForm((f) => ({ ...f, startDate: v }))}
              type="date"
            />
            <FormInput
              label="到期日期"
              value={form.endDate}
              onChange={(v) => setForm((f) => ({ ...f, endDate: v }))}
              type="date"
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

// ---- Metals Tab ----
function MetalsTab({
  members,
  rates,
  activeMemberId,
}: {
  members: { id: string; name: string }[];
  rates: Record<string, number>;
  activeMemberId: string | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    metalType: 'gold' as MetalType,
    grams: '',
    purchasePrice: '',
    currentPrice: '',
    currency: 'CNY' as Currency,
    purchaseDate: '',
    memberId: '',
  });

  const { data } = db.useQuery({ metals: {} });
  const metals = useMemo(() => {
    const all = data?.metals || [];
    return activeMemberId ? all.filter((m) => m.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function handleAdd() {
    if (!form.grams || !form.currentPrice || !form.memberId) return;
    db.transact(
      db.tx.metals[id()].update({
        metalType: form.metalType,
        grams: parseFloat(form.grams),
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        currentPrice: parseFloat(form.currentPrice),
        currency: form.currency,
        purchaseDate: form.purchaseDate,
        memberId: form.memberId,
      })
    );
    setModalOpen(false);
    setForm({ metalType: 'gold', grams: '', purchasePrice: '', currentPrice: '', currency: 'CNY', purchaseDate: '', memberId: '' });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-foreground-secondary">
          共 {metals.length} 笔持仓
        </p>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, memberId: activeMemberId || members[0]?.id || '' }));
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-accent text-white rounded-md text-xs font-medium hover:scale-105 transition-transform duration-200"
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
            const totalValue = m.grams * m.currentPrice;
            const totalCNY = toCNYDirect(totalValue, m.currency, rates);
            const costBasis = m.grams * m.purchasePrice;
            const pnl = totalValue - costBasis;
            return (
              <div
                key={m.id}
                className="bg-muted rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">
                      {METAL_TYPES[m.metalType as MetalType] || m.metalType}
                    </span>
                    {member && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-md">
                        {member.name}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-4 mt-1 text-xs text-foreground-secondary">
                    <span>{formatNumber(m.grams)}g</span>
                    <span>现价 {formatNumber(m.currentPrice)}/{CURRENCIES[m.currency as Currency] || m.currency}</span>
                    {m.purchaseDate && <span>买入 {formatDate(m.purchaseDate)}</span>}
                    {m.purchasePrice > 0 && (
                      <span className={pnl >= 0 ? 'text-secondary' : 'text-danger'}>
                        盈亏 {pnl >= 0 ? '+' : ''}{formatNumber(pnl)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatCNY(totalCNY)}</span>
                  <button
                    onClick={() => db.transact(db.tx.metals[m.id].delete())}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="添加贵金属">
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
            <FormSelect
              label="币种"
              value={form.currency}
              onChange={(v) => setForm((f) => ({ ...f, currency: v as Currency }))}
              options={Object.entries(CURRENCIES).map(([k, v]) => ({ value: k, label: v }))}
            />
          </div>
          <FormInput
            label="克数"
            value={form.grams}
            onChange={(v) => setForm((f) => ({ ...f, grams: v }))}
            type="number"
            placeholder="持仓克数"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="买入单价 (每克)"
              value={form.purchasePrice}
              onChange={(v) => setForm((f) => ({ ...f, purchasePrice: v }))}
              type="number"
              placeholder="买入价"
            />
            <FormInput
              label="当前单价 (每克)"
              value={form.currentPrice}
              onChange={(v) => setForm((f) => ({ ...f, currentPrice: v }))}
              type="number"
              placeholder="现价"
            />
          </div>
          <FormInput
            label="买入日期"
            value={form.purchaseDate}
            onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))}
            type="date"
          />
          <button
            onClick={handleAdd}
            disabled={!form.grams || !form.currentPrice || !form.memberId}
            className="w-full py-3 bg-accent text-white rounded-md font-medium text-sm hover:bg-accent-dark disabled:opacity-40 transition-colors duration-200"
          >
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Securities Tab ----
function SecuritiesTab({
  members,
  rates,
  activeMemberId,
}: {
  members: { id: string; name: string }[];
  rates: Record<string, number>;
  activeMemberId: string | null;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({
    secType: 'fund' as SecurityType,
    name: '',
    symbol: '',
    shares: '',
    purchasePrice: '',
    currentPrice: '',
    currency: 'CNY' as Currency,
    purchaseDate: '',
    memberId: '',
  });

  const { data } = db.useQuery({ securities: {} });
  const securities = useMemo(() => {
    const all = data?.securities || [];
    return activeMemberId ? all.filter((s) => s.memberId === activeMemberId) : all;
  }, [data, activeMemberId]);

  function handleAdd() {
    if (!form.shares || !form.currentPrice || !form.name || !form.memberId) return;
    db.transact(
      db.tx.securities[id()].update({
        secType: form.secType,
        name: form.name,
        symbol: form.symbol,
        shares: parseFloat(form.shares),
        purchasePrice: parseFloat(form.purchasePrice) || 0,
        currentPrice: parseFloat(form.currentPrice),
        currency: form.currency,
        purchaseDate: form.purchaseDate,
        memberId: form.memberId,
      })
    );
    setModalOpen(false);
    setForm({ secType: 'fund', name: '', symbol: '', shares: '', purchasePrice: '', currentPrice: '', currency: 'CNY', purchaseDate: '', memberId: '' });
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <p className="text-sm text-foreground-secondary">
          共 {securities.length} 笔持仓
        </p>
        <button
          onClick={() => {
            setForm((f) => ({ ...f, memberId: activeMemberId || members[0]?.id || '' }));
            setModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-secondary text-white rounded-md text-xs font-medium hover:scale-105 transition-transform duration-200"
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
              <div
                key={s.id}
                className="bg-muted rounded-lg p-4 flex items-center justify-between"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold">{s.name}</span>
                    <span className="text-xs px-2 py-0.5 bg-secondary/10 text-secondary rounded-md font-medium">
                      {SECURITY_TYPES[s.secType as SecurityType] || s.secType}
                    </span>
                    {member && (
                      <span className="text-xs px-2 py-0.5 bg-gray-200 rounded-md">
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
                <div className="flex items-center gap-3">
                  <span className="text-sm font-bold">{formatCNY(totalCNY)}</span>
                  <button
                    onClick={() => db.transact(db.tx.securities[s.id].delete())}
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

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="添加证券">
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
            <FormInput
              label="名称"
              value={form.name}
              onChange={(v) => setForm((f) => ({ ...f, name: v }))}
              placeholder="如 沪深300ETF"
            />
            <FormInput
              label="代码 (可选)"
              value={form.symbol}
              onChange={(v) => setForm((f) => ({ ...f, symbol: v }))}
              placeholder="如 510300"
            />
          </div>
          <FormInput
            label="持仓量 (份/股/个)"
            value={form.shares}
            onChange={(v) => setForm((f) => ({ ...f, shares: v }))}
            type="number"
            placeholder="数量"
          />
          <div className="grid grid-cols-2 gap-3">
            <FormInput
              label="买入单价"
              value={form.purchasePrice}
              onChange={(v) => setForm((f) => ({ ...f, purchasePrice: v }))}
              type="number"
              placeholder="买入价"
            />
            <FormInput
              label="当前单价"
              value={form.currentPrice}
              onChange={(v) => setForm((f) => ({ ...f, currentPrice: v }))}
              type="number"
              placeholder="现价"
            />
          </div>
          <FormInput
            label="买入日期"
            value={form.purchaseDate}
            onChange={(v) => setForm((f) => ({ ...f, purchaseDate: v }))}
            type="date"
          />
          <button
            onClick={handleAdd}
            disabled={!form.shares || !form.currentPrice || !form.name || !form.memberId}
            className="w-full py-3 bg-secondary text-white rounded-md font-medium text-sm hover:bg-secondary-dark disabled:opacity-40 transition-colors duration-200"
          >
            添加
          </button>
        </div>
      </Modal>
    </div>
  );
}

// ---- Shared Components ----
function EmptyState({ text }: { text: string }) {
  return (
    <div className="bg-muted rounded-lg p-8 text-center">
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
        className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all"
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
        className="w-full px-3 py-2 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all appearance-none"
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
