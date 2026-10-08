import { createFileRoute, Link } from "@tanstack/react-router";
import { ChevronRight, Package, Plus, Smartphone } from "lucide-react";
import { useMemo, useState } from "react";
import { AddSupplierDialog } from "@/components/fmm/AddSupplierDialog";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { Button } from "@/components/ui/button";
import { supplierDueBalance, totalSuppliersDue, useFmm } from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";
import type { SupplierType } from "@/lib/fmm-types";

export const Route = createFileRoute("/suppliers/")({
  head: () => ({
    meta: [
      { title: "Supplier Directory — Faridpur Mobile Mart" },
      { name: "description", content: "Monitor stock sources, supplied units, current stock and purchase value per supplier." },
      { property: "og:title", content: "Supplier Directory — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage stock sources and monitor transaction volumes and due balances." },
    ],
  }),
  component: SuppliersPage,
});

function SuppliersPage() {
  const { state } = useFmm();
  const [addOpen, setAddOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<SupplierType>("Phone");

  const totalDues = totalSuppliersDue(state);

  const phoneSuppliers = useMemo(
    () => state.suppliers.filter((s) => s.supplier_type === "Phone"),
    [state.suppliers],
  );
  const accessorySuppliers = useMemo(
    () => state.suppliers.filter((s) => s.supplier_type === "Accessory"),
    [state.suppliers],
  );

  const phoneSuppliersDue = useMemo(
    () => phoneSuppliers.reduce((sum, s) => sum + supplierDueBalance(state, s.id), 0),
    [phoneSuppliers, state],
  );
  const accessorySuppliersDue = useMemo(
    () => accessorySuppliers.reduce((sum, s) => sum + supplierDueBalance(state, s.id), 0),
    [accessorySuppliers, state],
  );
  const phoneSuppliersWithDue = useMemo(
    () => phoneSuppliers.filter((s) => supplierDueBalance(state, s.id) > 0).length,
    [phoneSuppliers, state],
  );
  const accessorySuppliersWithDue = useMemo(
    () => accessorySuppliers.filter((s) => supplierDueBalance(state, s.id) > 0).length,
    [accessorySuppliers, state],
  );

  const tabs: { type: SupplierType; label: string; icon: React.ElementType; count: number }[] = [
    { type: "Phone", label: "Phone Suppliers", icon: Smartphone, count: phoneSuppliers.length },
    { type: "Accessory", label: "Accessory Suppliers", icon: Package, count: accessorySuppliers.length },
  ];

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Supplier Directory"
          subtitle="Manage stock sources, track supplier liabilities and payments."
          actions={
            <Button className="rounded-xl" onClick={() => setAddOpen(true)}>
              <Plus className="size-4" />
              Add Supplier
            </Button>
          }
        />
        <AddSupplierDialog open={addOpen} onOpenChange={setAddOpen} defaultType={activeTab} />

        {/* Global Supplier Liability Overview */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className={`rounded-xl border p-4.5 ${totalDues > 0 ? "border-destructive/40 bg-danger-soft/40" : "border-border bg-card"}`}>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">TOTAL OUTSTANDING DUES</p>
            <p className={`mt-2 text-2xl font-bold ${totalDues > 0 ? "text-destructive" : "text-success"}`}>
              <Taka value={totalDues} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Owed to suppliers for sold inventory</p>
          </div>

          <div className={`rounded-xl border p-4.5 ${phoneSuppliersDue > 0 ? "border-destructive/30 bg-card" : "border-border bg-card"}`}>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">PHONE SUPPLIERS DUE</p>
            <p className={`mt-2 text-2xl font-bold ${phoneSuppliersDue > 0 ? "text-destructive" : "text-success"}`}>
              <Taka value={phoneSuppliersDue} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {phoneSuppliersDue > 0 ? (
                <span>{phoneSuppliersWithDue} partner{phoneSuppliersWithDue !== 1 ? "s" : ""} with dues · {phoneSuppliers.length} total</span>
              ) : (
                <span>All {phoneSuppliers.length} phone partners settled</span>
              )}
            </p>
          </div>

          <div className={`rounded-xl border p-4.5 ${accessorySuppliersDue > 0 ? "border-destructive/30 bg-card" : "border-border bg-card"}`}>
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">ACCESSORY SUPPLIERS DUE</p>
            <p className={`mt-2 text-2xl font-bold ${accessorySuppliersDue > 0 ? "text-destructive" : "text-success"}`}>
              <Taka value={accessorySuppliersDue} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {accessorySuppliersDue > 0 ? (
                <span>{accessorySuppliersWithDue} partner{accessorySuppliersWithDue !== 1 ? "s" : ""} with dues · {accessorySuppliers.length} total</span>
              ) : (
                <span>All {accessorySuppliers.length} accessory partners settled</span>
              )}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4.5">
            <p className="text-xs font-semibold tracking-wide text-muted-foreground">SUPPLIER PAYMENTS RECORDED</p>
            <p className="mt-2 text-2xl font-bold text-success">
              <Taka value={(state.supplier_payments ?? []).reduce((s, p) => s + p.amount, 0)} />
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Total cash/bank clearances logged</p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="mb-5 flex items-center gap-2 border-b border-border">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const active = activeTab === tab.type;
            return (
              <button
                key={tab.type}
                onClick={() => setActiveTab(tab.type)}
                className={`flex items-center gap-2 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors -mb-px ${
                  active
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="size-4" />
                {tab.label}
                <span
                  className={`ml-1 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                    active ? "bg-primary/15 text-primary" : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {tab.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Supplier Cards */}
        {activeTab === "Phone" ? (
          <PhoneSupplierGrid suppliers={phoneSuppliers} state={state} />
        ) : (
          <AccessorySupplierGrid suppliers={accessorySuppliers} state={state} />
        )}
      </div>
    </AppShell>
  );
}

function PhoneSupplierGrid({
  suppliers,
  state,
}: {
  suppliers: ReturnType<typeof useFmm>["state"]["suppliers"];
  state: ReturnType<typeof useFmm>["state"];
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
        <Smartphone className="mx-auto mb-3 size-8 opacity-40" />
        <p className="font-medium">No phone suppliers yet</p>
        <p className="mt-1 text-xs">Click "Add Supplier" and choose Phone Supplier</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {suppliers.map((s) => {
        const phones = state.phones.filter((p) => p.supplier_id === s.id);
        const current = phones.filter((p) => p.status === "Available").length;
        const value = phones.reduce((sum, p) => sum + p.purchase_price, 0);
        const due = supplierDueBalance(state, s.id);
        return (
          <Link
            key={s.id}
            to="/suppliers/$supplierId"
            params={{ supplierId: s.id }}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="rounded-lg bg-primary/10 p-2.5 text-primary">
                <Smartphone className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-xl font-bold">{s.name}</p>
                <p className={`text-sm ${s.status === "Active Partner" ? "text-success" : "text-warning"}`}>
                  {"\u25cf"} {s.status}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Stat
                label="CONSIGNMENT DUE"
                value={
                  <span className={due > 0 ? "font-bold text-destructive" : "font-semibold text-success"}>
                    <Taka value={due} />
                  </span>
                }
              />
              <Stat label="CURRENT STOCK" value={`${current} units`} />
              <Stat label="TOTAL VALUE" value={<Taka value={value} />} />
              <Stat label="TOTAL SUPPLIED" value={`${phones.length} units`} />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

function AccessorySupplierGrid({
  suppliers,
  state,
}: {
  suppliers: ReturnType<typeof useFmm>["state"]["suppliers"];
  state: ReturnType<typeof useFmm>["state"];
}) {
  if (suppliers.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-border bg-card py-16 text-center text-muted-foreground">
        <Package className="mx-auto mb-3 size-8 opacity-40" />
        <p className="font-medium">No accessory suppliers yet</p>
        <p className="mt-1 text-xs">Click "Add Supplier" and choose Accessory Supplier</p>
      </div>
    );
  }
  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {suppliers.map((s) => {
        const accessories = (state.accessories ?? []).filter((a) => a.supplier_id === s.id);
        const totalUnits = accessories.reduce((sum, a) => sum + (a.quantity ?? 0), 0);
        const totalValue = accessories.reduce((sum, a) => sum + (a.purchase_price ?? 0) * (a.quantity ?? 0), 0);
        const categories = [...new Set(accessories.map((a) => a.category))].slice(0, 3);
        return (
          <Link
            key={s.id}
            to="/suppliers/$supplierId"
            params={{ supplierId: s.id }}
            className="rounded-xl border border-border bg-card p-5 transition-shadow hover:shadow-sm"
          >
            <div className="flex items-center gap-3 border-b border-border pb-4">
              <span className="rounded-lg bg-amber-500/10 p-2.5 text-amber-500">
                <Package className="size-5" />
              </span>
              <div className="flex-1">
                <p className="text-xl font-bold">{s.name}</p>
                <p className={`text-sm ${s.status === "Active Partner" ? "text-success" : "text-warning"}`}>
                  {"\u25cf"} {s.status}
                </p>
              </div>
              <ChevronRight className="size-5 text-muted-foreground" />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Stat label="LINKED ACCESSORIES" value={`${accessories.length} items`} />
              <Stat label="CURRENT STOCK" value={`${totalUnits} units`} />
              <Stat label="STOCK VALUE" value={<Taka value={totalValue} />} />
              <Stat
                label="CATEGORIES"
                value={
                  categories.length > 0 ? (
                    <span className="text-xs">
                      {categories.join(", ")}
                      {accessories.length > 3 ? "\u2026" : ""}
                    </span>
                  ) : (
                    "\u2014"
                  )
                }
              />
            </div>
          </Link>
        );
      })}
    </div>
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