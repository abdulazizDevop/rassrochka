/**
 * Payment-overdue helpers for a contract.
 *
 * Semantics:
 *   - A contract has a payDay (day-of-month) and a lastPaymentDate.
 *   - Overdue starts strictly AFTER this month's payDay when the current
 *     period is not yet paid. payDay itself is a grace day.
 *   - Legacy debts (isLegacyDebt=true) ignore endDate and firstPay checks
 *     — they use only the current month's payDay.
 *
 * Kept in a shared module so `contracts` page, `analytics` page, and any
 * other consumer report the same numbers.
 */
import type { Contract } from './types';

export function parseRuDate(s: string | undefined | null): Date | null {
  if (!s) return null;
  const m = s.match(/^(\d{2})\.(\d{2})\.(\d{4})/);
  if (!m) return null;
  return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
}

/** First payment is one calendar month after startDate, on the payDay. */
export function getFirstPaymentDate(c: Contract): Date | null {
  const start = parseRuDate(c.startDate || c.createdAt);
  if (!start) return null;
  const payDay = c.payDay || 1;
  return new Date(start.getFullYear(), start.getMonth() + 1, payDay);
}

/** The payDay of the CURRENT open period (this month if payDay already passed, otherwise last month). */
export function getCurrentPeriodDueDate(c: Contract): Date {
  const now = new Date();
  const payDay = c.payDay || 1;
  if (now.getDate() > payDay) {
    return new Date(now.getFullYear(), now.getMonth(), payDay);
  }
  return new Date(now.getFullYear(), now.getMonth() - 1, payDay);
}

/** True if the most recent payment covers the current open period. */
export function isCurrentPeriodPaid(c: Contract): boolean {
  const lastPay = parseRuDate(c.lastPaymentDate);
  if (!lastPay) return false;
  return lastPay >= getCurrentPeriodDueDate(c);
}

export function isPaymentOverdue(c: Contract): boolean {
  if (c.remainingDebt <= 0) return false;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!c.isLegacyDebt) {
    const firstPay = getFirstPaymentDate(c);
    if (firstPay && today < firstPay) return false;
    const end = parseRuDate(c.endDate);
    if (end && end < today) return true;
  }
  const payDay = c.payDay || 1;
  if (now.getDate() <= payDay) return false;
  return !isCurrentPeriodPaid(c);
}

export function getPaymentOverdueDays(c: Contract): number {
  if (c.remainingDebt <= 0) return 0;
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (!c.isLegacyDebt) {
    const firstPay = getFirstPaymentDate(c);
    if (firstPay && today < firstPay) return 0;
    const end = parseRuDate(c.endDate);
    if (end && end < today) {
      return Math.floor((today.getTime() - end.getTime()) / (1000 * 60 * 60 * 24));
    }
  }
  const payDay = c.payDay || 1;
  if (now.getDate() <= payDay) return 0;
  if (isCurrentPeriodPaid(c)) return 0;
  const dueDate = new Date(now.getFullYear(), now.getMonth(), payDay);
  return Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24));
}
