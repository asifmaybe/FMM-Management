import { createFileRoute, Link } from "@tanstack/react-router";
import {
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
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AuditEntityLink } from "@/components/fmm/AuditEntityLink";
import { SaleDetailDialog } from "@/components/fmm/SaleDetailDialog";
import { ProfitChart } from "@/components/fmm/ProfitChart";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { buildSeries } from "@/lib/fmm-analytics";
import type { Transaction } from "@/lib/fmm-types";
import {
  accessoryBusinessMetrics,
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
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const handleTransactionOpen = (txId: string) => {
    const tx = state.transactions?.find((t) => t.id === txId);
    if (tx) setSelectedTx(tx);
  };

  const overall = useMemo(() => overallBusinessMetrics(state), [state]);
  const phone = useMemo(() => phoneBusinessMetrics(state), [state]);
  const acc = useMemo(() => accessoryBusinessMetrics(state), [state]);

  const totalDues = useMemo(() => totalSuppliersDue(state), [state]);

  const activeCampaigns = useMemo(() => {
    return (state.campaigns ?? []).filter((c) => c.status === "Active" || c.status === "Planned");
  }, [state.campaigns]);

  const chartData = useMemo(() => buildSeries(state, "daily", 7), [state]);

  // Today's expense summary
  const todayExpenses = useMemo(() => {
    const now = new Date();
    const list = (state.expenses ?? []).filter((e) => {
      const d = new Date(e.date);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth() && d.getDate() === now.getDate();
    });
    const total = list.reduce((s, e) => s + e.amount, 0);
    const catMap = new Map<string, number>();
    list.forEach((e) => catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount));
    const breakdown = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    return { total, count: list.length, breakdown };
  }, [state.expenses]);

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
      icon: TrendingDown,
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
              <Link
                to="/accessories"
                search={{ low_stock: "true" }}
                className="bg-secondary/40 hover:bg-secondary/70 p-3 rounded-xl transition-colors block group cursor-pointer"
              >
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground group-hover:text-foreground transition-colors">Low Stock</span>
                  <ArrowUpRight className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className={`font-bold text-base mt-1 ${acc.lowStockCount > 0 ? "text-destructive" : "text-success"}`}>
                  {acc.lowStockCount} items
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Need re-order</p>
              </Link>
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

          {/* Today's Expense Summary */}
          <Link
            to="/expenses"
            search={{ period: "daily" }}
            className="rounded-xl border border-border bg-card flex flex-col hover:border-primary/40 transition-colors group"
          >
            <div className="flex items-center justify-between border-b border-border px-5 py-4">
              <div className="flex items-center gap-2">
                <TrendingDown className="size-4 text-destructive" />
                <h3 className="text-sm font-semibold tracking-wide">TODAY'S EXPENSES</h3>
              </div>
              <ArrowUpRight className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>

            <div className="px-5 py-5 flex flex-col gap-4 flex-1">
              {/* Total spend */}
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Total Spent Today</p>
                <p className="text-3xl font-bold text-destructive"><Taka value={todayExpenses.total} /></p>
                <p className="text-xs text-muted-foreground mt-1">{todayExpenses.count} expense {todayExpenses.count === 1 ? "record" : "records"}</p>
              </div>

              {/* Category breakdown */}
              {todayExpenses.breakdown.length > 0 ? (
                <div className="space-y-2">
                  {todayExpenses.breakdown.slice(0, 5).map(([cat, amt]) => {
                    const pct = todayExpenses.total > 0 ? Math.round((amt / todayExpenses.total) * 100) : 0;
                    return (
                      <div key={cat}>
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="font-medium text-foreground">{cat}</span>
                          <span className="text-muted-foreground"><Taka value={amt} /></span>
                        </div>
                        <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                          <div
                            className="h-full rounded-full bg-destructive/70 transition-all"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground flex-1 flex items-center">
                  No expenses recorded today.
                </p>
              )}
            </div>
          </Link>
        </div>
      </div>

      <SaleDetailDialog transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </AppShell>
  );
}
