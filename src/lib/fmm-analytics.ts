import type { FmmState, Phone, Transaction } from "./fmm-types";

export interface PeriodPoint {
  key: string;
  label: string;
  start: Date;
  end: Date;
  revenue: number;
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

function bucketFor(state: FmmState, start: Date, end: Date, label: string, key: string): PeriodPoint {
  const txs = state.transactions.filter((t) => {
    const d = new Date(t.date).getTime();
    return d >= start.getTime() && d < end.getTime();
  });
  const paid = txs.filter((t) => t.payment_status === "Paid");
  const revenue = paid.reduce((s, t) => s + t.amount, 0);
  const cost = paid.reduce((s, t) => s + (phoneOf(state, t)?.purchase_price ?? 0), 0);
  return {
    key,
    label,
    start,
    end,
    revenue,
    cost,
    profit: revenue - cost,
    units: txs.length,
    pending: txs.filter((t) => t.payment_status === "Pending").reduce((s, t) => s + t.amount, 0),
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
  const paid = transactions.filter((t) => t.payment_status === "Paid");
  const phonesAdded = state.phones.filter((p) => within(p.created_at));

  return {
    date: start,
    transactions,
    revenue: paid.reduce((s, t) => s + t.amount, 0),
    profit: paid.reduce((s, t) => s + (t.amount - (phoneOf(state, t)?.purchase_price ?? 0)), 0),
    pending: transactions.filter((t) => t.payment_status === "Pending").reduce((s, t) => s + t.amount, 0),
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
