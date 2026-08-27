import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import type { PhoneCondition } from "@/lib/fmm-types";
import { TakaSign } from "@/components/fmm/Taka";

const conditions: PhoneCondition[] = ["New", "Used - A", "Used - B", "Refurbished"];

export function AddPhoneDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, addPhone } = useFmm();
  const [form, setForm] = useState({
    imei: "",
    imei_secondary: "",
    battery_health: "",
    brand: "",
    model: "",
    storage_ram: "",
    condition: "New" as PhoneCondition,
    supplier_id: state.suppliers[0]?.id ?? "",
    purchase_price: "",
    selling_price: "",
    condition_notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.imei || !form.brand || !form.model || !form.purchase_price) {
      toast.error("IMEI, brand, model and purchase price are required.");
      return;
    }
    addPhone({
      imei: form.imei,
      imei_secondary: form.imei_secondary || null,
      battery_health: form.battery_health || null,
      brand: form.brand,
      model: form.model,
      storage_ram: form.storage_ram,
      condition: form.condition,
      source_type: "Supplier Purchase",
      supplier_id: form.supplier_id || null,
      customer_purchase_id: null,
      purchase_price: Number(form.purchase_price),
      selling_price: form.selling_price ? Number(form.selling_price) : null,
      status: "Available",
      condition_notes: form.condition_notes,
      damage_checklist: { screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false },
      warranty_repair_notes: "",
    });
    toast.success("Phone added to stock");
    onOpenChange(false);
    setForm((f) => ({ ...f, imei: "", imei_secondary: "", battery_health: "", brand: "", model: "", storage_ram: "", purchase_price: "", selling_price: "" }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Phone (Supplier Purchase)</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="IMEI">
            <Input value={form.imei} onChange={(e) => set("imei", e.target.value)} placeholder="15-digit IMEI" />
          </Field>
          <Field label="Secondary IMEI (optional)">
            <Input value={form.imei_secondary} onChange={(e) => set("imei_secondary", e.target.value)} placeholder="Optional 2nd IMEI" />
          </Field>
          <Field label="Supplier">
            <select
              value={form.supplier_id}
              onChange={(e) => set("supplier_id", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {state.suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Brand">
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="Samsung" />
          </Field>
          <Field label="Model">
            <Input value={form.model} onChange={(e) => set("model", e.target.value)} placeholder="Galaxy S23" />
          </Field>
          <Field label="Storage / RAM">
            <Input value={form.storage_ram} onChange={(e) => set("storage_ram", e.target.value)} placeholder="8GB / 256GB" />
          </Field>
          <Field label="Condition">
            <select
              value={form.condition}
              onChange={(e) => set("condition", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {conditions.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Battery Health (optional)">
            <Input value={form.battery_health} onChange={(e) => set("battery_health", e.target.value)} placeholder="e.g. 89%" />
          </Field>
          <Field label={<>Purchase Price (<TakaSign />)</>}>
            <Input type="number" value={form.purchase_price} onChange={(e) => set("purchase_price", e.target.value)} />
          </Field>
          <Field label={<>Selling Price (<TakaSign />)</>}>
            <Input type="number" value={form.selling_price} onChange={(e) => set("selling_price", e.target.value)} />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Save to Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
