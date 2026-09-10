import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  CalendarDays,
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
  Megaphone,
  PieChart,
  Plus,
  Receipt,
  Search,
  Tag,
  Trash2,
  TrendingDown,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AddExpenseDialog } from "@/components/fmm/AddExpenseDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";
import { cn } from "@/lib/utils";

export type ExpensePeriod = "daily" | "7days" | "monthly" | "exact" | "all";

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Management & Reports — Faridpur Mobile Mart" },
      { name: "description", content: "Operating expenses tracker, daily and 7-day reports, monthly audits, shop rent, electricity, marketing, salaries and campaign costs." },
      { property: "og:title", content: "Expense Management & Reports — Faridpur Mobile Mart" },
      { property: "og:description", content: "Track daily, 7-day, monthly, and date-specific shop operating expenses." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): {
    period?: ExpensePeriod;
    date?: string;
    month?: string;
  } => {
    const p = s["period"];
    const valid: ExpensePeriod[] = ["daily", "7days", "monthly", "exact", "all"];
    const result: { period?: ExpensePeriod; date?: string; month?: string } = {};
    if (typeof p === "string" && valid.includes(p as ExpensePeriod)) result.period = p as ExpensePeriod;
    if (typeof s["date"] === "string") result.date = s["date"];
    if (typeof s["month"] === "string") result.month = s["month"];
    return result;
  },
  component: ExpensesPage,
});

function getTodayIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getCurrentMonthIso(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function ExpensesPage() {
  const { state, deleteExpense, updateExpense } = useFmm();
  const searchParams = Route.useSearch();

  // Daily report as default
  const [period, setPeriod] = useState<ExpensePeriod>(searchParams.period ?? "daily");
  const [exactDate, setExactDate] = useState<string>(searchParams.date ?? getTodayIso());
  const [selectedMonth, setSelectedMonth] = useState<string>(searchParams.month ?? getCurrentMonthIso());
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  // All-time statistics
  const allStats = useMemo(() => {
    const list = state.expenses ?? [];
    const total = list.reduce((s, e) => s + e.amount, 0);

    const now = new Date();
    const thisMonthList = list.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthTotal = thisMonthList.reduce((s, e) => s + e.amount, 0);

    const todayStr = now.toDateString();
    const todayTotal = list
      .filter((e) => new Date(e.date).toDateString() === todayStr)
      .reduce((s, e) => s + e.amount, 0);

    const campaignTotal = list.filter((e) => e.campaign_id).reduce((s, e) => s + e.amount, 0);

    return { total, thisMonthTotal, todayTotal, campaignTotal };
  }, [state.expenses]);

  // Expenses filtered by the selected reporting timeframe (Daily, 7 Days, Monthly, Exact Date, All)
  const periodExpenses = useMemo(() => {
    const list = state.expenses ?? [];
    return list.filter((e) => {
      const ed = new Date(e.date);

      if (period === "daily") {
        const now = new Date();
        return (
          ed.getFullYear() === now.getFullYear() &&
          ed.getMonth() === now.getMonth() &&
          ed.getDate() === now.getDate()
        );
      }

      if (period === "7days") {
        const now = new Date();
        const sevenDaysStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 6, 0, 0, 0, 0).getTime();
        const todayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999).getTime();
        const t = ed.getTime();
        return t >= sevenDaysStart && t <= todayEnd;
      }

      if (period === "monthly") {
        const [mYear, mMonth] = selectedMonth.split("-").map((v) => parseInt(v, 10));
        return ed.getFullYear() === mYear && ed.getMonth() + 1 === mMonth;
      }

      if (period === "exact") {
        const [eYear, eMonth, eDay] = exactDate.split("-").map((v) => parseInt(v, 10));
        return (
          ed.getFullYear() === eYear &&
          ed.getMonth() + 1 === eMonth &&
          ed.getDate() === eDay
        );
      }

      return true; // "all"
    });
  }, [state.expenses, period, exactDate, selectedMonth]);

  // Derived metrics for the active period
  const periodStats = useMemo(() => {
    const list = periodExpenses;
    const total = list.reduce((s, e) => s + e.amount, 0);
    const campaignTotal = list.filter((e) => e.campaign_id).reduce((s, e) => s + e.amount, 0);
    const campaignCount = list.filter((e) => e.campaign_id).length;

    // Category breakdown map for this period
    const catMap = new Map<string, number>();
    list.forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
    });
    const catBreakdown = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const topCategory = catBreakdown[0] || null;

    return { total, count: list.length, campaignTotal, campaignCount, catBreakdown, topCategory };
  }, [periodExpenses]);

  // Format human-readable period label
  const periodLabel = useMemo(() => {
    if (period === "daily") {
      return `Today (${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })})`;
    }
    if (period === "7days") {
      const past = new Date(Date.now() - 6 * 86400000);
      return `Last 7 Days (${past.toLocaleDateString("en-US", { month: "short", day: "numeric" })} – ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })})`;
    }
    if (period === "monthly") {
      const parts = selectedMonth.split("-").map((v) => parseInt(v, 10));
      const d = new Date(parts[0] ?? 0, (parts[1] ?? 1) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "long", year: "numeric" });
    }
    if (period === "exact") {
      const ep = exactDate.split("-").map((v) => parseInt(v, 10));
      const d = new Date(ep[0] ?? 0, (ep[1] ?? 1) - 1, ep[2] ?? 1);
      return d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
    }
    return "All Time";
  }, [period, exactDate, selectedMonth]);

  const periodTag = useMemo(() => {
    if (period === "daily") return "Today";
    if (period === "7days") return "7 Days";
    if (period === "monthly") return "Monthly";
    if (period === "exact") return "Selected Date";
    return "All Time";
  }, [period]);

  // Final table list incorporating Category Filter and Search Query
  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return periodExpenses.filter((e) => {
      const matchCat = categoryFilter === "All" || e.category === categoryFilter;
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.payment_method.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [periodExpenses, categoryFilter, search]);

  const getCampaign = (id?: string | null) => {
    if (!id) return null;
    return state.campaigns?.find((c) => c.id === id);
  };

  const handleDelete = (id: string, desc: string) => {
    if (window.confirm(`Are you sure you want to delete expense "${desc}"?`)) {
      deleteExpense(id);
      toast.success("Expense deleted.");
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Operating Expenses"
          subtitle="Track shop overheads, utilities, salaries, marketing and campaign expenditures."
          actions={
            <Button className="rounded-xl gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> Add Expense
            </Button>
          }
        />

        {/* Top Summary Cards — All-Time Stats */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">ALL-TIME EXPENSES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <DollarSign className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-destructive"><Taka value={allStats.total} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Across {state.expenses?.length ?? 0} records</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">THIS MONTH</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Calendar className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={allStats.thisMonthTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Current calendar month</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TODAY&apos;S EXPENSES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <TrendingDown className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={allStats.todayTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Recorded today</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">CAMPAIGN EXPENSES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Tag className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-primary"><Taka value={allStats.campaignTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Marketing &amp; festive promos</p>
          </div>
        </div>

        {/* ─── Period Report Selector ─────────────────────────────── */}
        <div className="mb-6 rounded-xl border border-border bg-card overflow-hidden">
          {/* Tab bar */}
          <div className="flex border-b border-border">
            {([
              { key: "daily", label: "Today" },
              { key: "7days", label: "Last 7 Days" },
              { key: "monthly", label: "Monthly" },
              { key: "exact", label: "Exact Date" },
              { key: "all", label: "All Time" },
            ] as { key: ExpensePeriod; label: string }[]).map(({ key, label }) => (
              <button
                key={key}
                type="button"
                id={`expense-period-${key}`}
                onClick={() => setPeriod(key)}
                className={cn(
                  "flex-1 px-3 py-3 text-xs font-semibold transition-colors whitespace-nowrap",
                  period === key
                    ? "bg-primary/10 text-primary border-b-2 border-primary"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Date / Month pickers (shown only when relevant) */}
          {(period === "exact" || period === "monthly") && (
            <div className="flex items-center gap-3 px-5 py-3 border-b border-border bg-secondary/30">
              <CalendarDays className="size-4 text-muted-foreground shrink-0" />
              {period === "exact" && (
                <>
                  <span className="text-xs text-muted-foreground">Select date:</span>
                  <input
                    type="date"
                    id="expense-exact-date"
                    value={exactDate}
                    onChange={(e) => setExactDate(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </>
              )}
              {period === "monthly" && (
                <>
                  <span className="text-xs text-muted-foreground">Select month:</span>
                  <input
                    type="month"
                    id="expense-month-picker"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="h-8 rounded-lg border border-border bg-background px-3 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
                  />
                </>
              )}
            </div>
          )}

          {/* Period summary metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-border">
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Period Total</p>
              <p className="text-2xl font-bold text-destructive"><Taka value={periodStats.total} /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{periodLabel}</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Records</p>
              <p className="text-2xl font-bold">{periodStats.count}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">expense entries</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Campaign Spend</p>
              <p className="text-2xl font-bold text-primary"><Taka value={periodStats.campaignTotal} /></p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{periodStats.campaignCount} linked expenses</p>
            </div>
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mb-1">Top Category</p>
              {periodStats.topCategory ? (
                <>
                  <p className="text-base font-bold truncate">{periodStats.topCategory[0]}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5"><Taka value={periodStats.topCategory[1]} /></p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground mt-1">—</p>
              )}
            </div>
          </div>
        </div>

        {/* Category Breakdown Chips (period-scoped) */}
        {periodStats.catBreakdown.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              {periodTag} — Expenses by Category
            </h4>
            <div className="flex flex-wrap gap-2">
              {periodStats.catBreakdown.map(([cat, amt]) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(categoryFilter === cat ? "All" : cat)}
                  className={cn(
                    "flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs transition-colors",
                    categoryFilter === cat
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary/60 hover:bg-secondary text-foreground"
                  )}
                >
                  <span className="font-medium">{cat}</span>
                  <span className="font-bold opacity-80"><Taka value={amt} /></span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5">
            {["All", "Shop Rent", "Electricity", "Internet", "Marketing", "Packaging", "Transport", "Salary"].map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategoryFilter(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  categoryFilter === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:bg-secondary text-foreground"
                }`}
              >
                {c === "All" ? "All Categories" : c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search description, category…"
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Expenses Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Description</th>
                <th className="px-5 py-3 font-medium">Campaign Link</th>
                <th className="px-5 py-3 font-medium">Payment Method</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                <th className="px-5 py-3 text-right font-medium">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredExpenses.map((exp) => {
                const cmp = getCampaign(exp.campaign_id);
                return (
                  <tr key={exp.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(exp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      <span className="inline-flex items-center rounded-lg bg-secondary px-2.5 py-1 text-xs font-semibold text-foreground">
                        {exp.category}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-medium text-foreground">{exp.description}</td>
                    <td className="px-5 py-4">
                      {cmp ? (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Link
                            to="/campaigns/$campaignId"
                            params={{ campaignId: cmp.id }}
                            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 text-xs font-semibold transition-colors shadow-2xs group"
                            title={`Open "${cmp.name}" details`}
                          >
                            <Megaphone className="size-3 shrink-0" />
                            <span className="truncate max-w-[120px]">{cmp.name}</span>
                            <ArrowUpRight className="size-3 shrink-0 opacity-70 group-hover:opacity-100" />
                          </Link>
                          <select
                            value={exp.campaign_id || ""}
                            onChange={(e) => {
                              const newCmpId = e.target.value || null;
                              updateExpense(exp.id, { campaign_id: newCmpId });
                              if (newCmpId) {
                                const c = state.campaigns.find((x) => x.id === newCmpId);
                                toast.success(`Expense linked to "${c?.name || "Campaign"}".`);
                              } else {
                                toast.success("Expense unlinked from campaign.");
                              }
                            }}
                            className="h-6 rounded border border-border text-[10px] px-1 bg-transparent text-muted-foreground hover:text-foreground"
                            title="Reassign or unlink campaign"
                          >
                            <option value={cmp.id}>Linked</option>
                            <option value="">Unlink</option>
                            {(state.campaigns ?? [])
                              .filter((c) => c.id !== cmp.id)
                              .map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name}
                                </option>
                              ))}
                          </select>
                        </div>
                      ) : exp.campaign_id ? (
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="rounded-lg bg-secondary px-2 py-0.5 text-[11px] font-mono">
                            Campaign ({exp.campaign_id.slice(0, 6)})
                          </span>
                          <button
                            type="button"
                            onClick={() => {
                              updateExpense(exp.id, { campaign_id: null });
                              toast.success("Unlinked missing campaign.");
                            }}
                            className="text-[11px] text-destructive hover:underline"
                          >
                            Clear
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-muted-foreground mr-1">—</span>
                          <select
                            value=""
                            onChange={(e) => {
                              const newCmpId = e.target.value || null;
                              if (newCmpId) {
                                updateExpense(exp.id, { campaign_id: newCmpId });
                                const c = state.campaigns.find((x) => x.id === newCmpId);
                                toast.success(`Expense linked to "${c?.name || "Campaign"}".`);
                              }
                            }}
                            className="h-6 rounded border border-border text-[10px] px-1 bg-transparent text-muted-foreground hover:text-foreground"
                          >
                            <option value="">+ Link</option>
                            {(state.campaigns ?? []).map((c) => (
                              <option key={c.id} value={c.id}>
                                {c.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground text-xs">{exp.payment_method}</td>
                    <td className="px-5 py-4 text-right font-bold text-foreground"><Taka value={exp.amount} /></td>
                    <td className="px-5 py-4 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(exp.id, exp.description)}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No expenses found matching the selected filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <AddExpenseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  );
}
