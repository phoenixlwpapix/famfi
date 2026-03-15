'use client';

import { useState } from 'react';
import { Plus, Trash2, Edit3, User } from 'lucide-react';
import { db, id } from '@/lib/instant';
import { useFamilyStore } from '@/lib/store';
import { Modal } from '@/components/modal';
import {
  MEMBER_ROLES,
  MEMBER_COLORS,
  type MemberRole,
} from '@/lib/types';
import { cn, getInitials, formatCNY, toCNYDirect } from '@/lib/utils';

export function MemberManager() {
  const [modalOpen, setModalOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<MemberRole>('parent');
  const [color, setColor] = useState(MEMBER_COLORS[0]);

  const rates = useFamilyStore((s) => s.rates);
  const activeMemberId = useFamilyStore((s) => s.activeMemberId);
  const setActiveMember = useFamilyStore((s) => s.setActiveMember);

  const { data, isLoading } = db.useQuery({
    members: {},
    deposits: {},
    metals: {},
    securities: {},
  });

  const members = data?.members || [];

  function getMemberAssets(memberId: string) {
    const deposits = (data?.deposits || []).filter((d) => d.memberId === memberId);
    const metals = (data?.metals || []).filter((m) => m.memberId === memberId);
    const securities = (data?.securities || []).filter((s) => s.memberId === memberId);

    const depositTotal = deposits.reduce(
      (sum, d) => sum + toCNYDirect(d.amount, d.currency, rates),
      0
    );
    const metalTotal = metals.reduce(
      (sum, m) => sum + toCNYDirect(m.grams * m.currentPrice, m.currency, rates),
      0
    );
    const securityTotal = securities.reduce(
      (sum, s) => sum + toCNYDirect(s.shares * s.currentPrice, s.currency, rates),
      0
    );

    return {
      total: depositTotal + metalTotal + securityTotal,
      depositTotal,
      metalTotal,
      securityTotal,
      depositCount: deposits.length,
      metalCount: metals.length,
      securityCount: securities.length,
    };
  }

  function openAdd() {
    setEditId(null);
    setName('');
    setRole('parent');
    setColor(MEMBER_COLORS[members.length % MEMBER_COLORS.length]);
    setModalOpen(true);
  }

  function openEdit(member: { id: string; name: string; role: string; color: string }) {
    setEditId(member.id);
    setName(member.name);
    setRole(member.role as MemberRole);
    setColor(member.color);
    setModalOpen(true);
  }

  function handleSave() {
    if (!name.trim()) return;

    if (editId) {
      db.transact(
        db.tx.members[editId].update({
          name: name.trim(),
          role,
          color,
        })
      );
    } else {
      const newId = id();
      db.transact(
        db.tx.members[newId].update({
          name: name.trim(),
          role,
          color,
          createdAt: Date.now(),
        })
      );
    }
    setModalOpen(false);
  }

  function handleDelete(memberId: string) {
    db.transact(db.tx.members[memberId].delete());
    if (activeMemberId === memberId) {
      setActiveMember(null);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin text-primary">
          <User size={24} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">家庭成员</h1>
          <p className="text-sm text-foreground-secondary mt-1">
            管理家庭成员及其财务档案
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2.5 bg-foreground text-white rounded-md text-sm font-medium hover:scale-105 transition-transform duration-200"
        >
          <Plus size={16} strokeWidth={2.5} />
          添加成员
        </button>
      </div>

      {/* Member Grid */}
      {members.length === 0 ? (
        <div className="bg-muted rounded-lg p-12 text-center">
          <div className="inline-flex p-4 bg-primary/10 rounded-full mb-4">
            <User size={32} className="text-primary" />
          </div>
          <p className="text-foreground-secondary">
            还没有家庭成员，点击上方按钮添加
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {members.map((member) => {
            const assets = getMemberAssets(member.id);
            const isActive = activeMemberId === member.id;

            return (
              <div
                key={member.id}
                onClick={() => setActiveMember(isActive ? null : member.id)}
                className={cn(
                  'bg-muted rounded-lg p-5 cursor-pointer transition-all duration-200 hover:scale-[1.02]',
                  isActive && 'ring-2 ring-primary'
                )}
              >
                {/* Member Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-md flex items-center justify-center text-white font-bold text-sm"
                      style={{ backgroundColor: member.color }}
                    >
                      {getInitials(member.name)}
                    </div>
                    <div>
                      <p className="font-semibold text-sm">{member.name}</p>
                      <p className="text-xs text-foreground-secondary">
                        {MEMBER_ROLES[member.role as MemberRole] || member.role}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        openEdit(member);
                      }}
                      className="p-1.5 rounded-md hover:bg-white transition-colors"
                    >
                      <Edit3 size={14} className="text-foreground-secondary" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(member.id);
                      }}
                      className="p-1.5 rounded-md hover:bg-white transition-colors"
                    >
                      <Trash2 size={14} className="text-danger" />
                    </button>
                  </div>
                </div>

                {/* Assets Summary */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-foreground-secondary">总资产</span>
                    <span className="text-lg font-bold tracking-tight">
                      {formatCNY(assets.total)}
                    </span>
                  </div>
                  <div className="grid grid-cols-3 gap-2 pt-2 border-t border-gray-200">
                    <div className="text-center">
                      <p className="text-xs text-foreground-secondary">存款</p>
                      <p className="text-xs font-medium mt-0.5">
                        {assets.depositCount} 笔
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-foreground-secondary">贵金属</p>
                      <p className="text-xs font-medium mt-0.5">
                        {assets.metalCount} 笔
                      </p>
                    </div>
                    <div className="text-center">
                      <p className="text-xs text-foreground-secondary">证券</p>
                      <p className="text-xs font-medium mt-0.5">
                        {assets.securityCount} 笔
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add/Edit Modal */}
      <Modal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editId ? '编辑成员' : '添加成员'}
      >
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium block mb-1.5">姓名</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="请输入姓名"
              className="w-full px-3 py-2.5 bg-gray-100 rounded-md text-sm focus:bg-white focus:border-2 focus:border-primary outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-sm font-medium block mb-1.5">角色</label>
            <div className="grid grid-cols-4 gap-2">
              {(Object.entries(MEMBER_ROLES) as [MemberRole, string][]).map(
                ([key, label]) => (
                  <button
                    key={key}
                    onClick={() => setRole(key)}
                    className={cn(
                      'px-3 py-2 rounded-md text-xs font-medium transition-all duration-200',
                      role === key
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

          <div>
            <label className="text-sm font-medium block mb-1.5">颜色标识</label>
            <div className="flex gap-2">
              {MEMBER_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  className={cn(
                    'w-8 h-8 rounded-md transition-transform duration-200',
                    color === c && 'scale-110 ring-2 ring-offset-2 ring-foreground'
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <button
            onClick={handleSave}
            disabled={!name.trim()}
            className="w-full py-3 bg-primary text-white rounded-md font-medium text-sm hover:bg-primary-dark disabled:opacity-40 transition-colors duration-200"
          >
            {editId ? '保存修改' : '添加成员'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
