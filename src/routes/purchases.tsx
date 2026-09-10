import { createFileRoute, Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  CreditCard,
  HandCoins,
  PackageCheck,
  Plus,
  Receipt,
  Search,
  ShoppingCart,
  TrendingDown,
  Truck,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { RecordPurchaseDialog } from "@/components/fmm/RecordPurchaseDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getSupplierPhonesPaymentMap, useFmm } from "@/lib/fmm-store";
import { type Purchase } from "@/lib/fmm-types";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/purchases")({
  head: () => ({
    meta: [
      { title: "Purchases & Procurement — Faridpur Mobile Mart" },
      { name: "description", content: "Supplier purchase orders, inventory procurement history, phone and accessory invoices, and payment tracking." },
      { property: "og:title", content: "Purchases & Procurement — Faridpur Mobile Mart" },
      { property: "og:description", content: "Track stock procurement, supplier dues and purchase orders." },
    ],
  }),
  validateSearch: (s: Record<string, unknown>): { supplier?: string; filter?: string } => {
    const supplier = s["supplier"];
    const filter = s["filter"];
    const out: { supplier?: string; filter?: string } = {};
    if (typeof supplier === "string" && supplier) out.supplier = supplier;
    if (typeof filter === "string" && filter) out.filter = filter;
    return out;
  },
  component: PurchasesPage,
});

