import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { ArrowLeftRight, Box, HandCoins, Pencil, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { AddPhoneDialog } from "@/components/fmm/AddPhoneDialog";
import { CustomerIntakeDialog } from "@/components/fmm/CustomerIntakeDialog";
import { ExchangePhoneDialog } from "@/components/fmm/ExchangePhoneDialog";
import { PhoneDetailDialog } from "@/components/fmm/PhoneDetailDialog";
import { EditPhoneDialog } from "@/components/fmm/EditPhoneDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { daysInStock, formatBatteryHealth, supplierName, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import type { Phone } from "@/lib/fmm-types";

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
  const [sortBy, setSortBy] = useState("newest");
  const [open, setOpen] = useState(false);
  const [intakeOpen, setIntakeOpen] = useState(false);
  const [exchangeOpen, setExchangeOpen] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [editingPhone, setEditingPhone] = useState<Phone | null>(null);

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
    const filtered = state.phones.filter((p) => {
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

    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "newest": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case "oldest": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "brand_az": return `${a.brand} ${a.model}`.localeCompare(`${b.brand} ${b.model}`);
        case "brand_za": return `${b.brand} ${b.model}`.localeCompare(`${a.brand} ${a.model}`);
        case "price_high": return (b.selling_price ?? b.purchase_price ?? 0) - (a.selling_price ?? a.purchase_price ?? 0);
        case "price_low": return (a.selling_price ?? a.purchase_price ?? 0) - (b.selling_price ?? b.purchase_price ?? 0);
        case "days_most": return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case "days_least": return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        default: return 0;
      }
    });
  }, [state, query, status, supplier, sortBy]);

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
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex gap-2 overflow-x-auto shrink min-w-0 pb-0.5">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                onClick={() => setStatus(tab.key)}
                className={`inline-flex shrink-0 items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
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

          <div className="flex items-center gap-2 shrink-0">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="w-36 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
              <option value="brand_az">Brand A → Z</option>
              <option value="brand_za">Brand Z → A</option>
              <option value="price_high">Price ↓ High</option>
              <option value="price_low">Price ↑ Low</option>
              <option value="days_most">Days ↓ Most</option>
              <option value="days_least">Days ↑ Least</option>
            </select>
            <select
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              className="w-32 rounded-lg border border-border bg-card px-2 py-1.5 text-xs font-medium"
            >
              {supplierOptions.map((s) => (
                <option key={s} value={s}>
                  {s === "All" ? "All suppliers" : s}
                </option>
              ))}
            </select>
          </div>
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
                {[
                  { label: "Date", className: "whitespace-nowrap min-w-[85px]" },
                  { label: "IMEI", className: "whitespace-nowrap min-w-[125px]" },
                  { label: "Brand / Model", className: "min-w-[210px]" },
                  { label: "Specs", className: "whitespace-nowrap min-w-[85px]" },
                  { label: "BH %", className: "whitespace-nowrap min-w-[55px]" },
                  { label: "Supplier", className: "whitespace-nowrap min-w-[85px]" },
                  { label: "Price", className: "text-right whitespace-nowrap min-w-[75px]" },
                  { label: "Status", className: "whitespace-nowrap min-w-[80px]" },
                  { label: "Days", className: "text-right whitespace-nowrap min-w-[45px]" },
                  { label: "Action", className: "text-right whitespace-nowrap min-w-[65px]" },
                ].map((col) => (
                  <th key={col.label} className={`px-3 py-2.5 font-medium ${col.className}`}>
                    {col.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((p) => {
                const specs = p.storage_ram || "—";
                return (
                <tr key={p.id} className="cursor-pointer hover:bg-secondary/40 transition-colors" onClick={() => setDetailId(p.id)}>
                  <td className="px-3 py-2.5 whitespace-nowrap text-muted-foreground">
                    {new Date(p.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <div>{p.imei}</div>
                    {p.imei_secondary ? (
                      <div className="text-xs text-muted-foreground">IMEI 2: {p.imei_secondary}</div>
                    ) : null}
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
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{specs}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{formatBatteryHealth(p.battery_health)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground whitespace-nowrap">{supplierName(state, p)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap font-medium">
                    {p.selling_price ? <Taka value={p.selling_price} /> : "—"}
                  </td>
                  <td className="px-3 py-2.5 whitespace-nowrap">
                    <StatusBadge status={p.status} />
                  </td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap">{daysInStock(p.created_at)}</td>
                  <td className="px-3 py-2.5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-7 rounded-lg px-2 text-xs font-medium gap-1 hover:bg-primary/10 hover:text-primary hover:border-primary/40 transition-colors"
                      onClick={() => setEditingPhone(p)}
                    >
                      <Pencil className="size-3" />
                      Edit
                    </Button>
                  </td>
                </tr>
                );
              })}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-5 py-10 text-center text-muted-foreground">
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
      <EditPhoneDialog
        phone={editingPhone}
        open={Boolean(editingPhone)}
        onOpenChange={(open) => !open && setEditingPhone(null)}
      />
    </AppShell>
  );
}
