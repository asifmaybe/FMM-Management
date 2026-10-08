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
  { label: "imei:35999", color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20 hover:bg-violet-500/20" },
  { label: "status:sold", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/20" },
  { label: "supplier:rahman", color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/20" },
  { label: "name:karim", color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/20" },
  { label: "brand:samsung", color: "text-rose-400", bg: "bg-rose-500/10 border-rose-500/20 hover:bg-rose-500/20" },
];

const CATEGORY_META: Record<
  SearchCategory,
  { icon: React.ReactNode; label: string; color: string; route: (r: any) => string }
> = {
  phones: {
    icon: <Smartphone className="size-3.5" />,
    label: "Phones",
    color: "text-violet-400",
    route: () => "/stock",
  },
  accessories: {
    icon: <Layers className="size-3.5" />,
    label: "Accessories",
    color: "text-blue-400",
    route: () => "/accessories",
  },
  customers: {
    icon: <Users className="size-3.5" />,
    label: "Customers",
    color: "text-emerald-400",
    route: () => "/customers",
  },
  suppliers: {
    icon: <Truck className="size-3.5" />,
    label: "Suppliers",
    color: "text-amber-400",
    route: (r) => `/suppliers/${r.raw.id}`,
  },
  campaigns: {
    icon: <Megaphone className="size-3.5" />,
    label: "Campaigns",
    color: "text-rose-400",
    route: (r) => `/campaigns/${r.raw.id}`,
  },
  transactions: {
    icon: <Receipt className="size-3.5" />,
    label: "Transactions",
    color: "text-sky-400",
    route: () => "/sales",
  },
  purchases: {
    icon: <ShoppingCart className="size-3.5" />,
    label: "Purchases",
    color: "text-orange-400",
    route: (r) =>
      r.raw.supplier_id ? `/purchases?supplier=${r.raw.supplier_id}` : "/purchases",
  },
  expenses: {
    icon: <Wallet className="size-3.5" />,
    label: "Expenses",
    color: "text-red-400",
    route: () => "/expenses",
  },
  warranty: {
    icon: <ShieldCheck className="size-3.5" />,
    label: "Warranty",
    color: "text-teal-400",
    route: () => "/sales",
  },
  exchanges: {
    icon: <ArrowLeftRight className="size-3.5" />,
    label: "Exchanges",
    color: "text-purple-400",
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
      <DialogContent className="max-w-2xl p-0 overflow-hidden gap-0 border-0 shadow-2xl rounded-2xl bg-transparent">
        <div
          className="flex flex-col overflow-hidden rounded-2xl"
          style={{
            background: "linear-gradient(135deg, rgba(10,10,15,0.97) 0%, rgba(18,18,28,0.98) 100%)",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.08), 0 32px 80px rgba(0,0,0,0.6), 0 0 120px rgba(139,92,246,0.06)",
            backdropFilter: "blur(40px)",
          }}
        >
          {/* Search bar */}
          <div className="relative flex items-center px-5 py-4 gap-3"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center justify-center size-8 rounded-xl shrink-0"
              style={{ background: "rgba(139,92,246,0.15)", border: "1px solid rgba(139,92,246,0.25)" }}>
              <Search className="size-4 text-violet-400" />
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
              className="flex-1 bg-transparent text-[15px] text-white placeholder:text-zinc-500 outline-none font-medium"
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
                  className="flex items-center justify-center size-6 rounded-lg transition-all"
                  style={{ background: "rgba(255,255,255,0.08)" }}
                >
                  <X className="size-3.5 text-zinc-400" />
                </button>
              )}
              <kbd className="hidden sm:flex items-center gap-1 px-2 py-1 text-[10px] font-mono rounded-lg text-zinc-500"
                style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
                ESC
              </kbd>
            </div>
          </div>

          {/* Body */}
          <div className="max-h-[62vh] overflow-y-auto custom-scroll">
            {!query.trim() ? (
              /* Empty state */
              <div className="px-5 py-8 space-y-6">
                <div className="text-center space-y-3">
                  <div className="flex items-center justify-center mx-auto size-14 rounded-2xl"
                    style={{ background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.2)" }}>
                    <Command className="size-6 text-violet-400" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-zinc-300">Universal Search</p>
                    <p className="text-xs text-zinc-500 mt-1">Search across inventory, sales, customers, and more</p>
                  </div>
                </div>

                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3 px-1">
                    Smart operators — click to try
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {OPERATOR_HINTS.map((op) => (
                      <button
                        key={op.label}
                        type="button"
                        onClick={() => setQuery(op.label)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[11px] font-mono font-semibold transition-all ${op.bg} ${op.color}`}
                      >
                        <Zap className="size-2.5" />
                        {op.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }} className="pt-4">
                  <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-600 mb-3 px-1">
                    You can search for
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {(["phones", "customers", "suppliers", "transactions", "expenses"] as SearchCategory[]).map((cat) => {
                      const m = CATEGORY_META[cat];
                      return (
                        <div key={cat} className="flex items-center gap-2 px-3 py-2 rounded-xl"
                          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                          <span className={m.color}>{m.icon}</span>
                          <span className="text-[11px] text-zinc-400 font-medium">{m.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            ) : totalResults === 0 ? (
              /* No results */
              <div className="py-14 text-center space-y-3">
                <div className="flex items-center justify-center mx-auto size-12 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <Search className="size-5 text-zinc-600" />
                </div>
                <p className="text-sm text-zinc-500">No results for <span className="text-zinc-300 font-medium">"{query}"</span></p>
                <p className="text-xs text-zinc-600">Try <span className="font-mono text-zinc-500">imei:123</span> or <span className="font-mono text-zinc-500">status:sold</span></p>
              </div>
            ) : (
              /* Results */
              <div className="py-2">
                {ORDERED_CATEGORIES.map((cat) => {
                  const items = grouped?.get(cat);
                  if (!items || items.length === 0) return null;
                  const meta = CATEGORY_META[cat];
                  return (
                    <div key={cat} className="mb-1">
                      {/* Category header */}
                      <div className="flex items-center gap-2 px-5 py-2">
                        <span className={meta.color}>{meta.icon}</span>
                        <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">
                          {meta.label}
                        </span>
                        <span className="ml-auto text-[10px] text-zinc-700 font-mono tabular-nums">
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
                            className={`w-full flex items-center justify-between px-5 py-2.5 text-left transition-all group ${
                              isSelected ? "bg-white/[0.08] ring-1 ring-inset ring-violet-500/30" : "hover:bg-white/[0.04]"
                            }`}
                          >
                          <div className="flex items-center gap-3 min-w-0">
                            {/* Icon dot */}
                            <div className="flex items-center justify-center size-7 rounded-lg shrink-0 transition-all"
                              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                              <span className={`${meta.color} opacity-80`}>{meta.icon}</span>
                            </div>

                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2">
                                {cat === "phones" && r.raw.with_box && (
                                  <span className="inline-flex items-center gap-0.5 shrink-0 rounded-md px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/25">
                                    <Box className="size-2.5" /> BOX
                                  </span>
                                )}
                                <span className="text-sm font-semibold text-zinc-100 truncate group-hover:text-white transition-colors">
                                  {r.title}
                                </span>
                              </div>
                              <span className="text-xs text-zinc-600 font-mono truncate block leading-relaxed">
                                {r.subtitle}
                              </span>
                              {r.meta && (
                                <span className="text-[11px] text-zinc-600 truncate block">
                                  {r.meta}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Right side */}
                          <div className="flex items-center gap-2.5 shrink-0 ml-4">
                            {cat === "phones" && (
                              <span className="text-xs font-bold text-zinc-300 tabular-nums">
                                <Taka value={r.raw.purchase_price} />
                              </span>
                            )}
                            {(cat === "transactions" || cat === "purchases") && (
                              <span className="text-xs font-bold text-emerald-400 tabular-nums">
                                <Taka value={cat === "transactions" ? r.raw.amount : r.raw.total_amount} />
                              </span>
                            )}
                            {cat === "expenses" && (
                              <span className="text-xs font-bold text-red-400 tabular-nums">
                                <Taka value={r.raw.amount} />
                              </span>
                            )}
                            {r.badge && <StatusBadge status={r.badge} />}
                            <ArrowRight className={`size-3.5 transition-all duration-150 ${
                              isSelected
                                ? "text-violet-400 opacity-100 translate-x-0"
                                : "text-zinc-600 opacity-0 group-hover:opacity-100 -translate-x-1 group-hover:translate-x-0"
                            }`} />
                          </div>
                        </button>
                      );
                    })}
                    </div>
                  );
                })}

                {/* Footer */}
                <div className="px-5 py-3 flex items-center justify-between"
                  style={{ borderTop: "1px solid rgba(255,255,255,0.05)", marginTop: "4px" }}>
                  <span className="text-[11px] text-zinc-600">
                    <span className="text-zinc-400 font-semibold tabular-nums">{totalResults}</span> result{totalResults !== 1 ? "s" : ""}
                  </span>
                  <div className="flex items-center gap-3 text-[10px] text-zinc-700">
                    {["imei:", "status:", "supplier:"].map((op) => (
                      <span key={op} className="font-mono">{op}</span>
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