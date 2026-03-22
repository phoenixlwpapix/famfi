'use client';

import { useEffect, useRef } from 'react';
import { db, id } from '@/lib/instant';

interface RecurringItem {
  id: string;
  recurring: boolean;
  recurringSourceId: string;
  date: string;
  dayOfMonth: number;
  userId: string;
}

/**
 * Auto-generates records from recurring templates for the current month.
 * Uses a processed-templates Set keyed by `${templateId}-${YYYY-MM}` to
 * ensure idempotency even if the effect re-fires.
 */
export function useRecurringAutoGen<T extends RecurringItem>(
  items: T[] | undefined,
  userId: string,
  entityName: 'incomes' | 'expenses',
  buildPayload: (template: T, dateStr: string, userId: string) => Record<string, unknown>
) {
  const processedRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!items || !userId) return;

    const templates = items.filter((i) => i.recurring);
    if (templates.length === 0) return;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

    const txns: ReturnType<typeof db.tx.incomes[string]['update']>[] = [];

    for (const template of templates) {
      const idempotencyKey = `${template.id}-${currentMonth}`;

      // Already processed in this session
      if (processedRef.current.has(idempotencyKey)) continue;

      // Already exists in DB
      const alreadyExists = items.some(
        (i) =>
          i.recurringSourceId === template.id &&
          i.date?.startsWith(currentMonth)
      );
      if (alreadyExists) {
        processedRef.current.add(idempotencyKey);
        continue;
      }

      const day = Math.min(template.dayOfMonth || 1, 28);
      const dateStr = `${currentMonth}-${String(day).padStart(2, '0')}`;
      const payload = buildPayload(template, dateStr, userId);

      // @ts-expect-error - dynamic entity access
      txns.push(db.tx[entityName][id()].update(payload));
      processedRef.current.add(idempotencyKey);
    }

    if (txns.length > 0) {
      db.transact(txns);
    }
  }, [items, userId, entityName, buildPayload]);
}
