'use client';

import { useEffect, useRef } from 'react';
import { db, id } from '@/lib/instant';

interface RecurringItem {
  id: string;
  recurring: boolean;
  recurringSourceId: string;
  date: string;
  dayOfMonth: number;
  userId?: string;
  startDate?: string;
  endDate?: string;
}

function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function monthsBetween(start: string, end: string): string[] {
  const [sy, sm] = start.split('-').map(Number);
  const [ey, em] = end.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const months: string[] = [];
  let y = sy;
  let m = sm;
  while (y < ey || (y === ey && m <= em)) {
    months.push(`${y}-${String(m).padStart(2, '0')}`);
    m += 1;
    if (m > 12) {
      m = 1;
      y += 1;
    }
  }
  return months;
}

/**
 * Auto-generates records from recurring templates.
 * For templates with startDate (YYYY-MM), backfills every month from
 * startDate to min(endDate, currentMonth). Templates without startDate
 * only generate for the current month (legacy behavior).
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

    const cur = currentMonth();
    const txns: ReturnType<typeof db.tx.incomes[string]['update']>[] = [];

    for (const template of templates) {
      const startMonth = (template.startDate || '').slice(0, 7) || cur;
      const rawEnd = (template.endDate || '').slice(0, 7) || cur;
      const endMonth = rawEnd < cur ? rawEnd : cur;
      if (startMonth > endMonth) continue;

      const months = monthsBetween(startMonth, endMonth);

      for (const month of months) {
        const idempotencyKey = `${template.id}-${month}`;
        if (processedRef.current.has(idempotencyKey)) continue;

        const alreadyExists = items.some(
          (i) =>
            i.recurringSourceId === template.id &&
            i.date?.startsWith(month)
        );
        if (alreadyExists) {
          processedRef.current.add(idempotencyKey);
          continue;
        }

        const day = Math.min(template.dayOfMonth || 1, 28);
        const dateStr = `${month}-${String(day).padStart(2, '0')}`;
        const payload = buildPayload(template, dateStr, userId);

        // @ts-expect-error - dynamic entity access
        txns.push(db.tx[entityName][id()].update(payload));
        processedRef.current.add(idempotencyKey);
      }
    }

    if (txns.length > 0) {
      db.transact(txns);
    }
  }, [items, userId, entityName, buildPayload]);
}
