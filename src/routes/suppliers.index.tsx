import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Plus, Store } from "lucide-react";
import { useState } from "react";
import { AddSupplierDialog } from "@/components/fmm/AddSupplierDialog";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { Button } from "@/components/ui/button";
import { useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export const Route = createFileRoute("/suppliers/")({
  head: () => ({
    meta: [
      { title: "Supplier Directory — Faridpur Mobile Mart" },
      { name: "description", content: "Monitor stock sources, supplied units, current stock and purchase value per supplier." },
      { property: "og:title", content: "Supplier Directory — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage stock sources and monitor transaction volumes." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { state } = useFmm();
  const [addOpen, setAddOpen] = useState(false);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Supplier Directory"
          subtitle="Manage stock sources and monitor transaction volumes."
          actions={
            <Button className="rounded-xl" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add Supplier
            </Button>
          }
        />
        <AddSupplierDialog open={addOpen} onOpenChange={setAddOpen} />

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.suppliers.map((s) => {
            const phones = state.phones.filter((p) => p.supplier_id === s.id);
            const current = phones.filter((p) => p.status === "Available").length;
            const value = phones.reduce((sum, p) => sum + p.purchase_price, 0);
            const last = phones
              .map((p) => p.created_at)
              .sort()
              .at(-1);
            return (
              <Link
                key={s.id}
                to="/suppliers/$supplierId"
                params={{ supplierId: s.id }}
                className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
              >
                <div className="flex items-center gap-3 border-b border-border pb-4">
                  <span className="rounded-lg bg-secondary p-2.5">
                    <Store className="size-5" />
                  </span>
                  <div className="flex-1">
                    <p className="text-xl font-bold">{s.name}</p>
                    <p className={`text-sm ${s.status === "Active Partner" ? "text-success" : "text-warning"}`}>
                      ● {s.status}
                    </p>
                  </div>
                  <ChevronRight className="size-5 text-muted-foreground" />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-4">
                  <Stat label="TOTAL SUPPLIED" value={`${phones.length} units`} />
                  <Stat label="CURRENT STOCK" value={`${current} units`} />
                  <Stat label="TOTAL VALUE" value={<Taka value={value} />} />
                  <Stat label="LAST PURCHASE" value={last ? new Date(last).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"} />
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </AppShell>
  );
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-1 font-semibold">{value}</p>
    </div>
  );
}
