import { useState } from "react";
import { toast } from "sonner";
import { Layers, Plus, ShoppingCart, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import { type Phone, type PhoneCondition, type PurchaseItem } from "@/lib/fmm-types";
import { Taka, TakaSign } from "./Taka";

interface PhoneInputRow {
  brand: string;
  model: string;
  rom: string;
  ram: string;
  condition: PhoneCondition;
  imei: string;
  purchase_price: string;
  selling_price: string;
}

const CONDITIONS: PhoneCondition[] = ["New", "Used - A", "Used - B", "Used - Good", "Refurbished"];

export function RecordPurchaseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, recordPurchase, addPhonesBatch, adjustAccessoryStock } = useFmm();

  const [supplierId, setSupplierId] = useState(state.suppliers[0]?.id || "");
  const [type, setType] = useState<"Phone" | "Accessory">("Accessory");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [campaignId, setCampaignId] = useState("");
  const [additionalCost, setAdditionalCost] = useState("0");
  const [paidAmount, setPaidAmount] = useState("");
  const [notes, setNotes] = useState("");

  // Accessory rows
  const [items, setItems] = useState<{ accessory_id: string; quantity: string; unit_price: string }[]>([
    { accessory_id: state.accessories[0]?.id || "", quantity: "10", unit_price: String(state.accessories[0]?.purchase_price || 0) },
  ]);

  // Phone rows
  const [phoneRows, setPhoneRows] = useState<PhoneInputRow[]>([
    { brand: "Apple", model: "iPhone 15", rom: "128GB", ram: "8GB", condition: "New", imei: "", purchase_price: "75000", selling_price: "85000" },
  ]);

  const handleAddAccItem = () => {
    const first = state.accessories[0];
    setItems((prev) => [...prev, { accessory_id: first?.id || "", quantity: "10", unit_price: String(first?.purchase_price || 0) }]);
  };

  const handleRemoveAccItem = (idx: number) => {
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleAccChange = (idx: number, field: string, value: string) => {
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

  const handleAddPhoneRow = () => {
    setPhoneRows((prev) => [
      ...prev,
      { brand: "Apple", model: "iPhone 15", rom: "128GB", ram: "8GB", condition: "New", imei: "", purchase_price: "75000", selling_price: "85000" },
    ]);
  };

  const handleRemovePhoneRow = (idx: number) => {
    setPhoneRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePhoneRowChange = (idx: number, field: keyof PhoneInputRow, value: string) => {
    setPhoneRows((prev) =>
      prev.map((row, i) => (i === idx ? { ...row, [field]: value } : row)),
    );
  };

  const accItemsTotal = items.reduce((sum, it) => {
    const q = Number(it.quantity) || 0;
    const p = Number(it.unit_price) || 0;
    return sum + q * p;
  }, 0);

  const phoneItemsTotal = phoneRows.reduce((sum, r) => sum + (Number(r.purchase_price) || 0), 0);

  const itemsTotal = type === "Phone" ? phoneItemsTotal : accItemsTotal;
  const totalAmount = itemsTotal + (Number(additionalCost) || 0);
  const paid = Number(paidAmount) || 0;
  const due = Math.max(0, totalAmount - paid);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      toast.error("Please select a supplier.");
      return;
    }

    const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();

    if (type === "Phone") {
      if (phoneRows.length === 0) {
        toast.error("Please add at least one phone to procure.");
        return;
      }

      // Validation
      const existingImeis = new Set(state.phones.map((p) => p.imei.trim()));
      const seenBatchImeis = new Set<string>();

      for (let i = 0; i < phoneRows.length; i++) {
        const row = phoneRows[i];
        if (!row) continue;
        if (!row.brand.trim() || !row.model.trim()) {
          toast.error(`Phone #${i + 1}: Brand and model are required.`);
          return;
        }
        const imei = row.imei.trim();
        if (!imei) {
          toast.error(`Phone #${i + 1}: IMEI is required.`);
          return;
        }
        if (existingImeis.has(imei)) {
          toast.error(`Phone #${i + 1}: IMEI "${imei}" is already registered in stock.`);
          return;
        }
        if (seenBatchImeis.has(imei)) {
          toast.error(`Phone #${i + 1}: Duplicate IMEI "${imei}" within this purchase batch.`);
          return;
        }
        seenBatchImeis.add(imei);

        const cost = Number(row.purchase_price);
        if (isNaN(cost) || cost <= 0) {
          toast.error(`Phone #${i + 1}: Please enter a valid purchase cost.`);
          return;
        }
      }

      const phonesToCreate: Omit<Phone, "id" | "created_at" | "updated_at">[] = phoneRows.map((r) => ({
        brand: r.brand.trim(),
        model: r.model.trim(),
        imei: r.imei.trim(),
        imei_secondary: null,
        storage_ram: [r.rom.trim(), r.ram.trim()].filter(Boolean).join(" / ") || "Standard",
        condition: r.condition,
        source_type: "Supplier Purchase",
        supplier_id: supplierId,
        customer_purchase_id: null,
        purchase_price: Number(r.purchase_price) || 0,
        selling_price: Number(r.selling_price) || null,
        status: "Available",
        battery_health: null,
        condition_notes: "",
        warranty_repair_notes: "",
        campaign_id: campaignId || null,
        warranty_days: 30,
        damage_checklist: {
          screen_scratch: false,
          body_dent: false,
          battery_issue: false,
          camera_blurry: false,
        },
      }));

      // Single-owner procurement: addPhonesBatch creates phone inventory AND the single authoritative Purchase record
      addPhonesBatch(phonesToCreate, {
        supplier_id: supplierId,
        notes: notes.trim() || `Procurement of ${phonesToCreate.length} phone(s)`,
        campaign_id: campaignId || null,
        additional_cost: Number(additionalCost) || 0,
        paid_amount: paid,
      });

      toast.success(`Procurement of ${phonesToCreate.length} phone(s) recorded successfully.`);
      onOpenChange(false);
      return;
    }

    // Accessory Procurement
    if (items.length === 0 || accItemsTotal <= 0) {
      toast.error("Please enter at least one valid accessory item in the purchase order.");
      return;
    }

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
      type: "Accessory",
      items: purchaseItems,
      total_amount: accItemsTotal,
      additional_cost: Number(additionalCost) || 0,
      paid_amount: paid,
      due_amount: due,
      payment_status: due === 0 ? "Paid" : paid > 0 ? "Due" : "Not Paid",
      campaign_id: campaignId || null,
      notes: notes.trim(),
    });

    // Increase accessory stock inventory
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
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
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
                      {s.name} ({s.contact || "No contact"})
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
                <Label htmlFor="pur_type" className="text-xs font-semibold">Procurement Category</Label>
                <div className="mt-1 flex rounded-lg border border-input bg-card p-0.5 text-xs font-medium">
                  <button
                    type="button"
                    onClick={() => setType("Accessory")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                      type === "Accessory" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Layers className="size-3.5" /> Accessories Batch
                  </button>
                  <button
                    type="button"
                    onClick={() => setType("Phone")}
                    className={`flex-1 flex items-center justify-center gap-1.5 py-1.5 rounded-md transition-all ${
                      type === "Phone" ? "bg-primary text-primary-foreground font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Smartphone className="size-3.5" /> Phones Inventory
                  </button>
                </div>
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

            {/* Conditional Items Section */}
            {type === "Phone" ? (
              <div className="border rounded-xl p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Phones to Procure ({phoneRows.length} units)
                    </Label>
                    <p className="text-[11px] text-muted-foreground">Enter serial/IMEI details for inventory creation</p>
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={handleAddPhoneRow}>
                    <Plus className="size-3" /> Add Device
                  </Button>
                </div>

                <div className="space-y-3">
                  {phoneRows.map((row, idx) => (
                    <div key={idx} className="bg-secondary/40 p-3 rounded-lg text-xs space-y-2 border border-border/50">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-muted-foreground">Device #{idx + 1}</span>
                        {phoneRows.length > 1 ? (
                          <button
                            type="button"
                            onClick={() => handleRemovePhoneRow(idx)}
                            className="p-1 hover:text-destructive text-muted-foreground rounded"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        ) : null}
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Brand</Label>
                          <Input
                            value={row.brand}
                            onChange={(e) => handlePhoneRowChange(idx, "brand", e.target.value)}
                            placeholder="Apple, Samsung…"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Model</Label>
                          <Input
                            value={row.model}
                            onChange={(e) => handlePhoneRowChange(idx, "model", e.target.value)}
                            placeholder="iPhone 15 Pro…"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Condition</Label>
                          <select
                            value={row.condition}
                            onChange={(e) => handlePhoneRowChange(idx, "condition", e.target.value as PhoneCondition)}
                            className="h-7 w-full rounded-md border border-input bg-card px-2 text-xs mt-0.5"
                          >
                            {CONDITIONS.map((c) => (
                              <option key={c} value={c}>{c}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">IMEI (15-digit)</Label>
                          <Input
                            value={row.imei}
                            onChange={(e) => handlePhoneRowChange(idx, "imei", e.target.value)}
                            placeholder="358492019284910"
                            className="h-7 text-xs font-mono mt-0.5"
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                        <div>
                          <Label className="text-[10px] text-muted-foreground">ROM (Storage)</Label>
                          <Input
                            value={row.rom}
                            onChange={(e) => handlePhoneRowChange(idx, "rom", e.target.value)}
                            placeholder="128GB"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">RAM</Label>
                          <Input
                            value={row.ram}
                            onChange={(e) => handlePhoneRowChange(idx, "ram", e.target.value)}
                            placeholder="8GB"
                            className="h-7 text-xs mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Purchase Cost (<TakaSign />)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={row.purchase_price}
                            onChange={(e) => handlePhoneRowChange(idx, "purchase_price", e.target.value)}
                            className="h-7 text-xs font-bold mt-0.5"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] text-muted-foreground">Selling Target (<TakaSign />)</Label>
                          <Input
                            type="number"
                            min="0"
                            value={row.selling_price}
                            onChange={(e) => handlePhoneRowChange(idx, "selling_price", e.target.value)}
                            className="h-7 text-xs mt-0.5 text-success font-semibold"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="border rounded-xl p-4 bg-card">
                <div className="flex items-center justify-between mb-3">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Purchased Items & Quantities
                  </Label>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs rounded-lg gap-1" onClick={handleAddAccItem}>
                    <Plus className="size-3" /> Add Item
                  </Button>
                </div>

                <div className="space-y-2.5">
                  {items.map((it, idx) => (
                    <div key={idx} className="flex flex-wrap sm:flex-nowrap items-center gap-2 bg-secondary/40 p-2.5 rounded-lg text-xs">
                      <div className="flex-1 min-w-[160px]">
                        <select
                          value={it.accessory_id}
                          onChange={(e) => handleAccChange(idx, "accessory_id", e.target.value)}
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
                          onChange={(e) => handleAccChange(idx, "quantity", e.target.value)}
                          className="h-8 text-xs"
                        />
                      </div>

                      <div className="w-28">
                        <Input
                          type="number"
                          min="0"
                          placeholder="Unit Cost"
                          value={it.unit_price}
                          onChange={(e) => handleAccChange(idx, "unit_price", e.target.value)}
                          className="h-8 text-xs font-medium"
                        />
                      </div>

                      <div className="w-24 text-right font-bold text-foreground">
                        <Taka value={(Number(it.quantity) || 0) * (Number(it.unit_price) || 0)} />
                      </div>

                      {items.length > 1 ? (
                        <button
                          type="button"
                          onClick={() => handleRemoveAccItem(idx)}
                          className="p-1 hover:text-destructive text-muted-foreground rounded"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  ))}
                </div>
              </div>
            )}

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
