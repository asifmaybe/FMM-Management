import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Edit2,
  History,
  Layers,
  Package,
  Plus,
  Scale,
  Search,
  ShoppingCart,
  TrendingUp,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AddAccessoryDialog } from "@/components/fmm/AddAccessoryDialog";
import { AdjustStockDialog } from "@/components/fmm/AdjustStockDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { accessoryBusinessMetrics, useFmm } from "@/lib/fmm-store";
import { type Accessory, type AccessoryCategory } from "@/lib/fmm-types";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/accessories")({
  head: () => ({
    meta: [
      { title: "Accessories Inventory — Faridpur Mobile Mart" },
      { name: "description", content: "Quantity-based accessories stock management, chargers, cables, earbuds, and stock movement ledger." },
      { property: "og:title", content: "Accessories Inventory — Faridpur Mobile Mart" },
      { property: "og:description", content: "Track quantity-based mobile accessories, stock movements, and low-stock alerts." },
    ],
  }),
  component: AccessoriesPage,
});

const CATEGORIES: ("All" | AccessoryCategory)[] = [
  "All",
  "Charger",
  "Charging Cable",
  "Headphone",
  "Earbuds",
  "Power Bank",
  "Phone Cover",
  "Screen Protector",
  "Adapter",
  "Data Cable",
];

