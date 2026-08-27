import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, Layers } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { BulkAddPhonesDialog } from "@/components/fmm/BulkAddPhonesDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { daysInStock, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export const Route = createFileRoute("/suppliers/$supplierId")({
  head: () => ({
    meta: [
      { title: "Supplier Details — Faridpur Mobile Mart" },
      { name: "description", content: "Every phone ever purchased from this supplier, with prices, status and stock age." },
      { property: "og:title", content: "Supplier Details — Faridpur Mobile Mart" },
      { property: "og:description", content: "Full purchase history for a single stock supplier." },
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

  const supplier = state.suppliers.find((s) => s.id === supplierId);
  const all = state.phones.filter((p) => p.supplier_id === supplierId);
  const brands = ["All", ...new Set(all.map((p) => p.brand))];
  const rows = all.filter((p) => (status === "All" || p.status === status) && (brand === "All" || p.brand === brand));

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Link to="/suppliers" className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" /> Back to suppliers
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <PageHeader
            title={supplier?.name ?? "Supplier"}
            subtitle={supplier ? `${supplier.status} · ${supplier.contact}` : "Supplier not found."}
          />
          {supplier ? (
            <Button className="rounded-xl" onClick={() => setBulkOpen(true)}>
              <Layers className="mr-1 size-4" /> Bulk Add Phones
            </Button>
          ) : null}
        </div>

        {supplier ? (
          <BulkAddPhonesDialog
            open={bulkOpen}
            onOpenChange={setBulkOpen}
            supplierId={supplier.id}
            supplierName={supplier.name}
          />
        ) : null}

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
                {["IMEI", "Brand / Model", "Specs", "Cond.", "Price (Buy/Sell)", "Status", "Days"].map((h) => (
                  <th key={h} className="px-5 py-3 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => (
                <tr key={p.id}>
                  <td className="px-5 py-4">{p.imei}</td>
                  <td className="px-5 py-4 font-semibold">
                    {p.brand} {p.model}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{p.storage_ram}</td>
                  <td className="px-5 py-4 text-muted-foreground">{p.condition}</td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {<Taka value={p.purchase_price} />} / {p.selling_price ? <Taka value={p.selling_price} /> : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-4">{daysInStock(p.created_at)}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                    No phones from this supplier match the filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </AppShell>
  );
}
