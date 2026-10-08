import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { Check, HandCoins, Package, Receipt, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import {
  accessorySupplierDueBalance,
  accessorySupplierTotalInvoiced,
  accessorySupplierTotalPaid,
  getAccessorySupplierInvoices,
  getSupplierPhonesPaymentMap,
  supplierDueBalance,
  useFmm,
} from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

// ─────────────────────────────────────────────────────────────────────────────
// Shared props
// ─────────────────────────────────────────────────────────────────────────────
interface RecordSupplierPaymentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplierId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Entry point — routes to the correct sub-dialog based on supplier type
// ─────────────────────────────────────────────────────────────────────────────
export function RecordSupplierPaymentDialog(props: RecordSupplierPaymentDialogProps) {
  const { state } = useFmm();
  const supplier = state.suppliers.find((s) => s.id === props.supplierId);
  if (!supplier) return null;

  if (supplier.supplier_type === "Accessory") {
    return <AccessorySupplierPaymentDialog {...props} />;
  }
  return <PhoneSupplierPaymentDialog {...props} />;
}

// ─────────────────────────────────────────────────────────────────────────────
// ACCESSORY SUPPLIER — per-invoice payment dialog
// ─────────────────────────────────────────────────────────────────────────────
function AccessorySupplierPaymentDialog({ open, onOpenChange, supplierId }: RecordSupplierPaymentDialogProps) {
  const { state, recordSupplierPayment } = useFmm();
  const supplier = state.suppliers.find((s) => s.id === supplierId);

  const totalInvoiced = supplier ? accessorySupplierTotalInvoiced(state, supplierId) : 0;
  const totalPaid = supplier ? accessorySupplierTotalPaid(state, supplierId) : 0;
  const totalDue = supplier ? accessorySupplierDueBalance(state, supplierId) : 0;

  const invoices = useMemo(
    () => (supplier ? getAccessorySupplierInvoices(state, supplierId) : []),
    [state, supplier, supplierId]
  );

  const dueInvoices = invoices.filter((inv) => inv.dueOnInvoice > 0);

  const [invoiceAmounts, setInvoiceAmounts] = useState<Record<string, string>>({});
  const [generalAmount, setGeneralAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      dueInvoices.forEach(({ purchase, dueOnInvoice }) => {
        initial[purchase.id] = dueOnInvoice > 0 ? String(dueOnInvoice) : "";
      });
      setInvoiceAmounts(initial);
      setGeneralAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const totalPayment = useMemo(() => {
    let sum = 0;
    Object.values(invoiceAmounts).forEach((v) => {
      const n = Number(v);
      if (!isNaN(n) && n > 0) sum += n;
    });
    const g = Number(generalAmount);
    if (!isNaN(g) && g > 0) sum += g;
    return sum;
  }, [invoiceAmounts, generalAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPayment <= 0) {
      toast.error("Please enter a payment amount.");
      return;
    }
    const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();
    let count = 0;

    // Record per-invoice amounts
    dueInvoices.forEach(({ purchase }) => {
      const amt = Number(invoiceAmounts[purchase.id] ?? 0);
      if (!isNaN(amt) && amt > 0) {
        recordSupplierPayment({
          supplier_id: supplierId,
          phone_id: null,
          purchase_id: purchase.id,
          amount: amt,
          date: isoDate,
          notes: `Invoice ${purchase.id.slice(-6).toUpperCase()}${notes.trim() ? ` — ${notes.trim()}` : ""}`,
        });
        count++;
      }
    });

    // Record general amount if any
    const g = Number(generalAmount);
    if (!isNaN(g) && g > 0) {
      recordSupplierPayment({
        supplier_id: supplierId,
        phone_id: null,
        amount: g,
        date: isoDate,
        notes: notes.trim() ? `General Payment — ${notes.trim()}` : "General Payment",
      });
      count++;
    }

    toast.success(`Payment of ৳${totalPayment.toLocaleString()} recorded for ${supplier?.name}`);
    onOpenChange(false);
  };

  if (!supplier) return null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <DialogTitle className="flex items-center gap-2 text-lg">
            <HandCoins className="size-5 text-amber-500" />
            Record Payment — {supplier.name}
          </DialogTitle>
          <div className="mt-3 grid grid-cols-3 gap-2">
            <div className="rounded-xl bg-secondary/50 p-3 text-center text-xs">
              <p className="text-muted-foreground">Total Invoiced</p>
              <p className="mt-0.5 text-base font-bold text-foreground"><Taka value={totalInvoiced} /></p>
            </div>
            <div className="rounded-xl bg-secondary/50 p-3 text-center text-xs">
              <p className="text-muted-foreground">Total Paid</p>
              <p className="mt-0.5 text-base font-bold text-success"><Taka value={totalPaid} /></p>
            </div>
            <div className={`rounded-xl p-3 text-center text-xs ${totalDue > 0 ? "bg-destructive/10" : "bg-secondary/50"}`}>
              <p className="text-muted-foreground">Outstanding Due</p>
              <p className={`mt-0.5 text-base font-bold ${totalDue > 0 ? "text-destructive" : "text-success"}`}><Taka value={totalDue} /></p>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">

            {/* Invoice list */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Receipt className="size-3.5" /> Pay Per Invoice
                </Label>
                {dueInvoices.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const all: Record<string, string> = {};
                        dueInvoices.forEach(({ purchase, dueOnInvoice }) => {
                          all[purchase.id] = String(dueOnInvoice);
                        });
                        setInvoiceAmounts(all);
                      }}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Pay All Full
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={() => {
                        const cleared: Record<string, string> = {};
                        dueInvoices.forEach(({ purchase }) => { cleared[purchase.id] = ""; });
                        setInvoiceAmounts(cleared);
                      }}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Clear All
                    </button>
                  </div>
                )}
              </div>

              {dueInvoices.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                  <Check className="size-6 text-success mx-auto mb-1.5" />
                  <p className="font-medium text-foreground">All invoices are fully settled!</p>
                  <p className="text-xs mt-1">No outstanding accessory purchase invoices. You can enter a general payment below if needed.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {dueInvoices.map(({ purchase, paidOnInvoice, dueOnInvoice }) => {
                    const invoiceTotal = purchase.total_amount + (purchase.additional_cost || 0);
                    const entered = Number(invoiceAmounts[purchase.id] ?? 0);
                    const isFullyPaying = entered >= dueOnInvoice && dueOnInvoice > 0;
                    const itemSummary = purchase.items?.map((it) => it.name).join(", ") || purchase.notes || "Accessory purchase";

                    return (
                      <div
                        key={purchase.id}
                        className={`rounded-xl border p-3.5 transition-colors ${entered > 0 ? "border-amber-500/40 bg-amber-500/5" : "border-border bg-card hover:bg-secondary/30"}`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Package className="size-3.5 shrink-0 text-amber-500" />
                              <span className="font-semibold text-sm truncate">{itemSummary}</span>
                              <span className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${dueOnInvoice > 0 ? "bg-destructive/15 text-destructive" : "bg-success/15 text-success"}`}>
                                {dueOnInvoice > 0 ? "Due" : "Paid"}
                              </span>
                            </div>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              Invoice #{purchase.id.slice(-6).toUpperCase()} · {formatDate(purchase.date || purchase.created_at)}
                              {purchase.additional_cost > 0 ? ` · +৳${purchase.additional_cost.toLocaleString()} extra cost` : ""}
                            </p>
                          </div>
                          <div className="text-right text-xs shrink-0">
                            <p className="text-muted-foreground">Invoice Total: <span className="font-medium text-foreground"><Taka value={invoiceTotal} /></span></p>
                            <p className="mt-0.5">
                              Paid: <span className="text-success font-medium"><Taka value={paidOnInvoice} /></span>
                              {" · "}
                              Due: <span className="text-destructive font-bold"><Taka value={dueOnInvoice} /></span>
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-border/60">
                          <Label htmlFor={`inv-${purchase.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                            Pay (<TakaSign />):
                          </Label>
                          <Input
                            id={`inv-${purchase.id}`}
                            type="number"
                            min="0"
                            value={invoiceAmounts[purchase.id] ?? ""}
                            onChange={(e) => setInvoiceAmounts((prev) => ({ ...prev, [purchase.id]: e.target.value }))}
                            placeholder={`Due: ${dueOnInvoice.toLocaleString()}`}
                            className="h-8 rounded-lg text-sm font-medium w-36"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant={isFullyPaying ? "default" : "outline"}
                            className="h-8 rounded-lg text-xs"
                            onClick={() => setInvoiceAmounts((prev) => ({ ...prev, [purchase.id]: String(dueOnInvoice) }))}
                          >
                            Pay Full (৳{dueOnInvoice.toLocaleString()})
                          </Button>
                          {entered > 0 && (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-xs text-muted-foreground"
                              onClick={() => setInvoiceAmounts((prev) => ({ ...prev, [purchase.id]: "" }))}
                            >
                              Clear
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* General payment */}
            <div className="rounded-xl border border-border bg-card p-3.5">
              <Label htmlFor="general_acc" className="text-xs font-medium">
                Additional / General Payment (<TakaSign />) <span className="text-muted-foreground font-normal">(Optional lump-sum)</span>
              </Label>
              <Input
                id="general_acc"
                type="number"
                min="0"
                value={generalAmount}
                onChange={(e) => setGeneralAmount(e.target.value)}
                placeholder="e.g. 5000 (applies as advance/general payment)"
                className="mt-1 h-9 rounded-lg text-sm font-medium"
              />
            </div>

            {/* Date & Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label htmlFor="acc_pay_date" className="text-xs font-medium">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="acc_pay_date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-9 rounded-xl"
                />
              </div>
              <div>
                <Label htmlFor="acc_pay_notes" className="text-xs font-medium">Payment Method / Notes</Label>
                <Input
                  id="acc_pay_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cash, bKash, Bank Transfer"
                  className="mt-1 h-9 rounded-xl"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between">
            <div className="text-left">
              <span className="text-xs text-muted-foreground">Total Payment to Record:</span>
              <p className="text-xl font-bold text-success"><Taka value={totalPayment} /></p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={totalPayment <= 0}
                className="rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-medium"
              >
                Confirm Payment (৳{totalPayment.toLocaleString()})
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// PHONE SUPPLIER — per-device payment dialog (original logic, untouched)
// ─────────────────────────────────────────────────────────────────────────────
function PhoneSupplierPaymentDialog({ open, onOpenChange, supplierId }: RecordSupplierPaymentDialogProps) {
  const { state, recordSupplierPayment } = useFmm();
  const supplier = state.suppliers.find((s) => s.id === supplierId);
  const due = supplier ? supplierDueBalance(state, supplier.id) : 0;

  // Get per-phone payment breakdown
  const paymentMap = useMemo(() => {
    return supplier ? getSupplierPhonesPaymentMap(state, supplier.id) : new Map();
  }, [state, supplier]);

  // Find all phones from this supplier where payment status is Not Paid or Due
  const duePhones = useMemo(() => {
    if (!supplier) return [];
    return (state.phones ?? [])
      .filter((p) => p.supplier_id === supplier.id)
      .map((p) => {
        const info = paymentMap.get(p.id) ?? {
          phoneId: p.id,
          cost: p.purchase_price,
          paid: 0,
          due: p.purchase_price,
          status: "Not Paid" as const,
        };
        return { phone: p, info };
      })
      .filter((item) => item.info.status !== "Paid")
      .sort((a, b) => {
        if (a.phone.status === "Sold" && b.phone.status !== "Sold") return -1;
        if (a.phone.status !== "Sold" && b.phone.status === "Sold") return 1;
        return new Date(b.phone.created_at).getTime() - new Date(a.phone.created_at).getTime();
      });
  }, [state.phones, supplier, paymentMap]);

  const [phoneAmounts, setPhoneAmounts] = useState<Record<string, string>>({});
  const [generalAmount, setGeneralAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (open) {
      const initial: Record<string, string> = {};
      duePhones.forEach(({ phone, info }) => {
        initial[phone.id] = info.due > 0 ? String(info.due) : "";
      });
      setPhoneAmounts(initial);
      setGeneralAmount("");
      setDate(new Date().toISOString().slice(0, 10));
      setNotes("");
    }
  }, [open, duePhones]);

  if (!supplier) return null;

  const handlePhoneAmountChange = (phoneId: string, val: string) => {
    setPhoneAmounts((prev) => ({ ...prev, [phoneId]: val }));
  };

  const handlePayFull = (phoneId: string, fullDue: number) => {
    setPhoneAmounts((prev) => ({ ...prev, [phoneId]: String(fullDue) }));
  };

  const handleClearPhone = (phoneId: string) => {
    setPhoneAmounts((prev) => ({ ...prev, [phoneId]: "" }));
  };

  const handleSelectAll = () => {
    const allFull: Record<string, string> = {};
    duePhones.forEach(({ phone, info }) => {
      allFull[phone.id] = String(info.due);
    });
    setPhoneAmounts(allFull);
  };

  const handleClearAll = () => {
    const allCleared: Record<string, string> = {};
    duePhones.forEach(({ phone }) => {
      allCleared[phone.id] = "";
    });
    setPhoneAmounts(allCleared);
  };

  const totalPayment = useMemo(() => {
    let sum = 0;
    Object.values(phoneAmounts).forEach((amt) => {
      const n = Number(amt);
      if (!isNaN(n) && n > 0) sum += n;
    });
    const g = Number(generalAmount);
    if (!isNaN(g) && g > 0) sum += g;
    return sum;
  }, [phoneAmounts, generalAmount]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (totalPayment <= 0) {
      toast.error("Please enter a payment amount for at least one device or as general payment.");
      return;
    }

    const isoDate = date ? new Date(date).toISOString() : new Date().toISOString();
    let paymentsCount = 0;

    // 1. Record specific payments for individual phones
    duePhones.forEach(({ phone }) => {
      const amt = Number(phoneAmounts[phone.id]);
      if (!isNaN(amt) && amt > 0) {
        recordSupplierPayment({
          supplier_id: supplier.id,
          phone_id: phone.id,
          amount: amt,
          date: isoDate,
          notes: `${phone.brand} ${phone.model} (IMEI: …${phone.imei.slice(-4)})${notes.trim() ? ` — ${notes.trim()}` : ""}`,
        });
        paymentsCount++;
      }
    });

    // 2. Record general unallocated payment if any
    const gAmt = Number(generalAmount);
    if (!isNaN(gAmt) && gAmt > 0) {
      recordSupplierPayment({
        supplier_id: supplier.id,
        phone_id: null,
        amount: gAmt,
        date: isoDate,
        notes: notes.trim() ? `General Payment — ${notes.trim()}` : "General Payment",
      });
      paymentsCount++;
    }

    toast.success(`Payment of ${totalPayment.toLocaleString()} ৳ recorded across ${paymentsCount} item(s) for ${supplier.name}`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-3 border-b border-border">
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2 text-lg">
              <HandCoins className="size-5 text-primary" />
              Record Payment to {supplier.name}
            </DialogTitle>
          </div>

          {/* Supplier Due Header Stats */}
          <div className="mt-3 flex items-center justify-between rounded-xl bg-secondary/50 p-3 text-xs">
            <div>
              <span className="text-muted-foreground">Total Outstanding Due:</span>{" "}
              <span className={`font-bold text-sm ${due > 0 ? "text-destructive" : "text-success"}`}>
                <Taka value={due} />
              </span>
            </div>
            <div>
              <span className="text-muted-foreground">Devices with Due:</span>{" "}
              <span className="font-semibold text-foreground">{duePhones.length} items</span>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            {/* List of Devices With Outstanding Due */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Select &amp; Enter Payment per Device
                </Label>
                {duePhones.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-xs font-medium text-primary hover:underline"
                    >
                      Pay All Full
                    </button>
                    <span className="text-muted-foreground">·</span>
                    <button
                      type="button"
                      onClick={handleClearAll}
                      className="text-xs font-medium text-muted-foreground hover:text-foreground"
                    >
                      Clear All
                    </button>
                  </div>
                ) : null}
              </div>

              {duePhones.length === 0 ? (
                <div className="rounded-xl border border-dashed border-border bg-card p-5 text-center text-sm text-muted-foreground">
                  <Check className="size-6 text-success mx-auto mb-1.5" />
                  <p className="font-medium text-foreground">All devices are fully paid!</p>
                  <p className="text-xs mt-1">No devices currently have due payment. You can enter a general payment below if needed.</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {duePhones.map(({ phone, info }) => {
                    const currentEntered = Number(phoneAmounts[phone.id] || 0);
                    const isFullyPaid = currentEntered >= info.due && info.due > 0;
                    return (
                      <div
                        key={phone.id}
                        className={`rounded-xl border p-3.5 transition-colors ${
                          currentEntered > 0
                            ? "border-primary/40 bg-primary/5"
                            : "border-border bg-card hover:bg-secondary/30"
                        }`}
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div>
                            <div className="flex items-center gap-2">
                              <Smartphone className="size-4 text-muted-foreground" />
                              <span className="font-semibold text-sm">
                                {phone.brand} {phone.model}
                              </span>
                              <StatusBadge status={phone.status} />
                              <StatusBadge status={info.status} />
                            </div>
                            <p className="mt-1 font-mono text-xs text-muted-foreground">
                              IMEI: {phone.imei} {phone.storage_ram ? `· ${phone.storage_ram}` : ""}
                            </p>
                          </div>

                          <div className="text-right text-xs">
                            <div className="text-muted-foreground">
                              Floor Cost: <span className="font-medium text-foreground"><Taka value={info.cost} /></span>
                            </div>
                            <div className="mt-0.5">
                              Already Paid: <span className="font-medium text-success"><Taka value={info.paid} /></span> {" "}
                              Remaining Due: <span className="font-bold text-destructive"><Taka value={info.due} /></span>
                            </div>
                          </div>
                        </div>

                        {/* Amount Input for this Device */}
                        <div className="mt-3 flex items-center gap-2 pt-2.5 border-t border-border/60">
                          <Label htmlFor={`amt-${phone.id}`} className="text-xs text-muted-foreground whitespace-nowrap">
                            Pay towards this device (<TakaSign />):
                          </Label>
                          <Input
                            id={`amt-${phone.id}`}
                            type="number"
                            min="0"
                            max={info.due * 2}
                            value={phoneAmounts[phone.id] || ""}
                            onChange={(e) => handlePhoneAmountChange(phone.id, e.target.value)}
                            placeholder={`Max due: ${info.due}`}
                            className="h-8 rounded-lg text-sm font-medium w-36"
                          />
                          <Button
                            type="button"
                            size="sm"
                            variant={isFullyPaid ? "default" : "outline"}
                            className="h-8 rounded-lg text-xs"
                            onClick={() => handlePayFull(phone.id, info.due)}
                          >
                            Pay Full ({info.due.toLocaleString()} ৳)
                          </Button>
                          {currentEntered > 0 ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              className="h-8 rounded-lg text-xs text-muted-foreground"
                              onClick={() => handleClearPhone(phone.id)}
                            >
                              Clear
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* General / Unallocated Payment Input (Optional) */}
            <div className="rounded-xl border border-border bg-card p-3.5">
              <Label htmlFor="general_amount" className="text-xs font-medium">
                Additional / General Payment (<TakaSign />) <span className="text-muted-foreground font-normal">(Optional lump-sum)</span>
              </Label>
              <Input
                id="general_amount"
                type="number"
                min="0"
                value={generalAmount}
                onChange={(e) => setGeneralAmount(e.target.value)}
                placeholder="e.g. 5000 (applies across remaining dues in FIFO)"
                className="mt-1 h-9 rounded-lg text-sm font-medium"
              />
            </div>

            {/* Payment Date & Method Notes */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <Label htmlFor="payment_date" className="text-xs font-medium">
                  Payment Date <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="payment_date"
                  type="date"
                  required
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-1 h-9 rounded-xl"
                />
              </div>

              <div>
                <Label htmlFor="payment_notes" className="text-xs font-medium">
                  Payment Method / Notes
                </Label>
                <Input
                  id="payment_notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Cash, bKash, Bank Transfer"
                  className="mt-1 h-9 rounded-xl"
                />
              </div>
            </div>
          </div>

          {/* Footer with Total and Confirm Button */}
          <DialogFooter className="p-4 px-6 border-t border-border bg-card/60 flex items-center justify-between sm:justify-between">
            <div className="text-left">
              <span className="text-xs text-muted-foreground">Total Payment to Record:</span>
              <p className="text-xl font-bold text-success">
                <Taka value={totalPayment} />
              </p>
            </div>

            <div className="flex items-center gap-2">
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
                disabled={totalPayment <= 0}
                className="rounded-xl bg-primary text-primary-foreground font-medium"
              >
                Confirm Payment ({totalPayment.toLocaleString()} ৳)
              </Button>
            </div>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
