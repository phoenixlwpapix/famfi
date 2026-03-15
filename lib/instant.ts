import { init, id as instantId, i } from '@instantdb/react';

const APP_ID = 'b51ff63b-cb56-4291-a1a1-4f5ce918bd99';

const schema = i.schema({
  entities: {
    members: i.entity({
      name: i.string(),
      role: i.string(),
      color: i.string(),
      createdAt: i.number(),
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
    }),
    metals: i.entity({
      metalType: i.string(),
      grams: i.number(),
      purchasePrice: i.number(),
      currency: i.string(),
      currentPrice: i.number(),
      purchaseDate: i.string(),
      memberId: i.string(),
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
    }),
  },
});

type Schema = typeof schema;

export const db = init<Schema>({ appId: APP_ID, schema });
export const id = instantId;
