export type MemberRole = 'parent' | 'child' | 'grandparent' | 'other';
export type IncomeType = 'salary' | 'bonus' | 'extra';
export type DepositType = 'current' | 'fixed';
export type MetalType = 'gold' | 'silver';
export type SecurityType = 'fund' | 'stock' | 'crypto';
export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD';

export const MEMBER_ROLES: Record<MemberRole, string> = {
  parent: '父母',
  child: '子女',
  grandparent: '祖辈',
  other: '其他',
};

export const INCOME_TYPES: Record<IncomeType, string> = {
  salary: '固定工资',
  bonus: '奖金',
  extra: '额外收入',
};

export const DEPOSIT_TYPES: Record<DepositType, string> = {
  current: '活期',
  fixed: '定期',
};

export const METAL_TYPES: Record<MetalType, string> = {
  gold: '黄金',
  silver: '白银',
};

export const SECURITY_TYPES: Record<SecurityType, string> = {
  fund: '基金',
  stock: '股票',
  crypto: '加密货币',
};

export const CURRENCIES: Record<Currency, string> = {
  CNY: '人民币',
  USD: '美元',
  EUR: '欧元',
  GBP: '英镑',
  JPY: '日元',
  HKD: '港币',
};

export const MEMBER_COLORS = [
  '#3B82F6',
  '#10B981',
  '#F59E0B',
  '#EF4444',
  '#8B5CF6',
  '#EC4899',
  '#06B6D4',
  '#F97316',
];
