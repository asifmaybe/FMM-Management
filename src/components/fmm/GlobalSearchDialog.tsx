import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  ArrowRight,
  Box,
  Layers,
  Megaphone,
  Receipt,
  Search,
  ShieldCheck,
  ShoppingCart,
  Smartphone,
  Truck,
  Users,
  Wallet,
  Zap,
  X,
  Command,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useFmm } from "@/lib/fmm-store";
import { Taka } from "./Taka";
import { StatusBadge } from "./StatusBadge";
import { groupedSearch, type SearchCategory } from "@/lib/fmm-search";

const OPERATOR_HINTS = [
  { label: "imei:35999", color: "text-slate-800", bg: "bg-slate-100 border-slate-200 hover:bg-slate-200/80" },
  { label: "status:sold", color: "text-emerald-800", bg: "bg-emerald-50 border-emerald-200 hover:bg-emerald-100" },
  { label: "supplier:rahman", color: "text-blue-800", bg: "bg-blue-50 border-blue-200 hover:bg-blue-100" },
  { label: "name:karim", color: "text-amber-800", bg: "bg-amber-50 border-amber-200 hover:bg-amber-100" },
  { label: "brand:samsung", color: "text-rose-800", bg: "bg-rose-50 border-rose-200 hover:bg-rose-100" },
];

const CATEGORY_META: Record<
  SearchCategory,
  { icon: React.ReactNode; label: string; color: string; route: (r: any) => string }
> = {
  phones: {
    icon: <Smartphone className="size-3.5" />,
    label: "Phones",
    color: "text-slate-800",
    route: () => "/stock",
  },
  accessories: {
    icon: <Layers className="size-3.5" />,
    label: "Accessories",
    color: "text-blue-700",
    route: () => "/accessories",
  },
  customers: {
    icon: <Users className="size-3.5" />,
    label: "Customers",
    color: "text-emerald-700",
    route: () => "/customers",
  },
  suppliers: {
    icon: <Truck className="size-3.5" />,
    label: "Suppliers",
    color: "text-amber-700",
    route: (r) => `/suppliers/${r.raw.id}`,
  },
  campaigns: {
    icon: <Megaphone className="size-3.5" />,
    label: "Campaigns",
    color: "text-rose-700",
    route: (r) => `/campaigns/${r.raw.id}`,
  },
  transactions: {
    icon: <Receipt className="size-3.5" />,
    label: "Transactions",
    color: "text-indigo-700",
    route: () => "/sales",
  },
  purchases: {
    icon: <ShoppingCart className="size-3.5" />,
    label: "Purchases",
    color: "text-orange-700",
    route: (r) =>
      r.raw.supplier_id ? `/purchases?supplier=${r.raw.supplier_id}` : "/purchases",
  },
  expenses: {
    icon: <Wallet className="size-3.5" />,
    label: "Expenses",
    color: "text-rose-700",
    route: () => "/expenses",
  },
  warranty: {
    icon: <ShieldCheck className="size-3.5" />,
    label: "Warranty",
    color: "text-teal-700",
    route: () => "/sales",
  },
  exchanges: {
    icon: <ArrowLeftRight className="size-3.5" />,
    label: "Exchanges",
    color: "text-purple-700",
    route: () => "/sales",
  },
};

const ORDERED_CATEGORIES: SearchCategory[] = [
  "phones", "customers", "suppliers", "transactions",
  "accessories", "campaigns", "purchases", "expenses", "warranty", "exchanges",
];

