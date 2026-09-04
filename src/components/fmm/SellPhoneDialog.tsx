import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Megaphone, Package, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import type { PaymentStatus, Phone } from "@/lib/fmm-types";
import { Taka, TakaSign } from "@/components/fmm/Taka";

interface BundledAccessory {
  accessory_id: string;
  quantity: number;
  unit_price: number;
  is_gift?: boolean;
}

export function SellPhoneDialog({
  open,
  onOpenChange,
  phone,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phone: Phone | null;
}) {
  const { state, recordSale } = useFmm();

  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    sold_price: "",
    payment_status: "Paid" as PaymentStatus,
    notes: "",
  });

  const [campaignId, setCampaignId] = useState("");
  const [bundledAccessories, setBundledAccessories] = useState<BundledAccessory[]>([]);
  const [addingAcc, setAddingAcc] = useState(false);
  const [pickedAccId, setPickedAccId] = useState("");
  const [pickedQty, setPickedQty] = useState("1");
  const [pickedPrice, setPickedPrice] = useState("");
  const [isGift, setIsGift] = useState(false);

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeCampaigns = (state.campaigns ?? []).filter(
    (c) => c.status === "Active" && (!c.start_date || c.start_date <= todayStr) && (!c.end_date || c.end_date >= todayStr),
  );

  useEffect(() => {
    if (phone && open) {
      setForm({
        customer_name: "",
        customer_phone: "",
        sold_price: phone.sold_price ? String(phone.sold_price) : phone.selling_price ? String(phone.selling_price) : "",
        payment_status: "Paid",
        notes: "",
      });
      setCampaignId(phone.campaign_id || "");
      setBundledAccessories([]);
      setAddingAcc(false);
      setPickedAccId("");
      setPickedQty("1");
      setPickedPrice("");
      setIsGift(false);
    }
  }, [phone, open]);

  if (!phone) return null;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Accessories in stock (quantity > 0)
  const availableAccessories = state.accessories.filter((a) => a.status === "Active" && a.quantity > 0);

  // When acc changes, pre-fill with its selling price
  const handlePickAcc = (id: string) => {
    setPickedAccId(id);
    const acc = state.accessories.find((a) => a.id === id);
    if (acc) setPickedPrice(isGift ? "0" : String(acc.selling_price));
  };

  const addBundledAcc = () => {
    if (!pickedAccId) { toast.error("Select an accessory."); return; }
    const acc = state.accessories.find((a) => a.id === pickedAccId);
    if (!acc) return;
    const qty = Math.max(1, Number(pickedQty) || 1);
    const price = isGift ? 0 : Number(pickedPrice);
    if (!isGift && (!price || price < 0)) { toast.error("Enter a valid price."); return; }

    // Check available stock (subtract what's already bundled)
    const alreadyBundled = bundledAccessories
      .filter((b) => b.accessory_id === pickedAccId)
      .reduce((s, b) => s + b.quantity, 0);
    if (qty + alreadyBundled > acc.quantity) {
      toast.error(`Only ${acc.quantity - alreadyBundled} unit(s) of "${acc.name}" available in stock.`);
      return;
    }

    setBundledAccessories((prev) => {
      const existingIndex = prev.findIndex((b) => b.accessory_id === pickedAccId && Boolean(b.is_gift) === isGift);
      if (existingIndex >= 0) {
        return prev.map((b, i) =>
          i === existingIndex ? { ...b, quantity: b.quantity + qty, unit_price: price } : b,
        );
      }
      return [...prev, { accessory_id: pickedAccId, quantity: qty, unit_price: price, is_gift: isGift }];
    });
    setAddingAcc(false);
    setPickedAccId("");
    setPickedQty("1");
    setPickedPrice("");
    setIsGift(false);
  };

  const removeAcc = (accId: string, giftFlag?: boolean) =>
    setBundledAccessories((prev) =>
      prev.filter((b) => !(b.accessory_id === accId && Boolean(b.is_gift) === Boolean(giftFlag))),
    );

  const phonePrice = Number(form.sold_price) || 0;
  const accTotal = bundledAccessories.reduce(
    (sum, b) => sum + (b.is_gift ? 0 : b.quantity * b.unit_price),
    0,
  );
  const grandTotal = phonePrice + accTotal;

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
      amount: phonePrice,
      payment_status: form.payment_status,
      campaign_id: campaignId || null,
      notes: form.notes.trim(),
      ...(bundledAccessories.length > 0 ? { accessories: bundledAccessories } : {}),
    });

    const accLine = bundledAccessories.length > 0
      ? ` + ${bundledAccessories.map((b) => {
          const acc = state.accessories.find((a) => a.id === b.accessory_id);
          return `${b.quantity}x ${acc?.name ?? "accessory"}${b.is_gift ? " (🎁 Free Gift)" : ""}`;
        }).join(", ")}`
      : "";

    toast.success(`Sold ${phone.brand} ${phone.model}${accLine} to ${form.customer_name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
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
            <Label htmlFor="spd_customer_name" className="text-xs font-medium">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="spd_customer_name"
              required
              value={form.customer_name}
              onChange={(e) => set("customer_name", e.target.value)}
              placeholder="e.g. Rahim Ali"
              className="mt-1 rounded-xl"
              autoFocus
            />
          </div>

          <div>
            <Label htmlFor="spd_customer_phone" className="text-xs font-medium">
              Customer Phone Number
            </Label>
            <Input
              id="spd_customer_phone"
              value={form.customer_phone}
              onChange={(e) => set("customer_phone", e.target.value)}
              placeholder="e.g. 01700-000000"
              className="mt-1 rounded-xl"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="spd_sold_price" className="text-xs font-medium">
                Phone Sold Price (<TakaSign />) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="spd_sold_price"
                type="number"
                required
                value={form.sold_price}
                onChange={(e) => set("sold_price", e.target.value)}
                placeholder="Final sold price"
                className="mt-1 rounded-xl font-medium"
              />
            </div>

            <div>
              <Label htmlFor="spd_payment_status" className="text-xs font-medium">
                Payment Status
              </Label>
              <select
                id="spd_payment_status"
                value={form.payment_status}
                onChange={(e) => set("payment_status", e.target.value as PaymentStatus)}
                className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
              </select>
            </div>
          </div>

          {/* ── Campaign Association ── */}
          <div className="rounded-xl border border-border bg-card p-3 space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="spd_campaign" className="text-xs font-semibold flex items-center gap-1.5">
                <Megaphone className="size-3.5 text-primary" />
                Campaign Association
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-normal">Optional</span>
              </Label>
              {activeCampaigns.length > 0 && activeCampaigns[0] && !campaignId && (
                <button
                  type="button"
                  onClick={() => setCampaignId(activeCampaigns[0]?.id ?? "")}
                  className="text-[11px] text-primary hover:underline font-medium"
                >
                  Attach to &quot;{activeCampaigns[0]?.name}&quot;
                </button>
              )}
            </div>

            {activeCampaigns.length > 0 && activeCampaigns[0] && (
              <div className="rounded-lg bg-primary/10 border border-primary/20 px-2.5 py-1.5 text-[11px] text-primary flex items-center justify-between">
                <span>⚡ Active Campaign: <strong>{activeCampaigns[0]?.name}</strong></span>
                <span className="text-[10px] opacity-80">{activeCampaigns[0]?.start_date} to {activeCampaigns[0]?.end_date}</span>
              </div>
            )}

            <select
              id="spd_campaign"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
            >
              <option value="">No Campaign (Standard Direct Sale)</option>
              {(state.campaigns ?? []).map((cmp) => {
                const isActive = cmp.status === "Active";
                return (
                  <option key={cmp.id} value={cmp.id}>
                    {isActive ? "⚡ " : ""}{cmp.name} ({cmp.status})
                  </option>
                );
              })}
            </select>
          </div>

          {/* ── Bundled Accessories & Free Gifts ── */}
          <div className="rounded-xl border border-border bg-secondary/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Package className="size-3.5 text-muted-foreground" />
                Bundled Accessories & Free Gifts
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-normal">Optional</span>
              </div>
              {!addingAcc && (
                <button
                  type="button"
                  onClick={() => setAddingAcc(true)}
                  className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/20 transition-colors"
                >
                  <Plus className="size-3" /> Add Item / Gift
                </button>
              )}
            </div>

            {/* Existing bundled rows */}
            {bundledAccessories.length > 0 && (
              <div className="mb-2 space-y-1.5">
                {bundledAccessories.map((b) => {
                  const acc = state.accessories.find((a) => a.id === b.accessory_id);
                  return (
                    <div key={`${b.accessory_id}-${b.is_gift ? "gift" : "paid"}`} className="flex items-center justify-between rounded-lg bg-card px-3 py-2 text-xs">
                      <div className="flex-1 min-w-0">
                        <span className="font-medium">{acc?.name ?? "—"}</span>
                        <span className="ml-2 text-muted-foreground">{acc?.category}</span>
                      </div>
                      <div className="flex items-center gap-2.5 ml-2 shrink-0">
                        {b.is_gift ? (
                          <span className="inline-flex items-center gap-1 rounded bg-primary/10 text-primary px-2 py-0.5 text-[11px] font-semibold">
                            🎁 Free Gift (৳0)
                          </span>
                        ) : (
                          <>
                            <span className="text-muted-foreground">{b.quantity} × <TakaSign />{b.unit_price.toLocaleString()}</span>
                            <span className="font-semibold text-emerald-600"><Taka value={b.quantity * b.unit_price} /></span>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => removeAcc(b.accessory_id, b.is_gift)}
                          className="text-destructive hover:text-destructive/80 transition-colors p-1"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Add accessory row */}
            {addingAcc && (
              <div className="rounded-lg border border-dashed border-border bg-card p-3 space-y-2">
                <div>
                  <Label className="text-[11px] text-muted-foreground">Accessory Item</Label>
                  <select
                    id="spd_acc_select"
                    value={pickedAccId}
                    onChange={(e) => handlePickAcc(e.target.value)}
                    className="mt-1 h-9 w-full rounded-xl border border-input bg-background px-3 text-sm"
                  >
                    <option value="">— Select accessory —</option>
                    {availableAccessories.map((acc) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.name} ({acc.category}) — {acc.quantity} in stock
                      </option>
                    ))}
                  </select>
                </div>

                {/* Free gift checkbox toggle */}
                <div className="rounded-lg bg-secondary/50 p-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-medium">
                    <input
                      type="checkbox"
                      checked={isGift}
                      onChange={(e) => {
                        setIsGift(e.target.checked);
                        if (e.target.checked) {
                          setPickedPrice("0");
                        } else {
                          const acc = state.accessories.find((a) => a.id === pickedAccId);
                          setPickedPrice(acc ? String(acc.selling_price) : "");
                        }
                      }}
                      className="rounded border-input text-primary focus:ring-primary size-4"
                    />
                    <span className="flex items-center gap-1 text-primary">
                      🎁 Offer as Free Gift / Bonus item <span className="text-muted-foreground font-normal">(Customer pays ৳0)</span>
                    </span>
                  </label>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-[11px] text-muted-foreground">Quantity</Label>
                    <Input
                      id="spd_acc_qty"
                      type="number"
                      min={1}
                      value={pickedQty}
                      onChange={(e) => setPickedQty(e.target.value)}
                      className="mt-1 h-9 rounded-xl text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-muted-foreground">
                      {isGift ? "Customer Pays" : <>Sale Price (<TakaSign />) each</>}
                    </Label>
                    <Input
                      id="spd_acc_price"
                      type="number"
                      min={0}
                      disabled={isGift}
                      value={isGift ? "0" : pickedPrice}
                      onChange={(e) => setPickedPrice(e.target.value)}
                      className={`mt-1 h-9 rounded-xl text-sm ${isGift ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-1">
                  <Button type="button" size="sm" className="rounded-xl h-7 px-3 text-xs" onClick={addBundledAcc}>
                    {isGift ? "Add Free Gift" : "Add Accessory"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" className="rounded-xl h-7 px-3 text-xs" onClick={() => setAddingAcc(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            )}

            {bundledAccessories.length === 0 && !addingAcc && (
              <p className="text-[11px] text-muted-foreground">
                No accessories or free gifts bundled. Click &quot;Add Item / Gift&quot; to include bonus items like power banks, chargers, or earbuds.
              </p>
            )}
          </div>

          {/* ── Financial Summary ── */}
          {(phonePrice > 0 || bundledAccessories.length > 0) && (
            <div className="rounded-xl border border-border bg-card px-4 py-3 space-y-1.5 text-sm">
              <div className="flex justify-between text-muted-foreground">
                <span>Phone</span>
                <span><Taka value={phonePrice} /></span>
              </div>
              {bundledAccessories.map((b, idx) => {
                const acc = state.accessories.find((a) => a.id === b.accessory_id);
                return (
                  <div key={idx} className="flex justify-between text-muted-foreground">
                    <span>{b.is_gift ? "🎁 [Free Gift] " : ""}{acc?.name ?? "Accessory"} ×{b.quantity}</span>
                    <span>
                      {b.is_gift ? (
                        <span className="text-primary font-medium">Free (৳0)</span>
                      ) : (
                        <Taka value={b.quantity * b.unit_price} />
                      )}
                    </span>
                  </div>
                );
              })}
              <div className="border-t border-border pt-1.5 flex justify-between font-semibold">
                <span>Customer Total</span>
                <span className="text-emerald-600"><Taka value={grandTotal} /></span>
              </div>
            </div>
          )}

          <div>
            <Label htmlFor="spd_notes" className="text-xs font-medium">
              Notes (Optional)
            </Label>
            <Input
              id="spd_notes"
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
              Confirm Sale{grandTotal > 0 ? ` · ৳${grandTotal.toLocaleString()}` : ""}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
