import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  DollarSign,
  Layers,
  Megaphone,
  Package,
  Receipt,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { ProfitChart } from "@/components/fmm/ProfitChart";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Taka } from "@/components/fmm/Taka";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildDayReport, buildSeries, monthMatrix, type Granularity } from "@/lib/fmm-analytics";
import {
  accessoryBusinessMetrics,
  overallBusinessMetrics,
  phoneBusinessMetrics,
  stockAgingSummary,
  supplierName,
  useFmm,
} from "@/lib/fmm-store";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Business & Profit Reports — Faridpur Mobile Mart" },
      {
        name: "description",
        content:
          "Comprehensive financials, gross vs net profit, operating expenses, phone and accessory analytics, stock aging and cash flow analysis.",
      },
      { property: "og:title", content: "Business & Profit Reports — Faridpur Mobile Mart" },
      { property: "og:description", content: "Detailed business financial metrics, gross & net profit, phone & accessory performance." },
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

  const [activeTab, setActiveTab] = useState("financials");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selected, setSelected] = useState(() => new Date());

  const overall = useMemo(() => overallBusinessMetrics(state), [state]);
  const phoneMetrics = useMemo(() => phoneBusinessMetrics(state), [state]);
  const accMetrics = useMemo(() => accessoryBusinessMetrics(state), [state]);
  const aging = useMemo(() => stockAgingSummary(state.phones ?? []), [state.phones]);

  const series = useMemo(() => buildSeries(state, granularity, RANGE[granularity].count), [state, granularity]);

  const report = useMemo(() => buildDayReport(state, selected), [state, selected]);
  const days = useMemo(() => monthMatrix(month), [month]);
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of days) map.set(d.toDateString(), buildDayReport(state, d).transactions.length);
    return map;
  }, [days, state]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Business Intelligence & Reports"
          subtitle="Financial performance, domain analytics, cash flow and stock aging."
        />

        {/* Top Report Domain Navigation */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="financials">Financials & Net Profit</TabsTrigger>
            <TabsTrigger value="phones">Phone Analytics & Aging</TabsTrigger>
            <TabsTrigger value="accessories">Accessories Analytics</TabsTrigger>
            <TabsTrigger value="calendar">Day Calendar Report</TabsTrigger>
          </TabsList>

          {/* 1. FINANCIALS TAB */}
          <TabsContent value="financials" className="space-y-6">
            {/* Top Scorecard */}
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL SALES REVENUE</span>
                <p className="mt-4 text-3xl font-bold text-foreground"><Taka value={overall.totalRevenue} /></p>
                <p className="mt-2 text-xs text-muted-foreground">Combined phone & accessory sales</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">GROSS PROFIT</span>
                <p className="mt-4 text-3xl font-bold text-success"><Taka value={overall.grossProfit} /></p>
                <p className="mt-2 text-xs text-muted-foreground">Revenue minus product COGS</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">OPERATING EXPENSES</span>
                <p className="mt-4 text-3xl font-bold text-destructive"><Taka value={overall.operatingExpenses} /></p>
                <p className="mt-2 text-xs text-muted-foreground">Rent, bills, marketing & salaries</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">NET BUSINESS PROFIT</span>
                <p className={`mt-4 text-3xl font-bold ${overall.netProfit >= 0 ? "text-success" : "text-destructive"}`}>
                  <Taka value={overall.netProfit} />
                </p>
                <p className="mt-2 text-xs text-muted-foreground">Gross Profit − Operating Expenses</p>
              </div>
            </div>

            {/* Cash Flow Section */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                <Wallet className="size-4 text-primary" />
                Cash Flow Breakdown (Actual Cash Position)
              </h3>
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-secondary/40 p-4">
                  <span className="text-xs text-muted-foreground">Total Cash Inflow</span>
                  <p className="text-2xl font-bold text-success mt-1"><Taka value={overall.cashInflow} /></p>
                  <p className="text-xs text-muted-foreground mt-1">Cash collected from customer sales</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-4">
                  <span className="text-xs text-muted-foreground">Total Cash Outflow</span>
                  <p className="text-2xl font-bold text-destructive mt-1"><Taka value={overall.cashOutflow} /></p>
                  <p className="text-xs text-muted-foreground mt-1">Supplier payments + expenses + intakes</p>
                </div>
                <div className="rounded-xl bg-secondary/40 p-4">
                  <span className="text-xs text-muted-foreground">Net Cash Flow</span>
                  <p className={`text-2xl font-bold mt-1 ${overall.netCashFlow >= 0 ? "text-success" : "text-destructive"}`}>
                    <Taka value={overall.netCashFlow} />
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">Inflow minus Outflow</p>
                </div>
              </div>
            </div>

            {/* Profit Chart */}
            <div className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-sm font-semibold tracking-wide">PROFIT & SALES TREND</h3>
                  <p className="text-xs text-muted-foreground">{RANGE[granularity].title}</p>
                </div>

                <div className="flex rounded-lg border border-border p-0.5 bg-secondary/40">
                  {(["daily", "weekly", "monthly", "yearly"] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-3 py-1 text-xs capitalize rounded-md font-medium transition-colors ${
                        granularity === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <ProfitChart data={series} height={320} />
            </div>
          </TabsContent>

          {/* 2. PHONES TAB */}
          <TabsContent value="phones" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">AVAILABLE PHONE STOCK</span>
                <p className="mt-3 text-3xl font-bold">{phoneMetrics.totalStock} <span className="text-sm font-normal text-muted-foreground">units</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Value: <Taka value={phoneMetrics.stockValue} /></p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">PHONE SALES REVENUE</span>
                <p className="mt-3 text-3xl font-bold"><Taka value={phoneMetrics.totalRevenue} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Cost of goods: <Taka value={phoneMetrics.totalCOGS} /></p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">PHONE GROSS PROFIT</span>
                <p className="mt-3 text-2xl font-bold text-success"><Taka value={phoneMetrics.totalGrossProfit} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Realized phone margins</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">CUSTOMER DUES (PHONES)</span>
                <p className="mt-3 text-2xl font-bold text-destructive"><Taka value={phoneMetrics.totalOutstanding} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Pending phone collections</p>
              </div>
            </div>

            {/* Stock Aging Analysis */}
            <div className="rounded-xl border border-border bg-card p-6">
              <h3 className="text-base font-semibold mb-2 flex items-center gap-2">
                <Clock className="size-4 text-primary" />
                Phone Stock Aging Analysis
              </h3>
              <p className="text-xs text-muted-foreground mb-4">
                Identifies fast-moving inventory vs slow-moving/dead stock based on acquisition date.
              </p>

              <div className="grid gap-3 sm:grid-cols-5">
                {(
                  [
                    { key: "0-7 days", label: "Fresh Stock (0-7d)", color: "text-success bg-success-soft/30 border-success/30" },
                    { key: "8-30 days", label: "Normal (8-30d)", color: "text-foreground bg-secondary/60 border-border" },
                    { key: "31-60 days", label: "Aging (31-60d)", color: "text-warning bg-warning-soft/30 border-warning/30" },
                    { key: "61-90 days", label: "Slow Moving (61-90d)", color: "text-destructive bg-danger-soft/30 border-destructive/30" },
                    { key: "90+ days", label: "Dead Stock (90d+)", color: "text-destructive bg-danger-soft border-destructive/50" },
                  ] as const
                ).map(({ key, label, color }) => {
                  const list = aging[key] || [];
                  const val = list.reduce((s, p) => s + p.purchase_price, 0);
                  return (
                    <div key={key} className={`rounded-xl border p-4 ${color}`}>
                      <span className="text-xs font-semibold">{label}</span>
                      <p className="text-2xl font-bold mt-2">{list.length} <span className="text-xs font-normal">units</span></p>
                      <p className="text-xs mt-1 opacity-80"><Taka value={val} /></p>
                    </div>
                  );
                })}
              </div>
            </div>
          </TabsContent>

          {/* 3. ACCESSORIES TAB */}
          <TabsContent value="accessories" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">ACCESSORY INVENTORY</span>
                <p className="mt-3 text-3xl font-bold">{accMetrics.totalQuantity} <span className="text-sm font-normal text-muted-foreground">units</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Valuation: <Taka value={accMetrics.totalValue} /></p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">ACCESSORY SALES</span>
                <p className="mt-3 text-3xl font-bold"><Taka value={accMetrics.totalRevenue} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Cost: <Taka value={accMetrics.totalCOGS} /></p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">ACCESSORY GROSS PROFIT</span>
                <p className="mt-3 text-2xl font-bold text-success"><Taka value={accMetrics.totalGrossProfit} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Accessory markup profit</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-5">
                <span className="text-xs font-semibold text-muted-foreground">LOW STOCK ITEMS</span>
                <p className={`mt-3 text-2xl font-bold ${accMetrics.lowStockCount > 0 ? "text-destructive" : "text-success"}`}>
                  {accMetrics.lowStockCount} <span className="text-sm font-normal text-muted-foreground">products</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Below minimum threshold</p>
              </div>
            </div>

            {/* Low Stock List */}
            {accMetrics.lowStockCount > 0 && (
              <div className="rounded-xl border border-destructive/30 bg-card p-5">
                <h4 className="font-semibold text-sm text-destructive mb-3 flex items-center gap-2">
                  <AlertTriangle className="size-4" />
                  Products Requiring Immediate Supplier Reorder
                </h4>
                <div className="grid gap-2 sm:grid-cols-2 md:grid-cols-3">
                  {accMetrics.lowStockItems.map((a) => (
                    <div key={a.id} className="p-3 rounded-lg bg-danger-soft/20 border border-destructive/20 text-xs">
                      <p className="font-semibold text-foreground">{a.name}</p>
                      <p className="text-muted-foreground mt-0.5">
                        Remaining: <strong className="text-destructive">{a.quantity} {a.unit}</strong> (Min: {a.min_threshold})
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* 4. DAY CALENDAR REPORT TAB */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
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
                </div>

                <div className="rounded-xl border border-border bg-card overflow-hidden">
                  <h3 className="border-b border-border px-5 py-4 text-sm font-semibold tracking-wide">SALES & EXCHANGES</h3>
                  {report.transactions.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">No transactions on this day.</p>
                  ) : (
                    <table className="w-full text-sm">
                      <thead className="border-b border-border text-left text-muted-foreground">
                        <tr>
                          <th className="px-5 py-3 font-medium">Customer</th>
                          <th className="px-5 py-3 font-medium">Device / Item</th>
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
                                {phone ? `${phone.brand} ${phone.model}` : "Item"}
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
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}
