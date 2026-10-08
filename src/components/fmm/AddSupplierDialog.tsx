import { useState } from "react";
import { toast } from "sonner";
import { Smartphone, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/fmm/AddPhoneDialog";
import { useFmm } from "@/lib/fmm-store";
import type { SupplierStatus, SupplierType } from "@/lib/fmm-types";

const statuses: SupplierStatus[] = ["Active Partner", "Pending Review"];

export function AddSupplierDialog({
  open,
  onOpenChange,
  defaultType = "Phone",
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultType?: SupplierType;
}) {
  const { addSupplier } = useFmm();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    status: "Active Partner" as SupplierStatus,
    supplier_type: defaultType as SupplierType,
    notes: "",
  });

  const handleOpenChange = (v: boolean) => {
    if (v) setForm((f) => ({ ...f, supplier_type: defaultType }));
    onOpenChange(v);
  };

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim() || !form.contact.trim()) {
      toast.error("Supplier name and contact number are required.");
      return;
    }
    addSupplier({
      name: form.name.trim(),
      contact: form.contact.trim(),
      status: form.status,
      supplier_type: form.supplier_type,
      notes: form.notes.trim(),
    });
    toast.success(`${form.name.trim()} added as ${form.supplier_type} Supplier`);
    onOpenChange(false);
    setForm({ name: "", contact: "", status: "Active Partner", supplier_type: defaultType, notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
        </DialogHeader>

        {/* Supplier Type Toggle */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground tracking-wide">SUPPLIER TYPE</p>
          <div className="grid grid-cols-2 gap-2">
            {(["Phone", "Accessory"] as SupplierType[]).map((type) => {
              const Icon = type === "Phone" ? Smartphone : Package;
              const active = form.supplier_type === type;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => set("supplier_type", type)}
                  className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                    active
                      ? "border-primary bg-primary/10 text-primary shadow-xs"
                      : "border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground"
                  }`}
                >
                  <Icon className="size-4 shrink-0" />
                  <div className="text-left">
                    <p className="font-semibold">{type} Supplier</p>
                    <p className="text-[11px] font-normal leading-tight opacity-75">
                      {type === "Phone" ? "Supplies handsets & devices" : "Supplies cases, cables & accessories"}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Zakaria Traders" />
          </Field>
          <Field label="Contact Number">
            <Input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="01XXX-XXXXXX" />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Dhaka wholesale" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Save Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

