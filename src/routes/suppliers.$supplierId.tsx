import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Box, Check, FileText, HandCoins, Layers, Package, Receipt, RotateCcw, Search, ShoppingCart, Smartphone, Trash2, X } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { BulkAddPhonesDialog } from "@/components/fmm/BulkAddPhonesDialog";
import { RecordSupplierPaymentDialog } from "@/components/fmm/RecordSupplierPaymentDialog";
import { SupplierReportPdfDialog } from "@/components/fmm/SupplierReportPdfDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  accessorySupplierDueBalance,
  accessorySupplierTotalInvoiced,
  accessorySupplierTotalPaid,
  daysInStock,
  getSupplierPhonesPaymentMap,
  supplierDueBalance,
  supplierTotalOwed,
  supplierTotalPaid,
  useFmm,
} from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import { formatStorageRam } from "@/lib/utils";
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
  const { state, recordSupplierPayment, deletePhone, undoSupplierPhonePayment } = useFmm();
  const [status, setStatus] = useState("All");
  const [brand, setBrand] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState("newest");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [reportOpen, setReportOpen] = useState(false);
  const [phoneToDelete, setPhoneToDelete] = useState<Phone | null>(null);

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
        const matchSerial = (p.serial_number || "").toLowerCase().includes(q);
        const matchBrand = p.brand.toLowerCase().includes(q);
        const matchModel = p.model.toLowerCase().includes(q);
        const matchSpecs = (p.storage_ram || "").toLowerCase().includes(q);
        const matchNotes = (p.condition_notes || "").toLowerCase().includes(q);
        if (!matchImei && !matchSerial && !matchBrand && !matchModel && !matchSpecs && !matchNotes) {
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
  const isAccessory = supplier?.supplier_type === "Accessory";

  // Phone supplier accounting
  const due = supplier && !isAccessory ? supplierDueBalance(state, supplier.id) : 0;
  const totalOwed = supplier && !isAccessory ? supplierTotalOwed(state, supplier.id) : 0;
  const totalPaid = supplier && !isAccessory ? supplierTotalPaid(state, supplier.id) : 0;

  // Monthly focused boundaries
  const { startOfMonth, endOfMonth } = useMemo(() => {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
    return { startOfMonth: start, endOfMonth: end };
  }, []);

  // Map of phone_id -> sale date from transactions
  const phoneSaleDateMap = useMemo(() => {
    const map = new Map<string, Date>();
    for (const t of state.transactions ?? []) {
      const d = new Date(t.date);
      if (t.phone_id) map.set(t.phone_id, d);
      if (t.items) {
        for (const it of t.items) {
          if (it.type === "phone" && it.id) map.set(it.id, d);
        }
      }
    }
    return map;
  }, [state.transactions]);

  const getPhoneSaleDate = (p: Phone): Date => {
    if (p.sold_date) return new Date(p.sold_date);
    return phoneSaleDateMap.get(p.id) ?? new Date(p.updated_at || p.created_at);
  };

  // Phones sold this month (including restocked units with active supplier liability)
  const monthSoldPhones = useMemo(() => {
    return all.filter((p) => {
      const isSoldOrExchange = p.status === "Sold" || p.status === "Exchange";
      const isRestockedWithDue =
        p.status === "Available" &&
        p.source_type === "Supplier Purchase" &&
        (state.returns ?? []).some((r) => r.phone_id === p.id && r.disposition === "Restocked");
      if (!isSoldOrExchange && !isRestockedWithDue) return false;
      const d = getPhoneSaleDate(p);
      return d >= startOfMonth && d < endOfMonth;
    });
  }, [all, phoneSaleDateMap, startOfMonth, endOfMonth, state.returns]);

  const monthConsignmentOwed = useMemo(() => {
    return monthSoldPhones.reduce((sum, p) => sum + (p.original_purchase_price ?? p.purchase_price), 0);
  }, [monthSoldPhones]);

  // Payments made this month
  const monthPayments = useMemo(() => {
    return payments.filter((sp) => {
      const d = new Date(sp.date);
      return d >= startOfMonth && d < endOfMonth;
    });
  }, [payments, startOfMonth, endOfMonth]);

  const monthTotalPaid = useMemo(() => {
    return monthPayments.reduce((sum, sp) => sum + sp.amount, 0);
  }, [monthPayments]);

  // Inventory analysis: available now vs available on 1st day of month
  const availablePhones = useMemo(() => all.filter((p) => p.status === "Available"), [all]);
  const availableStockValue = useMemo(() => availablePhones.reduce((s, p) => s + p.purchase_price, 0), [availablePhones]);

  // Phones available on 1st of the month: created before startOfMonth, and not sold before startOfMonth
  const openingAvailablePhones = useMemo(() => {
    return all.filter((p) => {
      const created = new Date(p.created_at);
      if (created >= startOfMonth) return false;
      if (p.status === "Available") return true;
      const saleDate = getPhoneSaleDate(p);
      return saleDate >= startOfMonth;
    });
  }, [all, phoneSaleDateMap, startOfMonth]);

  const phonesAddedThisMonth = useMemo(() => {
    return all.filter((p) => new Date(p.created_at) >= startOfMonth);
  }, [all, startOfMonth]);

  const monthStockPoolCount = openingAvailablePhones.length + phonesAddedThisMonth.length;

  // Accessory supplier accounting
  const accDue = supplier && isAccessory ? accessorySupplierDueBalance(state, supplier.id) : 0;
  const accTotalInvoiced = supplier && isAccessory ? accessorySupplierTotalInvoiced(state, supplier.id) : 0;
  const accTotalPaid = supplier && isAccessory ? accessorySupplierTotalPaid(state, supplier.id) : 0;

  // The "due" value used for the Record Payment button badge
  const effectiveDue = isAccessory ? accDue : due;

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

  const handleUndoPhonePaid = (p: Phone) => {
    undoSupplierPhonePayment(p.id);
    toast.success(`Payment undone for ${p.brand} ${p.model}`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] w-full min-w-0 px-4 sm:px-6 py-8">
        <Link to="/suppliers" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to suppliers
        </Link>
        <PageHeader
          title={supplier?.name ?? "Supplier"}
          subtitle={
            supplier ? (
              <span className="flex flex-wrap items-center gap-2">
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
                  supplier.supplier_type === "Phone"
                    ? "bg-primary/10 text-primary"
                    : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  {supplier.supplier_type === "Phone" ? <Smartphone className="size-3" /> : <Package className="size-3" />}
                  {supplier.supplier_type} Supplier
                </span>
                <span className="text-muted-foreground">{supplier.status} · {supplier.contact || "No contact"}{supplier.notes ? ` · ${supplier.notes}` : ""}</span>
              </span>
            ) : "Supplier not found."
          }
          actions={
            supplier ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-semibold shadow-2xs"
                  asChild
                >
                  <Link to="/purchases" search={{ supplier: supplier.id }}>
                    <ShoppingCart className="size-3.5 text-muted-foreground" />
                    View Purchases
                  </Link>
                </Button>
                {supplier.supplier_type === "Phone" && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl gap-1.5 text-xs font-semibold shadow-2xs"
                    onClick={() => setBulkOpen(true)}
                  >
                    <Layers className="size-3.5 text-muted-foreground" />
                    Bulk Add Phones
                  </Button>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-semibold shadow-2xs"
                  onClick={() => setReportOpen(true)}
                >
                  <FileText className="size-3.5 text-muted-foreground" />
                  Generate Report
                </Button>
                <Button
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-semibold shadow-xs"
                  onClick={() => setPayOpen(true)}
                >
                  <HandCoins className="size-3.5" />
                  Record Payment
                  {effectiveDue > 0 ? (
                    <span className="ml-1 rounded-md bg-rose-500/20 px-1.5 py-0.5 text-[10px] font-bold text-rose-300">
                      Due
                    </span>
                  ) : null}
                </Button>
              </div>
            ) : null
          }
        />

        {/* Due Balance & Financial Overview Cards */}
        {supplier && isAccessory ? (
          /* ── Accessory Supplier KPI Cards ── */
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl border p-4 min-w-0 ${accDue > 0 ? "border-destructive/40 bg-danger-soft/40" : "border-border bg-card"}`}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="OUTSTANDING BALANCE">OUTSTANDING BALANCE</p>
              <p className={`mt-2 text-2xl font-bold ${accDue > 0 ? "text-destructive" : "text-success"}`}>
                <Taka value={accDue} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {accDue > 0 ? "Unpaid accessory purchase invoices" : "All invoices fully settled"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="TOTAL INVOICED">TOTAL INVOICED</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                <Taka value={accTotalInvoiced} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                From {(state.purchases ?? []).filter((p) => p.supplier_id === supplierId && (p.type === "Accessory" || p.type === "Mixed")).length} purchase invoice(s)
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="TOTAL PAID">TOTAL PAID</p>
              <p className="mt-2 text-2xl font-bold text-success">
                <Taka value={accTotalPaid} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">Across {payments.length} payment record(s)</p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="LINKED ACCESSORIES">LINKED ACCESSORIES</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {(state.accessories ?? []).filter((a) => a.supplier_id === supplierId).length}{" "}
                <span className="text-sm font-normal text-muted-foreground">items</span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                Total stock: {(state.accessories ?? []).filter((a) => a.supplier_id === supplierId).reduce((s, a) => s + a.quantity, 0)} units
              </p>
            </div>
          </div>
        ) : supplier ? (
          /* ── Phone Supplier KPI Cards (Monthly Focused) ── */
          <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <div className={`rounded-xl border p-4 min-w-0 ${due > 0 ? "border-destructive/40 bg-danger-soft/40" : "border-border bg-card"}`}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="CURRENT DUE">CURRENT DUE</p>
              <p className={`mt-2 text-2xl font-bold ${due > 0 ? "text-destructive" : "text-success"}`}>
                <Taka value={due} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate" title={due > 0 ? "Owed for sold consignment phones" : "All sold consignment stock settled"}>
                {due > 0 ? "Owed for sold consignment phones" : "All sold consignment stock settled"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="TOTAL CONSIGNMENT OWED This Month">TOTAL CONSIGNMENT OWED This Month</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                <Taka value={monthConsignmentOwed} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                From {monthSoldPhones.length} sold unit(s) this month
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="TOTAL PAID This Month">TOTAL PAID This Month</p>
              <p className="mt-2 text-2xl font-bold text-success">
                <Taka value={monthTotalPaid} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate">
                {monthPayments.length} payment(s) this month · All-time: <Taka value={totalPaid} />
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4 min-w-0">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="CURRENT INVENTORY">CURRENT INVENTORY</p>
              <p className="mt-2 text-2xl font-bold text-foreground">
                {availablePhones.length}{" "}
                <span className="text-sm font-normal text-muted-foreground">
                  / {monthStockPoolCount > 0 ? monthStockPoolCount : availablePhones.length} units
                </span>
              </p>
              <p className="mt-1 text-xs text-muted-foreground truncate" title={`Stock value: ৳ ${availableStockValue.toLocaleString()} · 1st of month: ${openingAvailablePhones.length} units`}>
                Stock value: <Taka value={availableStockValue} /> · 1st of month: {openingAvailablePhones.length} units
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
            <SupplierReportPdfDialog
              open={reportOpen}
              onOpenChange={setReportOpen}
              supplier={supplier}
              mode={supplier.supplier_type === "Accessory" ? "accessory" : "phone"}
            />
          </>
        ) : null}

        <AlertDialog open={!!phoneToDelete} onOpenChange={(open) => { if (!open) setPhoneToDelete(null); }}>
          <AlertDialogContent className="max-w-md rounded-2xl border-border bg-card p-6 shadow-xl">
            <AlertDialogHeader className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-destructive/10 text-destructive">
                  <Trash2 className="size-5" />
                </div>
                <div>
                  <AlertDialogTitle className="text-lg font-semibold text-foreground">
                    Delete Phone from Inventory?
                  </AlertDialogTitle>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Are you sure you want to delete it?
                  </p>
                </div>
              </div>
              <AlertDialogDescription className="text-sm text-muted-foreground">
                Are you sure you want to delete this phone? It will be permanently removed from inventory, and all stock counts and supplier balance calculations will be synchronized.
              </AlertDialogDescription>
            </AlertDialogHeader>

            {phoneToDelete && (
              <div className="my-2 rounded-xl border border-border/80 bg-secondary/30 p-3.5 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Device:</span>
                  <span className="font-semibold text-foreground">{phoneToDelete.brand} {phoneToDelete.model}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">IMEI:</span>
                  <span className="font-mono font-medium text-foreground">{phoneToDelete.imei}</span>
                </div>
                {phoneToDelete.serial_number ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Serial Number:</span>
                    <span className="font-mono font-medium text-foreground">{phoneToDelete.serial_number}</span>
                  </div>
                ) : null}
                {phoneToDelete.cycle_count != null ? (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Cycle Count:</span>
                    <span className="text-foreground">{phoneToDelete.cycle_count} cycles</span>
                  </div>
                ) : null}
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Purchase Cost:</span>
                  <span className="font-semibold text-foreground"><Taka value={phoneToDelete.purchase_price} /></span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Status:</span>
                  <StatusBadge status={phoneToDelete.status} />
                </div>
              </div>
            )}

            <AlertDialogFooter className="mt-4 flex items-center justify-end gap-2 sm:space-x-0">
              <AlertDialogCancel className="rounded-xl text-xs font-medium">
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction
                className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90 text-xs font-semibold gap-1.5 shadow-sm"
                onClick={() => {
                  if (phoneToDelete) {
                    deletePhone(phoneToDelete.id);
                    toast.success(`Deleted ${phoneToDelete.brand} ${phoneToDelete.model} (IMEI: …${phoneToDelete.imei.slice(-4)})`);
                    setPhoneToDelete(null);
                  }
                }}
              >
                <Trash2 className="size-3.5" />
                Delete Phone
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Conditional content: phones table for Phone suppliers, accessories table for Accessory suppliers */}
        {supplier?.supplier_type === "Accessory" ? (
          <AccessorySupplierContent supplierId={supplierId} state={state} />
        ) : (
          <>
        {/* Phones from this Supplier */}
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <h3 className="text-base font-semibold">Supplied Devices</h3>
            <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
              {rows.length} {rows.length === 1 ? "device" : "devices"}
            </span>
          </div>
        </div>

        <div className="mb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3 min-w-0">
          {/* Left side: Search bar & Sorting option */}
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search IMEI, model, specs..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-8 w-48 sm:w-60 rounded-lg pl-8 pr-7 text-xs bg-card"
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
              className="h-8 w-32 sm:w-36 rounded-lg border border-border bg-card px-2 text-xs font-medium text-foreground cursor-pointer focus:outline-none focus:ring-1 focus:ring-ring"
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
          <div className="flex flex-wrap items-center gap-2 min-w-0">
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full pb-0.5">
              {(["All", "Available", "Sold", "Exchange"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setStatus(s)}
                  className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-colors ${
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
              className="h-8 shrink-0 rounded-lg border border-border bg-card px-2.5 text-xs font-medium text-foreground cursor-pointer"
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === "All" ? "All brands" : b}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-card">
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
                  { label: "Action", className: "text-right whitespace-nowrap min-w-[140px]" },
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
                    <td className="px-3 py-2.5 font-mono whitespace-nowrap">
                      <div>{p.imei}</div>
                      {p.serial_number ? <div className="text-[11px] text-muted-foreground font-sans">SN: {p.serial_number}</div> : null}
                    </td>
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
                    <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatStorageRam(p.brand, p.storage_ram)}</td>
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
                      <div className="inline-flex items-center justify-end gap-1.5">
                        {payStatus === "Paid" ? (
                          <>
                            <span className="inline-flex items-center gap-1 text-xs text-success font-medium">
                              <Check className="size-3.5" /> Paid
                            </span>
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-xs rounded-lg gap-1 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                              title={`Undo payment for ${p.brand} ${p.model}`}
                              onClick={() => handleUndoPhonePaid(p)}
                            >
                              <RotateCcw className="size-3" /> Undo
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-7 px-2.5 text-xs rounded-lg gap-1 border-primary/40 text-primary hover:bg-primary/10"
                              onClick={() => handleMarkPhonePaid(p, remainingDue)}
                            >
                              <HandCoins className="size-3" /> Mark Paid
                            </Button>
                            {payInfo && payInfo.paid > 0 ? (
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 px-2 text-xs rounded-lg gap-1 text-muted-foreground hover:text-amber-600 hover:bg-amber-500/10 transition-colors"
                                title={`Undo partial payment for ${p.brand} ${p.model}`}
                                onClick={() => handleUndoPhonePaid(p)}
                              >
                                <RotateCcw className="size-3" /> Undo
                              </Button>
                            ) : null}
                          </>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 w-7 p-0 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                          title={`Delete ${p.brand} ${p.model}`}
                          onClick={() => setPhoneToDelete(p)}
                        >
                          <Trash2 className="size-3.5" />
                          <span className="sr-only">Delete</span>
                        </Button>
                      </div>
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
          </>
        )}

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

          <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-card">
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

function AccessorySupplierContent({
  supplierId,
  state,
}: {
  supplierId: string;
  state: Parameters<typeof supplierDueBalance>[0];
}) {
  const accessories = useMemo(
    () => (state.accessories ?? []).filter((a) => a.supplier_id === supplierId),
    [state.accessories, supplierId],
  );
  const totalUnits = accessories.reduce((sum, a) => sum + (a.quantity ?? 0), 0);
  const totalValue = accessories.reduce((sum, a) => sum + (a.purchase_price ?? 0) * (a.quantity ?? 0), 0);
  const payments = (state.supplier_payments ?? []).filter((sp) => sp.supplier_id === supplierId);
  const totalPaid = payments.reduce((s, p) => s + p.amount, 0);

  return (
    <>
      {/* Accessory Financial Overview */}
      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl border border-border bg-card p-4 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="LINKED ACCESSORIES">LINKED ACCESSORIES</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {accessories.length}{" "}
            <span className="text-sm font-normal text-muted-foreground">items</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {[...new Set(accessories.map((a) => a.category))].join(", ") || "No categories"}
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="CURRENT STOCK UNITS">CURRENT STOCK UNITS</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            {totalUnits}{" "}
            <span className="text-sm font-normal text-muted-foreground">units</span>
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">
            {accessories.filter((a) => a.quantity <= a.min_threshold).length} items below threshold
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="TOTAL STOCK VALUE">TOTAL STOCK VALUE</p>
          <p className="mt-2 text-2xl font-bold text-foreground">
            <Taka value={totalValue} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">At purchase price</p>
        </div>

        <div className="rounded-xl border border-border bg-card p-4 min-w-0">
          <p className="text-xs font-semibold tracking-wide text-muted-foreground truncate" title="TOTAL PAID">TOTAL PAID</p>
          <p className="mt-2 text-2xl font-bold text-success">
            <Taka value={totalPaid} />
          </p>
          <p className="mt-1 text-xs text-muted-foreground truncate">Across {payments.length} payment records</p>
        </div>
      </div>

      {/* Accessories Table */}
      <div className="mb-3 flex items-center gap-3">
        <h3 className="text-base font-semibold">Supplied Accessories</h3>
        <span className="rounded-full bg-secondary px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {accessories.length} {accessories.length === 1 ? "item" : "items"}
        </span>
      </div>

      <div className="w-full max-w-full overflow-x-auto rounded-xl border border-border bg-card">
        <table className="w-full min-w-[700px] text-sm">
          <thead className="bg-secondary/60 text-left text-muted-foreground">
            <tr>
              {[
                { label: "Name / Brand", className: "min-w-[180px]" },
                { label: "Category", className: "whitespace-nowrap" },
                { label: "SKU / Variant", className: "" },
                { label: "Qty", className: "text-right whitespace-nowrap" },
                { label: "Buy Price", className: "text-right whitespace-nowrap" },
                { label: "Sell Price", className: "text-right whitespace-nowrap" },
                { label: "Stock Value", className: "text-right whitespace-nowrap" },
                { label: "Status", className: "whitespace-nowrap" },
              ].map((col) => (
                <th key={col.label} className={`px-3 py-2.5 font-medium ${col.className}`}>
                  {col.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {accessories.map((a) => {
              const stockValue = (a.purchase_price ?? 0) * (a.quantity ?? 0);
              const isLow = a.quantity <= a.min_threshold;
              return (
                <tr key={a.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-3 py-2.5 font-semibold">
                    <div>{a.name}</div>
                    <div className="text-xs font-normal text-muted-foreground">{a.brand}</div>
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground">{a.category}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">
                    <div>{a.model_sku || "—"}</div>
                    {a.variant ? <div className="text-xs">{a.variant}</div> : null}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold">
                    <span className={isLow ? "text-destructive" : ""}>{a.quantity}</span>
                    {isLow ? (
                      <div className="text-[10px] text-destructive font-normal">Low stock</div>
                    ) : null}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {a.purchase_price ? <Taka value={a.purchase_price} /> : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">
                    {a.selling_price ? <Taka value={a.selling_price} /> : "—"}
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-semibold">
                    <Taka value={stockValue} />
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                        isLow
                          ? "bg-destructive/10 text-destructive"
                          : "bg-success/10 text-success"
                      }`}
                    >
                      {isLow ? "Low Stock" : "In Stock"}
                    </span>
                  </td>
                </tr>
              );
            })}
            {accessories.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                  No accessories linked to this supplier yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </>
  );
}
