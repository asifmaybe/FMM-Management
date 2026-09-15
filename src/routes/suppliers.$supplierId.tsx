import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, Check, HandCoins, Layers, Receipt, Search, ShoppingCart, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { BulkAddPhonesDialog } from "@/components/fmm/BulkAddPhonesDialog";
import { RecordSupplierPaymentDialog } from "@/components/fmm/RecordSupplierPaymentDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysInStock, getSupplierPhonesPaymentMap, supplierDueBalance, supplierTotalOwed, supplierTotalPaid, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import type { Phone } from "@/lib/fmm-types";

export const Route = createFileRoute("/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Details — Faridpur Mobile Mart" },
      { name: "description", content: "Every phone ever purchased from this supplier, with prices, status and stock age." },
      { property: "og:title", content: "Supplier Details — Faridpur Mobile Mart" },
      { property: "og:description", content: "Full purchase history and payment ledger for a single stock supplier." },
    ],
  }),
  component: SupplierDetailPage,
});

function SupplierDetailPage() {
  const { supplierId } = Route.useParams();
  const { state, recordSupplierPayment } = useFmm();
  const [status, setStatus] = useState("All");
  const [brand, setBrand] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const supplier = state.suppliers.find((s) => s.id === supplierId);
  const all = useMemo(() => state.phones.filter((p) => p.supplier_id === supplierId), [state.phones, supplierId]);
  const brands = useMemo(() => ["All", ...new Set(all.map((p) => p.brand))], [all]);

  const statusCounts = useMemo(() => {
    return {
      All: all.length,
      Available: all.filter((p) => p.status === "Available").length,
      Sold: all.filter((p) => p.status === "Sold").length,
      Exchange: all.filter((p) => p.status === "Exchange").length,
    };
  }, [all]);

  const rows = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const filtered = all.filter((p) => {
      if (status !== "All" && p.status !== status) return false;
      if (brand !== "All" && p.brand !== brand) return false;
      if (q) {
        const matchImei = p.imei.toLowerCase().includes(q) || (p.imei_secondary ? p.imei_secondary.toLowerCase().includes(q) : false);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchModel = p.model.toLowerCase().includes(q);
        const matchSpecs = (p.storage_ram || "").toLowerCase().includes(q);
        const matchNotes = (p.condition_notes || "").toLowerCase().includes(q);
        if (!matchImei && !matchBrand && !matchModel && !matchSpecs && !matchNotes) {
          return false;
        }
      }
      return true;
    });

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest":
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest":
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "brand-asc":
          return a.brand.localeCompare(b.brand) || a.model.localeCompare(b.model);
        case "brand-desc":
          return b.brand.localeCompare(a.brand) || b.model.localeCompare(a.model);
        case "price-desc":
          return b.purchase_price - a.purchase_price;
        case "price-asc":
          return a.purchase_price - b.purchase_price;
        case "days-desc":
          return daysInStock(b.created_at) - daysInStock(a.created_at);
        case "days-asc":
          return daysInStock(a.created_at) - daysInStock(b.created_at);
        default:
          return 0;
      }
    });
  }, [all, status, brand, searchQuery, sortBy]);

  const payments = (state.supplier_payments ?? []).filter((sp) => sp.supplier_id === supplierId);
  const due = supplier ? supplierDueBalance(state, supplier.id) : 0;
  const totalOwed = supplier ? supplierTotalOwed(state, supplier.id) : 0;
  const totalPaid = supplier ? supplierTotalPaid(state, supplier.id) : 0;

  const paymentStatusMap = useMemo(() => {
    return getSupplierPhonesPaymentMap(state, supplierId);
  }, [state, supplierId]);

  const handleMarkPhonePaid = (p: Phone, dueAmt: number) => {
    if (dueAmt <= 0) return;
    recordSupplierPayment({
      supplier_id: supplierId,
      phone_id: p.id,
      amount: dueAmt,
      date: new Date().toISOString(),
      notes: `${p.brand} ${p.model} (IMEI: …${p.imei.slice(-4)}) — Direct Settlement`,
    });
    toast.success(`Marked ${p.brand} ${p.model} as fully paid (${dueAmt.toLocaleString()} ৳)`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Link to="/suppliers" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to suppliers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={supplier?.name ?? "Supplier"}
            subtitle={supplier ? `${supplier.status} · ${supplier.contact || "No contact"} ${supplier.notes ? `· ${supplier.notes}` : ""}` : "Supplier not found."}
          />
          {supplier ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                to="/purchases"
                search={{ supplier: supplier.id }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 hover:bg-secondary px-3.5 py-2 text-xs font-semibold text-foreground transition-colors shadow-2xs"
              >
                <ShoppingCart className="size-3.5 text-primary" />
                View Purchases
              </Link>
              <Button
                variant={due > 0 ? "destructive" : "default"}
                className="rounded-xl gap-1.5 text-xs"
                onClick={() => setPayOpen(true)}
              >
                <HandCoins className="size-3.5" /> Record Payment
              </Button>
              <Button variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={() => setBulkOpen(true)}>
                <Layers className="size-3.5" /> Bulk Add Phones
              </Button>
            </div>
          ) : null}
        </div>

        {/* Due Balance & Financial Overview Cards */}
        {supplier ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-xl border p-4.5 ${due > 0 ? "border-destructive/40 bg-danger-soft/40" : "border-border bg-card"}`}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">CONSIGNMENT PAYABLE (SOLD STOCK)</p>
              <p className={`mt-2 text-2xl font-bold ${due > 0 ? "text-destructive" : "text-success"}`}>
                <Taka value={due} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {due > 0 ? "Owed for sold inventory under consignment terms" : "All sold consignment stock settled"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL CONSIGNMENT OWED</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                <Taka value={totalOwed} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">From {all.filter((p) => p.status === "Sold").length} sold units</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL PAID</p>
              <p className="mt-2 text-2xl font-bold text-success">
                <Taka value={totalPaid} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Across {payments.length} payment records</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">CURRENT INVENTORY</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {all.filter((p) => p.status === "Available").length}{" "}
                <span className="text-sm font-normal text-muted-foreground">/ {all.length} units</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Stock value: <Taka value={all.filter((p) => p.status === "Available").reduce((s, p) => s + p.purchase_price, 0)} />
              </p>
            </div>
          </div>
        ) : null}

        {supplier ? (
          <>
            <BulkAddPhonesDialog
              open={bulkOpen}
              onOpenChange={setBulkOpen}
              supplierId={supplier.id}
              supplierName={supplier.name}
            />
            <RecordSupplierPaymentDialog
              open={payOpen}
              onOpenChange={setPayOpen}
              supplierId={supplier.id}
            />
          </>
        ) : null}

        {/* Phones from this Supplier */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold">Supplied Devices</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {rows.length} {rows.length === 1 ? "device" : "devices"}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center justify-between gap-2.5">
          {/* Left side: Search bar & Sorting option */}
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search IMEI, model, specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-52 sm:w-64 rounded-lg pl-8 pr-7 text-xs bg-card"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground p-0.5 rounded"
                  aria-label="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="h-8 w-36 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="newest">Sort: Newest</option>
              <option value="oldest">Sort: Oldest</option>
              <option value="brand-asc">Brand: A → Z</option>
              <option value="brand-desc">Brand: Z → A</option>
              <option value="price-desc">Price: High → Low</option>
              <option value="price-asc">Price: Low → High</option>
              <option value="days-desc">Days: Most → Least</option>
              <option value="days-asc">Days: Least → Most</option>
            </select>
          </div>

          {/* Right side: Status and Brand filters */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1.5">
              {(["All", "Available", "Sold", "Exchange"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
                    status === s
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "border-border bg-card hover:bg-secondary text-foreground"
                  }`}
                >
                  <span>{s}</span>
                  <span
                    className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                      status === s
                        ? "bg-primary-foreground/20 text-primary-foreground"
                        : "bg-secondary text-muted-foreground"
                    }`}
                  >
                    {statusCounts[s]}
                  </span>
                </button>
              ))}
            </div>

            <select
              value={brand}
              onChange={(e) => setBrand(e.target.value)}
              className="h-8 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All brands" : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[920px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                {[
                  { label: "Date", className: "whitespace-nowrap min-w-[85px]" },
                  { label: "IMEI", className: "whitespace-nowrap min-w-[125px]" },
                  { label: "Brand / Model", className: "min-w-[210px]" },
                  { label: "Specs", className: "whitespace-nowrap min-w-[85px]" },
                  { label: "Price (Buy/Sell)", className: "text-right whitespace-nowrap min-w-[130px]" },
                  { label: "Status", className: "whitespace-nowrap min-w-[80px]" },
                  { label: "Payment", className: "whitespace-nowrap min-w-[100px]" },
                  { label: "Days", className: "text-right whitespace-nowrap min-w-[45px]" },
                  { label: "Action", className: "text-right whitespace-nowrap min-w-[80px]" },
                ].map((col) => (
                  <th key={col.label} className={`px-3 py-2.5 font-medium ${col.className}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const payInfo = paymentStatusMap.get(p.id);
                const payStatus = payInfo?.status ?? "Not Paid";
                const remainingDue = payInfo ? payInfo.due : p.purchase_price;
                return (
                  <tr key={p.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">{p.imei}</td>
                    <td className="px-3 py-2.5 font-semibold min-w-[210px] leading-snug">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span>{p.brand} {p.model}</span>
                        {p.with_box ? (
                          <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20" title="Includes original box">
                            <Box className="size-2.5" /> Box
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{p.storage_ram || "—"}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {<Taka value={p.purchase_price} />} / {p.selling_price ? <Taka value={p.selling_price} /> : "—"}
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <div className="flex flex-col gap-0.5">
                        <StatusBadge status={payStatus} />
                        {payInfo && payInfo.paid > 0 && payInfo.due > 0 ? (
                          <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                            Paid: {payInfo.paid.toLocaleString()} ৳ · Due: {payInfo.due.toLocaleString()} ৳
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">{daysInStock(p.created_at)}</td>
                    <td className="px-3 py-2.5 text-right whitespace-nowrap">
                      {payStatus === "Paid" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                          <Check className="size-3.5" /> Paid
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-7 px-2.5 text-xs rounded-lg gap-1 border-primary/40 text-primary hover:bg-primary/10"
                          onClick={() => handleMarkPhonePaid(p, remainingDue)}
                        >
                          <HandCoins className="size-3" /> Mark Paid
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                    {searchQuery
                      ? `No phones match "${searchQuery}".`
                      : "No phones from this supplier match the filters."}
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Payment History Section */}
        <div className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Receipt className="size-4 text-muted-foreground" />
              <h3 className="text-base font-semibold">Supplier Payment History</h3>
            </div>
            {supplier ? (
              <Button size="sm" variant="outline" className="rounded-lg gap-1.5" onClick={() => setPayOpen(true)}>
                <HandCoins className="size-3.5" /> Record Payment
              </Button>
            ) : null}
          </div>

          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full text-sm">
              <thead className="bg-secondary/60 text-left text-muted-foreground">
                <tr>
                  <th className="px-5 py-3 font-medium">Payment Date</th>
                  <th className="px-5 py-3 font-medium">Payment Method / Notes</th>
                  <th className="px-5 py-3 text-right font-medium">Amount Paid</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {payments.map((sp) => (
                  <tr key={sp.id}>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(sp.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4">
                      {sp.notes || <span className="text-muted-foreground italic">No notes</span>}
                    </td>
                    <td className="px-5 py-4 text-right font-semibold text-success whitespace-nowrap">
                      <Taka value={sp.amount} />
                    </td>
                  </tr>
                ))}
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-5 py-8 text-center text-muted-foreground">
                      No payments recorded yet for this supplier. Click "Record Payment" to log a payment.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
