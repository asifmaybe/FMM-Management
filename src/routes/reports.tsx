import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { CalendarDays, ChevronLeft, ChevronRight, Package, Receipt, TrendingUp, Truck } from "lucide-react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { ProfitChart } from "@/components/fmm/ProfitChart";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Taka } from "@/components/fmm/Taka";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildDayReport, buildSeries, monthMatrix, type Granularity } from "@/lib/fmm-analytics";
import { supplierName, useFmm } from "@/lib/fmm-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Profit Reports — Faridpur Mobile Mart" },
      {
        name: "description",
        content:
          "Daily, weekly, monthly and yearly profit trends plus a calendar day report of stock, suppliers and sales activity.",
      },
      { property: "og:title", content: "Profit Reports — Faridpur Mobile Mart" },
      { property: "og:description", content: "Profit trends and per-day business reports for the shop." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: ReportsPage,
});

const RANGE: Record<Granularity, { count: number; title: string }> = {
  daily: { count: 14, title: "Last 14 days" },
  weekly: { count: 12, title: "Last 12 weeks" },
  monthly: { count: 12, title: "Last 12 months" },
  yearly: { count: 5, title: "Last 5 years" },
};

function ReportsPage() {
  const { state } = useFmm();
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date());

  const series = useMemo(() => buildSeries(state, granularity, RANGE[granularity].count), [state, granularity]);
  const totals = useMemo(
    () =>
      series.reduce(
        (acc, p) => ({
          revenue: acc.revenue + p.revenue,
          profit: acc.profit + p.profit,
          units: acc.units + p.units,
          pending: acc.pending + p.pending,
        }),
        { revenue: 0, profit: 0, units: 0, pending: 0 },
      ),
    [series],
  );

  const report = useMemo(() => buildDayReport(state, selected), [state, selected]);
  const days = useMemo(() => monthMatrix(month), [month]);
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of days) map.set(d.toDateString(), buildDayReport(state, d).transactions.length);
    return map;
  }, [days, state]);

  const summary = [
    { label: "PROFIT", value: <Taka value={totals.profit} />, icon: TrendingUp },
    { label: "REVENUE", value: <Taka value={totals.revenue} />, icon: Receipt },
    { label: "TRANSACTIONS", value: String(totals.units), icon: Package },
    { label: "PENDING", value: <Taka value={totals.pending} />, icon: Truck, danger: true },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader title="Profit Reports" subtitle="Trends over time and a full day-by-day business report." />

        <Tabs value={granularity} onValueChange={(v) => setGranularity(v as Granularity)}>
          <TabsList>
            <TabsTrigger value="daily">Daily</TabsTrigger>
            <TabsTrigger value="weekly">Weekly</TabsTrigger>
            <TabsTrigger value="monthly">Monthly</TabsTrigger>
            <TabsTrigger value="yearly">Yearly</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {summary.map((c) => (
            <div key={c.label} className="rounded-xl border border-border bg-card p-5">
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">{c.label}</span>
                <span className={cn("rounded-lg p-2", c.danger ? "bg-danger-soft text-destructive" : "bg-secondary")}>
                  <c.icon className="size-4" />
                </span>
              </div>
              <p className={cn("mt-4 text-2xl font-bold", c.danger && "text-destructive")}>{c.value}</p>
              <p className="mt-2 text-xs text-muted-foreground">{RANGE[granularity].title}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 rounded-xl border border-border bg-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="text-sm font-semibold tracking-wide">PROFIT TREND — {granularity.toUpperCase()}</h3>
            <p className="text-xs text-muted-foreground">{RANGE[granularity].title} · hover a point for details</p>
          </div>
          <div className="mt-6">
            <ProfitChart data={series} height={340} />
          </div>
        </div>

        <div className="mt-4 grid gap-4 xl:grid-cols-[380px_1fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarDays className="size-4 text-muted-foreground" />
                <h3 className="text-sm font-semibold tracking-wide">
                  {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                </h3>
              </div>
              <div className="flex gap-1">
                <button
                  type="button"
                  aria-label="Previous month"
                  className="rounded-lg p-1.5 hover:bg-secondary"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                >
                  <ChevronLeft className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label="Next month"
                  className="rounded-lg p-1.5 hover:bg-secondary"
                  onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground">
              {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                <span key={d} className="py-1">{d}</span>
              ))}
            </div>
            <div className="mt-1 grid grid-cols-7 gap-1">
              {days.map((d) => {
                const inMonth = d.getMonth() === month.getMonth();
                const isSelected = d.toDateString() === selected.toDateString();
                const isToday = d.toDateString() === new Date().toDateString();
                const count = dayTotals.get(d.toDateString()) ?? 0;
                return (
                  <button
                    key={d.toISOString()}
                    type="button"
                    onClick={() => setSelected(d)}
                    className={cn(
                      "relative aspect-square rounded-lg text-sm transition-colors",
                      inMonth ? "text-foreground" : "text-muted-foreground/40",
                      isSelected ? "bg-primary text-primary-foreground" : "hover:bg-secondary",
                      !isSelected && isToday && "ring-1 ring-primary",
                    )}
                  >
                    {d.getDate()}
                    {count > 0 ? (
                      <span
                        className={cn(
                          "absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                          isSelected ? "bg-primary-foreground" : "bg-primary",
                        )}
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>
            <p className="mt-4 text-xs text-muted-foreground">A dot marks days with recorded transactions.</p>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-5">
              <h3 className="text-sm font-semibold tracking-wide">
                DAY REPORT — {report.date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
              </h3>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { label: "Revenue", value: <Taka value={report.revenue} /> },
                  { label: "Profit", value: <Taka value={report.profit} /> },
                  { label: "Pending", value: <Taka value={report.pending} /> },
                  { label: "Stock purchased", value: <Taka value={report.purchaseSpend} /> },
                ].map((s) => (
                  <div key={s.label} className="rounded-lg border border-border p-3">
                    <p className="text-xs text-muted-foreground">{s.label}</p>
                    <p className="mt-1 text-lg font-bold">{s.value}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="rounded-lg bg-secondary px-2.5 py-1">{report.transactions.length} transactions</span>
                <span className="rounded-lg bg-secondary px-2.5 py-1">{report.phonesAdded.length} phones added</span>
                <span className="rounded-lg bg-secondary px-2.5 py-1">{report.suppliersAdded} suppliers added</span>
                <span className="rounded-lg bg-secondary px-2.5 py-1">{report.customerPurchases} customer intakes</span>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card">
              <h3 className="border-b border-border px-5 py-4 text-sm font-semibold tracking-wide">SALES & EXCHANGES</h3>
              {report.transactions.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No transactions on this day.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Device</th>
                      <th className="px-5 py-3 font-medium">Type</th>
                      <th className="px-5 py-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.transactions.map((t) => {
                      const phone = state.phones.find((p) => p.id === t.phone_id);
                      return (
                        <tr key={t.id}>
                          <td className="px-5 py-3 font-medium">{t.customer_name}</td>
                          <td className="px-5 py-3 text-muted-foreground">
                            {phone ? `${phone.brand} ${phone.model}` : "—"}
                          </td>
                          <td className="px-5 py-3"><StatusBadge status={t.payment_status} /></td>
                          <td className="px-5 py-3 text-right font-medium"><Taka value={t.amount} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card">
              <h3 className="border-b border-border px-5 py-4 text-sm font-semibold tracking-wide">STOCK ADDED</h3>
              {report.phonesAdded.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No stock added on this day.</p>
              ) : (
                <table className="w-full text-sm">
                  <thead className="border-b border-border text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Device</th>
                      <th className="px-5 py-3 font-medium">Source</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Cost</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {report.phonesAdded.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3 font-medium">{p.brand} {p.model}</td>
                        <td className="px-5 py-3 text-muted-foreground">{supplierName(state, p)}</td>
                        <td className="px-5 py-3"><StatusBadge status={p.status} /></td>
                        <td className="px-5 py-3 text-right font-medium"><Taka value={p.purchase_price} /></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="rounded-xl border border-border bg-card">
              <h3 className="border-b border-border px-5 py-4 text-sm font-semibold tracking-wide">ACTIVITY LOG</h3>
              {report.audit.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">No activity recorded on this day.</p>
              ) : (
                <div className="divide-y divide-border">
                  {report.audit.map((a) => (
                    <div key={a.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 text-sm">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(a.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                        </span>
                        <StatusBadge status={a.action} />
                        <span className="text-muted-foreground">{a.details}</span>
                      </div>
                      <span className="font-medium">{a.amount === null ? "—" : <Taka value={a.amount} />}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
