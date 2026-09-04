import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Layers, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type AccessoryCategory, type Accessory } from "@/lib/fmm-types";
import { useFmm } from "@/lib/fmm-store";
import { TakaSign } from "./Taka";

const CATEGORIES: AccessoryCategory[] = [
  "Charger",
  "Charging Cable",
  "Headphone",
  "Earbuds",
  "Power Bank",
  "Phone Cover",
  "Screen Protector",
  "Adapter",
  "Data Cable",
  "Other",
];

export function AddAccessoryDialog({
  open,
  onOpenChange,
  editItem,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editItem?: Accessory | null;
}) {
  const { state, addAccessory, updateAccessory } = useFmm();

  const [form, setForm] = useState({
    name: "",
    category: "Charger" as AccessoryCategory | string,
    brand: "",
    model_sku: "",
    variant: "",
    unit: "pcs",
    purchase_price: "",
    selling_price: "",
    quantity: "",
    min_threshold: "5",
    supplier_id: "",
    notes: "",
    status: "Active" as "Active" | "Discontinued",
  });

  useEffect(() => {
    if (editItem) {
      setForm({
        name: editItem.name,
        category: editItem.category,
        brand: editItem.brand,
        model_sku: editItem.model_sku,
        variant: editItem.variant,
        unit: editItem.unit || "pcs",
        purchase_price: String(editItem.purchase_price),
        selling_price: String(editItem.selling_price),
        quantity: String(editItem.quantity),
        min_threshold: String(editItem.min_threshold),
        supplier_id: editItem.supplier_id || "",
        notes: editItem.notes,
        status: editItem.status,
      });
    } else {
      setForm({
        name: "",
        category: "Charger",
        brand: "",
        model_sku: "",
        variant: "",
        unit: "pcs",
        purchase_price: "",
        selling_price: "",
        quantity: "0",
        min_threshold: "5",
        supplier_id: "",
        notes: "",
        status: "Active",
      });
    }
  }, [editItem, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error("Product name is required.");
      return;
    }
    const buy = Number(form.purchase_price) || 0;
    const sell = Number(form.selling_price) || 0;
    const qty = Number(form.quantity) || 0;
    const min = Number(form.min_threshold) || 0;

    if (editItem) {
      updateAccessory(editItem.id, {
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim(),
        model_sku: form.model_sku.trim(),
        variant: form.variant.trim(),
        unit: form.unit.trim() || "pcs",
        purchase_price: buy,
        selling_price: sell,
        quantity: qty,
        min_threshold: min,
        supplier_id: form.supplier_id || null,
        notes: form.notes.trim(),
        status: form.status,
      });
      toast.success("Accessory product updated.");
    } else {
      addAccessory({
        name: form.name.trim(),
        category: form.category,
        brand: form.brand.trim(),
        model_sku: form.model_sku.trim(),
        variant: form.variant.trim(),
        unit: form.unit.trim() || "pcs",
        purchase_price: buy,
        selling_price: sell,
        quantity: qty,
        min_threshold: min,
        supplier_id: form.supplier_id || null,
        notes: form.notes.trim(),
        status: form.status,
      });
      toast.success(`Added ${form.name.trim()} to accessories inventory.`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Layers className="size-5 text-primary" />
            {editItem ? "Edit Accessory Product" : "Add Accessory Product"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-2">
                <Label htmlFor="acc_name" className="text-xs font-semibold">
                  Product Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="acc_name"
                  required
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Baseus Cafule USB-C Fast Cable 1m"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_cat" className="text-xs font-semibold">
                  Category <span className="text-destructive">*</span>
                </Label>
                <select
                  id="acc_cat"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="acc_brand" className="text-xs font-semibold">Brand / Manufacturer</Label>
                <Input
                  id="acc_brand"
                  value={form.brand}
                  onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  placeholder="e.g. Baseus, Anker, Remax, OEM"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_sku" className="text-xs font-semibold">Model / SKU</Label>
                <Input
                  id="acc_sku"
                  value={form.model_sku}
                  onChange={(e) => setForm((f) => ({ ...f, model_sku: e.target.value }))}
                  placeholder="e.g. CATKLF-GG1"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_variant" className="text-xs font-semibold">Variant / Specs</Label>
                <Input
                  id="acc_variant"
                  value={form.variant}
                  onChange={(e) => setForm((f) => ({ ...f, variant: e.target.value }))}
                  placeholder="e.g. 1m / 66W Grey, 20W White"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_buy" className="text-xs font-semibold">
                  Purchase Unit Cost (<TakaSign />) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="acc_buy"
                  type="number"
                  required
                  min="0"
                  value={form.purchase_price}
                  onChange={(e) => setForm((f) => ({ ...f, purchase_price: e.target.value }))}
                  placeholder="e.g. 250"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_sell" className="text-xs font-semibold">
                  Selling Price (<TakaSign />) <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="acc_sell"
                  type="number"
                  required
                  min="0"
                  value={form.selling_price}
                  onChange={(e) => setForm((f) => ({ ...f, selling_price: e.target.value }))}
                  placeholder="e.g. 400"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_qty" className="text-xs font-semibold">
                  {editItem ? "Current Stock Quantity" : "Initial Stock Quantity"}
                </Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    id="acc_qty"
                    type="number"
                    min="0"
                    value={form.quantity}
                    onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                    placeholder="e.g. 50"
                  />
                  <Input
                    value={form.unit}
                    onChange={(e) => setForm((f) => ({ ...f, unit: e.target.value }))}
                    placeholder="pcs"
                    className="w-20"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="acc_min" className="text-xs font-semibold">Low Stock Alert Threshold</Label>
                <Input
                  id="acc_min"
                  type="number"
                  min="0"
                  value={form.min_threshold}
                  onChange={(e) => setForm((f) => ({ ...f, min_threshold: e.target.value }))}
                  placeholder="e.g. 5"
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="acc_sup" className="text-xs font-semibold">Supplier</Label>
                <select
                  id="acc_sup"
                  value={form.supplier_id}
                  onChange={(e) => setForm((f) => ({ ...f, supplier_id: e.target.value }))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">None / Open Market</option>
                  {(state.suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contact})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="acc_status" className="text-xs font-semibold">Status</Label>
                <select
                  id="acc_status"
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as "Active" | "Discontinued" }))}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Active">Active</option>
                  <option value="Discontinued">Discontinued</option>
                </select>
              </div>

              <div className="sm:col-span-2">
                <Label htmlFor="acc_notes" className="text-xs font-semibold">Notes / Description</Label>
                <Input
                  id="acc_notes"
                  value={form.notes}
                  onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                  placeholder="e.g. Box packed with authentic hologram verification"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between sm:justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl">
              {editItem ? "Save Changes" : "Create Product"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
