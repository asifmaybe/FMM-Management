import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Calendar,
  CreditCard,
  DollarSign,
  ExternalLink,
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

export const Route = createFileRoute("/expenses")({
  head: () => ({
    meta: [
      { title: "Expense Management — Faridpur Mobile Mart" },
      { name: "description", content: "Operating expenses tracker, shop rent, electricity, marketing, salaries and campaign costs." },
      { property: "og:title", content: "Expense Management — Faridpur Mobile Mart" },
      { property: "og:description", content: "Track shop rent, utilities, marketing and operational expenses." },
    ],
  }),
  component: ExpensesPage,
});

function ExpensesPage() {
  const { state, deleteExpense, updateExpense } = useFmm();

  const [categoryFilter, setCategoryFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

  const stats = useMemo(() => {
    const list = state.expenses ?? [];
    const total = list.reduce((s, e) => s + e.amount, 0);

    const now = new Date();
    const thisMonthList = list.filter((e) => {
      const d = new Date(e.date);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const thisMonthTotal = thisMonthList.reduce((s, e) => s + e.amount, 0);

    const todayStr = now.toDateString();
    const todayTotal = list.filter((e) => new Date(e.date).toDateString() === todayStr).reduce((s, e) => s + e.amount, 0);

    const campaignTotal = list.filter((e) => e.campaign_id).reduce((s, e) => s + e.amount, 0);

    // Category breakdown map
    const catMap = new Map<string, number>();
    list.forEach((e) => {
      catMap.set(e.category, (catMap.get(e.category) ?? 0) + e.amount);
    });
    const catBreakdown = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);

    return { total, thisMonthTotal, todayTotal, campaignTotal, catBreakdown };
  }, [state.expenses]);

  const filteredExpenses = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.expenses ?? []).filter((e) => {
      const matchCat = categoryFilter === "All" || e.category === categoryFilter;
      const matchSearch =
        !q ||
        e.description.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        e.payment_method.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [state.expenses, categoryFilter, search]);

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

        {/* Top Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL EXPENSES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <DollarSign className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-destructive"><Taka value={stats.total} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Across {state.expenses?.length ?? 0} expense records</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">THIS MONTH</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Calendar className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={stats.thisMonthTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Current calendar month</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TODAY&apos;S EXPENSES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <TrendingDown className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={stats.todayTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Recorded today</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">CAMPAIGN EXPENSES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Tag className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-primary"><Taka value={stats.campaignTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Marketing & festive promos</p>
          </div>
        </div>

        {/* Category Breakdown Chips */}
        {stats.catBreakdown.length > 0 && (
          <div className="mb-6 rounded-xl border border-border bg-card p-4">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
              Expenses by Category
            </h4>
            <div className="flex flex-wrap gap-2">
              {stats.catBreakdown.map(([cat, amt]) => (
                <div key={cat} className="flex items-center gap-2 rounded-lg bg-secondary/60 px-3 py-1.5 text-xs">
                  <span className="font-medium text-foreground">{cat}</span>
                  <span className="font-bold text-foreground/80"><Taka value={amt} /></span>
                </div>
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
                      <div className="flex items-center gap-1.5">
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
                          className={`h-7 rounded-lg border text-xs px-2 bg-transparent max-w-[170px] ${
                            exp.campaign_id ? "border-primary/40 text-primary font-medium bg-primary/5" : "border-border text-muted-foreground"
                          }`}
                        >
                          <option value="">No Campaign</option>
                          {(state.campaigns ?? []).map((c) => (
                            <option key={c.id} value={c.id}>
                              {c.status === "Active" ? "⚡ " : ""}{c.name}
                            </option>
                          ))}
                        </select>
                        {cmp && (
                          <Link
                            to="/campaigns/$campaignId"
                            params={{ campaignId: cmp.id }}
                            className="text-muted-foreground hover:text-primary p-1"
                            title={`Open "${cmp.name}" details`}
                          >
                            <ExternalLink className="size-3" />
                          </Link>
                        )}
                      </div>
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
