import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, HandCoins, Layers, Receipt } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { BulkAddPhonesDialog } from "@/components/fmm/BulkAddPhonesDialog";
import { RecordSupplierPaymentDialog } from "@/components/fmm/RecordSupplierPaymentDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { daysInStock, getSupplierPhonesPaymentMap, supplierDueBalance, supplierTotalOwed, supplierTotalPaid, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

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
  const { state } = useFmm();
  const [status, setStatus] = useState("All");
  const [brand, setBrand] = useState("All");
  const [bulkOpen, setBulkOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);

  const supplier = state.suppliers.find((s) => s.id === supplierId);
  const all = state.phones.filter((p) => p.supplier_id === supplierId);
  const brands = ["All", ...new Set(all.map((p) => p.brand))];
  const rows = all.filter((p) => (status === "All" || p.status === status) && (brand === "All" || p.brand === brand));

  const payments = (state.supplier_payments ?? []).filter((sp) => sp.supplier_id === supplierId);
  const due = supplier ? supplierDueBalance(state, supplier.id) : 0;
  const totalOwed = supplier ? supplierTotalOwed(state, supplier.id) : 0;
  const totalPaid = supplier ? supplierTotalPaid(state, supplier.id) : 0;

  const paymentStatusMap = useMemo(() => {
    return getSupplierPhonesPaymentMap(state, supplierId);
  }, [state, supplierId]);

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
              <Button
                variant={due > 0 ? "destructive" : "default"}
                className="rounded-xl gap-1.5"
                onClick={() => setPayOpen(true)}
              >
                <HandCoins className="size-4" /> Record Payment
              </Button>
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => setBulkOpen(true)}>
                <Layers className="size-4" /> Bulk Add Phones
              </Button>
            </div>
          ) : null}
        </div>

        {/* Due Balance & Financial Overview Cards */}
        {supplier ? (
          <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className={`rounded-xl border p-4.5 ${due > 0 ? "border-destructive/40 bg-danger-soft/40" : "border-border bg-card"}`}>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">DUE TO SUPPLIER</p>
              <p className={`mt-2 text-2xl font-bold ${due > 0 ? "text-destructive" : "text-success"}`}>
                <Taka value={due} />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {due > 0 ? "Outstanding balance owed" : "All sold stock cleared"}
              </p>
            </div>

            <div className="rounded-xl border border-border bg-card p-4.5">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL EVER OWED</p>
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
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-semibold">Supplied Devices</h3>
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {["All", "Available", "Sold", "Exchange", "Payment Pending"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`rounded-lg border border-border px-3 py-1.5 text-xs font-medium ${status === s ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}
            >
              {s}
            </button>
          ))}
          <select
            value={brand}
            onChange={(e) => setBrand(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
          >
            {brands.map((b) => (
              <option key={b} value={b}>
                {b === "All" ? "All brands" : b}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[800px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                {["Date", "IMEI", "Brand / Model", "Specs", "Price (Buy/Sell)", "Status", "Payment", "Days"].map((h) => (
                  <th key={h} className={`px-5 py-3 font-medium ${h === "Days" || h.startsWith("Price") ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const payInfo = paymentStatusMap.get(p.id);
                const payStatus = payInfo?.status ?? "Not Paid";
                return (
                  <tr key={p.id}>
                    <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                      {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                    </td>
                    <td className="px-5 py-4 font-mono">{p.imei}</td>
                    <td className="px-5 py-4 font-semibold">
                      {p.brand} {p.model}
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{p.storage_ram}</td>
                    <td className="px-5 py-4 text-right whitespace-nowrap">
                      {<Taka value={p.purchase_price} />} / {p.selling_price ? <Taka value={p.selling_price} /> : "—"}
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={p.status} />
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={payStatus} />
                    </td>
                    <td className="px-5 py-4 text-right">{daysInStock(p.created_at)}</td>
                  </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-10 text-center text-muted-foreground">
                    No phones from this supplier match the filters.
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
