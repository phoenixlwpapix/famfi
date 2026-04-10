import { init, id as instantId, i } from '@instantdb/react';

const APP_ID = process.env.NEXT_PUBLIC_INSTANTDB_APP_ID!;

const schema = i.schema({
  entities: {
    members: i.entity({
      name: i.string(),
      role: i.string(),
      color: i.string(),
      createdAt: i.number(),
      userId: i.string(),
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
      startDate: i.string(),
      endDate: i.string(),
      userId: i.string(),
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
      userId: i.string(),
    }),
    metals: i.entity({
      metalType: i.string(),
      grams: i.number(),
      purchasePrice: i.number(),
      currency: i.string(),
      currentPrice: i.number(),
      purchaseDate: i.string(),
      memberId: i.string(),
      userId: i.string(),
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
      userId: i.string(),
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
      userId: i.string(),
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
      userId: i.string(),
    }),
  },
});

type Schema = typeof schema;

export const db = init<Schema>({ appId: APP_ID, schema });
export const id = instantId;
