import type { FmmState, Phone, Transaction } from "./fmm-types";
import { getTransactionPayment } from "./fmm-store";

export interface PeriodPoint {
  key: string;
  label: string;
  start: Date;
  end: Date;
  revenue: number;
  cashInflow?: number;
  cost: number;
  profit: number;
  units: number;
  pending: number;
}

export type Granularity = "daily" | "weekly" | "monthly" | "yearly";

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function phoneOf(state: FmmState, t: Transaction): Phone | undefined {
  return state.phones.find((p) => p.id === t.phone_id);
}

/**
 * Derives total acquisition COGS for a transaction across phones, accessories, and free gifts.
 */
export function getTransactionCost(state: FmmState, t: Transaction): number {
  if (t.items && t.items.length > 0) {
    return t.items.reduce((sum, it) => {
      const cost = it.cost_price || 0;
      const qty = it.quantity || 1;
      return sum + cost * qty;
    }, 0);
  }
  // Fallback for legacy single-phone transactions without items array
  return phoneOf(state, t)?.purchase_price ?? 0;
}

function bucketFor(state: FmmState, start: Date, end: Date, label: string, key: string): PeriodPoint {
  const txs = state.transactions.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= start.getTime() && d < end.getTime();
  });

  let revenue = 0;
  let cashInflow = 0;
  let cost = 0;
  let pending = 0;

  for (const t of txs) {
    const pay = getTransactionPayment(t);
    revenue += pay.total;
    cashInflow += pay.paid;
    pending += pay.due;
    cost += getTransactionCost(state, t);
  }

  return {
    key,
    label,
    start,
    end,
    revenue,
    cashInflow,
    cost,
    profit: revenue - cost,
    units: txs.length,
    pending,
  };
}

/** Series of buckets ending with the current period. */
export function buildSeries(state: FmmState, granularity: Granularity, count: number): PeriodPoint[] {
  const now = new Date();
  const points: PeriodPoint[] = [];

  for (let i = count - 1; i >= 0; i--) {
    if (granularity === "daily") {
      const start = startOfDay(addDays(now, -i));
      const end = addDays(start, 1);
      points.push(bucketFor(state, start, end, start.toLocaleDateString("en-US", { weekday: "short", day: "numeric" }), start.toISOString()));
    } else if (granularity === "weekly") {
      const base = startOfDay(addDays(now, -i * 7));
      const start = addDays(base, -((base.getDay() + 6) % 7));
      const end = addDays(start, 7);
      points.push(bucketFor(state, start, end, `${start.toLocaleDateString("en-US", { month: "short", day: "numeric" })}`, start.toISOString()));
    } else if (granularity === "monthly") {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(start.getFullYear(), start.getMonth() + 1, 1);
      points.push(bucketFor(state, start, end, start.toLocaleDateString("en-US", { month: "short" }), start.toISOString()));
    } else {
      const start = new Date(now.getFullYear() - i, 0, 1);
      const end = new Date(start.getFullYear() + 1, 0, 1);
      points.push(bucketFor(state, start, end, String(start.getFullYear()), start.toISOString()));
    }
  }
  return points;
}

export interface DayReport {
  date: Date;
  transactions: Transaction[];
  revenue: number;
  cashInflow: number;
  profit: number;
  pending: number;
  phonesAdded: Phone[];
  purchaseSpend: number;
  suppliersAdded: number;
  customerPurchases: number;
  audit: FmmState["audit_log"];
}

export function buildDayReport(state: FmmState, date: Date): DayReport {
  const start = startOfDay(date);
  const end = addDays(start, 1);
  const within = (iso: string) => {
    const t = new Date(iso).getTime();
    return t >= start.getTime() && t < end.getTime();
  };

  const transactions = state.transactions.filter((t) => within(t.date));
  const phonesAdded = state.phones.filter((p) => within(p.created_at));

  let revenue = 0;
  let cashInflow = 0;
  let profit = 0;
  let pending = 0;

  for (const t of transactions) {
    const pay = getTransactionPayment(t);
    const cost = getTransactionCost(state, t);
    revenue += pay.total;
    cashInflow += pay.paid;
    profit += (pay.total - cost);
    pending += pay.due;
  }

  return {
    date: start,
    transactions,
    revenue,
    cashInflow,
    profit,
    pending,
    phonesAdded,
    purchaseSpend: phonesAdded.reduce((s, p) => s + p.purchase_price, 0),
    suppliersAdded: state.suppliers.filter((s) => within(s.created_at)).length,
    customerPurchases: state.customer_purchases.filter((c) => within(c.created_at)).length,
    audit: state.audit_log.filter((a) => within(a.timestamp)),
  };
}

export function monthMatrix(month: Date): Date[] {
  const first = new Date(month.getFullYear(), month.getMonth(), 1);
  const startOffset = (first.getDay() + 6) % 7;
  const gridStart = addDays(first, -startOffset);
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}
