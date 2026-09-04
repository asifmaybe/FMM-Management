import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import {
  Calendar,
  Layers,
  Megaphone,
  Package,
  Receipt,
  Search,
  Smartphone,
  Truck,
  Users,
} from "lucide-react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka } from "./Taka";
import { StatusBadge } from "./StatusBadge";

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

  const q = query.trim().toLowerCase();

  const results = useMemo(() => {
    if (!q) return null;

    const phones = (state.phones ?? []).filter(
      (p) =>
        p.imei.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.model.toLowerCase().includes(q) ||
        (p.storage_ram && p.storage_ram.toLowerCase().includes(q)),
    );

    const accessories = (state.accessories ?? []).filter(
      (a) =>
        a.name.toLowerCase().includes(q) ||
        a.brand.toLowerCase().includes(q) ||
        a.model_sku.toLowerCase().includes(q) ||
        a.category.toLowerCase().includes(q),
    );

    const customers = (state.customers ?? []).filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone.toLowerCase().includes(q) ||
        (c.nid_number && c.nid_number.toLowerCase().includes(q)),
    );

    const suppliers = (state.suppliers ?? []).filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        s.contact.toLowerCase().includes(q) ||
        s.notes.toLowerCase().includes(q),
    );

    const campaigns = (state.campaigns ?? []).filter(
      (cmp) =>
        cmp.name.toLowerCase().includes(q) ||
        cmp.description.toLowerCase().includes(q),
    );

    const transactions = (state.transactions ?? []).filter(
      (t) =>
        t.customer_name.toLowerCase().includes(q) ||
        t.customer_phone.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q),
    );

    return { phones, accessories, customers, suppliers, campaigns, transactions };
  }, [q, state]);

  const totalResults = results
    ? results.phones.length +
      results.accessories.length +
      results.customers.length +
      results.suppliers.length +
      results.campaigns.length +
      results.transactions.length
    : 0;

  const handleSelect = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl p-0 overflow-hidden rounded-2xl gap-0 border-border">
        <div className="flex items-center border-b border-border px-4 py-3.5 gap-3 bg-card">
          <Search className="size-5 text-muted-foreground shrink-0" />
          <Input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search phones (IMEI/model), accessories, customers, suppliers, campaigns…"
            className="border-0 bg-transparent text-base focus-visible:ring-0 focus-visible:ring-offset-0 px-0 h-8 shadow-none"
          />
          <kbd className="hidden sm:inline-block rounded bg-secondary px-2 py-0.5 text-[10px] font-mono text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-[60vh] overflow-y-auto p-4 space-y-4">
          {!q ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              <Search className="size-8 mx-auto mb-2 text-muted-foreground/50" />
              <p>Type to search across the entire inventory, contacts, and records.</p>
            </div>
          ) : totalResults === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              No results found for &ldquo;{query}&rdquo;
            </div>
          ) : (
            <>
              {/* Phones */}
              {results!.phones.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Smartphone className="size-3.5" /> Phones ({results!.phones.length})
                  </h4>
                  <div className="space-y-1">
                    {results!.phones.slice(0, 5).map((p) => (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => handleSelect("/stock")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                      >
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">{p.brand} {p.model}</span>
                          <span className="font-mono text-xs text-muted-foreground">IMEI: {p.imei}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-xs"><Taka value={p.purchase_price} /></span>
                          <StatusBadge status={p.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Accessories */}
              {results!.accessories.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Layers className="size-3.5" /> Accessories ({results!.accessories.length})
                  </h4>
                  <div className="space-y-1">
                    {results!.accessories.slice(0, 5).map((a) => (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => handleSelect("/accessories")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                      >
                        <div>
                          <span className="font-semibold">{a.name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">({a.category})</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground font-medium">{a.quantity} {a.unit} in stock</span>
                          <span className="font-medium text-xs"><Taka value={a.selling_price} /></span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Customers */}
              {results!.customers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Users className="size-3.5" /> Customers ({results!.customers.length})
                  </h4>
                  <div className="space-y-1">
                    {results!.customers.slice(0, 5).map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelect("/customers")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                      >
                        <span className="font-semibold">{c.name}</span>
                        <span className="text-xs text-muted-foreground">{c.phone} · {c.address || "No address"}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Suppliers */}
              {results!.suppliers.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Truck className="size-3.5" /> Suppliers ({results!.suppliers.length})
                  </h4>
                  <div className="space-y-1">
                    {results!.suppliers.slice(0, 5).map((s) => (
                      <button
                        key={s.id}
                        type="button"
                        onClick={() => handleSelect(`/suppliers/${s.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                      >
                        <span className="font-semibold">{s.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{s.contact}</span>
                          <StatusBadge status={s.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Campaigns */}
              {results!.campaigns.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Megaphone className="size-3.5" /> Campaigns ({results!.campaigns.length})
                  </h4>
                  <div className="space-y-1">
                    {results!.campaigns.slice(0, 5).map((cmp) => (
                      <button
                        key={cmp.id}
                        type="button"
                        onClick={() => handleSelect(`/campaigns/${cmp.id}`)}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                      >
                        <span className="font-semibold">{cmp.name}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-muted-foreground">{cmp.start_date} to {cmp.end_date}</span>
                          <StatusBadge status={cmp.status} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Transactions */}
              {results!.transactions.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Receipt className="size-3.5" /> Transactions ({results!.transactions.length})
                  </h4>
                  <div className="space-y-1">
                    {results!.transactions.slice(0, 5).map((t) => (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => handleSelect("/sales")}
                        className="w-full flex items-center justify-between p-2.5 rounded-xl hover:bg-secondary text-left transition-colors text-sm"
                      >
                        <div>
                          <span className="font-medium">{t.customer_name}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{new Date(t.date).toLocaleDateString()}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs"><Taka value={t.amount} /></span>
                          <StatusBadge status={t.payment_status === "Pending" ? "Payment Pending" : "Paid"} />
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
