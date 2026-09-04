import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Layers, Plus, Receipt, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import type { PaymentStatus, SaleItem, TransactionType } from "@/lib/fmm-types";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export function NewSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, recordSale, recordAccessorySale, addCustomer, adjustAccessoryStock } = useFmm();
  const available = state.phones.filter((p) => p.status === "Available");

  const [saleType, setSaleType] = useState<"phone" | "accessory" | "combo">("phone");
  const [phoneId, setPhoneId] = useState("");
  const [phoneSoldPrice, setPhoneSoldPrice] = useState("");

  const [accItems, setAccItems] = useState<{ accessory_id: string; quantity: string; unit_price: string; is_gift?: boolean }[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Paid");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [campaignId, setCampaignId] = useState("");
  const [notes, setNotes] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeCampaigns = (state.campaigns ?? []).filter(
    (c) => c.status === "Active" && (!c.start_date || c.start_date <= todayStr) && (!c.end_date || c.end_date >= todayStr),
  );

  useEffect(() => {
    if (open) {
      setPhoneId("");
      setPhoneSoldPrice("");
      setAccItems([]);
      setCustomerId("");
      setCustomerName("");
      setCustomerPhone("");
      setPaymentStatus("Paid");
      setPaymentMethod("Cash");
      setCampaignId("");
      setNotes("");
    }
  }, [open]);

  const selectedPhone = available.find((p) => p.id === phoneId);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const c = state.customers?.find((cus) => cus.id === id);
    if (c) {
      setCustomerName(c.name);
      setCustomerPhone(c.phone);
    }
  };

  const handleAddAccItem = () => {
    const first = state.accessories[0];
    if (first) {
      setAccItems((prev) => [...prev, { accessory_id: first.id, quantity: "1", unit_price: String(first.selling_price), is_gift: false }]);
    }
  };

  const handleAccChange = (idx: number, field: string, val: string) => {
    setAccItems((prev) =>
      prev.map((it, i) => {
        if (i !== idx) return it;
        if (field === "accessory_id") {
          const acc = state.accessories.find((a) => a.id === val);
          return { ...it, accessory_id: val, unit_price: it.is_gift ? "0" : String(acc?.selling_price || 0) };
        }
        if (field === "is_gift") {
          const isGiftVal = val === "true";
          const acc = state.accessories.find((a) => a.id === it.accessory_id);
          return {
            ...it,
            is_gift: isGiftVal,
            unit_price: isGiftVal ? "0" : String(acc?.selling_price || 0),
          };
        }
        return { ...it, [field]: val };
      }),
    );
  };

  const handleRemoveAccItem = (idx: number) => {
    setAccItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const accTotal = accItems.reduce((sum, it) => {
    if (it.is_gift) return sum;
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    return sum + q * p;
  }, 0);

  const phonePrice = Number(phoneSoldPrice) || 0;
  const grandTotal = (saleType === "accessory" ? 0 : phonePrice) + (saleType === "phone" ? 0 : accTotal);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }

    // Auto-register customer if new
    let finalCusId = customerId;
    if (!finalCusId && customerName.trim()) {
      const existing = state.customers?.find(
        (c) => c.phone === customerPhone.trim() || c.name.toLowerCase() === customerName.trim().toLowerCase(),
      );
      if (existing) {
        finalCusId = existing.id;
      } else {
        finalCusId = addCustomer({
          name: customerName.trim(),
          phone: customerPhone.trim(),
          address: "",
          nid_number: "",
          notes: "Created during sale",
        });
      }
    }

    if (saleType === "phone") {
      if (!phoneId) {
        toast.error("Please select a phone from available stock.");
        return;
      }
      if (phonePrice <= 0) {
        toast.error("Please enter a valid sold price.");
        return;
      }
      recordSale({
        phone_id: phoneId,
        type: "Sale",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_id: finalCusId,
        amount: phonePrice,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        campaign_id: campaignId || null,
        notes: notes.trim(),
      });
      toast.success("Phone sale recorded.");
    } else if (saleType === "accessory") {
      if (accItems.length === 0 || (accTotal <= 0 && !accItems.some((it) => it.is_gift))) {
        toast.error("Please select at least one accessory item.");
        return;
      }
      recordAccessorySale({
        items: accItems.map((it) => ({
          accessory_id: it.accessory_id,
          quantity: Number(it.quantity) || 1,
          unit_price: it.is_gift ? 0 : Number(it.unit_price) || 0,
          is_gift: it.is_gift,
        })),
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_id: finalCusId,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        campaign_id: campaignId || null,
        notes: notes.trim(),
      });
      toast.success("Accessory sale recorded.");
    } else {
      // Combo sale (Phone + Accessories)
      if (!phoneId) {
        toast.error("Please select a phone.");
        return;
      }
      recordSale({
        phone_id: phoneId,
        type: "Sale",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_id: finalCusId,
        amount: phonePrice,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        campaign_id: campaignId || null,
        notes: notes.trim(),
        accessories: accItems.map((it) => ({
          accessory_id: it.accessory_id,
          quantity: Number(it.quantity) || 1,
          unit_price: it.is_gift ? 0 : Number(it.unit_price) || 0,
          is_gift: it.is_gift,
        })),
      });
      toast.success(`Combo sale recorded: ${grandTotal.toLocaleString()} ৳.`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Receipt className="size-5 text-primary" />
            New Customer Sale / Order
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Sale Type Selector */}
            <div className="flex rounded-xl border border-border p-1 bg-secondary/30">
              <button
                type="button"
                onClick={() => setSaleType("phone")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  saleType === "phone" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Smartphone className="size-3.5" /> Phone Only
              </button>
              <button
                type="button"
                onClick={() => setSaleType("accessory")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  saleType === "accessory" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Layers className="size-3.5" /> Accessories
              </button>
              <button
                type="button"
                onClick={() => setSaleType("combo")}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
                  saleType === "combo" ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Combo (Phone + Acc)
              </button>
            </div>

            {/* Phone Selection if Phone or Combo */}
            {saleType !== "accessory" && (
              <div className="space-y-2 border rounded-xl p-3.5 bg-card">
                <Label className="text-xs font-semibold">Select Phone from Available Stock</Label>
                <select
                  value={phoneId}
                  onChange={(e) => {
                    setPhoneId(e.target.value);
                    const ph = available.find((p) => p.id === e.target.value);
                    if (ph?.selling_price) setPhoneSoldPrice(String(ph.selling_price));
                  }}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">Select phone…</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.model} — {p.imei}
                    </option>
                  ))}
                </select>

                {selectedPhone ? (
                  <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary/50 p-2.5 text-xs">
                    <div>
                      <span className="text-muted-foreground">Floor Cost:</span>{" "}
                      <span className="font-semibold"><Taka value={selectedPhone.purchase_price} /></span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Asking Price:</span>{" "}
                      <span className="font-semibold">
                        {selectedPhone.selling_price ? <Taka value={selectedPhone.selling_price} /> : "—"}
                      </span>
                    </div>
                  </div>
                ) : null}

                <div>
                  <Label htmlFor="ph_sold" className="text-xs font-semibold">
                    Sold Closing Rate (<TakaSign />)
                  </Label>
                  <Input
                    id="ph_sold"
                    type="number"
                    min="1"
                    required
                    value={phoneSoldPrice}
                    onChange={(e) => setPhoneSoldPrice(e.target.value)}
                    placeholder="e.g. 82000"
                    className="mt-1 font-bold"
                  />
                </div>
              </div>
            )}

            {/* Accessory Items if Accessory or Combo */}
            {saleType !== "phone" && (
              <div className="border rounded-xl p-3.5 bg-card space-y-2.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Accessory Products</Label>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={handleAddAccItem}>
                    <Plus className="size-3" /> Add Item
                  </Button>
                </div>

                <div className="space-y-2">
                  {accItems.map((it, idx) => (
                    <div key={idx} className="flex items-center gap-2 bg-secondary/40 p-2 rounded-lg text-xs">
                      <select
                        value={it.accessory_id}
                        onChange={(e) => handleAccChange(idx, "accessory_id", e.target.value)}
                        className="flex-1 h-8 rounded border border-input bg-card px-2 text-xs"
                      >
                        {(state.accessories ?? []).map((a) => (
                          <option key={a.id} value={a.id}>
                            {a.name} ({a.quantity} {a.unit})
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAccChange(idx, "is_gift", String(!it.is_gift))}
                        className={`h-8 px-2 rounded-md text-[10px] font-semibold shrink-0 transition-colors ${
                          it.is_gift
                            ? "bg-primary text-primary-foreground shadow-sm"
                            : "bg-card border border-border text-muted-foreground hover:text-foreground"
                        }`}
                        title="Mark item as Free Gift (Customer pays ৳0)"
                      >
                        {it.is_gift ? "🎁 Free Gift" : "Normal"}
                      </button>
                      <Input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={it.quantity}
                        onChange={(e) => handleAccChange(idx, "quantity", e.target.value)}
                        className="w-14 h-8 text-xs"
                      />
                      <Input
                        type="number"
                        min="0"
                        placeholder="Price"
                        disabled={it.is_gift}
                        value={it.is_gift ? "0" : it.unit_price}
                        onChange={(e) => handleAccChange(idx, "unit_price", e.target.value)}
                        className={`w-20 h-8 text-xs font-medium ${it.is_gift ? "bg-muted text-muted-foreground cursor-not-allowed" : ""}`}
                      />
                      <button type="button" onClick={() => handleRemoveAccItem(idx)} className="p-1 text-muted-foreground hover:text-destructive">
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  ))}
                  {accItems.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-2">Click &ldquo;Add Item&rdquo; to include accessories or gifts.</p>
                  ) : null}
                </div>
              </div>
            )}

            {/* Customer Details */}
            <div className="border rounded-xl p-3.5 bg-card space-y-3">
              <div className="flex items-center justify-between">
                <Label className="text-xs font-semibold">Customer Information</Label>
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="h-7 rounded border border-input bg-transparent px-2 text-xs"
                >
                  <option value="">Existing customer profile…</option>
                  {(state.customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="cus_n" className="text-xs text-muted-foreground">Name *</Label>
                  <Input
                    id="cus_n"
                    required
                    value={customerName}
                    onChange={(e) => {
                      setCustomerId("");
                      setCustomerName(e.target.value);
                    }}
                    placeholder="Rahim Ali"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="cus_p" className="text-xs text-muted-foreground">Phone</Label>
                  <Input
                    id="cus_p"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="01XXX-XXXXXX"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Payment & Campaign Details */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs font-semibold">Payment Status</Label>
                <select
                  value={paymentStatus}
                  onChange={(e) => setPaymentStatus(e.target.value as PaymentStatus)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Paid">Paid in Full</option>
                  <option value="Pending">Payment Pending / Due</option>
                </select>
              </div>

              <div>
                <Label className="text-xs font-semibold">Payment Method</Label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="Cash">Cash</option>
                  <option value="bKash">bKash</option>
                  <option value="Nagad">Nagad</option>
                  <option value="Bank">Bank Transfer</option>
                </select>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Campaign (Optional)</Label>
                  {activeCampaigns.length > 0 && activeCampaigns[0] && !campaignId && (
                    <button
                      type="button"
                      onClick={() => setCampaignId(activeCampaigns[0]?.id ?? "")}
                      className="text-[10px] text-primary hover:underline font-semibold"
                    >
                      Attach active
                    </button>
                  )}
                </div>
                <select
                  value={campaignId}
                  onChange={(e) => setCampaignId(e.target.value)}
                  className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  <option value="">No Campaign</option>
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
            </div>

            <div>
              <Label htmlFor="sale_notes" className="text-xs font-semibold">Notes</Label>
              <Input
                id="sale_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Free tempered glass included, invoice #948"
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between">
            <div>
              <span className="text-xs text-muted-foreground">Total Sale Amount:</span>
              <p className="text-xl font-bold text-foreground"><Taka value={grandTotal} /></p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl">
                Record Sale
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
