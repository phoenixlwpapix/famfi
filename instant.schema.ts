import { i } from '@instantdb/react';

const _schema = i.schema({
  entities: {
    $users: i.entity({
      email: i.string().unique().indexed(),
    }),
    members: i.entity({
      name: i.string(),
      role: i.string(),
      color: i.string(),
      createdAt: i.number(),
      userId: i.string().optional().indexed(),
    }),
    incomes: i.entity({
      type: i.string(),
      amount: i.number(),
      currency: i.string(),
      description: i.string(),
      date: i.string(),
      memberId: i.string(),
      recurring: i.boolean(),
      dayOfMonth: i.number(),
      recurringSourceId: i.string(),
      startDate: i.string().optional(),
      endDate: i.string().optional(),
      userId: i.string().optional().indexed(),
    }),
    deposits: i.entity({
      type: i.string(),
      amount: i.number(),
      currency: i.string(),
      rate: i.number(),
      startDate: i.string(),
      endDate: i.string(),
      bank: i.string(),
      memberId: i.string(),
      userId: i.string().optional().indexed(),
    }),
    metals: i.entity({
      metalType: i.string(),
      grams: i.number(),
      purchasePrice: i.number(),
      currency: i.string(),
      currentPrice: i.number(),
      purchaseDate: i.string(),
      memberId: i.string(),
      userId: i.string().optional().indexed(),
    }),
    securities: i.entity({
      secType: i.string(),
      name: i.string(),
      symbol: i.string(),
      shares: i.number(),
      purchasePrice: i.number(),
      currentPrice: i.number(),
      currency: i.string(),
      purchaseDate: i.string(),
      memberId: i.string(),
      userId: i.string().optional().indexed(),
    }),
    expenses: i.entity({
      category: i.string(),
      amount: i.number(),
      currency: i.string(),
      description: i.string(),
      date: i.string(),
      memberId: i.string(),
      recurring: i.boolean(),
      dayOfMonth: i.number(),
      recurringSourceId: i.string(),
      userId: i.string().optional().indexed(),
    }),
    goals: i.entity({
      name: i.string(),
      targetAmount: i.number(),
      currentAmount: i.number(),
      currency: i.string(),
      deadline: i.string(),
      category: i.string(),
      status: i.string(),
      createdAt: i.number(),
      userId: i.string().optional().indexed(),
    }),
  },
});

type _AppSchema = typeof _schema;
export type AppSchema = _AppSchema;
const schema: AppSchema = _schema;

export default schema;
