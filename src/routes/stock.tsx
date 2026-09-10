import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, HandCoins, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { AddPhoneDialog } from "@/components/fmm/AddPhoneDialog";
import { CustomerIntakeDialog } from "@/components/fmm/CustomerIntakeDialog";
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
  validateSearch: (s: Record<string, unknown>): { q?: string } => {
    const q = s["q"];
    return typeof q === "string" && q ? { q } : {};
  },
  component: StockPage,
});

function StockPage() {
  const { state } = useFmm();
  const navigate = useNavigate();
  const { q: initialSearch } = Route.useSearch();
  const [query, setQuery] = useState(initialSearch ?? "");
  const [status, setStatus] = useState("Available");
  const [supplier, setSupplier] = useState("All");
  const [open, setOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);

  const counts = useMemo(() => {
    const available = state.phones.filter((p) => p.status === "Available").length;
    const inInspection = state.phones.filter((p) => p.status === "In Inspection").length;
    const sold = state.phones.filter((p) => p.status === "Sold" || p.status === "Exchange" || (p.status as string) === "Payment Pending").length;
    const returned = state.phones.filter((p) => p.status === "Returned" || p.status === "Returned to Supplier").length;
    const all = state.phones.length;
    return { available, inInspection, sold, returned, all };
  }, [state.phones]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.phones.filter((p) => {
      const matchQ = !q || [p.imei, p.imei_secondary ?? "", p.brand, p.model].some((v) => v.toLowerCase().includes(q));
      const matchS =
        status === "All"
          ? true
          : status === "Sold"
            ? p.status === "Sold" || p.status === "Exchange" || (p.status as string) === "Payment Pending"
            : status === "Returned"
              ? p.status === "Returned" || p.status === "Returned to Supplier"
              : p.status === status;
      const matchSup = supplier === "All" || supplierName(state, p) === supplier;
      return matchQ && matchS && matchSup;
    });
  }, [state, query, status, supplier]);

  const supplierOptions = ["All", ...state.suppliers.map((s) => s.name), "Bought from Customer", "Own Stock"];

  const tabs = [
    { key: "Available", label: "Available Stock", count: counts.available },
    { key: "In Inspection", label: "In Inspection", count: counts.inInspection },
    { key: "Sold", label: "Sold Archive", count: counts.sold },
    { key: "Returned", label: "Returned", count: counts.returned },
    { key: "All", label: "All Phones", count: counts.all },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Inventory Stock"
          subtitle="Manage and track all active mobile devices currently in stock."
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
              <Button
                variant="outline"
                className="rounded-xl gap-1.5"
                onClick={() => setIntakeOpen(true)}
              >
                <HandCoins className="size-4" /> Buy from Customer
              </Button>
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => setExchangeOpen(true)}>
                <ArrowLeftRight className="size-4" /> Exchange
              </Button>
              <Button variant="destructive" className="rounded-xl gap-1.5" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> Add Phone
              </Button>
            </>
          }
        />

        {/* Filter Navigation Tabs */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  status === tab.key
                    ? "bg-primary text-primary-foreground border-primary shadow-xs"
                    : "border-border bg-card hover:bg-secondary text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                <span
                  className={`rounded-full px-1.5 py-0.2 text-[10px] font-semibold ${
                    status === tab.key
                      ? "bg-primary-foreground/20 text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

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

        {/* Information banner when viewing sold device archive */}
        {status === "Sold" && (
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-900 dark:text-blue-200">
            <div className="flex items-center gap-2">
              <span className="text-base">📦</span>
              <span>
                <strong>Sold Devices Archive:</strong> These devices have been sold and are no longer in physical inventory. They are preserved here for IMEI lookup and warranty tracking. To view customer invoices, collect dues, and handle order payments, visit{" "}
                <strong>Sales & Orders</strong>.
              </span>
            </div>
            <Link
              to="/sales"
              className="inline-flex items-center gap-1 font-semibold text-primary hover:underline whitespace-nowrap"
            >
              Open Sales & Orders &rarr;
            </Link>
          </div>
        )}

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
      <CustomerIntakeDialog open={intakeOpen} onOpenChange={setIntakeOpen} />
      <PhoneDetailDialog phoneId={detailId} onClose={() => setDetailId(null)} />
    </AppShell>
  );
}
