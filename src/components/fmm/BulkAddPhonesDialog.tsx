import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import type { PhoneCondition } from "@/lib/fmm-types";
import { TakaSign } from "@/components/fmm/Taka";

const conditions: PhoneCondition[] = ["New", "Used - A", "Used - B", "Refurbished"];

interface Row {
  imei: string;
  brand: string;
  model: string;
  storage_ram: string;
  condition: PhoneCondition;
  purchase_price: string;
  selling_price: string;
}

const emptyRow = (): Row => ({
  imei: "",
  brand: "",
  model: "",
  storage_ram: "",
  condition: "New",
  purchase_price: "",
  selling_price: "",
});

export function BulkAddPhonesDialog({
  open,
  onOpenChange,
  supplierId,
  supplierName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  supplierId: string;
  supplierName: string;
}) {
  const { addPhone } = useFmm();
  const [rows, setRows] = useState<Row[]>([emptyRow(), emptyRow(), emptyRow()]);

  const set = (i: number, k: keyof Row, v: string) =>
    setRows((r) => r.map((row, idx) => (idx === i ? { ...row, [k]: v } : row)));

  const filled = rows.filter((r) => r.imei || r.brand || r.model || r.purchase_price);

  const submit = () => {
    if (filled.length === 0) {
      toast.error("Fill at least one row.");
      return;
    }
    const invalid = filled.find((r) => !r.imei || !r.brand || !r.model || !r.purchase_price);
    if (invalid) {
      toast.error("Every filled row needs IMEI, brand, model and purchase price.");
      return;
    }
    filled.forEach((r) =>
      addPhone({
        imei: r.imei.trim(),
        imei_secondary: null,
        battery_health: null,
        brand: r.brand.trim(),
        model: r.model.trim(),
        storage_ram: r.storage_ram.trim(),
        condition: r.condition,
        source_type: "Supplier Purchase",
        supplier_id: supplierId,
        customer_purchase_id: null,
        purchase_price: Number(r.purchase_price),
        selling_price: r.selling_price ? Number(r.selling_price) : null,
        status: "Available",
        condition_notes: "",
        damage_checklist: { screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false },
        warranty_repair_notes: "",
      }),
    );
    toast.success(`${filled.length} phone${filled.length > 1 ? "s" : ""} added from ${supplierName}`);
    setRows([emptyRow(), emptyRow(), emptyRow()]);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Bulk Add Phones — {supplierName}</DialogTitle>
        </DialogHeader>

        <div className="max-h-[55vh] overflow-auto rounded-xl border border-border">
          <table className="w-full min-w-[860px] text-sm">
            <thead className="sticky top-0 bg-secondary/80 text-left text-xs text-muted-foreground">
              <tr>
                {["IMEI", "Brand", "Model", "Storage / RAM", "Condition", <>Buy (<TakaSign />)</>, <>Sell (<TakaSign />)</>, ""].map((h, hi) => (
                  <th key={hi} className="px-3 py-2 font-medium">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {rows.map((r, i) => (
                <tr key={i}>
                  <td className="px-2 py-2">
                    <Input className="h-9" value={r.imei} onChange={(e) => set(i, "imei", e.target.value)} placeholder="15-digit" />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-9" value={r.brand} onChange={(e) => set(i, "brand", e.target.value)} placeholder="Samsung" />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-9" value={r.model} onChange={(e) => set(i, "model", e.target.value)} placeholder="Galaxy S23" />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-9" value={r.storage_ram} onChange={(e) => set(i, "storage_ram", e.target.value)} placeholder="8/256" />
                  </td>
                  <td className="px-2 py-2">
                    <select
                      value={r.condition}
                      onChange={(e) => set(i, "condition", e.target.value)}
                      className="h-9 w-full rounded-md border border-input bg-transparent px-2 text-sm"
                    >
                      {conditions.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-9 w-24" type="number" value={r.purchase_price} onChange={(e) => set(i, "purchase_price", e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <Input className="h-9 w-24" type="number" value={r.selling_price} onChange={(e) => set(i, "selling_price", e.target.value)} />
                  </td>
                  <td className="px-2 py-2">
                    <button
                      onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, idx) => idx !== i) : rs))}
                      className="rounded-md p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      aria-label="Remove row"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between">
          <Button variant="outline" className="rounded-xl" onClick={() => setRows((r) => [...r, emptyRow()])}>
            <Plus className="mr-1 size-4" /> Add row
          </Button>
          <span className="text-xs text-muted-foreground">{filled.length} row(s) ready</span>
        </div>

        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Save {filled.length > 0 ? `${filled.length} ` : ""}to Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
