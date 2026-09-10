import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowLeftRight,
  HandCoins,
  Info,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  ShieldAlert,
  ShieldCheck,
  ShoppingCart,
  TrendingUp,
  Wrench,
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

  const [viewTab, setViewTab] = useState<"sales" | "exchanges" | "warranty">("sales");
  const [filter, setFilter] = useState("All");
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
    let total = 0;
    let paid = 0;
    let outstanding = 0;
    let pendingCount = 0;

    list.forEach((t) => {
      const p = getTransactionPayment(t);
      total += p.total;
      paid += p.paid;
      if (p.hasDue) {
        outstanding += p.due;
        pendingCount += 1;
      }
    });

    const todayStr = new Date().toDateString();
    const todayList = list.filter((t) => new Date(t.date).toDateString() === todayStr);
    const todayTotal = todayList.reduce((s, t) => s + getTransactionPayment(t).total, 0);

    return { total, paid, outstanding, pendingCount, todayTotal, todayCount: todayList.length };
  }, [state.transactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
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

      const phone = state.phones.find((p) => p.id === t.phone_id);
      const matchSearch =
        !q ||
        t.customer_name.toLowerCase().includes(q) ||
        t.customer_phone.toLowerCase().includes(q) ||
        (phone && (phone.brand.toLowerCase().includes(q) || phone.model.toLowerCase().includes(q) || phone.imei.includes(q))) ||
        (t.items && t.items.some((i) => i.name.toLowerCase().includes(q)));

      return matchFilter && matchSearch;
    });
  }, [state.transactions, state.phones, filter, search]);

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
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL SALES REVENUE</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Receipt className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={stats.total} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Across {state.transactions?.length ?? 0} total orders</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL COLLECTED</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <HandCoins className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-success"><Taka value={stats.paid} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Collected customer funds</p>
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
              className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewTab === "sales"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <Receipt className="size-3.5" /> All Sales & Orders ({state.transactions?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("exchanges")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewTab === "exchanges"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ArrowLeftRight className="size-3.5" /> Trade-in Exchanges ({state.exchanges?.length ?? 0})
            </button>
            <button
              type="button"
              onClick={() => setViewTab("warranty")}
              className={`rounded-xl px-4 py-2 text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewTab === "warranty"
                  ? "bg-primary text-primary-foreground shadow-xs"
                  : "bg-secondary/60 text-muted-foreground hover:text-foreground"
              }`}
            >
              <ShieldAlert className="size-3.5" /> Warranty & Returns ({(state.warranty_claims?.length ?? 0) + (state.returns?.length ?? 0)})
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer, phone, IMEI…"
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* 1. SALES & ORDERS VIEW */}
        {viewTab === "sales" && (
          <div className="space-y-4">
            <div className="flex flex-wrap gap-1.5">
              {[
                { key: "All", label: "All Orders" },
                { key: "Phones", label: "Phones" },
                { key: "Accessories", label: "Accessories" },
                { key: "Paid", label: "Paid in Full" },
                { key: "Pending", label: "Pending / Due" },
                { key: "Exchange", label: "Trade-in Exchanges" },
                { key: "Returned", label: "Customer Returns" },
              ].map((item) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => setFilter(item.key)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === item.key
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[950px] text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Item(s) & Details</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 text-right font-medium">Payment Breakdown</th>
                    <th className="px-5 py-3 font-medium">Status</th>
                    <th className="px-5 py-3 text-right font-medium">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTransactions.map((t) => {
                    const p = phoneLabel(t.phone_id);
                    const isReturned = Boolean(t.return_info);
                    const tradeInPhone = t.trade_in
                      ? state.phones.find((ph) => ph.id === t.trade_in?.incoming_phone_id)
                      : null;
                    const isTradeInInInspection = tradeInPhone?.status === "In Inspection";
                    const pay = getTransactionPayment(t);

                    return (
                      <tr
                        key={t.id}
                        className="cursor-pointer hover:bg-secondary/40 transition-colors group"
                        onClick={() => setSelectedTx(t)}
                      >
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground text-xs">
                          {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-col gap-1 items-start">
                            <StatusBadge status={t.type} />
                            {t.trade_in && (
                              <span className="inline-flex items-center gap-1 rounded bg-purple-500/10 px-1.5 py-0.5 text-[10px] font-semibold text-purple-600 dark:text-purple-400">
                                <ArrowLeftRight className="size-2.5" /> Trade-in
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {t.items && t.items.length > 0 ? (
                              t.items.map((i, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${
                                    i.is_gift
                                      ? "bg-primary/10 text-primary font-semibold"
                                      : "bg-secondary text-foreground font-medium"
                                  }`}
                                >
                                  {i.is_gift ? "🎁 [Gift] " : ""}{i.quantity}x {i.name}
                                </span>
                              ))
                            ) : (
                              <p className="font-semibold text-foreground group-hover:text-primary transition-colors">
                                {p.model !== "—" ? `${p.model} (${p.imei})` : "Transaction item"}
                              </p>
                            )}
                          </div>

                          {/* Trade-in Info */}
                          {t.trade_in && (
                            <div className="text-[11px] text-muted-foreground mt-1 flex flex-wrap items-center gap-1.5">
                              <span className="font-medium text-foreground">Trade-in:</span>
                              <span>{t.trade_in.incoming_brand} {t.trade_in.incoming_model}</span>
                              <span className="font-mono text-[10px]">({t.trade_in.incoming_imei})</span>
                              <span className="text-purple-600 font-semibold">Valuation: <Taka value={t.trade_in.incoming_valuation} /></span>
                            </div>
                          )}

                          {/* Return Banner */}
                          {t.return_info && (
                            <div className="mt-1.5 inline-flex items-center gap-1.5 rounded-lg border border-rose-500/20 bg-rose-500/10 px-2 py-1 text-[11px] text-rose-700 dark:text-rose-300">
                              <RotateCcw className="size-3 text-rose-600 shrink-0" />
                              <span>
                                <strong>Returned:</strong> Net refund <Taka value={t.return_info.refund_amount} /> ({t.return_info.deduction_percentage}% ded.) &bull; Disposition: <strong>{t.return_info.disposition}</strong>
                              </span>
                            </div>
                          )}

                          <div className="flex flex-wrap items-center gap-2 mt-1">
                            {t.campaign_id && (
                              <Link
                                to="/campaigns/$campaignId"
                                params={{ campaignId: t.campaign_id }}
                                onClick={(e) => e.stopPropagation()}
                                className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary bg-primary/10 hover:bg-primary/20 px-2 py-0.5 rounded-md transition-colors"
                              >
                                🏷️ {state.campaigns.find((c) => c.id === t.campaign_id)?.name || "Campaign"}
                              </Link>
                            )}
                            {t.notes ? <span className="text-xs text-muted-foreground">{t.notes}</span> : null}
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <p className="font-medium text-foreground">{t.customer_name}</p>
                          <p className="font-mono text-xs text-muted-foreground">{t.customer_phone}</p>
                        </td>
                        <td className="px-5 py-4 text-right whitespace-nowrap">
                          <p className="font-bold text-foreground">
                            <Taka value={pay.total} />
                          </p>
                          {pay.hasDue ? (
                            <div className="text-[11px] text-muted-foreground mt-0.5">
                              <span>Paid: <Taka value={pay.paid} /></span>
                              <span className="mx-1">&bull;</span>
                              <span className="text-destructive font-semibold">Due: <Taka value={pay.due} /></span>
                            </div>
                          ) : (
                            <p className="text-[11px] text-success font-medium">Paid in Full</p>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={pay.status} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <div className="flex flex-wrap justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
                            {pay.hasDue && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-lg gap-1 text-emerald-600 border-emerald-500/30 hover:bg-emerald-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setCollectTx(t);
                                }}
                              >
                                <HandCoins className="size-3" /> Collect Due
                              </Button>
                            )}

                            {t.phone_id && !isReturned && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-lg gap-1 text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setReturnTx(t);
                                }}
                              >
                                <RotateCcw className="size-3" /> Return
                              </Button>
                            )}

                            {isTradeInInInspection && tradeInPhone && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs rounded-lg gap-1 text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setInspectPhone(tradeInPhone);
                                }}
                              >
                                <ShieldCheck className="size-3" /> Inspect Trade-In
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                        No transactions found.
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

