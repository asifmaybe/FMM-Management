import { useState } from "react";
import { toast } from "sonner";
import { Plus, ShoppingCart, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import { type PurchaseItem } from "@/lib/fmm-types";
import { Taka, TakaSign } from "./Taka";

export function RecordPurchaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, recordPurchase, adjustAccessoryStock } = useFmm();

  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || "");
  const [type, setType] = useState<"Phone" | "Accessory" | "Mixed">("Accessory");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [campaignId, setCampaignId] = useState("");
  const [additionalCost, setAdditionalCost] = useState("0");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<{ accessory_id: string; quantity: string; unit_price: string }[]>([
    { accessory_id: state.accessories[0]?.id || "", quantity: "10", unit_price: String(state.accessories[0]?.purchase_price || 0) },
  ]);

  const handleAddItem = () => {
    const first = state.accessories[0];
    setItems((prev) => [...prev, { accessory_id: first?.id || "", quantity: "10", unit_price: String(first?.purchase_price || 0) }]);
  };

  const handleRemoveItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleItemChange = (idx: number, field: string, value: string) => {
    setItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (field === "accessory_id") {
          const acc = state.accessories.find((a) => a.id === value);
          return { ...it, accessory_id: value, unit_price: String(acc?.purchase_price || 0) };
        }
        return { ...it, [field]: value };
      }),
    );
  };

  const itemsTotal = items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    return sum + q * p;
  }, 0);

  const totalAmount = itemsTotal + (Number(additionalCost) || 0);
  const paid = Number(paidAmount) || 0;
  const due = Math.max(0, totalAmount - paid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Please select a supplier.");
      return;
    }
    if (items.length === 0 || itemsTotal <= 0) {
      toast.error("Please enter at least one valid item in the purchase order.");
      return;
    }

    const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();
    const purchaseItems: PurchaseItem[] = items.map((it) => {
      const acc = state.accessories.find((a) => a.id === it.accessory_id);
      const q = Number(it.quantity) || 0;
      const u = Number(it.unit_price) || 0;
      return {
        type: "accessory",
        id: it.accessory_id,
        name: acc?.name || "Accessory",
        quantity: q,
        unit_price: u,
        total: q * u,
      };
    });

    recordPurchase({
      supplier_id: supplierId,
      date: isoDate,
      type,
      items: purchaseItems,
      total_amount: itemsTotal,
      additional_cost: Number(additionalCost) || 0,
      paid_amount: paid,
      due_amount: due,
      payment_status: due === 0 ? "Paid" : paid > 0 ? "Due" : "Not Paid",
      campaign_id: campaignId || null,
      notes: notes.trim(),
    });

    // Automatically increase accessory stock inventory
    items.forEach((it) => {
      const q = Number(it.quantity) || 0;
      const u = Number(it.unit_price) || 0;
      if (it.accessory_id && q > 0) {
        adjustAccessoryStock({
          accessory_id: it.accessory_id,
          type: "Purchase",
          quantity: q,
          direction: "in",
          unit_price: u,
          date: isoDate,
          reason: `Supplier purchase batch (${state.suppliers.find((s) => s.id === supplierId)?.name || "Supplier"})`,
        });
      }
    });

    toast.success(`Purchase order of ${totalAmount.toLocaleString()} ৳ recorded and stock updated.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="size-5 text-primary" />
            Record Supplier Procurement / Purchase Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="pur_sup" className="text-xs font-semibold">
                  Supplier <span className="text-destructive">*</span>
                </Label>
                <select
                  id="pur_sup"
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Select Supplier…</option>
                  {(state.suppliers ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.contact})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <Label htmlFor="pur_date" className="text-xs font-semibold">Purchase Date</Label>
                <Input
                  id="pur_date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pur_type" className="text-xs font-semibold">Category Type</Label>
                <select
                  id="pur_type"
                  value={type}
                  onChange={(e) => setType(e.target.value as "Phone" | "Accessory" | "Mixed")}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Accessory">Accessories Batch</option>
                  <option value="Phone">Phones Stock Batch</option>
                  <option value="Mixed">Mixed Inventory</option>
                </select>
              </div>

              <div>
                <Label htmlFor="pur_cmp" className="text-xs font-semibold">Link to Campaign (Optional)</Label>
                <select
                  id="pur_cmp"
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">No Campaign</option>
                  {(state.campaigns ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.status})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Items Section */}
            <div className="border rounded-xl p-4 bg-card">
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Purchased Items & Quantities
                </Label>
                <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={handleAddItem}>
                  <Plus className="size-3" /> Add Item
                </Button>
              </div>

              <div className="space-y-2.5">
                {items.map((it, idx) => (
                  <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-secondary/40 p-2.5 rounded-lg text-xs">
                    <div className="flex-1 min-w-[160px]">
                      <select
                        value={it.accessory_id}
                        onChange={(e) => handleItemChange(idx, "accessory_id", e.target.value)}
                        className="h-8 w-full rounded-md border border-input bg-card px-2 text-xs"
                      >
                        {(state.accessories ?? []).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.category})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="w-24">
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="h-8 text-xs"
                      />
                    </div>

                    <div className="w-28">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Unit Cost"
                        value={it.unit_price}
                        onChange={(e) => handleItemChange(idx, "unit_price", e.target.value)}
                        className="h-8 text-xs font-medium"
                      />
                    </div>

                    <div className="w-24 text-right font-bold text-foreground">
                      <Taka value={(Number(it.quantity) || 0) * (Number(it.unit_price) || 0)} />
                    </div>

                    {items.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="p-1 hover:text-destructive text-muted-foreground rounded"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>

            {/* Financial Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="pur_add" className="text-xs font-semibold">Additional Costs / Courier (<TakaSign />)</Label>
                <Input
                  id="pur_add"
                  type="number"
                  min="0"
                  value={additionalCost}
                  onChange={(e) => setAdditionalCost(e.target.value)}
                  className="mt-1"
                />
              </div>

              <div>
                <Label htmlFor="pur_paid" className="text-xs font-semibold">Amount Paid Now (<TakaSign />)</Label>
                <Input
                  id="pur_paid"
                  type="number"
                  min="0"
                  max={totalAmount}
                  value={paidAmount}
                  onChange={(e) => setPaidAmount(e.target.value)}
                  placeholder={`Max: ${totalAmount}`}
                  className="mt-1 font-semibold text-success"
                />
              </div>

              <div>
                <Label className="text-xs font-semibold">Remaining Due</Label>
                <div className="mt-1 h-9 rounded-md bg-secondary/60 flex items-center px-3 font-bold text-destructive text-sm">
                  <Taka value={due} />
                </div>
              </div>

              <div className="sm:col-span-3">
                <Label htmlFor="pur_notes" className="text-xs font-semibold">Purchase Notes / Invoice Ref</Label>
                <Input
                  id="pur_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Challan #8491, courier tracking #3491"
                  className="mt-1"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Total Order Cost:</span>
              <p className="text-xl font-bold text-foreground"><Taka value={totalAmount} /></p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl">
                Confirm Purchase Order
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
