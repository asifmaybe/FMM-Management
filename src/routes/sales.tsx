import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  ArrowUpDown,
  Box,
  Calendar,
  CalendarDays,
  HandCoins,
  Info,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Tag,
  TrendingUp,
  Wrench,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { NewSaleDialog } from "@/components/fmm/NewSaleDialog";
import { RecordWarrantyDialog } from "@/components/fmm/RecordWarrantyDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFmm, getTransactionPayment } from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";
import { CollectDueDialog } from "@/components/fmm/CollectDueDialog";
import { InspectTradeInDialog } from "@/components/fmm/InspectTradeInDialog";
import { ProcessReturnDialog } from "@/components/fmm/ProcessReturnDialog";
import { SaleDetailDialog } from "@/components/fmm/SaleDetailDialog";
import type { WarrantyStatus, Transaction, Phone } from "@/lib/fmm-types";

function toLocalDateStr(d: Date | string | number): string {
  const date = new Date(d);
  if (isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDayWithSuffix(dateStr: string): string {
  if (!dateStr) return "";
  const parts = dateStr.split("-");
  if (parts.length !== 3) return dateStr;
  const y = Number(parts[0]);
  const m = Number(parts[1]);
  const d = Number(parts[2]);
  if (isNaN(y) || isNaN(m) || isNaN(d)) return dateStr;
  const dt = new Date(y, m - 1, d);
  if (isNaN(dt.getTime())) return dateStr;
  const day = dt.getDate();
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  const monthName = dt.toLocaleDateString("en-US", { month: "long" });
  return `${day}${suffix} ${monthName}, ${dt.getFullYear()}`;
}

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales, Exchanges & Services — Faridpur Mobile Mart" },
      { name: "description", content: "Record sales and exchanges, track warranty claims, customer returns, and collect outstanding balances." },
      { property: "og:title", content: "Sales, Exchanges & Services — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage phone and accessory sales, trade-in exchanges, warranty claims and customer returns." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { customer?: string } => {
    const customer = s["customer"];
    return typeof customer === "string" && customer ? { customer } : {};
  },
  component: SalesPage,
});

function SalesPage() {
  const { state, collectPayment, updateWarrantyClaim } = useFmm();
  const { customer: customerSearchParam } = Route.useSearch();

  type SortOption =
    | "date-desc"
    | "date-asc"
    | "name-asc"
    | "name-desc"
    | "amount-desc"
    | "amount-asc"
    | "due-desc";

  const [viewTab, setViewTab] = useState<"sales" | "exchanges" | "warranty">("sales");
  const [filter, setFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "yesterday" | "thisMonth" | "exact">("all");
  const [exactDate, setExactDate] = useState("");
  const [sortBy, setSortBy] = useState<SortOption>("date-desc");
  // Pre-seed search from URL param (e.g. navigating from Customers page)
  const [search, setSearch] = useState(customerSearchParam ?? "");
  const [warrantyOpen, setWarrantyOpen] = useState(false);
  const [saleOpen, setSaleOpen] = useState(false);
  const [returnTx, setReturnTx] = useState<Transaction | null>(null);
  const [collectTx, setCollectTx] = useState<Transaction | null>(null);
  const [inspectPhone, setInspectPhone] = useState<Phone | null>(null);
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  const stats = useMemo(() => {
    const list = state.transactions ?? [];
    const now = new Date();
    const thisYear = now.getFullYear();
    const thisMonth = now.getMonth();
    const thisMonthPrefix = `${thisYear}-${String(thisMonth + 1).padStart(2, "0")}`;

    let total = 0;
    let paid = 0;
    let outstanding = 0;
    let pendingCount = 0;

    let thisMonthTotal = 0;
    let thisMonthPaid = 0;
    let thisMonthCount = 0;

    list.forEach((t) => {
      const p = getTransactionPayment(t);
      total += p.total;
      paid += p.paid;
      if (p.hasDue) {
        outstanding += p.due;
        pendingCount += 1;
      }

      const txDateStr = toLocalDateStr(t.date);
      if (txDateStr.startsWith(thisMonthPrefix)) {
        thisMonthTotal += p.total;
        thisMonthPaid += p.paid;
        thisMonthCount += 1;
      }
    });

    const todayStr = new Date().toDateString();
    const todayList = list.filter((t) => new Date(t.date).toDateString() === todayStr);
    const todayTotal = todayList.reduce((s, t) => s + getTransactionPayment(t).total, 0);

    const thisMonthName = now.toLocaleDateString("en-US", { month: "long" });
    const thisMonthYear = now.getFullYear();

    return {
      total,
      paid,
      outstanding,
      pendingCount,
      todayTotal,
      todayCount: todayList.length,
      thisMonthTotal,
      thisMonthPaid,
      thisMonthCount,
      thisMonthName,
      thisMonthYear,
    };
  }, [state.transactions]);

  const typeCounts = useMemo(() => {
    const list = state.transactions ?? [];
    let phones = 0;
    let accessories = 0;
    let paid = 0;
    let pending = 0;
    let exchange = 0;
    let returned = 0;

    list.forEach((t) => {
      const pay = getTransactionPayment(t);
      if (t.phone_id || (t.items && t.items.some((i) => i.type === "phone"))) phones++;
      if (!t.phone_id && t.items && t.items.some((i) => i.type === "accessory")) accessories++;
      if (pay.isPaidInFull) paid++;
      if (pay.hasDue) pending++;
      if (t.type === "Exchange" || Boolean(t.trade_in)) exchange++;
      if (Boolean(t.return_info)) returned++;
    });

    return { all: list.length, phones, accessories, paid, pending, exchange, returned };
  }, [state.transactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    const todayStr = toLocalDateStr(new Date());
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = toLocalDateStr(yesterday);
    const now = new Date();
    const thisMonthPrefix = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    return (state.transactions ?? []).filter((t) => {
      const pay = getTransactionPayment(t);
      let matchFilter = true;
      if (filter === "Phones") {
        matchFilter = Boolean(t.phone_id || (t.items && t.items.some((i) => i.type === "phone")));
      } else if (filter === "Accessories") {
        matchFilter = !t.phone_id && Boolean(t.items && t.items.some((i) => i.type === "accessory"));
      } else if (filter === "Paid") {
        matchFilter = pay.isPaidInFull;
      } else if (filter === "Pending") {
        matchFilter = pay.hasDue;
      } else if (filter === "Exchange") {
        matchFilter = t.type === "Exchange" || Boolean(t.trade_in);
      } else if (filter === "Returned") {
        matchFilter = Boolean(t.return_info);
      }

      const txDateStr = toLocalDateStr(t.date);
      let matchDate = true;
      if (dateFilter === "today") {
        matchDate = txDateStr === todayStr;
      } else if (dateFilter === "yesterday") {
        matchDate = txDateStr === yesterdayStr;
      } else if (dateFilter === "thisMonth") {
        matchDate = txDateStr.startsWith(thisMonthPrefix);
      } else if (dateFilter === "exact" && exactDate) {
        matchDate = txDateStr === exactDate;
      }

      const phone = state.phones.find((p) => p.id === t.phone_id);
      const matchSearch =
        !q ||
        t.customer_name.toLowerCase().includes(q) ||
        t.customer_phone.toLowerCase().includes(q) ||
        (phone && (phone.brand.toLowerCase().includes(q) || phone.model.toLowerCase().includes(q) || phone.imei.includes(q))) ||
        (t.memo_no && t.memo_no.toLowerCase().includes(q)) ||
        (t.items && t.items.some((i) => i.name.toLowerCase().includes(q)));

      return matchFilter && matchDate && matchSearch;
    });
  }, [state.transactions, state.phones, filter, search, dateFilter, exactDate]);

  const filteredSalesStats = useMemo(() => {
    let total = 0;
    let paid = 0;
    let due = 0;
    filteredTransactions.forEach((t) => {
      const p = getTransactionPayment(t);
      total += p.total;
      paid += p.paid;
      due += p.due;
    });
    return { count: filteredTransactions.length, total, paid, due };
  }, [filteredTransactions]);

  const sortedTransactions = useMemo(() => {
    const list = [...filteredTransactions];
    list.sort((a, b) => {
      if (sortBy === "date-desc") {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === "date-asc") {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === "name-asc") {
        return a.customer_name.localeCompare(b.customer_name);
      }
      if (sortBy === "name-desc") {
        return b.customer_name.localeCompare(a.customer_name);
      }
      if (sortBy === "amount-desc") {
        return getTransactionPayment(b).total - getTransactionPayment(a).total;
      }
      if (sortBy === "amount-asc") {
        return getTransactionPayment(a).total - getTransactionPayment(b).total;
      }
      if (sortBy === "due-desc") {
        return getTransactionPayment(b).due - getTransactionPayment(a).due;
      }
      return 0;
    });
    return list;
  }, [filteredTransactions, sortBy]);

  const filteredExchanges = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.exchanges ?? []).filter((exc) => {
      if (!q) return true;
      const outPh = state.phones.find((p) => p.id === exc.outgoing_phone_id);
      const inPh = state.phones.find((p) => p.id === exc.incoming_phone_id);
      return (
        exc.customer_name.toLowerCase().includes(q) ||
        exc.customer_phone.toLowerCase().includes(q) ||
        (outPh && `${outPh.brand} ${outPh.model} ${outPh.imei}`.toLowerCase().includes(q)) ||
        (inPh && `${inPh.brand} ${inPh.model} ${inPh.imei}`.toLowerCase().includes(q))
      );
    });
  }, [state.exchanges, state.phones, search]);

  const filteredWarrantyClaims = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.warranty_claims ?? []).filter((w) => {
      if (!q) return true;
      return (
        w.customer_name.toLowerCase().includes(q) ||
        w.customer_phone.toLowerCase().includes(q) ||
        w.issue_description.toLowerCase().includes(q) ||
        w.status.toLowerCase().includes(q)
      );
    });
  }, [state.warranty_claims, search]);

  const filteredReturns = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.returns ?? []).filter((r) => {
      if (!q) return true;
      return (
        r.customer_name.toLowerCase().includes(q) ||
        r.customer_phone.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.action.toLowerCase().includes(q)
      );
    });
  }, [state.returns, search]);

  const phoneLabel = (id: string) => {
    const p = state.phones.find((x) => x.id === id);
    return p ? { imei: p.imei, model: `${p.brand} ${p.model}` } : { imei: "—", model: "—" };
  };

  const handleCollect = (txId: string, customer: string) => {
    collectPayment(txId);
    toast.success(`Payment collected from ${customer}.`);
  };

  const handleClaimStatusChange = (claimId: string, newStatus: WarrantyStatus) => {
    updateWarrantyClaim(claimId, { status: newStatus });
    toast.success(`Warranty claim marked as ${newStatus}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Sales, Exchanges & Services"
          subtitle="View phone & accessory transactions, customer trade-in records, warranty repairs and returns."
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <Button
                variant="outline"
                className="rounded-xl gap-1.5 text-xs"
                onClick={() => setWarrantyOpen(true)}
              >
                <ShieldAlert className="size-3.5" /> Record Warranty / Return
              </Button>
              <Button
                className="rounded-xl gap-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setSaleOpen(true)}
              >
                <Plus className="size-3.5" /> New Sale / POS
              </Button>
            </div>
          }
        />

        {/* Top Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">SALES REVENUE {stats.thisMonthName.toUpperCase()} {stats.thisMonthYear}</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Receipt className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={stats.thisMonthTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Across {stats.thisMonthCount} order{stats.thisMonthCount === 1 ? "" : "s"} this month</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">COLLECTED {stats.thisMonthName.toUpperCase()} {stats.thisMonthYear}</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <HandCoins className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-success"><Taka value={stats.thisMonthPaid} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Collected customer funds this month</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">OUTSTANDING DUES</span>
              <span className={`rounded-lg p-2 ${stats.outstanding > 0 ? "bg-danger-soft text-destructive" : "bg-secondary text-foreground"}`}>
                <AlertTriangle className="size-4" />
              </span>
            </div>
            <p className={`mt-4 text-3xl font-bold ${stats.outstanding > 0 ? "text-destructive" : "text-success"}`}>
              <Taka value={stats.outstanding} />
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Across {stats.pendingCount} pending orders</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TODAY&apos;S SALES</span>
              <span className="rounded-lg p-2 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <TrendingUp className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={stats.todayTotal} /></p>
            <p className="mt-2 text-xs text-muted-foreground">{stats.todayCount} order{stats.todayCount === 1 ? "" : "s"} completed today</p>
          </div>
        </div>

        {/* View Mode Navigation Tabs */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setViewTab("sales")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${viewTab === "sales"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
            >
              <Receipt className="size-3.5" /> All Sales & Orders ({state.transactions?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("exchanges")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${viewTab === "exchanges"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
            >
              <ArrowLeftRight className="size-3.5" /> Trade-in Exchanges ({state.exchanges?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("warranty")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${viewTab === "warranty"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
            >
              <ShieldAlert className="size-3.5" /> Warranty & Returns ({(state.warranty_claims?.length ?? 0) + (state.returns?.length ?? 0)})
            </button>
          </div>

          <div className="relative w-full sm:w-72 md:w-80">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, phone, IMEI…"
              className="pl-9 pr-8 h-9 text-xs rounded-xl"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                title="Clear search"
                className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* 1. SALES & ORDERS VIEW */}
        {viewTab === "sales" && (
          <div className="space-y-4">
            {/* Unified Filter & Sorting Control Card */}
            <div className="rounded-2xl border border-border bg-card p-3 sm:p-4 space-y-3.5 shadow-2xs">
              {/* Row 1: Order Type Pills */}
              <div className="flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider mr-1 shrink-0">
                    Type:
                  </span>
                  {[
                    { key: "All", label: "All Orders", count: typeCounts.all },
                    { key: "Phones", label: "Phones", count: typeCounts.phones },
                    { key: "Accessories", label: "Accessories", count: typeCounts.accessories },
                    { key: "Paid", label: "Paid in Full", count: typeCounts.paid },
                    { key: "Pending", label: "Pending / Due", count: typeCounts.pending },
                    { key: "Exchange", label: "Trade-in Exchanges", count: typeCounts.exchange },
                    { key: "Returned", label: "Customer Returns", count: typeCounts.returned },
                  ].map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => setFilter(item.key)}
                      className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${filter === item.key
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-background hover:bg-secondary text-foreground"
                        }`}
                    >
                      <span>{item.label}</span>
                      <span
                        className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${filter === item.key
                            ? "bg-primary-foreground/20 text-primary-foreground"
                            : "bg-secondary text-muted-foreground"
                          }`}
                      >
                        {item.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Active Filters Clear Button if filter / date / search applied */}
                {(filter !== "All" || dateFilter !== "all" || search) && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilter("All");
                      setDateFilter("all");
                      setExactDate("");
                      setSearch("");
                    }}
                    className="text-[11px] font-medium text-muted-foreground hover:text-destructive transition-colors shrink-0 ml-auto"
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Row 2: Date Filters & Sorting Controls */}
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pt-3 border-t border-border/60">
                {/* Date Filter Pills + Exact Date Picker */}
                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground mr-1 shrink-0">
                    <Calendar className="size-3.5 text-primary" />
                    <span>Date:</span>
                  </div>
                  {[
                    { key: "all", label: "All Dates" },
                    { key: "today", label: "Today" },
                    { key: "yesterday", label: "Yesterday" },
                    { key: "thisMonth", label: "This Month" },
                  ].map((opt) => (
                    <button
                      key={opt.key}
                      type="button"
                      onClick={() => {
                        setDateFilter(opt.key as any);
                        if (opt.key !== "exact") setExactDate("");
                      }}
                      className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${dateFilter === opt.key
                          ? "bg-primary text-primary-foreground border-primary shadow-xs"
                          : "border-border bg-background hover:bg-secondary text-foreground"
                        }`}
                    >
                      {opt.label}
                    </button>
                  ))}

                  {/* Exact Date Picker Input */}
                  <div
                    className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition-colors ${dateFilter === "exact"
                        ? "border-primary bg-primary/10 text-primary ring-1 ring-primary/30"
                        : "border-border bg-background text-muted-foreground hover:text-foreground"
                      }`}
                  >
                    <CalendarDays className="size-3.5 shrink-0" />
                    <span className="font-medium whitespace-nowrap">Exact Date:</span>
                    <input
                      type="date"
                      value={exactDate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setExactDate(val);
                        if (val) {
                          setDateFilter("exact");
                        } else {
                          setDateFilter("all");
                        }
                      }}
                      className="bg-transparent text-foreground text-xs focus:outline-hidden cursor-pointer"
                    />
                    {exactDate && (
                      <button
                        type="button"
                        title="Clear exact date"
                        onClick={() => {
                          setExactDate("");
                          setDateFilter("all");
                        }}
                        className="rounded p-0.5 hover:bg-secondary text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3" />
                      </button>
                    )}
                  </div>

                  {/* Filter badge if date is active */}
                  {dateFilter !== "all" && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary rounded-md bg-primary/10 px-2 py-1 border border-primary/20">
                      <span>Filtered:</span>
                      <strong>
                        {dateFilter === "today" && "Today"}
                        {dateFilter === "yesterday" && "Yesterday"}
                        {dateFilter === "thisMonth" && "This Month"}
                        {dateFilter === "exact" && (exactDate ? formatDayWithSuffix(exactDate) : "Exact Date")}
                      </strong>
                    </span>
                  )}
                </div>

                {/* Sorting Controls (Right Aligned) */}
                <div className="flex items-center gap-2 self-start lg:self-auto shrink-0">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <ArrowUpDown className="size-3.5 text-primary" />
                    <span>Sort By:</span>
                  </div>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as SortOption)}
                    aria-label="Sort orders"
                    className="h-8.5 rounded-lg border border-border bg-background px-3 py-1 text-xs font-medium text-foreground focus:outline-hidden focus:ring-1 focus:ring-primary shadow-2xs cursor-pointer hover:bg-secondary/40 transition-colors"
                  >
                    <option value="date-desc">Date: Newest First</option>
                    <option value="date-asc">Date: Oldest First</option>
                    <option value="name-asc">Customer: A → Z</option>
                    <option value="name-desc">Customer: Z → A</option>
                    <option value="amount-desc">Total Amount: High → Low</option>
                    <option value="amount-asc">Total Amount: Low → High</option>
                    <option value="due-desc">Due Amount: High → Low</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Performance Summary Banner for Filtered Date Range */}
            {dateFilter !== "all" && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-primary/5 border border-primary/20 px-4 py-2.5 text-xs text-foreground">
                <div className="flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" />
                  <span>
                    <strong>
                      {dateFilter === "today" && "Today's"}
                      {dateFilter === "yesterday" && "Yesterday's"}
                      {dateFilter === "thisMonth" && "This Month's"}
                      {dateFilter === "exact" && (exactDate ? `${formatDayWithSuffix(exactDate)}` : "Selected Day")}
                    </strong>{" "}
                    Sales Summary:
                  </span>
                  <span className="text-muted-foreground">
                    <strong>{filteredSalesStats.count}</strong> order{filteredSalesStats.count === 1 ? "" : "s"}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs font-semibold">
                  <span>
                    Total Sales: <strong className="text-foreground"><Taka value={filteredSalesStats.total} /></strong>
                  </span>
                  <span>
                    Collected: <strong className="text-success"><Taka value={filteredSalesStats.paid} /></strong>
                  </span>
                  {filteredSalesStats.due > 0 && (
                    <span>
                      Outstanding Due: <strong className="text-destructive"><Taka value={filteredSalesStats.due} /></strong>
                    </span>
                  )}
                </div>
              </div>
            )}

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full text-xs">
                <thead className="bg-secondary/60 text-left text-muted-foreground border-b border-border">
                  <tr>
                    <th
                      className="w-[110px] min-w-[105px] px-3.5 py-2.5 font-medium cursor-pointer hover:text-foreground select-none transition-colors"
                      onClick={() => setSortBy(sortBy === "date-desc" ? "date-asc" : "date-desc")}
                      title="Sort by date"
                    >
                      <div className="flex items-center gap-1">
                        <span>Date</span>
                        <ArrowUpDown className={`size-3 ${sortBy.startsWith("date") ? "text-primary" : "opacity-40"}`} />
                        {sortBy === "date-desc" && <span className="text-[10px] text-primary font-bold">↓</span>}
                        {sortBy === "date-asc" && <span className="text-[10px] text-primary font-bold">↑</span>}
                      </div>
                    </th>
                    <th className="w-[85px] min-w-[80px] px-2.5 py-2.5 font-medium">Type</th>
                    <th className="min-w-[320px] px-3.5 py-2.5 font-medium">Item(s) & Details</th>
                    <th
                      className="w-[150px] min-w-[130px] px-3 py-2.5 font-medium cursor-pointer hover:text-foreground select-none transition-colors"
                      onClick={() => setSortBy(sortBy === "name-asc" ? "name-desc" : "name-asc")}
                      title="Sort by customer name"
                    >
                      <div className="flex items-center gap-1">
                        <span>Customer</span>
                        <ArrowUpDown className={`size-3 ${sortBy.startsWith("name") ? "text-primary" : "opacity-40"}`} />
                        {sortBy === "name-asc" && <span className="text-[10px] text-primary font-bold">↑</span>}
                        {sortBy === "name-desc" && <span className="text-[10px] text-primary font-bold">↓</span>}
                      </div>
                    </th>
                    <th
                      className="w-[170px] min-w-[150px] px-3 py-2.5 text-right font-medium cursor-pointer hover:text-foreground select-none transition-colors"
                      onClick={() => setSortBy(sortBy === "amount-desc" ? "amount-asc" : "amount-desc")}
                      title="Sort by total amount"
                    >
                      <div className="flex items-center justify-end gap-1">
                        <span>Payment Breakdown</span>
                        <ArrowUpDown className={`size-3 ${sortBy.startsWith("amount") ? "text-primary" : "opacity-40"}`} />
                        {sortBy === "amount-desc" && <span className="text-[10px] text-primary font-bold">↓</span>}
                        {sortBy === "amount-asc" && <span className="text-[10px] text-primary font-bold">↑</span>}
                      </div>
                    </th>
                    <th className="w-[80px] min-w-[75px] px-2.5 py-2.5 font-medium">Status</th>
                    <th className="w-[130px] min-w-[110px] px-3 py-2.5 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sortedTransactions.map((t) => {
                    const p = phoneLabel(t.phone_id);
                    const phoneObj = state.phones.find((ph) => ph.id === t.phone_id);
                    const isReturned = Boolean(t.return_info);
                    const tradeInPhone = t.trade_in
                      ? state.phones.find((ph) => ph.id === t.trade_in?.incoming_phone_id)
                      : null;
                    const isTradeInInInspection = tradeInPhone?.status === "In Inspection";
                    const pay = getTransactionPayment(t);

                    // Separate phone items and accessory items
                    const phoneItems = (t.items ?? []).filter((i) => i.type === "phone");
                    const accessoryItems = (t.items ?? []).filter((i) => i.type === "accessory");
                    const otherItems = (t.items ?? []).filter((i) => i.type !== "phone" && i.type !== "accessory");

                    const phoneName = phoneItems.length > 0
                      ? phoneItems.map((pi) => pi.name).join(", ")
                      : p.model !== "—"
                        ? p.model
                        : null;
                    const phoneImei = phoneObj?.imei || (p.imei !== "—" ? p.imei : null);
                    const campaign = t.campaign_id ? state.campaigns.find((c) => c.id === t.campaign_id) : null;

                    return (
                      <tr
                        key={t.id}
                        className="cursor-pointer hover:bg-secondary/40 transition-colors group"
                        onClick={() => setSelectedTx(t)}
                      >
                        <td className="w-[110px] px-3.5 py-2.5 whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="w-[85px] px-2.5 py-2.5">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={t.type} />
                            {t.trade_in && (
                              <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                <ArrowLeftRight className="size-2.5" /> Trade-in
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="min-w-[320px] px-3.5 py-2.5">
                          <div className="flex flex-col gap-1">
                            {/* 1. Phone item ALWAYS on TOP */}
                            {phoneName ? (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors flex items-center gap-1">
                                  <Smartphone className="size-3.5 text-primary shrink-0" />
                                  <span>{phoneName}</span>
                                  {phoneImei && (
                                    <span className="font-mono text-[10.5px] text-muted-foreground font-normal">
                                      ({phoneImei})
                                    </span>
                                  )}
                                </span>

                                {phoneObj?.with_box && (
                                  <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Includes original box">
                                    <Box className="size-2.5" /> Box
                                  </span>
                                )}

                                {/* Compact discount icon to indicate campaign link (0 extra vertical height) */}
                                {t.campaign_id && (
                                  <Link
                                    to="/campaigns/$campaignId"
                                    params={{ campaignId: t.campaign_id }}
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Campaign: ${campaign?.name || "Special Campaign"}`}
                                    className="inline-flex items-center justify-center size-4.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors shrink-0"
                                  >
                                    <Tag className="size-2.5" />
                                  </Link>
                                )}
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 flex-wrap">
                                {accessoryItems.length === 0 && (
                                  <p className="font-semibold text-foreground text-xs group-hover:text-primary transition-colors">
                                    {p.model !== "—" ? `${p.model} (${p.imei})` : "Transaction item"}
                                  </p>
                                )}
                                {t.campaign_id && (
                                  <Link
                                    to="/campaigns/$campaignId"
                                    params={{ campaignId: t.campaign_id }}
                                    onClick={(e) => e.stopPropagation()}
                                    title={`Campaign: ${campaign?.name || "Special Campaign"}`}
                                    className="inline-flex items-center justify-center size-4.5 rounded bg-amber-500/15 text-amber-600 dark:text-amber-400 hover:bg-amber-500/25 transition-colors shrink-0"
                                  >
                                    <Tag className="size-2.5" />
                                  </Link>
                                )}
                              </div>
                            )}

                            {/* 2. Accessories Listed Below Phone */}
                            {accessoryItems.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {accessoryItems.map((i, idx) => (
                                  <span
                                    key={idx}
                                    className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] leading-tight ${i.is_gift
                                        ? "bg-primary/10 text-primary font-semibold border border-primary/20"
                                        : "bg-secondary text-foreground font-medium border border-border"
                                      }`}
                                  >
                                    {i.is_gift ? "🎁 " : ""}{i.quantity}x {i.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Other custom items if any */}
                            {otherItems.length > 0 && (
                              <div className="flex flex-wrap items-center gap-1">
                                {otherItems.map((i, idx) => (
                                  <span
                                    key={idx}
                                    className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] bg-secondary text-foreground font-medium border border-border"
                                  >
                                    {i.quantity}x {i.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Trade-in info */}
                            {t.trade_in && (
                              <div className="text-[11px] text-muted-foreground flex flex-wrap items-center gap-1.5 mt-0.5">
                                <span className="font-medium text-foreground">Trade-in:</span>
                                <span>{t.trade_in.incoming_brand} {t.trade_in.incoming_model}</span>
                                {tradeInPhone?.with_box && (
                                  <span className="inline-flex items-center gap-0.5 rounded px-1 py-0.2 text-[9.5px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Includes box">
                                    <Box className="size-2" /> Box
                                  </span>
                                )}
                                <span className="font-mono text-[10px]">({t.trade_in.incoming_imei})</span>
                                <span className="text-purple-600 dark:text-purple-400 font-semibold">Valuation: <Taka value={t.trade_in.incoming_valuation} /></span>
                              </div>
                            )}

                            {/* Return Banner */}
                            {t.return_info && (
                              <div className="inline-flex items-center gap-1.5 rounded border border-rose-500/20 bg-rose-500/10 px-2 py-0.5 text-[10.5px] text-rose-700 dark:text-rose-300 mt-0.5">
                                <RotateCcw className="size-3 text-rose-600 shrink-0" />
                                <span>
                                  <strong>Returned:</strong> Net refund <Taka value={t.return_info.refund_amount} /> ({t.return_info.deduction_percentage}% ded.) &bull; {t.return_info.disposition}
                                </span>
                              </div>
                            )}

                            {/* Notes */}
                            {t.notes && (
                              <p className="text-[11px] text-muted-foreground truncate max-w-[420px]" title={t.notes}>
                                {t.notes}
                              </p>
                            )}
                          </div>
                        </td>
                        <td className="w-[150px] px-3 py-2.5">
                          <p className="font-medium text-foreground text-xs leading-tight">{t.customer_name}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{t.customer_phone}</p>
                        </td>
                        <td className="w-[170px] px-3 py-2.5 text-right whitespace-nowrap">
                          <p className="font-bold text-foreground text-xs">
                            <Taka value={pay.total} />
                          </p>
                          {pay.hasDue ? (
                            <div className="text-[10.5px] text-muted-foreground mt-0.5">
                              <span>Paid: <Taka value={pay.paid} /></span>
                              <span className="mx-1">&bull;</span>
                              <span className="text-destructive font-semibold">Due: <Taka value={pay.due} /></span>
                            </div>
                          ) : (
                            <p className="text-[10.5px] text-success font-medium">Paid in Full</p>
                          )}
                        </td>
                        <td className="w-[80px] px-2.5 py-2.5">
                          <StatusBadge status={pay.status} />
                        </td>
                        <td className="w-[130px] px-3 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                            {pay.hasDue && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6.5 px-2 text-[11px] rounded-lg gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollectTx(t);
                                }}
                              >
                                <HandCoins className="size-2.5" /> Collect Due
                              </Button>
                            )}

                            {t.phone_id && !isReturned && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6.5 px-2 text-[11px] rounded-lg gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReturnTx(t);
                                }}
                              >
                                <RotateCcw className="size-2.5" /> Return
                              </Button>
                            )}

                            {isTradeInInInspection && tradeInPhone && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6.5 px-2 text-[11px] rounded-lg gap-1 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectPhone(tradeInPhone);
                                }}
                              >
                                <ShieldCheck className="size-2.5" /> Inspect
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {sortedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <p className="font-medium text-foreground">No transactions found</p>
                          <p className="text-xs text-muted-foreground">
                            {dateFilter !== "all"
                              ? `No sales recorded for ${dateFilter === "today"
                                ? "today"
                                : dateFilter === "yesterday"
                                  ? "yesterday"
                                  : dateFilter === "thisMonth"
                                    ? "this month"
                                    : exactDate
                                      ? formatDayWithSuffix(exactDate)
                                      : "the selected date"
                              }.`
                              : "No transactions match your current search and filter criteria."}
                          </p>
                          {(dateFilter !== "all" || filter !== "All" || search) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="mt-2 text-xs h-7 rounded-lg"
                              onClick={() => {
                                setDateFilter("all");
                                setExactDate("");
                                setFilter("All");
                                setSearch("");
                              }}
                            >
                              Clear All Filters
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 2. EXCHANGES LEDGER VIEW */}
        {viewTab === "exchanges" && (
          <div className="space-y-4">
            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Outgoing Phone (FMM Sold)</th>
                    <th className="px-5 py-3 font-medium">Incoming Phone (Customer Trade-in)</th>
                    <th className="px-5 py-3 font-medium">Trade-in Status</th>
                    <th className="px-5 py-3 text-right font-medium">Incoming Valuation</th>
                    <th className="px-5 py-3 text-right font-medium">Settlement</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredExchanges.map((exc) => {
                    const outPh = state.phones.find((p) => p.id === exc.outgoing_phone_id);
                    const inPh = state.phones.find((p) => p.id === exc.incoming_phone_id);
                    const isDowngrade = exc.difference_direction === "shop_pays_customer";
                    const isPendingInspection = inPh?.status === "In Inspection";

                    return (
                      <tr key={exc.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(exc.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{exc.customer_name}</p>
                          <p className="text-xs text-muted-foreground font-mono">{exc.customer_phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          {outPh ? (
                            <div>
                              <p className="font-semibold text-foreground">{outPh.brand} {outPh.model}</p>
                              <p className="text-xs font-mono text-muted-foreground">IMEI: {outPh.imei}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">Sold Price: <Taka value={exc.outgoing_value} /></p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Device #{exc.outgoing_phone_id.slice(-4)}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {inPh ? (
                            <div>
                              <p className="font-semibold text-foreground">{inPh.brand} {inPh.model}</p>
                              <p className="text-xs font-mono text-muted-foreground">IMEI: {inPh.imei}</p>
                              <p className="text-xs text-muted-foreground mt-0.5">{inPh.condition}</p>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">Device #{exc.incoming_phone_id.slice(-4)}</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {inPh ? (
                            <div className="flex flex-col gap-1 items-start">
                              <StatusBadge status={inPh.status} />
                              {inPh.status === "Available" && inPh.selling_price ? (
                                <span className="text-[10px] text-muted-foreground">Resale: ৳{inPh.selling_price}</span>
                              ) : null}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right font-medium text-foreground">
                          <Taka value={exc.incoming_valuation} />
                        </td>
                        <td className="px-5 py-4 text-right font-bold whitespace-nowrap">
                          {isDowngrade ? (
                            <div>
                              <span className="text-amber-600 dark:text-amber-400">
                                -<Taka value={exc.settlement_amount ?? exc.additional_paid} />
                              </span>
                              <p className="text-[10px] font-normal text-muted-foreground">Shop paid customer</p>
                            </div>
                          ) : (
                            <div>
                              <span className="text-success">
                                +<Taka value={exc.settlement_amount ?? exc.additional_paid} />
                              </span>
                              <p className="text-[10px] font-normal text-muted-foreground">Customer paid shop</p>
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-right">
                          {isPendingInspection && inPh ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 text-xs rounded-lg gap-1 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                              onClick={() => setInspectPhone(inPh)}
                            >
                              <ShieldCheck className="size-3" /> Inspect
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Completed</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {filteredExchanges.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                        No phone exchange records found.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 3. WARRANTY & RETURNS VIEW */}
        {viewTab === "warranty" && (
          <div className="space-y-6">
            {/* Warranty Claims Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <Wrench className="size-4 text-primary" /> Warranty Repair Claims ({state.warranty_claims?.length ?? 0})
                </h3>
                <Button size="sm" className="rounded-xl gap-1 text-xs" onClick={() => setWarrantyOpen(true)}>
                  <Plus className="size-3.5" /> Record Claim
                </Button>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-secondary/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Claim Date</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Issue Description</th>
                      <th className="px-5 py-3 text-right font-medium">Repair Cost</th>
                      <th className="px-5 py-3 font-medium">Status</th>
                      <th className="px-5 py-3 text-right font-medium">Update Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredWarrantyClaims.map((w) => (
                      <tr key={w.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                          {new Date(w.claim_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{w.customer_name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{w.customer_phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground">{w.issue_description}</p>
                          {w.notes ? <p className="text-xs text-muted-foreground mt-0.5">{w.notes}</p> : null}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <span className="font-medium text-destructive"><Taka value={w.repair_cost} /></span>
                          {w.customer_charge > 0 ? (
                            <p className="text-[10px] text-success">Charged: {w.customer_charge} ৳</p>
                          ) : null}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={w.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <select
                            value={w.status}
                            onChange={(e) => handleClaimStatusChange(w.id, e.target.value as WarrantyStatus)}
                            className="h-8 rounded-lg border border-border bg-card px-2 text-xs font-medium"
                          >
                            <option value="Pending Inspection">Pending Inspection</option>
                            <option value="In Repair">In Repair</option>
                            <option value="Repaired">Repaired</option>
                            <option value="Replaced">Replaced</option>
                            <option value="Resolved">Resolved</option>
                            <option value="Rejected">Rejected</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                    {filteredWarrantyClaims.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                          No warranty claims recorded.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Customer Returns Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold flex items-center gap-2">
                  <RotateCcw className="size-4 text-primary" /> Customer Returns History ({state.returns?.length ?? 0})
                </h3>
              </div>

              <div className="overflow-x-auto rounded-xl border border-border bg-card">
                <table className="w-full min-w-[850px] text-sm">
                  <thead className="bg-secondary/60 text-left text-muted-foreground">
                    <tr>
                      <th className="px-5 py-3 font-medium">Return Date</th>
                      <th className="px-5 py-3 font-medium">Customer</th>
                      <th className="px-5 py-3 font-medium">Reason</th>
                      <th className="px-5 py-3 font-medium">Resolution Action</th>
                      <th className="px-5 py-3 text-right font-medium">Refund Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {filteredReturns.map((r) => (
                      <tr key={r.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                          {new Date(r.return_date).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-semibold text-foreground">{r.customer_name}</p>
                          <p className="text-xs font-mono text-muted-foreground">{r.customer_phone}</p>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground">{r.reason}</p>
                          {r.notes ? <p className="text-xs text-muted-foreground mt-0.5">{r.notes}</p> : null}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={r.action} />
                        </td>
                        <td className="px-5 py-4 text-right font-semibold text-destructive">
                          <Taka value={r.refund_amount} />
                        </td>
                      </tr>
                    ))}
                    {filteredReturns.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">
                          No returns recorded.
                        </td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>

      <RecordWarrantyDialog open={warrantyOpen} onOpenChange={setWarrantyOpen} />
      <NewSaleDialog open={saleOpen} onOpenChange={setSaleOpen} />
      <ProcessReturnDialog
        transaction={returnTx}
        open={Boolean(returnTx)}
        onOpenChange={(open) => !open && setReturnTx(null)}
      />
      <CollectDueDialog
        transaction={collectTx}
        open={Boolean(collectTx)}
        onOpenChange={(open) => !open && setCollectTx(null)}
      />
      <InspectTradeInDialog
        phone={inspectPhone}
        open={Boolean(inspectPhone)}
        onOpenChange={(open) => !open && setInspectPhone(null)}
      />
      <SaleDetailDialog
        transaction={selectedTx}
        onClose={() => setSelectedTx(null)}
      />
    </AppShell>
  );
}

