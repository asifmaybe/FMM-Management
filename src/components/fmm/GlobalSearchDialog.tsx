import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Box,
  Layers,
  Megaphone,
  Package,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka } from "./Taka";
import { StatusBadge } from "./StatusBadge";
import { groupedSearch, type SearchCategory } from "@/lib/fmm-search";

const CATEGORY_META: Record<
  SearchCategory,
  { icon: React.ReactNode; label: string; route: (r: any) => string }
> = {
  phones: {
    icon: <Smartphone className="size-3.5" />,
    label: "Phones",
    route: () => "/stock",
  },
  accessories: {
    icon: <Layers className="size-3.5" />,
    label: "Accessories",
    route: () => "/accessories",
  },
  customers: {
    icon: <Users className="size-3.5" />,
    label: "Customers",
    route: () => "/customers",
  },
  suppliers: {
    icon: <Truck className="size-3.5" />,
    label: "Suppliers",
    route: (r) => `/suppliers/${r.raw.id}`,
  },
  campaigns: {
    icon: <Megaphone className="size-3.5" />,
    label: "Campaigns",
    route: (r) => `/campaigns/${r.raw.id}`,
  },
  transactions: {
    icon: <Receipt className="size-3.5" />,
    label: "Transactions",
    route: () => "/sales",
  },
  purchases: {
    icon: <ShoppingCart className="size-3.5" />,
    label: "Purchases",
    route: (r) =>
      r.raw.supplier_id ? `/purchases?supplier=${r.raw.supplier_id}` : "/purchases",
  },
  expenses: {
    icon: <Wallet className="size-3.5" />,
    label: "Expenses",
    route: () => "/expenses",
  },
  warranty: {
    icon: <ShieldCheck className="size-3.5" />,
    label: "Warranty",
    route: () => "/sales",
  },
  exchanges: {
    icon: <ArrowLeftRight className="size-3.5" />,
    label: "Exchanges",
    route: () => "/sales",
  },
};

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useFmm();
  const [query, setQuery] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    if (open) setQuery("");
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return groupedSearch(state, q, 5);
  }, [query, state]);

  const totalResults = grouped
    ? Array.from(grouped.values()).reduce((sum, arr) => sum + arr.length, 0)
    : 0;

  const handleSelect = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  const ORDERED_CATEGORIES: SearchCategory[] = [
    "phones",
    "customers",
    "suppliers",
    "transactions",
    "accessories",
    "campaigns",
    "purchases",
    "expenses",
    "warranty",
    "exchanges",
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl gap-0 border-border">
        <div className="flex items-center border-b border-border px-4 py-3.5 gap-3 bg-card">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search… or use imei:, name:, phone:, status:, supplier: operators"
            className="border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-8 shadow-none"
          />
          <kbd className="hidden sm:inline-block rounded bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!query.trim() ? (
            <div className="py-10 text-center text-sm text-muted-foreground space-y-3">
              <Search className="size-8 mx-auto text-muted-foreground/40" />
              <p>Type to search across the entire inventory, contacts, and records.</p>
              <div className="flex flex-wrap justify-center gap-2 text-[11px]">
                {["imei:35999", "status:sold", "supplier:rahman", "name:karim", "brand:samsung"].map(
                  (op) => (
                    <button
                      key={op}
                      type="button"
                      onClick={() => setQuery(op)}
                      className="rounded-lg border border-border/60 bg-secondary/50 px-2.5 py-1 text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors flex items-center gap-1"
                    >
                      <Zap className="size-2.5" />
                      {op}
                    </button>
                  ),
                )}
              </div>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {ORDERED_CATEGORIES.map((cat) => {
                const items = grouped?.get(cat);
                if (!items || items.length === 0) return null;
                const meta = CATEGORY_META[cat];
                return (
                  <div key={cat}>
                    <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      {meta.icon} {meta.label} ({items.length})
                    </h4>
                    <div className="space-y-1">
                      {items.map((r) => (
                        <button
                          key={r.id}
                          type="button"
                          onClick={() => handleSelect(meta.route(r))}
                          className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                        >
                          <div className="flex flex-col min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              {cat === "phones" && r.raw.with_box ? (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                  <Box className="size-2.5" /> Box
                                </span>
                              ) : null}
                              <span className="font-semibold text-foreground truncate">{r.title}</span>
                            </div>
                            <span className="text-xs text-muted-foreground font-mono truncate">{r.subtitle}</span>
                            {r.meta && (
                              <span className="text-xs text-muted-foreground truncate">{r.meta}</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 shrink-0 ml-2">
                            {cat === "phones" && (
                              <span className="font-medium text-xs">
                                <Taka value={r.raw.purchase_price} />
                              </span>
                            )}
                            {(cat === "transactions" || cat === "purchases") && (
                              <span className="font-semibold text-xs">
                                <Taka value={cat === "transactions" ? r.raw.amount : r.raw.total_amount} />
                              </span>
                            )}
                            {cat === "expenses" && (
                              <span className="font-semibold text-xs text-destructive">
                                <Taka value={r.raw.amount} />
                              </span>
                            )}
                            {r.badge && <StatusBadge status={r.badge} />}
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
              <div className="pt-2 border-t border-border/50 text-[11px] text-center text-muted-foreground">
                {totalResults} result{totalResults !== 1 ? "s" : ""} · Use{" "}
                <span className="font-mono">imei:</span>,{" "}
                <span className="font-mono">status:</span>,{" "}
                <span className="font-mono">supplier:</span> operators for precision search
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
