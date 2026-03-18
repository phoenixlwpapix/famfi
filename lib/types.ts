export type MemberRole = 'parent' | 'child' | 'grandparent' | 'other';
export type IncomeType = 'salary' | 'bonus' | 'extra';
export type DepositType = 'current' | 'fixed';
export type MetalType = 'gold' | 'silver';
export type SecurityType = 'fund' | 'stock' | 'crypto';
export type Currency = 'CNY' | 'USD' | 'EUR' | 'GBP' | 'JPY' | 'HKD';
export type ExpenseCategory = 'housing' | 'food' | 'transport' | 'education' | 'healthcare' | 'entertainment' | 'shopping' | 'other';
export type GoalCategory = 'savings' | 'investment' | 'education' | 'housing' | 'travel' | 'retirement' | 'other';
export type GoalStatus = 'active' | 'completed' | 'paused';

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

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, string> = {
  housing: '住房',
  food: '餐饮',
  transport: '交通',
  education: '教育',
  healthcare: '医疗',
  entertainment: '娱乐',
  shopping: '购物',
  other: '其他',
};

export const EXPENSE_CATEGORY_ICONS: Record<ExpenseCategory, string> = {
  housing: '🏠',
  food: '🍽️',
  transport: '🚗',
  education: '📚',
  healthcare: '🏥',
  entertainment: '🎮',
  shopping: '🛍️',
  other: '📦',
};

export const GOAL_CATEGORIES: Record<GoalCategory, string> = {
  savings: '储蓄',
  investment: '投资',
  education: '教育',
  housing: '购房',
  travel: '旅行',
  retirement: '养老',
  other: '其他',
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
