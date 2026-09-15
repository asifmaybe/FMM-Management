import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Check, Layers, Megaphone, Package, Plus, Search, ShoppingBag, Trash2, X } from "lucide-react";
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
  const { state, recordSale, addCustomer } = useFmm();

  const [customerId, setCustomerId] = useState("");
  const [form, setForm] = useState({
    customer_name: "",
    customer_phone: "",
    sold_price: "",
    payment_status: "Paid" as PaymentStatus,
    notes: "",
  });

  const [campaignId, setCampaignId] = useState("");
  const [bundledAccessories, setBundledAccessories] = useState<BundledAccessory[]>([]);
  const [isBatchPickerOpen, setIsBatchPickerOpen] = useState(false);
  const [batchSearch, setBatchSearch] = useState("");
  const [batchCategory, setBatchCategory] = useState("All");
  const [batchItems, setBatchItems] = useState<
    Record<string, { selected: boolean; quantity: number; unit_price: number; is_gift: boolean }>
  >({});
  const [paidAmountInput, setPaidAmountInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [memoNo, setMemoNo] = useState("");

  const todayStr = new Date().toISOString().slice(0, 10);
  const activeCampaigns = (state.campaigns ?? []).filter(
    (c) => c.status === "Active" && (!c.start_date || c.start_date <= todayStr) && (!c.end_date || c.end_date >= todayStr),
  );

  useEffect(() => {
    if (phone && open) {
      const defaultSold = phone.sold_price ? String(phone.sold_price) : phone.selling_price ? String(phone.selling_price) : "";
      setCustomerId("");
      setForm({
        customer_name: "",
        customer_phone: "",
        sold_price: defaultSold,
        payment_status: "Paid",
        notes: "",
      });
      setPaidAmountInput(defaultSold);
      setPaymentMethod("Cash");
      setMemoNo("");
      setCampaignId(phone.campaign_id || "");
      setBundledAccessories([]);
      setIsBatchPickerOpen(false);
      setBatchItems({});
      setBatchSearch("");
      setBatchCategory("All");
    }
  }, [phone, open]);

  const handleCustomerSelect = (id: string) => {
    setCustomerId(id);
    const c = state.customers?.find((cus) => cus.id === id);
    if (c) {
      setForm((f) => ({ ...f, customer_name: c.name, customer_phone: c.phone }));
    }
  };

  if (!phone) return null;

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  // Accessories in stock (quantity > 0)
  const availableAccessories = state.accessories.filter((a) => a.status === "Active" && a.quantity > 0);

  const distinctCategories = Array.from(
    new Set(availableAccessories.map((a) => a.category).filter(Boolean)),
  );

  const openBatchPicker = () => {
    const initial: Record<string, { selected: boolean; quantity: number; unit_price: number; is_gift: boolean }> = {};
    for (const acc of availableAccessories) {
      const existing = bundledAccessories.find((b) => b.accessory_id === acc.id);
      if (existing) {
        initial[acc.id] = {
          selected: true,
          quantity: existing.quantity,
          unit_price: existing.unit_price,
          is_gift: Boolean(existing.is_gift),
        };
      } else {
        initial[acc.id] = {
          selected: false,
          quantity: 1,
          unit_price: acc.selling_price,
          is_gift: false,
        };
      }
    }
    setBatchItems(initial);
    setBatchSearch("");
    setBatchCategory("All");
    setIsBatchPickerOpen(true);
  };

  const toggleBatchItem = (accId: string) => {
    setBatchItems((prev) => {
      const cur = prev[accId];
      if (!cur) return prev;
      return {
        ...prev,
        [accId]: { ...cur, selected: !cur.selected },
      };
    });
  };

  const updateBatchItem = (
    accId: string,
    patch: Partial<{ quantity: number; unit_price: number; is_gift: boolean }>,
  ) => {
    setBatchItems((prev) => {
      const cur = prev[accId];
      if (!cur) return prev;
      const updated = { ...cur, ...patch };
      if (patch.is_gift !== undefined) {
        if (patch.is_gift) {
          updated.unit_price = 0;
        } else {
          const acc = state.accessories.find((a) => a.id === accId);
          if (acc && updated.unit_price === 0) {
            updated.unit_price = acc.selling_price;
          }
        }
      }
      return {
        ...prev,
        [accId]: updated,
      };
    });
  };

  const applyBatchSelection = () => {
    const selectedList = Object.entries(batchItems).filter(([, item]) => item.selected);
    if (selectedList.length === 0) {
      toast.error("Please select at least one accessory.");
      return;
    }

    // Validate stock
    for (const [accId, item] of selectedList) {
      const acc = state.accessories.find((a) => a.id === accId);
      if (!acc) continue;
      const qty = Math.max(1, Number(item.quantity) || 1);
      if (qty > acc.quantity) {
        toast.error(`"${acc.name}" only has ${acc.quantity} unit(s) in stock.`);
        return;
      }
    }

    const newBundled: BundledAccessory[] = selectedList.map(([accId, item]) => {
      const qty = Math.max(1, Number(item.quantity) || 1);
      const price = item.is_gift ? 0 : Math.max(0, Number(item.unit_price) || 0);
      return {
        accessory_id: accId,
        quantity: qty,
        unit_price: price,
        is_gift: item.is_gift,
      };
    });

    setBundledAccessories(newBundled);
    setIsBatchPickerOpen(false);
    toast.success(`Bundled ${newBundled.length} accessories with this sale.`);
  };

  const handleAddBlankRow = () => {
    const unused =
      availableAccessories.find((a) => !bundledAccessories.some((b) => b.accessory_id === a.id)) ||
      availableAccessories[0];

    if (!unused) {
      toast.error("No accessories available in stock.");
      return;
    }

    setBundledAccessories((prev) => [
      ...prev,
      {
        accessory_id: unused.id,
        quantity: 1,
        unit_price: unused.selling_price,
        is_gift: false,
      },
    ]);
  };

  const updateBundledAcc = (index: number, patch: Partial<BundledAccessory>) => {
    setBundledAccessories((prev) =>
      prev.map((b, i) => {
        if (i !== index) return b;
        const updated = { ...b, ...patch };
        if (patch.accessory_id && patch.accessory_id !== b.accessory_id) {
          const acc = state.accessories.find((a) => a.id === patch.accessory_id);
          if (acc) {
            updated.unit_price = updated.is_gift ? 0 : acc.selling_price;
          }
        }
        if (patch.is_gift !== undefined) {
          if (patch.is_gift) {
            updated.unit_price = 0;
          } else {
            const acc = state.accessories.find((a) => a.id === updated.accessory_id);
            if (acc && updated.unit_price === 0) {
              updated.unit_price = acc.selling_price;
            }
          }
        }
        return updated;
      }),
    );
  };

  const removeBundledAcc = (index: number) => {
    setBundledAccessories((prev) => prev.filter((_, i) => i !== index));
  };

  const phonePrice = Number(form.sold_price) || 0;
  const accTotal = bundledAccessories.reduce(
    (sum, b) => sum + (b.is_gift ? 0 : b.quantity * b.unit_price),
    0,
  );
  const grandTotal = phonePrice + accTotal;
  const livePaid = form.payment_status === "Paid" ? grandTotal : Number(paidAmountInput) || 0;
  const liveDue = Math.max(0, grandTotal - livePaid);
  const computedPaymentStatus: PaymentStatus = liveDue === 0 ? "Paid" : livePaid > 0 ? "Partial" : "Pending";

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

    // Validate bundled accessories stock
    for (const b of bundledAccessories) {
      const acc = state.accessories.find((a) => a.id === b.accessory_id);
      if (!acc) continue;
      const totalBundledQty = bundledAccessories
        .filter((item) => item.accessory_id === b.accessory_id)
        .reduce((sum, item) => sum + item.quantity, 0);
      if (totalBundledQty > acc.quantity) {
        toast.error(`Only ${acc.quantity} unit(s) of "${acc.name}" available in stock.`);
        return;
      }
    }

    // Auto-resolve or register customer profile
    let finalCusId = customerId;
    if (!finalCusId && form.customer_name.trim()) {
      const existing = state.customers?.find(
        (c) =>
          (form.customer_phone.trim() && c.phone === form.customer_phone.trim()) ||
          c.name.toLowerCase() === form.customer_name.trim().toLowerCase(),
      );
      if (existing) {
        finalCusId = existing.id;
      } else {
        finalCusId = addCustomer({
          name: form.customer_name.trim(),
          phone: form.customer_phone.trim(),
          address: "",
          nid_number: "",
          notes: "Auto-registered during phone sale",
        });
      }
    }

    recordSale({
      phone_id: phone.id,
      type: "Sale",
      customer_name: form.customer_name.trim(),
      customer_phone: form.customer_phone.trim(),
      customer_id: finalCusId,
      amount: phonePrice,
      payment_status: computedPaymentStatus,
      payment_method: paymentMethod,
      paid_amount: livePaid,
      due_amount: liveDue,
      campaign_id: campaignId || null,
      memo_no: memoNo.trim() || null,
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
      <DialogContent className="max-w-lg max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="size-5 text-emerald-600" />
            Sell Phone — {phone.brand} {phone.model}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
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

          {/* Customer Information */}
          <div className="rounded-xl border border-border p-3.5 bg-card/60 space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold">Customer Information</Label>
              {(state.customers?.length ?? 0) > 0 && (
                <select
                  value={customerId}
                  onChange={(e) => handleCustomerSelect(e.target.value)}
                  className="h-7 rounded-lg border border-input bg-background px-2 text-xs"
                >
                  <option value="">Existing customer profile…</option>
                  {(state.customers ?? []).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label htmlFor="spd_customer_name" className="text-xs font-medium">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="spd_customer_name"
                  required
                  value={form.customer_name}
                  onChange={(e) => {
                    setCustomerId("");
                    set("customer_name", e.target.value);
                  }}
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
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label htmlFor="spd_sold_price" className="text-xs font-medium">
                Phone Sold Price (<TakaSign />) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="spd_sold_price"
                type="number"
                required
                value={form.sold_price}
                onChange={(e) => {
                  set("sold_price", e.target.value);
                  if (form.payment_status === "Paid") {
                    setPaidAmountInput(e.target.value);
                  }
                }}
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
                onChange={(e) => {
                  const val = e.target.value as PaymentStatus;
                  set("payment_status", val);
                  if (val === "Paid") {
                    setPaidAmountInput(String(grandTotal));
                  } else if (!paidAmountInput || paidAmountInput === String(grandTotal)) {
                    setPaidAmountInput("");
                  }
                }}
                className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="Paid">Paid in Full</option>
                <option value="Partial">Partial Payment</option>
                <option value="Pending">Full Due (Pending)</option>
              </select>
            </div>

            <div>
              <Label htmlFor="spd_payment_method" className="text-xs font-medium">
                Payment Method
              </Label>
              <select
                id="spd_payment_method"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-sm"
              >
                <option value="Cash">Cash</option>
                <option value="bKash">bKash</option>
                <option value="Nagad">Nagad</option>
                <option value="Bank">Bank Transfer</option>
                <option value="Card">Card</option>
              </select>
            </div>
          </div>

          {form.payment_status !== "Paid" && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <div>
                <Label htmlFor="spd_paid_amount" className="text-xs font-medium text-foreground">
                  Amount Paid Now (<TakaSign />)
                </Label>
                <Input
                  id="spd_paid_amount"
                  type="number"
                  min="0"
                  max={grandTotal}
                  value={paidAmountInput}
                  onChange={(e) => setPaidAmountInput(e.target.value)}
                  placeholder="e.g. 45000"
                  className="mt-1 rounded-xl bg-card font-medium"
                />
              </div>
              <div className="flex flex-col justify-center">
                <span className="text-xs text-muted-foreground">Remaining Due:</span>
                <p className="text-lg font-bold text-destructive">
                  <Taka value={liveDue} />
                </p>
              </div>
            </div>
          )}

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
          <div className="rounded-xl border border-border bg-secondary/30 p-3 space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-1.5 text-xs font-semibold">
                <Package className="size-3.5 text-primary" />
                Bundled Accessories & Free Gifts
                <span className="rounded-full bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground font-normal">Optional</span>
                {bundledAccessories.length > 0 && (
                  <span className="rounded-full bg-primary/15 text-primary px-2 py-0.5 text-[10px] font-bold">
                    {bundledAccessories.length} item{bundledAccessories.length > 1 ? "s" : ""}
                  </span>
                )}
              </div>

              {!isBatchPickerOpen && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    onClick={openBatchPicker}
                    className="h-7 px-2.5 text-xs rounded-lg gap-1 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90"
                    title="Select multiple accessories at once with checkboxes"
                  >
                    <Layers className="size-3.5" /> Select Multiple
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBlankRow}
                    className="h-7 px-2.5 text-xs rounded-lg gap-1 bg-card hover:bg-secondary font-medium"
                    title="Add an individual accessory row inline"
                  >
                    <Plus className="size-3" /> Add Row
                  </Button>
                </div>
              )}
            </div>

            {/* ── BATCH SELECTION CATALOG VIEW ── */}
            {isBatchPickerOpen && (
              <div className="rounded-xl border border-primary/30 bg-card p-3.5 space-y-3 shadow-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-border">
                  <div className="flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Layers className="size-3.5" />
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-foreground leading-none">Select Multiple Accessories</h4>
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        Check all items to bundle with this sale. Toggle gifts or adjust prices directly.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsBatchPickerOpen(false)}
                    className="size-6 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <X className="size-3.5" />
                  </button>
                </div>

                {/* Search and Category Filters */}
                <div className="space-y-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 size-3.5 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Search accessories (e.g. charger, case, glass)..."
                      value={batchSearch}
                      onChange={(e) => setBatchSearch(e.target.value)}
                      className="pl-8 pr-7 h-8 text-xs rounded-lg"
                    />
                    {batchSearch && (
                      <button
                        type="button"
                        onClick={() => setBatchSearch("")}
                        className="absolute right-2.5 top-2.5 text-muted-foreground hover:text-foreground"
                      >
                        <X className="size-3.5" />
                      </button>
                    )}
                  </div>

                  {distinctCategories.length > 1 && (
                    <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px]">
                      <button
                        type="button"
                        onClick={() => setBatchCategory("All")}
                        className={`px-2.5 py-0.5 rounded-full font-medium transition-colors shrink-0 ${
                          batchCategory === "All"
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        All ({availableAccessories.length})
                      </button>
                      {distinctCategories.map((cat) => {
                        const count = availableAccessories.filter((a) => a.category === cat).length;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setBatchCategory(cat)}
                            className={`px-2.5 py-0.5 rounded-full font-medium transition-colors shrink-0 ${
                              batchCategory === cat
                                ? "bg-primary text-primary-foreground"
                                : "bg-secondary text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {cat} ({count})
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Filtered Accessories Checklist */}
                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {availableAccessories
                    .filter((acc) => {
                      const matchesSearch =
                        !batchSearch.trim() ||
                        acc.name.toLowerCase().includes(batchSearch.toLowerCase().trim()) ||
                        acc.category.toLowerCase().includes(batchSearch.toLowerCase().trim());
                      const matchesCat = batchCategory === "All" || acc.category === batchCategory;
                      return matchesSearch && matchesCat;
                    })
                    .map((acc) => {
                      const item = batchItems[acc.id] || {
                        selected: false,
                        quantity: 1,
                        unit_price: acc.selling_price,
                        is_gift: false,
                      };
                      const isSelected = item.selected;

                      return (
                        <div
                          key={acc.id}
                          className={`rounded-xl border p-2.5 transition-all ${
                            isSelected
                              ? "border-primary/50 bg-primary/5 shadow-xs"
                              : "border-border/70 bg-background/90 hover:border-border hover:bg-secondary/20"
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <label className="flex items-center gap-2.5 cursor-pointer flex-1 min-w-0 select-none">
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleBatchItem(acc.id)}
                                className="rounded border-input text-primary focus:ring-primary size-4 shrink-0 accent-primary"
                              />
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="font-semibold text-xs text-foreground truncate">{acc.name}</span>
                                  <span className="text-[10px] px-1.5 py-0.2 rounded bg-secondary text-muted-foreground">
                                    {acc.category}
                                  </span>
                                </div>
                                <div className="text-[10px] text-muted-foreground flex items-center gap-2 mt-0.5">
                                  <span className="font-medium text-primary/90">{acc.quantity} in stock</span>
                                  <span>·</span>
                                  <span>Regular: <Taka value={acc.selling_price} /></span>
                                </div>
                              </div>
                            </label>

                            {!isSelected && (
                              <button
                                type="button"
                                onClick={() => toggleBatchItem(acc.id)}
                                className="text-xs font-semibold text-primary hover:underline shrink-0"
                              >
                                + Select
                              </button>
                            )}
                          </div>

                          {/* Expanded row when selected */}
                          {isSelected && (
                            <div className="mt-2 pt-2 border-t border-border/60 flex items-center justify-between flex-wrap gap-2 text-xs">
                              {/* Quantity Stepper */}
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] text-muted-foreground font-medium">Qty:</span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateBatchItem(acc.id, {
                                      quantity: Math.max(1, (item.quantity || 1) - 1),
                                    })
                                  }
                                  className="size-6 rounded border border-border bg-background flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
                                >
                                  -
                                </button>
                                <Input
                                  type="number"
                                  min={1}
                                  max={acc.quantity}
                                  value={item.quantity || 1}
                                  onChange={(e) =>
                                    updateBatchItem(acc.id, {
                                      quantity: Math.min(
                                        acc.quantity,
                                        Math.max(1, Number(e.target.value) || 1),
                                      ),
                                    })
                                  }
                                  className="h-6 w-11 text-center p-0 text-xs font-bold"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    const curQty = item.quantity || 1;
                                    if (curQty < acc.quantity) {
                                      updateBatchItem(acc.id, { quantity: curQty + 1 });
                                    } else {
                                      toast.error(`Only ${acc.quantity} available in stock.`);
                                    }
                                  }}
                                  className="size-6 rounded border border-border bg-background flex items-center justify-center text-xs text-muted-foreground hover:text-foreground"
                                >
                                  +
                                </button>
                              </div>

                              {/* Gift and Custom Price Controls */}
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => updateBatchItem(acc.id, { is_gift: !item.is_gift })}
                                  className={`h-6 px-2 rounded-md text-[10px] font-semibold transition-colors ${
                                    item.is_gift
                                      ? "bg-primary text-primary-foreground shadow-xs"
                                      : "bg-secondary text-muted-foreground hover:text-foreground border border-border/60"
                                  }`}
                                >
                                  {item.is_gift ? "🎁 Free Gift (৳0)" : "Paid"}
                                </button>

                                {!item.is_gift && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-muted-foreground"><TakaSign /></span>
                                    <Input
                                      type="number"
                                      min={0}
                                      value={item.unit_price}
                                      onChange={(e) =>
                                        updateBatchItem(acc.id, {
                                          unit_price: Math.max(0, Number(e.target.value) || 0),
                                        })
                                      }
                                      className="h-6 w-16 px-1 text-right text-xs font-semibold"
                                    />
                                  </div>
                                )}

                                <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 min-w-14 text-right">
                                  {item.is_gift ? "৳0" : <Taka value={(item.quantity || 1) * (item.unit_price || 0)} />}
                                </span>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}

                  {availableAccessories.length === 0 && (
                    <div className="p-4 text-center text-xs text-muted-foreground">
                      No accessories in stock with quantity &gt; 0.
                    </div>
                  )}
                </div>

                {/* Batch Actions Footer */}
                <div className="pt-2 border-t border-border flex items-center justify-between flex-wrap gap-2">
                  <div className="text-xs">
                    <span className="font-bold text-foreground">
                      {Object.values(batchItems).filter((it) => it.selected).length} selected
                    </span>
                    {Object.values(batchItems).filter((it) => it.selected).length > 0 && (
                      <span className="text-muted-foreground ml-1.5">
                        · Total:{" "}
                        <strong className="text-emerald-600 font-semibold">
                          <Taka
                            value={Object.entries(batchItems).reduce((sum, [, it]) => {
                              if (!it.selected || it.is_gift) return sum;
                              return sum + (it.quantity || 1) * (it.unit_price || 0);
                            }, 0)}
                          />
                        </strong>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="h-7 text-xs rounded-lg"
                      onClick={() => setIsBatchPickerOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={Object.values(batchItems).filter((it) => it.selected).length === 0}
                      className="h-7 text-xs rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-medium"
                      onClick={applyBatchSelection}
                    >
                      Add Selected ({Object.values(batchItems).filter((it) => it.selected).length}) to Sale
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* ── INLINE BUNDLED ACCESSORIES LIST ── */}
            {!isBatchPickerOpen && bundledAccessories.length > 0 && (
              <div className="space-y-2">
                {bundledAccessories.map((b, idx) => {
                  const acc = state.accessories.find((a) => a.id === b.accessory_id);
                  const isStockExceeded = acc && b.quantity > acc.quantity;

                  return (
                    <div
                      key={idx}
                      className={`rounded-xl border p-2.5 bg-card text-xs space-y-2 transition-all ${
                        isStockExceeded ? "border-destructive/60 bg-destructive/5" : "border-border"
                      }`}
                    >
                      <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                        {/* Accessory Selector Dropdown */}
                        <select
                          value={b.accessory_id}
                          onChange={(e) => updateBundledAcc(idx, { accessory_id: e.target.value })}
                          className="flex-1 min-w-40 h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium"
                        >
                          {availableAccessories.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name} ({a.category}) — {a.quantity} in stock
                            </option>
                          ))}
                        </select>

                        {/* Gift Toggle Button */}
                        <button
                          type="button"
                          onClick={() => updateBundledAcc(idx, { is_gift: !b.is_gift })}
                          className={`h-8 px-2.5 rounded-lg text-xs font-semibold shrink-0 transition-colors border ${
                            b.is_gift
                              ? "bg-primary text-primary-foreground border-primary shadow-xs"
                              : "bg-background border-border text-muted-foreground hover:text-foreground"
                          }`}
                          title={b.is_gift ? "Customer pays ৳0 (Free gift)" : "Mark as free gift"}
                        >
                          {b.is_gift ? "🎁 Free Gift" : "Paid"}
                        </button>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => updateBundledAcc(idx, { quantity: Math.max(1, b.quantity - 1) })}
                            className="size-8 rounded-lg border border-border bg-background flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-foreground"
                          >
                            -
                          </button>
                          <Input
                            type="number"
                            min={1}
                            max={acc?.quantity ?? 99}
                            value={b.quantity}
                            onChange={(e) =>
                              updateBundledAcc(idx, {
                                quantity: Math.max(1, Number(e.target.value) || 1),
                              })
                            }
                            className="h-8 w-11 text-center p-0 text-xs font-bold"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              if (acc && b.quantity >= acc.quantity) {
                                toast.error(`Only ${acc.quantity} in stock`);
                                return;
                              }
                              updateBundledAcc(idx, { quantity: b.quantity + 1 });
                            }}
                            className="size-8 rounded-lg border border-border bg-background flex items-center justify-center text-xs font-bold text-muted-foreground hover:text-foreground"
                          >
                            +
                          </button>
                        </div>

                        {/* Unit Price */}
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-[10px] text-muted-foreground"><TakaSign /></span>
                          <Input
                            type="number"
                            min={0}
                            disabled={b.is_gift}
                            value={b.is_gift ? "0" : b.unit_price}
                            onChange={(e) =>
                              updateBundledAcc(idx, {
                                unit_price: Math.max(0, Number(e.target.value) || 0),
                              })
                            }
                            className={`h-8 w-18 px-1 text-right text-xs font-semibold ${
                              b.is_gift ? "bg-muted text-muted-foreground cursor-not-allowed" : ""
                            }`}
                          />
                        </div>

                        {/* Row Subtotal */}
                        <div className="text-right min-w-16 shrink-0">
                          {b.is_gift ? (
                            <span className="text-xs font-bold text-primary">Free</span>
                          ) : (
                            <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                              <Taka value={b.quantity * b.unit_price} />
                            </span>
                          )}
                        </div>

                        {/* Delete Row */}
                        <button
                          type="button"
                          onClick={() => removeBundledAcc(idx)}
                          className="size-8 rounded-lg flex items-center justify-center text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors shrink-0"
                          title="Remove accessory"
                        >
                          <Trash2 className="size-4" />
                        </button>
                      </div>

                      {/* Stock Exceeded Alert */}
                      {isStockExceeded && (
                        <p className="text-[10px] text-destructive font-medium">
                          ⚠️ Requested quantity ({b.quantity}) exceeds available stock ({acc.quantity}).
                        </p>
                      )}
                    </div>
                  );
                })}

                {/* Quick Add Row & Batch Buttons */}
                <div className="flex items-center justify-between pt-1 text-xs">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleAddBlankRow}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <Plus className="size-3" /> Add Another Row
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={openBatchPicker}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-primary hover:underline"
                    >
                      <Layers className="size-3" /> Select Multiple at Once
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setBundledAccessories([])}
                    className="text-[11px] text-muted-foreground hover:text-destructive transition-colors"
                  >
                    Clear All
                  </button>
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isBatchPickerOpen && bundledAccessories.length === 0 && (
              <div className="rounded-xl border border-dashed border-border bg-card/60 p-4 text-center space-y-2">
                <p className="text-xs text-muted-foreground">
                  Bundle cases, screen protectors, chargers, or free bonus gifts with this phone sale.
                </p>
                <div className="flex items-center justify-center gap-2 pt-1">
                  <Button
                    type="button"
                    size="sm"
                    onClick={openBatchPicker}
                    className="h-8 text-xs rounded-xl gap-1.5 bg-primary text-primary-foreground font-semibold shadow-xs hover:bg-primary/90"
                  >
                    <Layers className="size-3.5" /> Select Multiple Accessories
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleAddBlankRow}
                    className="h-8 text-xs rounded-xl gap-1 text-foreground"
                  >
                    <Plus className="size-3" /> Add Single Row
                  </Button>
                </div>
              </div>
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
              <Label htmlFor="spd_memo_no" className="text-xs font-medium">
                Memo No. <span className="text-muted-foreground font-normal text-[10px]">(Optional — physical memo reference)</span>
              </Label>
              <Input
                id="spd_memo_no"
                value={memoNo}
                onChange={(e) => setMemoNo(e.target.value)}
                placeholder="e.g. 1048 or MEMO-2026-001"
                className="mt-1 rounded-xl"
              />
            </div>

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
          </div>

          <div className="p-4 px-6 border-t border-border bg-secondary/20 shrink-0">
            <DialogFooter className="gap-2 sm:gap-2">
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
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