function PurchasesPage() {
  const { state, recordPurchasePayment } = useFmm();
  const searchParams = Route.useSearch();

  const [filter, setFilter] = useState(searchParams.filter ?? "All");
  const [supplierFilter, setSupplierFilter] = useState<string>(searchParams.supplier ?? "All");
  const [search, setSearch] = useState("");
  const [recordOpen, setRecordOpen] = useState(false);

  // Compute live paid & due amounts for phone-type purchase batches from per-phone payment ledger
  const augmentedPurchases = useMemo(() => {
    return (state.purchases ?? []).map((p) => {
      const isPhoneBatch = p.type === "Phone" || (p.phone_ids && p.phone_ids.length > 0);
      if (isPhoneBatch && p.supplier_id) {
        const pmap = getSupplierPhonesPaymentMap(state, p.supplier_id);
        if (p.phone_ids && p.phone_ids.length > 0) {
          let batchCost = 0;
          let batchPaid = 0;
          let batchDue = 0;
          p.phone_ids.forEach((id) => {
            const info = pmap.get(id);
            if (info) {
              batchCost += info.cost;
              batchPaid += info.paid;
              batchDue += info.due;
            } else {
              const ph = (state.phones ?? []).find((x) => x.id === id);
              if (ph) {
                batchCost += ph.purchase_price;
                batchDue += ph.purchase_price;
              }
            }
          });
          const totalSpend = (batchCost > 0 ? batchCost : p.total_amount) + (p.additional_cost || 0);
          const dueAmt = Math.max(0, totalSpend - batchPaid);
          const payStatus: "Paid" | "Due" | "Not Paid" = dueAmt === 0 ? "Paid" : batchPaid > 0 ? "Due" : "Not Paid";
          return {
            ...p,
            isPhoneBatch: true,
            computedTotal: totalSpend,
            computedPaid: batchPaid,
            computedDue: dueAmt,
            computedStatus: payStatus,
          };
        }
      }
      const totalSpend = p.total_amount + (p.additional_cost || 0);
      return {
        ...p,
        isPhoneBatch: false,
        computedTotal: totalSpend,
        computedPaid: p.paid_amount,
        computedDue: p.due_amount,
        computedStatus: p.payment_status,
      };
    });
  }, [state]);

  const stats = useMemo(() => {
    const list = augmentedPurchases;
    const totalSpend = list.reduce((s, p) => s + p.computedTotal, 0);
    const totalPaid = list.reduce((s, p) => s + p.computedPaid, 0);
    const totalDue = list.reduce((s, p) => s + p.computedDue, 0);
    return { count: list.length, totalSpend, totalPaid, totalDue };
  }, [augmentedPurchases]);

  const filteredPurchases = useMemo(() => {
    const q = search.trim().toLowerCase();
    return augmentedPurchases.filter((p) => {
      const matchSupplier = supplierFilter === "All" || p.supplier_id === supplierFilter;
      const matchFilter =
        filter === "All"
          ? true
          : filter === "Accessory"
            ? p.type === "Accessory"
            : filter === "Phone"
              ? p.type === "Phone" || (p.phone_ids && p.phone_ids.length > 0)
              : filter === "Mixed"
                ? p.type === "Mixed"
                : filter === "Paid"
                  ? p.computedStatus === "Paid"
                  : filter === "Due"
                    ? p.computedStatus === "Due" || p.computedStatus === "Not Paid"
                    : true;
      const sup = state.suppliers.find((s) => s.id === p.supplier_id);
      const matchSearch =
        !q ||
        (sup && sup.name.toLowerCase().includes(q)) ||
        (p.notes && p.notes.toLowerCase().includes(q)) ||
        p.id.toLowerCase().includes(q);
      return matchSupplier && matchFilter && matchSearch;
    });
  }, [augmentedPurchases, filter, search, supplierFilter, state.suppliers]);

  const activeSupplier = state.suppliers.find((s) => s.id === supplierFilter);

  const getSupplier = (id: string) => {
    return state.suppliers.find((s) => s.id === id);
  };

  const getCampaignName = (id?: string | null) => {
    if (!id) return null;
    return state.campaigns?.find((c) => c.id === id)?.name || null;
  };

  const handlePayDue = (p: typeof augmentedPurchases[number]) => {
    const amountStr = window.prompt(`Enter amount to pay towards accessory purchase due (${p.computedDue.toLocaleString()} ৳ remaining):`, String(p.computedDue));
    if (!amountStr) return;
    const amt = Number(amountStr);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid positive amount.");
      return;
    }
    recordPurchasePayment(p.id, Math.min(amt, p.computedDue), `Accessory purchase clearance`);
    toast.success(`Payment of ${amt.toLocaleString()} ৳ recorded.`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Procurement & Purchase Orders"
          subtitle="Inspect supplier inventory purchases, stock batches, and payment dues automatically recorded from stock operations."
          actions={
            <Button
              onClick={() => setRecordOpen(true)}
              className="rounded-xl text-xs gap-1.5 shadow-xs"
            >
              <Plus className="size-4" /> Record Purchase
            </Button>
          }
        />

        {/* Top Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL PURCHASES SPEND</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <ShoppingCart className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={stats.totalSpend} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Across {stats.count} purchase batches</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL PAID</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <PackageCheck className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold text-success"><Taka value={stats.totalPaid} /></p>
            <p className="mt-2 text-xs text-muted-foreground">Cleared to suppliers</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">PURCHASE INVOICE OUTSTANDING</span>
              <span className={`rounded-lg p-2 ${stats.totalDue > 0 ? "bg-danger-soft text-destructive" : "bg-secondary text-foreground"}`}>
                <AlertTriangle className="size-4" />
              </span>
            </div>
            <p className={`mt-4 text-3xl font-bold ${stats.totalDue > 0 ? "text-destructive" : "text-success"}`}>
              <Taka value={stats.totalDue} />
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Recorded invoice balance (for sold consignment payable, see Suppliers)</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">ACTIVE SUPPLIERS</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Truck className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">{state.suppliers?.length ?? 0}</p>
            <p className="mt-2 text-xs text-muted-foreground">Supplying stock & goods</p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {["All", "Accessory", "Phone", "Mixed", "Paid", "Due"].map((f) => (
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

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={supplierFilter}
              onChange={(e) => setSupplierFilter(e.target.value)}
              className="h-9 rounded-xl border border-border bg-card px-3 text-xs text-foreground"
            >
              <option value="All">All Suppliers</option>
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
            {supplierFilter !== "All" && (
              <button
                type="button"
                onClick={() => setSupplierFilter("All")}
                className="flex items-center gap-1 rounded-lg bg-secondary px-2.5 py-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
                title="Clear supplier filter"
              >
                <X className="size-3" /> Clear
              </button>
            )}
            <div className="relative w-full sm:w-60">
              <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search supplier, notes, ID…"
                className="pl-9 h-9 text-xs rounded-xl"
              />
            </div>
          </div>
        </div>

        {/* Purchases Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 font-medium">Type / Items</th>
                <th className="px-5 py-3 text-right font-medium">Total Cost</th>
                <th className="px-5 py-3 text-right font-medium">Paid</th>
                <th className="px-5 py-3 text-right font-medium">Due</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredPurchases.map((p) => {
                const sup = getSupplier(p.supplier_id);
                const cmp = getCampaignName(p.campaign_id);
                const itemsSummary =
                  p.items && p.items.length > 0
                    ? p.items.map((it) => `${it.quantity}x ${it.name}`).join(", ")
                    : p.phone_ids && p.phone_ids.length > 0
                    ? `${p.phone_ids.length} serialized phone(s)`
                    : "Stock batch";

                return (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      {sup ? (
                        <Link
                          to="/suppliers/$supplierId"
                          params={{ supplierId: p.supplier_id }}
                          className="font-semibold text-foreground hover:text-primary hover:underline transition-colors"
                        >
                          {sup.name}
                        </Link>
                      ) : (
                        <p className="font-semibold text-foreground">Supplier</p>
                      )}
                      <p className="text-xs text-muted-foreground">{sup?.contact || ""}</p>
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-1.5">
                        <StatusBadge status={p.type} className="text-[10px] py-0 px-2" />
                        {cmp ? <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium">🏷️ {cmp}</span> : null}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{itemsSummary}</p>
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground">
                      <Taka value={p.computedTotal} />
                    </td>
                    <td className="px-5 py-4 text-right text-success font-medium">
                      <Taka value={p.computedPaid} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.computedDue > 0 ? (
                        <span className="font-bold text-destructive"><Taka value={p.computedDue} /></span>
                      ) : (
                        <span className="text-xs text-success font-medium">0 ৳</span>
                      )}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={p.computedStatus} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      {p.isPhoneBatch ? (
                        p.computedDue > 0 ? (
                          <Link
                            to="/suppliers/$supplierId"
                            params={{ supplierId: p.supplier_id }}
                            className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                          >
                            Supplier Ledger →
                          </Link>
                        ) : (
                          <span className="text-xs text-success font-medium">Cleared</span>
                        )
                      ) : p.computedDue > 0 ? (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs gap-1 text-primary border-primary/40 hover:bg-primary/10"
                          onClick={() => handlePayDue(p)}
                        >
                          <HandCoins className="size-3.5" /> Pay Due
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Cleared</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    <p className="mb-3">No purchase records found{supplierFilter !== "All" && activeSupplier ? ` for ${activeSupplier.name}` : ""}.</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="rounded-xl text-xs gap-1.5"
                      onClick={() => setRecordOpen(true)}
                    >
                      <Plus className="size-3.5" /> Record Purchase
                    </Button>
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <RecordPurchaseDialog open={recordOpen} onOpenChange={setRecordOpen} />
    </AppShell>
  );
}

