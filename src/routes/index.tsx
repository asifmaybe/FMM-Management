import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, Archive, ArrowUpRight, Banknote, HandCoins, ShoppingCart, TrendingUp, Wallet } from "lucide-react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { ProfitChart } from "@/components/fmm/ProfitChart";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { buildSeries } from "@/lib/fmm-analytics";
import { daysInStock, shopBalance, totalSuppliersDue, useFmm } from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — Faridpur Mobile Mart Stock Manager" },
      {
        name: "description",
        content:
          "Live inventory, sales and profit metrics for Faridpur Mobile Mart. Track stock, suppliers, transactions and outstanding balances offline.",
      },
      { property: "og:title", content: "Dashboard — Faridpur Mobile Mart Stock Manager" },
      {
        property: "og:description",
        content: "Live inventory, sales and profit metrics for a used and new phone resale shop.",
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
  const today = new Date();

  const totalStock = state.phones.filter((p) => p.status === "Available").length;
  const addedThisWeek = state.phones.filter((p) => daysInStock(p.created_at) <= 7).length;
  const todayTx = state.transactions.filter((t) => isSameDay(t.date, today));
  const soldToday = todayTx.length;
  const pendingToday = todayTx.filter((t) => t.payment_status === "Pending").length;

  const shopBal = shopBalance(state);
  const totalDues = totalSuppliersDue(state);

  const outstanding = state.transactions
    .filter((t) => t.payment_status === "Pending")
    .reduce((s, t) => s + t.amount, 0);
  const outstandingSuppliers = new Set(
    state.transactions.filter((t) => t.payment_status === "Pending").map((t) => t.customer_name),
  ).size;

  const chartData = buildSeries(state, "daily", 7);

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
  const lowStock = [...modelCounts.values()]
    .filter((m) => m.count < state.settings.low_stock_threshold)
    .sort((a, b) => a.count - b.count)
    .slice(0, 6);

  const cards = [
    { label: "SHOP PROFIT BALANCE", value: <Taka value={shopBal} />, icon: Wallet, hint: "Accumulated realized profit", hintClass: "text-success", to: "/reports" as const },
    { label: "TOTAL SUPPLIER DUE", value: <Taka value={totalDues} />, icon: HandCoins, hint: `Owed across ${state.suppliers.length} suppliers`, hintClass: totalDues > 0 ? "text-destructive" : "text-success", danger: totalDues > 0, to: "/suppliers" as const },
    { label: "TOTAL STOCK", value: String(totalStock), icon: Archive, hint: `+${addedThisWeek} this week`, hintClass: "text-success", to: "/stock" as const },
    { label: "CUSTOMER OUTSTANDING", value: <Taka value={outstanding} />, icon: AlertTriangle, hint: `Across ${outstandingSuppliers} customers`, hintClass: outstanding > 0 ? "text-destructive" : "text-muted-foreground", danger: outstanding > 0, to: "/sales" as const },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader title="Dashboard Overview" subtitle="Real-time inventory and sales metrics." />

        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {cards.map((c) => (
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

        <div className="mt-4 grid gap-4 xl:grid-cols-[1.9fr_1fr]">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-sm font-semibold tracking-wide">PROFIT TREND (7 DAYS)</h3>
              <Link to="/reports" className="text-sm font-medium hover:underline">
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
              <h3 className="text-sm font-semibold tracking-wide">LOW STOCK ALERT</h3>
            </div>
            <div className="divide-y divide-border">
              {lowStock.length === 0 ? (
                <p className="px-5 py-6 text-sm text-muted-foreground">All models are above the threshold.</p>
              ) : (
                lowStock.map((m) => (
                  <div key={m.label} className="flex items-center justify-between gap-3 px-5 py-4">
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

        <div className="mt-4 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between px-5 py-4">
            <h3 className="text-sm font-semibold tracking-wide">RECENT ACTIVITY</h3>
            <Link to="/audit" className="text-sm font-medium hover:underline">
              View All
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
                  <td className="px-5 py-4 whitespace-nowrap">
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
