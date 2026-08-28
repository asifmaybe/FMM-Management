import { useState, useEffect } from "react";
import { toast } from "sonner";
import { ShoppingBag } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import type { PaymentStatus, Phone } from "@/lib/fmm-types";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export function SellPhoneDialog({
  open,
  onOpenChange,
  phone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: Phone | null;
}) {
  const { recordSale } = useFmm();

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    sold_price: "",
    payment_status: "Paid" as PaymentStatus,
    notes: "",
  });

  useEffect(() => {
    if (phone && open) {
      setForm({
        customer_name: "",
        customer_phone: "",
        sold_price: phone.sold_price ? String(phone.sold_price) : phone.selling_price ? String(phone.selling_price) : "",
        payment_status: "Paid",
        notes: "",
      });
    }
  }, [phone, open]);

  if (!phone) return null;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.customer_name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!form.sold_price || isNaN(Number(form.sold_price)) || Number(form.sold_price) <= 0) {
      toast.error("Please enter a valid sold price.");
      return;
    }

    recordSale({
      phone_id: phone.id,
      type: "Sale",
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      amount: Number(form.sold_price),
      payment_status: form.payment_status,
      notes: form.notes.trim(),
    });

    toast.success(`Sold ${phone.brand} ${phone.model} to ${form.customer_name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-emerald-600" />
            Sell Phone — {phone.brand} {phone.model}
          </DialogTitle>
        </DialogHeader>

        {/* Reference Price Details */}
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-3 text-xs">
          <div>
            <span className="text-muted-foreground">IMEI:</span>{" "}
            <span className="font-mono font-medium">{phone.imei}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Purchase Price:</span>{" "}
            <span className="font-semibold"><Taka value={phone.purchase_price} /></span>
          </div>
          <div>
            <span className="text-muted-foreground">Target Selling Price:</span>{" "}
            <span className="font-semibold">
              {phone.selling_price ? <Taka value={phone.selling_price} /> : "—"}
            </span>
          </div>
          <div>
            <span className="text-muted-foreground">Status:</span>{" "}
            <span className="font-medium text-primary">{phone.status}</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="customer_name" className="text-xs font-medium">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="customer_name"
              required
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              placeholder="e.g. Rahim Ali"
              className="mt-1 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="customer_phone" className="text-xs font-medium">
              Customer Phone Number
            </Label>
            <Input
              id="customer_phone"
              value={form.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
              placeholder="e.g. 01700-000000"
              className="mt-1 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="sold_price" className="text-xs font-medium">
                Sold Price (<TakaSign />) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="sold_price"
                type="number"
                required
                value={form.sold_price}
                onChange={(e) => set("sold_price", e.target.value)}
                placeholder="Final sold price"
                className="mt-1 rounded-xl font-medium"
              />
            </div>

            <div>
              <Label htmlFor="payment_status" className="text-xs font-medium">
                Payment Status
              </Label>
              <select
                id="payment_status"
                value={form.payment_status}
                onChange={(e) => set("payment_status", e.target.value as PaymentStatus)}
                className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="notes" className="text-xs font-medium">
              Notes (Optional)
            </Label>
            <Input
              id="notes"
              value={form.notes}
              onChange={(e) => set("notes", e.target.value)}
              placeholder="Warranty details, payment method, etc."
              className="mt-1 rounded-xl"
            />
          </div>

          <DialogFooter className="gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              Confirm Sale
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