export function GlobalSearchDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state } = useFmm();
  const [query, setQuery] = useState("");
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (open) {
      setQuery("");
      setFocusedIndex(-1);
    }
  }, [open]);

  const grouped = useMemo(() => {
    const q = query.trim();
    if (!q) return null;
    return groupedSearch(state, q, 5);
  }, [query, state]);

  // Flattened array of results for keyboard navigation (ArrowUp, ArrowDown, Enter)
  const flatResults = useMemo(() => {
    if (!grouped) return [];
    const list: { id: string; route: string }[] = [];
    for (const cat of ORDERED_CATEGORIES) {
      const items = grouped.get(cat);
      if (items) {
        const meta = CATEGORY_META[cat];
        for (const r of items) {
          list.push({ id: r.id, route: meta.route(r) });
        }
      }
    }
    return list;
  }, [grouped]);

  const totalResults = flatResults.length;

  const handleSelect = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (flatResults.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev < flatResults.length - 1 ? prev + 1 : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setFocusedIndex((prev) => (prev > 0 ? prev - 1 : flatResults.length - 1));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = focusedIndex >= 0 ? flatResults[focusedIndex] : flatResults[0];
      if (target) {
        handleSelect(target.route);
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent hideClose className="max-w-2xl p-0 overflow-hidden gap-0 border border-slate-200/90 shadow-2xl rounded-2xl bg-white text-slate-900 [&>button.absolute]:hidden">
        <div className="flex flex-col overflow-hidden rounded-2xl bg-white">
          {/* Search bar */}
          <div className="relative flex items-center px-4 sm:px-5 py-3.5 gap-3 border-b border-slate-100 bg-white">
            <div className="flex items-center justify-center size-8 rounded-xl bg-slate-100 border border-slate-200/80 shrink-0 text-slate-700">
              <Search className="size-4" />
            </div>
            <input
              ref={inputRef}
              autoFocus
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setFocusedIndex(0);
              }}
              onKeyDown={handleKeyDown}
              placeholder="Search phones, customers, IMEI… or use imei:, status:, supplier: operators"
              className="flex-1 bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 outline-none font-medium"
              style={{ letterSpacing: "-0.01em" }}
            />
            <div className="flex items-center gap-2 shrink-0">
              {query && (
                <button
                  type="button"
                  onClick={() => {
                    setQuery("");
                    setFocusedIndex(-1);
                  }}
                  className="flex items-center justify-center size-6 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                  title="Clear search"
                >
                  <X className="size-3.5" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1.5 px-2 py-0.5 text-[11px] font-mono rounded-md text-slate-500 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 transition-colors cursor-pointer"
                title="Close dialog (ESC)"
              >
                <span>ESC</span>
                <X className="size-3 text-slate-400" />
              </button>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[62vh] overflow-y-auto custom-scroll">
            {!query.trim() ? (
              /* Empty state */
              <div className="px-5 py-7 space-y-6 bg-slate-50/50">
                <div className="text-center space-y-2 pt-2">
                  <div className="flex items-center justify-center mx-auto size-12 rounded-2xl bg-white border border-slate-200 shadow-xs text-slate-700">
                    <Command className="size-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-900">Universal Search</p>
                    <p className="text-xs text-slate-500 mt-0.5">Quickly find devices, customers, orders, and expenses</p>
                  </div>
                </div>

                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                    Smart operators — click to try
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OPERATOR_HINTS.map((op) => (
                      <button
                        key={op.label}
                        type="button"
                        onClick={() => setQuery(op.label)}
                        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border text-[11px] font-mono font-semibold transition-all shadow-2xs ${op.bg} ${op.color}`}
                      >
                        <Zap className="size-3" />
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200/70">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2.5 px-1">
                    Categories
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["phones", "customers", "suppliers", "transactions", "expenses"] as SearchCategory[]).map((cat) => {
                      const m = CATEGORY_META[cat];
                      return (
                        <div
                          key={cat}
                          className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white border border-slate-200 shadow-2xs"
                        >
                          <span className={m.color}>{m.icon}</span>
                          <span className="text-[11px] text-slate-700 font-medium">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : totalResults === 0 ? (
              /* No results */
              <div className="py-14 text-center space-y-2.5">
                <div className="flex items-center justify-center mx-auto size-11 rounded-xl bg-slate-100 border border-slate-200 text-slate-400">
                  <Search className="size-5" />
                </div>
                <p className="text-sm font-medium text-slate-700">
                  No results for <span className="text-slate-900 font-bold">"{query}"</span>
                </p>
                <p className="text-xs text-slate-400">
                  Try <span className="font-mono text-slate-600">imei:123</span> or <span className="font-mono text-slate-600">status:sold</span>
                </p>
              </div>
            ) : (
              /* Results */
              <div className="py-1">
                {ORDERED_CATEGORIES.map((cat) => {
                  const items = grouped?.get(cat);
                  if (!items || items.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat} className="mb-0.5">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-5 py-1.5 bg-slate-50/80 border-y border-slate-100">
                        <span className={meta.color}>{meta.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                          {meta.label}
                        </span>
                        <span className="ml-auto text-[10px] text-slate-400 font-mono tabular-nums font-semibold">
                          {items.length}
                        </span>
                      </div>

                      {/* Result rows */}
                      {items.map((r) => {
                        const isSelected = flatResults[focusedIndex]?.id === r.id;
                        return (
                          <button
                            key={r.id}
                            type="button"
                            onClick={() => handleSelect(meta.route(r))}
                            className={`w-full flex items-center justify-between px-5 py-2.5 text-left transition-colors group ${
                              isSelected ? "bg-slate-100/90 ring-1 ring-inset ring-slate-300/80" : "hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              {/* Icon dot */}
                              <div className="flex items-center justify-center size-7 rounded-lg shrink-0 bg-slate-100 border border-slate-200/80">
                                <span className={meta.color}>{meta.icon}</span>
                              </div>

                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {cat === "phones" && r.raw.with_box && (
                                    <span className="inline-flex items-center gap-0.5 shrink-0 rounded px-1.5 py-0.5 text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                      <Box className="size-2.5" /> BOX
                                    </span>
                                  )}
                                  <span className="text-sm font-semibold text-slate-900 truncate">
                                    {r.title}
                                  </span>
                                </div>
                                <span className="text-xs text-slate-500 font-mono truncate block leading-tight">
                                  {r.subtitle}
                                </span>
                                {r.meta && (
                                  <span className="text-[11px] text-slate-400 truncate block">
                                    {r.meta}
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Right side */}
                            <div className="flex items-center gap-2.5 shrink-0 ml-4">
                              {cat === "phones" && (
                                <span className="text-xs font-bold text-slate-800 font-mono tabular-nums">
                                  <Taka value={r.raw.purchase_price} />
                                </span>
                              )}
                              {(cat === "transactions" || cat === "purchases") && (
                                <span className="text-xs font-bold text-emerald-700 font-mono tabular-nums">
                                  <Taka value={cat === "transactions" ? r.raw.amount : r.raw.total_amount} />
                                </span>
                              )}
                              {cat === "expenses" && (
                                <span className="text-xs font-bold text-rose-600 font-mono tabular-nums">
                                  <Taka value={r.raw.amount} />
                                </span>
                              )}
                              {r.badge && <StatusBadge status={r.badge} />}
                              <ArrowRight
                                className={`size-3.5 transition-all duration-150 ${
                                  isSelected
                                    ? "text-slate-800 opacity-100 translate-x-0"
                                    : "text-slate-400 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
                                }`}
                              />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}

                {/* Footer */}
                <div className="px-5 py-2.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/60 mt-1">
                  <span className="text-[11px] text-slate-500">
                    <strong className="text-slate-700 font-semibold tabular-nums">{totalResults}</strong> result{totalResults !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-slate-400">
                    {["imei:", "status:", "supplier:"].map((op) => (
                      <span key={op} className="font-mono bg-white px-1.5 py-0.5 rounded border border-slate-200 text-slate-600 font-medium">
                        {op}
                      </span>
                    ))}
                    <span>for precision</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}