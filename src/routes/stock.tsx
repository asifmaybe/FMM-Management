import { createFileRoute } from "@tanstack/react-router";
import { ArrowLeftRight, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { AddPhoneDialog } from "@/components/fmm/AddPhoneDialog";
import { ExchangePhoneDialog } from "@/components/fmm/ExchangePhoneDialog";
import { PhoneDetailDialog } from "@/components/fmm/PhoneDetailDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysInStock, supplierName, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Inventory Stock — Faridpur Mobile Mart" },
      { name: "description", content: "Track every phone in stock by IMEI, brand, condition, supplier, price and days in stock." },
      { property: "og:title", content: "Inventory Stock — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage and track all mobile devices in stock." },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { state } = useFmm();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("All");
  const [supplier, setSupplier] = useState("All");
  const [open, setOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.phones.filter((p) => {
      const matchQ = !q || [p.imei, p.imei_secondary ?? "", p.brand, p.model].some((v) => v.toLowerCase().includes(q));
      const matchS = status === "All" || p.status === status;
      const matchSup = supplier === "All" || supplierName(state, p) === supplier;
      return matchQ && matchS && matchSup;
    });
  }, [state, query, status, supplier]);

  const supplierOptions = ["All", ...state.suppliers.map((s) => s.name), "Bought from Customer", "Own Stock"];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Inventory Stock"
          subtitle="Manage and track all mobile devices in stock."
          actions={
            <>
              <div className="relative">
                <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search IMEI, Brand, Model..."
                  className="w-[280px] rounded-xl pl-9"
                />
              </div>
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => setExchangeOpen(true)}>
                <ArrowLeftRight className="size-4" /> Exchange
              </Button>
              <Button variant="destructive" className="rounded-xl gap-1.5" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Add Phone
              </Button>
            </>
          }
        />

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
            value={supplier}
            onChange={(e) => setSupplier(e.target.value)}
            className="rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium"
          >
            {supplierOptions.map((s) => (
              <option key={s} value={s}>
                {s === "All" ? "All suppliers" : s}
              </option>
            ))}
          </select>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                {["Date", "IMEI", "Brand / Model", "Specs", "Battery Health", "Supplier", "Price", "Status", "Days"].map((h) => (
                  <th key={h} className={`px-5 py-3 font-medium ${h === "Days" || h.startsWith("Price") ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const isApple = /apple|iphone/i.test(`${p.brand} ${p.model}`);
                const specs = isApple ? p.storage_ram.split("/").pop()?.trim() || "—" : p.storage_ram;
                return (
                <tr key={p.id} className="cursor-pointer hover:bg-secondary/40" onClick={() => setDetailId(p.id)}>
                  <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div>{p.imei}</div>
                    {p.imei_secondary ? (
                      <div className="text-xs text-muted-foreground">IMEI 2: {p.imei_secondary}</div>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 font-semibold">
                    {p.brand} {p.model}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{specs}</td>
                  <td className="px-5 py-4 text-muted-foreground">{p.battery_health || "—"}</td>
                  <td className="px-5 py-4 text-muted-foreground">{supplierName(state, p)}</td>
                  <td className="px-5 py-4 text-right whitespace-nowrap font-medium">
                    {p.selling_price ? <Taka value={p.selling_price} /> : "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-5 py-4 text-right">{daysInStock(p.created_at)}</td>
                </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-muted-foreground">
                    No phones match these filters.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      <ExchangePhoneDialog open={exchangeOpen} onOpenChange={setExchangeOpen} />
      <AddPhoneDialog open={open} onOpenChange={setOpen} />
      <PhoneDetailDialog phoneId={detailId} onClose={() => setDetailId(null)} />
    </AppShell>
  );
}
