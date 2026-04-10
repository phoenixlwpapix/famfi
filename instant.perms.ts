import type { InstantRules } from '@instantdb/react';

const ownerOnly = {
  view: 'auth.id != null && auth.id == data.userId',
  create: 'auth.id != null && auth.id == data.userId',
  update:
    'auth.id != null && auth.id == data.userId && newData.userId == auth.id',
  delete: 'auth.id != null && auth.id == data.userId',
};

const rules = {
  $default: {
    allow: {
      view: 'false',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },
  $users: {
    allow: {
      view: 'auth.id != null && auth.id == data.id',
      create: 'false',
      update: 'false',
      delete: 'false',
    },
  },
  members: { allow: ownerOnly },
  incomes: { allow: ownerOnly },
  expenses: { allow: ownerOnly },
  deposits: { allow: ownerOnly },
  metals: { allow: ownerOnly },
  securities: { allow: ownerOnly },
  goals: { allow: ownerOnly },
} satisfies InstantRules;

export default rules;
