import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  Archive,
  ArrowUpRight,
  Calendar,
  CreditCard,
  DollarSign,
  HandCoins,
  Layers,
  Megaphone,
  Package,
  Receipt,
  ShoppingCart,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { ProfitChart } from "@/components/fmm/ProfitChart";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { buildSeries } from "@/lib/fmm-analytics";
import {
  accessoryBusinessMetrics,
  daysInStock,
  overallBusinessMetrics,
  phoneBusinessMetrics,
  shopBalance,
  totalSuppliersDue,
  useFmm,
} from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Faridpur Mobile Mart Management" },
      {
        name: "description",
        content:
          "Live business metrics, phone and accessory inventory performance, profit breakdown, supplier payables and active campaign tracking.",
      },
      { property: "og:title", content: "Dashboard — Faridpur Mobile Mart Management" },
      {
        property: "og:description",
        content: "Multi-domain dashboard for phones, accessories, expenses and campaigns.",
      },
    ],
  }),
  component: DashboardPage,
});

function isSameDay(a: string, b: Date) {
  const d = new Date(a);
  return d.toDateString() === b.toDateString();
}

function DashboardPage() {
  const { state } = useFmm();

  const overall = useMemo(() => overallBusinessMetrics(state), [state]);
  const phone = useMemo(() => phoneBusinessMetrics(state), [state]);
  const acc = useMemo(() => accessoryBusinessMetrics(state), [state]);

  const totalDues = useMemo(() => totalSuppliersDue(state), [state]);

  const activeCampaigns = useMemo(() => {
    return (state.campaigns ?? []).filter((c) => c.status === "Active" || c.status === "Planned");
  }, [state.campaigns]);

  const chartData = useMemo(() => buildSeries(state, "daily", 7), [state]);

  // Model counts for low stock phones
  const modelCounts = new Map<string, { label: string; supplier: string; count: number }>();
  for (const p of state.phones) {
    const key = `${p.brand} ${p.model}`;
    const supplier =
      p.source_type === "Buy from Customer"
        ? "Bought from Customer"
        : (state.suppliers.find((s) => s.id === p.supplier_id)?.name ?? "—");
    const entry = modelCounts.get(key) ?? { label: key, supplier, count: 0 };
    if (p.status === "Available") entry.count += 1;
    modelCounts.set(key, entry);
  }
  const lowStockPhones = [...modelCounts.values()]
    .filter((m) => m.count < state.settings.low_stock_threshold)
    .sort((a, b) => a.count - b.count)
    .slice(0, 5);

  const businessCards = [
    {
      label: "TOTAL SALES REVENUE",
      value: <Taka value={overall.totalRevenue} />,
      icon: Receipt,
      hint: `Gross profit: ${overall.grossProfit.toLocaleString()} ৳`,
      hintClass: "text-success",
      to: "/reports" as const,
    },
    {
      label: "NET BUSINESS PROFIT",
      value: <Taka value={overall.netProfit} />,
      icon: Wallet,
      hint: `After ${overall.operatingExpenses.toLocaleString()} ৳ operating expenses`,
      hintClass: overall.netProfit >= 0 ? "text-success" : "text-destructive",
      danger: overall.netProfit < 0,
      to: "/reports" as const,
    },
    {
      label: "TOTAL SUPPLIER DUE",
      value: <Taka value={totalDues} />,
      icon: HandCoins,
      hint: `Across ${state.suppliers.length} active suppliers`,
      hintClass: totalDues > 0 ? "text-destructive" : "text-success",
      danger: totalDues > 0,
      to: "/suppliers" as const,
    },
    {
      label: "CUSTOMER OUTSTANDING",
      value: <Taka value={overall.totalOutstanding} />,
      icon: AlertTriangle,
      hint: "Pending customer collections",
      hintClass: overall.totalOutstanding > 0 ? "text-destructive" : "text-muted-foreground",
      danger: overall.totalOutstanding > 0,
      to: "/sales" as const,
    },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader title="Business Dashboard" subtitle="Real-time multi-domain inventory, sales, expenses and profit metrics." />

        {/* 1. Overall Business Performance Scorecard */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          {businessCards.map((c) => (
            <Link
              key={c.label}
              to={c.to}
              className="group rounded-xl border border-border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-semibold tracking-wide text-muted-foreground">{c.label}</span>
                <span className={`rounded-lg p-2 ${c.danger ? "bg-danger-soft text-destructive" : "bg-secondary text-foreground"}`}>
                  <c.icon className="size-4" />
                </span>
              </div>
              <p className={`mt-4 text-3xl font-bold ${c.danger ? "text-destructive" : ""}`}>{c.value}</p>
              <p className={`mt-2 flex items-center gap-1 text-xs ${c.hintClass}`}>
                {c.hintClass === "text-success" ? <TrendingUp className="size-3.5" /> : null}
                {c.hint}
                <ArrowUpRight className="ml-auto size-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            </Link>
          ))}
        </div>

        {/* 2. Phone vs Accessory Domain Summaries */}
        <div className="grid gap-4 md:grid-cols-2 mb-6">
          {/* Phone Domain Card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Smartphone className="size-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Phones Domain</h3>
                  <p className="text-xs text-muted-foreground">Serialized device inventory & sales</p>
                </div>
              </div>
              <Link to="/stock" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View Stock <ArrowUpRight className="size-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Available Stock</span>
                <p className="font-bold text-base text-foreground mt-1">{phone.totalStock} units</p>
                <p className="text-[10px] text-muted-foreground mt-0.5"><Taka value={phone.stockValue} /></p>
              </div>
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Sold Today</span>
                <p className="font-bold text-base text-foreground mt-1">{phone.soldTodayCount} units</p>
                <p className="text-[10px] text-success mt-0.5"><Taka value={phone.soldTodayRevenue} /></p>
              </div>
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Phone Revenue</span>
                <p className="font-bold text-base text-foreground mt-1"><Taka value={phone.totalRevenue} /></p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Paid transactions</p>
              </div>
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Gross Profit</span>
                <p className="font-bold text-base text-success mt-1"><Taka value={phone.totalGrossProfit} /></p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Phone margins</p>
              </div>
            </div>
          </div>

          {/* Accessory Domain Card */}
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-xl bg-primary/10 text-primary">
                  <Layers className="size-5" />
                </span>
                <div>
                  <h3 className="font-bold text-sm">Accessories Domain</h3>
                  <p className="text-xs text-muted-foreground">Quantity-based chargers, cables & cases</p>
                </div>
              </div>
              <Link to="/accessories" className="text-xs font-semibold text-primary hover:underline flex items-center gap-1">
                View Inventory <ArrowUpRight className="size-3" />
              </Link>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Stock Quantity</span>
                <p className="font-bold text-base text-foreground mt-1">{acc.totalQuantity} units</p>
                <p className="text-[10px] text-muted-foreground mt-0.5"><Taka value={acc.totalValue} /></p>
              </div>
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Low Stock</span>
                <p className={`font-bold text-base mt-1 ${acc.lowStockCount > 0 ? "text-destructive" : "text-success"}`}>
                  {acc.lowStockCount} items
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Need re-order</p>
              </div>
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Acc. Revenue</span>
                <p className="font-bold text-base text-foreground mt-1"><Taka value={acc.totalRevenue} /></p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Sales total</p>
              </div>
              <div className="bg-secondary/40 p-3 rounded-xl">
                <span className="text-muted-foreground">Gross Profit</span>
                <p className="font-bold text-base text-success mt-1"><Taka value={acc.totalGrossProfit} /></p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Acc. margins</p>
              </div>
            </div>
          </div>
        </div>

        {/* 3. Active Campaigns Widget (If Any) */}
        {activeCampaigns.length > 0 && (
          <div className="mb-6 rounded-2xl border border-primary/30 bg-primary/5 p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Megaphone className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Active Business Promotion</h3>
              </div>
              <Link to="/campaigns" className="text-xs font-semibold text-primary hover:underline">
                All Campaigns →
              </Link>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {activeCampaigns.slice(0, 2).map((cmp) => (
                <Link
                  key={cmp.id}
                  to="/campaigns/$campaignId"
                  params={{ campaignId: cmp.id }}
                  className="rounded-xl border border-border bg-card p-3.5 hover:border-primary/50 transition-colors flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-foreground">{cmp.name}</span>
                      <StatusBadge status={cmp.status} />
                    </div>
                    <p className="text-muted-foreground mt-1">
                      {cmp.start_date} to {cmp.end_date} {cmp.budget ? `· Budget: ${cmp.budget.toLocaleString()} ৳` : ""}
                    </p>
                  </div>
                  <ArrowUpRight className="size-4 text-muted-foreground" />
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 4. Profit Trend & Low Stock Grid */}
        <div className="grid gap-4 xl:grid-cols-[1.9fr_1fr] mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-wide">PROFIT TREND (7 DAYS)</h3>
              <Link to="/reports" className="text-sm font-medium text-primary hover:underline">
                Full reports
              </Link>
            </div>
            <div className="mt-6">
              <ProfitChart data={chartData} />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2 border-b border-border px-5 py-4">
              <AlertTriangle className="size-4 text-destructive" />
              <h3 className="text-sm font-semibold tracking-wide">PHONE LOW STOCK ALERT</h3>
            </div>
            <div className="divide-y divide-border">
              {lowStockPhones.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">All phone models are above the threshold.</p>
              ) : (
                lowStockPhones.map((m) => (
                  <div key={m.label} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div>
                      <p className="text-sm font-semibold">{m.label}</p>
                      <p className="text-xs text-muted-foreground">Supplier: {m.supplier}</p>
                    </div>
                    <span className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-semibold text-destructive">
                      {m.count} left
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* 5. Recent Activity from Audit Log */}
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-sm font-semibold tracking-wide">RECENT ACTIVITY</h3>
            <Link to="/audit" className="text-sm font-medium text-primary hover:underline">
              View All Log
            </Link>
          </div>
          <table className="w-full text-sm">
            <thead className="border-y border-border text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium">Action</th>
                <th className="px-5 py-3 font-medium">Details</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {state.audit_log.slice(0, 6).map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                    {new Date(a.timestamp).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.action} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{a.details}</td>
                  <td className="px-5 py-4 text-right font-medium">{a.amount === null ? "—" : <Taka value={a.amount} />}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
