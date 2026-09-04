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
  ShoppingCart,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { RecordWarrantyDialog } from "@/components/fmm/RecordWarrantyDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";
import type { WarrantyStatus } from "@/lib/fmm-types";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Sales, Exchanges & Services — Faridpur Mobile Mart" },
      { name: "description", content: "Record sales and exchanges, track warranty claims, customer returns, and collect outstanding balances." },
      { property: "og:title", content: "Sales, Exchanges & Services — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage phone and accessory sales, trade-in exchanges, warranty claims and customer returns." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { state, collectPayment, updateWarrantyClaim } = useFmm();

  const [viewTab, setViewTab] = useState<"sales" | "exchanges" | "warranty">("sales");
  const [filter, setFilter] = useState("All");
  const [search, setSearch] = useState("");
  const [warrantyOpen, setWarrantyOpen] = useState(false);

  const stats = useMemo(() => {
    const list = state.transactions ?? [];
    const total = list.reduce((s, t) => s + t.amount, 0);
    const paid = list.filter((t) => t.payment_status === "Paid").reduce((s, t) => s + t.amount, 0);
    const pendingList = list.filter((t) => t.payment_status === "Pending");
    const outstanding = pendingList.reduce((s, t) => s + (t.due_amount ?? t.amount), 0);

    const todayStr = new Date().toDateString();
    const todayList = list.filter((t) => new Date(t.date).toDateString() === todayStr);
    const todayTotal = todayList.reduce((s, t) => s + t.amount, 0);

    return { total, paid, outstanding, pendingCount: pendingList.length, todayTotal };
  }, [state.transactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.transactions ?? []).filter((t) => {
      const matchFilter =
        filter === "All" ||
        t.type === filter ||
        t.payment_status === filter;

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
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">PAID IN FULL</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <TrendingUp className="size-4" />
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
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TRADE-IN EXCHANGES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <ArrowLeftRight className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">{state.exchanges?.length ?? 0} <span className="text-sm font-normal text-muted-foreground">records</span></p>
            <p className="mt-2 text-xs text-muted-foreground">{state.warranty_claims?.length ?? 0} warranty claims logged</p>
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
              {["All", "Sale", "Exchange", "Paid", "Pending"].map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                    filter === f
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  {f === "All" ? "All Orders" : f}
                </button>
              ))}
            </div>

            <div className="overflow-x-auto rounded-xl border border-border bg-card">
              <table className="w-full min-w-[850px] text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Type</th>
                    <th className="px-5 py-3 font-medium">Item(s) Description</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 font-medium">Payment Status</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredTransactions.map((t) => {
                    const p = phoneLabel(t.phone_id);
                    const itemsStr =
                      t.items && t.items.length > 0
                        ? t.items.map((i) => `${i.quantity}x ${i.name}`).join(", ")
                        : p.model !== "—"
                        ? `${p.model} (${p.imei})`
                        : "Transaction item";

                    return (
                      <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                          {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={t.type} />
                        </td>
                        <td className="px-5 py-4">
                          <div className="flex flex-wrap items-center gap-1.5 mb-1">
                            {t.items && t.items.length > 0 ? (
                              t.items.map((i, idx) => (
                                <span
                                  key={idx}
                                  className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${
                                    i.is_gift ? "bg-primary/10 text-primary font-semibold" : "font-semibold text-foreground"
                                  }`}
                                >
                                  {i.is_gift ? "🎁 [Gift] " : ""}{i.quantity}x {i.name}
                                </span>
                              ))
                            ) : (
                              <p className="font-semibold text-foreground">{itemsStr}</p>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 mt-0.5">
                            {t.campaign_id && (
                              <Link
                                to="/campaigns/$campaignId"
                                params={{ campaignId: t.campaign_id }}
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
                        <td className="px-5 py-4 text-right font-bold text-foreground whitespace-nowrap">
                          <Taka value={t.amount} />
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={t.payment_status === "Pending" ? "Payment Pending" : "Paid"} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          {t.payment_status === "Pending" ? (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 rounded-lg text-xs gap-1 text-primary border-primary/40 hover:bg-primary/10"
                              onClick={() => handleCollect(t.id, t.customer_name)}
                            >
                              <HandCoins className="size-3.5" /> Collect
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">Paid</span>
                          )}
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
              <table className="w-full min-w-[900px] text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Outgoing Phone (FMM Sold)</th>
                    <th className="px-5 py-3 font-medium">Incoming Phone (Customer Trade-in)</th>
                    <th className="px-5 py-3 text-right font-medium">Incoming Valuation</th>
                    <th className="px-5 py-3 text-right font-medium">Customer Paid (+৳)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredExchanges.map((exc) => {
                    const outPh = state.phones.find((p) => p.id === exc.outgoing_phone_id);
                    const inPh = state.phones.find((p) => p.id === exc.incoming_phone_id);
                    return (
                      <tr key={exc.id} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
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
                              <p className="text-xs text-muted-foreground mt-0.5">Price: <Taka value={exc.outgoing_value} /></p>
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
                        <td className="px-5 py-4 text-right font-medium text-foreground">
                          <Taka value={exc.incoming_valuation} />
                        </td>
                        <td className="px-5 py-4 text-right font-bold text-success">
                          +<Taka value={exc.additional_paid} />
                        </td>
                      </tr>
                    );
                  })}
                  {filteredExchanges.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-12 text-center text-muted-foreground">
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
    </AppShell>
  );
}

