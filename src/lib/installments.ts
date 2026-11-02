/**
 * Links ledger rows to contracts and works out the payment schedule of a contract.
 *
 * Semantics:
 *   - Rows are matched by the exact contract number: "#1" must not catch "#147".
 *   - remainingDebt decides how many installments are closed: a debt worth one
 *     monthly payment leaves one installment open. This also covers money paid
 *     before the contract got into the system, which has no ledger rows.
 *   - A month picked in the payment form closes that month; the other closed
 *     installments are the oldest ones.
 *
 * Kept in a shared module so the payment form, client card, exports and the
 * delete cascade all agree on which rows belong to a contract.
 */
import type { Contract, LedgerEntry } from './types';
import { parseRuDate } from './overdue';

export const EXTRA_PAYMENT_LABEL = 'Внеочередной платёж';

/** Below this share of a monthly payment a difference is rounding, not money. */
const ROUNDING = 0.01;

type LedgerRef = Pick<LedgerEntry, 'note' | 'clientContract'>;
type LedgerPayment = LedgerRef & Pick<LedgerEntry, 'operation' | 'amount' | 'paidForMonth'>;

export interface Installment {
  index: number;
  /** "2-й (08.06.2026)" — this exact text is stored in ledger.paidForMonth. */
  label: string;
  status: 'paid' | 'partial' | 'open';
  /** Money received for this installment. */
  paid: number;
}

const ledgerText = (e: LedgerRef) => `${e.clientContract ?? ''} ${e.note ?? ''}`;

/** "Иванов (#147) · Кухня" → 147. Product and comment text can hold a "#" too, so "(#N)" goes first. */
export function ledgerContractNumber(e: LedgerRef): number | null {
  const text = ledgerText(e);
  const m = text.match(/\(#(\d+)\)/) ?? text.match(/договор\S*\s+#(\d+)/i) ?? text.match(/#(\d+)/);
  return m ? Number(m[1]) : null;
}

export function isContractLedgerEntry(e: LedgerRef, c: Pick<Contract, 'number' | 'clientName'>): boolean {
  if (ledgerContractNumber(e) !== c.number) return false;
  // Older contracts could get a repeated number, so a row naming a client has to name this one.
  const ref = `(#${c.number})`;
  const text = ledgerText(e);
  return !c.clientName || !text.includes(ref) || text.includes(`${c.clientName} ${ref}`);
}

function getInstallmentCount(c: Contract, owedAtStart: number): number {
  const effective = c.effectiveMonths || 0;
  // "Фактический отсчёт" in days only: one payment
  if (!effective && c.useEffectiveTerm && c.effectiveDays) return 1;
  // effectiveMonths can outlive an edit of the term, so it only counts while it adds up to the debt
  if (effective && effective * c.monthlyPayment >= owedAtStart * (1 - ROUNDING)) return effective;
  return c.months || effective || 1;
}

function getDueDates(c: Contract, count: number): Date[] {
  const start = parseRuDate(c.startDate || c.createdAt) ?? new Date();
  if (!c.effectiveMonths && c.useEffectiveTerm && c.effectiveDays) {
    return [new Date(start.getFullYear(), start.getMonth(), start.getDate() + c.effectiveDays)];
  }
  return Array.from({ length: count }, (_, i) =>
    new Date(start.getFullYear(), start.getMonth() + i + 1, c.payDay || 1));
}

export function getInstallments(c: Contract, ledger: LedgerPayment[]): Installment[] {
  const payments = ledger.filter(e => e.operation === 'Платёж клиента' && isContractLedgerEntry(e, c));
  const ledgerPaid = payments.reduce((sum, e) => sum + e.amount, 0);
  const owedAtStart = Math.max((c.initialTotal || c.cost + c.markup) - c.firstPayment, c.remainingDebt + ledgerPaid);
  const monthly = c.monthlyPayment;
  const dates = getDueDates(c, getInstallmentCount(c, owedAtStart));

  // parseInt reads the month off the stored label: "3-й (08.07.2026)" → 3
  const paidByMonth = new Map<number, number>();
  for (const e of payments) {
    const month = parseInt(e.paidForMonth ?? '', 10);
    if (month > 0) paidByMonth.set(month, (paidByMonth.get(month) ?? 0) + e.amount);
  }

  const closed = new Set<number>();
  if (monthly > 0) {
    dates.forEach((_, i) => {
      if ((paidByMonth.get(i + 1) ?? 0) >= monthly * (1 - ROUNDING)) closed.add(i + 1);
    });
  }
  const openCount = c.remainingDebt <= 0 ? 0
    : monthly > 0 ? Math.ceil(c.remainingDebt / monthly - ROUNDING)
    : dates.length;
  for (let i = 1; i <= dates.length && closed.size < dates.length - openCount; i++) closed.add(i);

  // Money left after the closed installments sits on one open installment.
  // Capped by the ledger so that a schedule that doesn't add up can't invent a payment.
  const partial = Math.min(owedAtStart - c.remainingDebt - closed.size * monthly, ledgerPaid, monthly);
  const openIndexes = dates.map((_, i) => i + 1).filter(i => !closed.has(i));
  const partialIndex = partial > 0 && partial >= monthly * ROUNDING
    ? openIndexes.find(i => paidByMonth.has(i)) ?? openIndexes[0]
    : undefined;

  return dates.map((date, i) => {
    const index = i + 1;
    const label = `${index}-й (${date.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: 'numeric' })})`;
    if (closed.has(index)) return { index, label, status: 'paid' as const, paid: monthly };
    if (index === partialIndex) return { index, label, status: 'partial' as const, paid: partial };
    return { index, label, status: 'open' as const, paid: 0 };
  });
}
