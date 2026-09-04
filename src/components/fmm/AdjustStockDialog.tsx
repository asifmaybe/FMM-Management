import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ArrowDownRight, ArrowUpRight, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Accessory, type AccessoryMovementType } from "@/lib/fmm-types";
import { useFmm } from "@/lib/fmm-store";
import { TakaSign } from "./Taka";

export function AdjustStockDialog({
  open,
  onOpenChange,
  accessory,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accessory: Accessory | null;
}) {
  const { adjustAccessoryStock } = useFmm();

  const [type, setType] = useState<AccessoryMovementType>("Manual Adjustment");
  const [direction, setDirection] = useState<"in" | "out">("in");
  const [quantity, setQuantity] = useState("1");
  const [unitPrice, setUnitPrice] = useState("");
  const [reason, setReason] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

  useEffect(() => {
    if (accessory) {
      setUnitPrice(String(accessory.purchase_price));
      setQuantity("1");
      setReason("");
      setType("Manual Adjustment");
      setDirection("in");
      setDate(new Date().toISOString().slice(0, 10));
    }
  }, [accessory, open]);

  if (!accessory) return null;

  const handleTypeChange = (newType: AccessoryMovementType) => {
    setType(newType);
    if (newType === "Purchase" || newType === "Customer Return" || newType === "Manual Adjustment") {
      setDirection("in");
    } else if (newType === "Damage/Loss" || newType === "Supplier Return" || newType === "Sale") {
      setDirection("out");
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const qty = Number(quantity);
    if (isNaN(qty) || qty <= 0) {
      toast.error("Please enter a valid quantity greater than 0.");
      return;
    }
    if (!reason.trim()) {
      toast.error("Please enter a reason for this stock adjustment.");
      return;
    }

    adjustAccessoryStock({
      accessory_id: accessory.id,
      type,
      quantity: qty,
      direction,
      unit_price: Number(unitPrice) || accessory.purchase_price,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      reason: reason.trim(),
    });

    const newEst = direction === "in" ? accessory.quantity + qty : Math.max(0, accessory.quantity - qty);
    toast.success(`Stock adjusted: ${accessory.name} is now ${newEst} ${accessory.unit}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Scale className="size-5 text-primary" />
            Adjust Stock — {accessory.name}
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Current Quantity: <span className="font-bold text-foreground text-sm">{accessory.quantity} {accessory.unit}</span>
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label className="text-xs font-semibold">Movement Type</Label>
            <select
              value={type}
              onChange={(e) => handleTypeChange(e.target.value as AccessoryMovementType)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="Manual Adjustment">Manual Adjustment (+ in / - out)</option>
              <option value="Purchase">Purchase / Restock (+ in)</option>
              <option value="Customer Return">Customer Return (+ in)</option>
              <option value="Damage/Loss">Damage / Defective / Loss (- out)</option>
              <option value="Supplier Return">Return to Supplier (- out)</option>
              <option value="Stock Correction">Stock Audit Correction</option>
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs font-semibold">Direction</Label>
              <div className="mt-1 flex rounded-lg border border-border overflow-hidden">
                <button
                  type="button"
                  onClick={() => setDirection("in")}
                  className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${
                    direction === "in" ? "bg-success text-success-foreground" : "bg-card hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <ArrowUpRight className="size-3.5" /> In (Add)
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("out")}
                  className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-1 ${
                    direction === "out" ? "bg-destructive text-destructive-foreground" : "bg-card hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <ArrowDownRight className="size-3.5" /> Out (Deduct)
                </button>
              </div>
            </div>

            <div>
              <Label htmlFor="adj_qty" className="text-xs font-semibold">Quantity ({accessory.unit})</Label>
              <Input
                id="adj_qty"
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="adj_cost" className="text-xs font-semibold">Unit Cost (<TakaSign />)</Label>
              <Input
                id="adj_cost"
                type="number"
                min="0"
                value={unitPrice}
                onChange={(e) => setUnitPrice(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="adj_date" className="text-xs font-semibold">Date</Label>
              <Input
                id="adj_date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="adj_reason" className="text-xs font-semibold">
              Reason / Reference <span className="text-destructive">*</span>
            </Label>
            <Input
              id="adj_reason"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Restocked 20 units from Dhaka wholesale"
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl">
              Save Adjustment
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