function AccessoriesPage() {
  const { state } = useFmm();

  const [category, setCategory] = useState<string>("All");
  const [search, setSearch] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Accessory | null>(null);
  const [adjustingItem, setAdjustingItem] = useState<Accessory | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);

  const metrics = useMemo(() => accessoryBusinessMetrics(state), [state]);

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (state.accessories ?? []).filter((item) => {
      const matchCat = category === "All" || item.category === category;
      const matchSearch =
        !q ||
        item.name.toLowerCase().includes(q) ||
        item.brand.toLowerCase().includes(q) ||
        item.model_sku.toLowerCase().includes(q) ||
        item.variant.toLowerCase().includes(q);
      return matchCat && matchSearch;
    });
  }, [state.accessories, category, search]);

  const getSupplierName = (id: string | null) => {
    if (!id) return "—";
    return state.suppliers.find((s) => s.id === id)?.name ?? "—";
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Accessories Inventory"
          subtitle="Quantity-based mobile accessories, stock alerts and movement history."
          actions={
            <div className="flex items-center gap-2">
              <Button variant="outline" className="rounded-xl gap-1.5" onClick={() => setHistoryOpen(true)}>
                <History className="size-4" /> Movement Ledger
              </Button>
              <Button
                className="rounded-xl gap-1.5"
                onClick={() => {
                  setEditingItem(null);
                  setAddOpen(true);
                }}
              >
                <Plus className="size-4" /> Add Product
              </Button>
            </div>
          }
        />

        {/* Top Summary Cards */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 mb-6">
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL QUANTITY</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Layers className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold">{metrics.totalQuantity} <span className="text-sm font-normal text-muted-foreground">units</span></p>
            <p className="mt-2 text-xs text-muted-foreground">Across {state.accessories?.length ?? 0} unique SKUs</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">STOCK VALUATION</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <Package className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={metrics.totalValue} /></p>
            <p className="mt-2 text-xs text-muted-foreground">At unit purchase cost</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">LOW STOCK ALERTS</span>
              <span className={`rounded-lg p-2 ${metrics.lowStockCount > 0 ? "bg-danger-soft text-destructive" : "bg-secondary text-foreground"}`}>
                <AlertTriangle className="size-4" />
              </span>
            </div>
            <p className={`mt-4 text-3xl font-bold ${metrics.lowStockCount > 0 ? "text-destructive" : ""}`}>
              {metrics.lowStockCount} <span className="text-sm font-normal text-muted-foreground">products</span>
            </p>
            <p className="mt-2 text-xs text-muted-foreground">Need supplier re-order</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-start justify-between">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground">TODAY&apos;S SALES</span>
              <span className="rounded-lg p-2 bg-secondary text-foreground">
                <ShoppingCart className="size-4" />
              </span>
            </div>
            <p className="mt-4 text-3xl font-bold"><Taka value={metrics.soldTodayRevenue} /></p>
            <p className="mt-2 flex items-center gap-1 text-xs text-success">
              <TrendingUp className="size-3.5" />
              {metrics.soldTodayCount} orders recorded
            </p>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-1.5 overflow-x-auto pb-1">
            {CATEGORIES.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setCategory(c)}
                className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  category === c
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:bg-secondary text-foreground"
                }`}
              >
                {c === "All" ? "All Categories" : c}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search product, brand, SKU…"
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[900px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Product Name & Category</th>
                <th className="px-5 py-3 font-medium">Brand / SKU</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
                <th className="px-5 py-3 text-right font-medium">Cost Price</th>
                <th className="px-5 py-3 text-right font-medium">Selling Price</th>
                <th className="px-5 py-3 text-center font-medium">Stock Qty</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredItems.map((item) => {
                const isLow = item.quantity <= item.min_threshold;
                return (
                  <tr key={item.id} className="hover:bg-secondary/20 transition-colors">
                    <td className="px-5 py-4">
                      <p className="font-semibold text-foreground">{item.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {item.category} {item.variant ? `· ${item.variant}` : ""}
                      </p>
                    </td>
                    <td className="px-5 py-4">
                      <p className="font-medium">{item.brand || "—"}</p>
                      <p className="font-mono text-xs text-muted-foreground">{item.model_sku || "—"}</p>
                    </td>
                    <td className="px-5 py-4 text-muted-foreground">{getSupplierName(item.supplier_id)}</td>
                    <td className="px-5 py-4 text-right font-medium"><Taka value={item.purchase_price} /></td>
                    <td className="px-5 py-4 text-right font-semibold text-foreground"><Taka value={item.selling_price} /></td>
                    <td className="px-5 py-4 text-center">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                          isLow
                            ? "bg-danger-soft text-destructive"
                            : "bg-secondary text-foreground"
                        }`}
                      >
                        {isLow ? <AlertTriangle className="size-3" /> : null}
                        {item.quantity} {item.unit}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <StatusBadge status={item.status} />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 rounded-lg text-xs gap-1"
                          onClick={() => setAdjustingItem(item)}
                        >
                          <Scale className="size-3.5" /> Adjust
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 rounded-lg text-xs"
                          onClick={() => {
                            setEditingItem(item);
                            setAddOpen(true);
                          }}
                        >
                          <Edit2 className="size-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-5 py-12 text-center text-muted-foreground">
                    No accessories found matching your filter criteria.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Dialog */}
      <AddAccessoryDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editItem={editingItem}
      />

      {/* Adjust Stock Dialog */}
      <AdjustStockDialog
        open={!!adjustingItem}
        onOpenChange={(open) => !open && setAdjustingItem(null)}
        accessory={adjustingItem}
      />

      {/* Movement History Drawer */}
      <Sheet open={historyOpen} onOpenChange={setHistoryOpen}>
        <SheetContent className="sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <History className="size-5 text-primary" />
              Accessory Stock Movement Ledger
            </SheetTitle>
          </SheetHeader>
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-3">
              {(state.accessory_movements ?? []).map((m) => {
                const acc = state.accessories?.find((a) => a.id === m.accessory_id);
                const isIn = m.direction === "in";
                return (
                  <div key={m.id} className="rounded-xl border border-border bg-card p-3.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold text-sm text-foreground">{acc?.name || "Product"}</span>
                        <p className="text-muted-foreground mt-0.5">{m.reason}</p>
                      </div>
                      <span
                        className={`inline-flex items-center gap-1 font-bold rounded-lg px-2 py-0.5 text-xs ${
                          isIn ? "bg-success-soft text-success" : "bg-danger-soft text-destructive"
                        }`}
                      >
                        {isIn ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
                        {isIn ? "+" : "-"}{m.quantity} {acc?.unit || "pcs"}
                      </span>
                    </div>
                    <div className="mt-2.5 flex items-center justify-between border-t border-border/50 pt-2 text-muted-foreground">
                      <span>Type: <strong className="text-foreground">{m.type}</strong></span>
                      <span>{new Date(m.date).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>
                    </div>
                  </div>
                );
              })}
              {(state.accessory_movements ?? []).length === 0 ? (
                <div className="py-12 text-center text-sm text-muted-foreground">No stock movements recorded yet.</div>
              ) : null}
            </div>
          </div>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
}
