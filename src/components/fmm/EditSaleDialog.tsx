import { useState, useEffect } from "react";
import { uid } from "@/lib/fmm-db";
import {
  Calendar,
  CreditCard,
  Pencil,
  Receipt,
  Save,
  Smartphone,
  User,
  Package,
  X,
} from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useFmm } from "@/lib/fmm-store";
import type { Transaction, SaleItem, PaymentStatus } from "@/lib/fmm-types";

interface EditSaleDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const PAYMENT_METHODS = ["Cash", "bKash", "Nagad", "Bank Transfer", "Card"];

function toDatetimeLocal(iso: string) {
  // Convert ISO string to datetime-local input value
  try {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch {
    return "";
  }
}

export function EditSaleDialog({ transaction, open, onOpenChange }: EditSaleDialogProps) {
  const { state, updateTransaction, updatePhone, updateCustomer } = useFmm();

  // Customer
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");

  // Order
  const [orderDate, setOrderDate] = useState("");
  const [memoNo, setMemoNo] = useState("");
  const [notes, setNotes] = useState("");

  // Payment
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("Paid");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [paidAmount, setPaidAmount] = useState("");

  // Phone sold price (if tx has a phone)
  const [phoneSoldPrice, setPhoneSoldPrice] = useState("");

  // Accessory items (editable unit_price + cost_price)
  const [items, setItems] = useState<SaleItem[]>([]);

  // Derive phone from state
  const phone = transaction?.phone_id
    ? state.phones.find((p) => p.id === transaction.phone_id) ?? null
    : null;

  // Re-sync form when dialog opens
  useEffect(() => {
    if (open && transaction) {
      const tx =
        state.transactions.find((t) => t.id === transaction.id) ?? transaction;

      setCustomerName(tx.customer_name ?? "");
      setCustomerPhone(tx.customer_phone ?? "");
      setCustomerAddress(
        tx.customer_address ??
          (tx.customer_id
            ? state.customers.find((c) => c.id === tx.customer_id)?.address ?? ""
            : tx.customer_phone
            ? state.customers.find((c) => c.phone === tx.customer_phone)?.address ?? ""
            : "")
      );
      setOrderDate(toDatetimeLocal(tx.date));
      setMemoNo(tx.memo_no ?? "");
      setNotes(tx.notes ?? "");
      setPaymentStatus(tx.payment_status ?? "Paid");
      setPaymentMethod(tx.payment_method ?? "Cash");

      const currentPhone = tx.phone_id
        ? state.phones.find((p) => p.id === tx.phone_id) ?? null
        : null;
      setPhoneSoldPrice(String(currentPhone?.sold_price ?? tx.amount ?? 0));

      const paidAmt =
        tx.payment_status === "Paid"
          ? tx.amount
          : tx.paid_amount ?? 0;
      setPaidAmount(String(paidAmt));

      // Clone accessory items for editing
      setItems(
        (tx.items ?? []).map((item) => ({ ...item }))
      );
    }
  }, [open, transaction, state.transactions, state.phones, state.customers]);

  if (!transaction) return null;

  const tx =
    state.transactions.find((t) => t.id === transaction.id) ?? transaction;

  // Derived total: phone sold price + accessory subtotals
  const phonePriceNum = parseFloat(phoneSoldPrice) || 0;
  const accTotal = items
    .filter((i) => i.type === "accessory" && !i.is_gift)
    .reduce((s, i) => s + i.unit_price * i.quantity, 0);
  const calculatedTotal = phone ? phonePriceNum + accTotal : accTotal;

  // Item helpers
  function updateItemUnitPrice(idx: number, val: string) {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== idx) return item;
        const up = parseFloat(val) || 0;
        return { ...item, unit_price: up, subtotal: up * item.quantity };
      })
    );
  }

  function updateItemCostPrice(idx: number, val: string) {
    setItems((prev) =>
      prev.map((item, i) =>
        i !== idx ? item : { ...item, cost_price: parseFloat(val) || 0 }
      )
    );
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();

    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!orderDate) {
      toast.error("Order date is required.");
      return;
    }

    const newDate = new Date(orderDate).toISOString();
    const newAmount = calculatedTotal;

    // Resolve paid/due amounts
    let newPaidAmount: number;
    let newDueAmount: number;
    let newPaymentStatus: PaymentStatus = paymentStatus;

    if (paymentStatus === "Paid") {
      newPaidAmount = newAmount;
      newDueAmount = 0;
    } else if (paymentStatus === "Pending") {
      newPaidAmount = 0;
      newDueAmount = newAmount;
    } else {
      // Partial
      newPaidAmount = parseFloat(paidAmount) || 0;
      newDueAmount = Math.max(0, newAmount - newPaidAmount);
      if (newDueAmount === 0) newPaymentStatus = "Paid";
    }

    // Rebuild payment_history to match the new paid amount so the ledger stays consistent.
    // We reconstruct rather than attempt to reconcile the old entries.
    let newPaymentHistory: Transaction["payment_history"];
    if (newPaidAmount <= 0) {
      newPaymentHistory = [];
    } else {
      newPaymentHistory = [
        {
          id: uid("txp"),
          date: newDate,
          amount: newPaidAmount,
          payment_method: paymentMethod,
          notes: newPaymentStatus === "Paid" ? "Settled (edited record)" : "Partial payment (edited record)",
        },
      ];
    }

    // Patch transaction
    const patch: Partial<typeof tx> = {
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_address: customerAddress.trim() || null,
      date: newDate,
      memo_no: memoNo.trim() || null,
      notes: notes.trim(),
      payment_status: newPaymentStatus,
      payment_method: paymentMethod,
      paid_amount: newPaidAmount,
      due_amount: newDueAmount,
      amount: newAmount,
      payment_history: newPaymentHistory,
      items: items.map((item) => ({
        ...item,
        subtotal: item.unit_price * item.quantity,
      })),
    };

    updateTransaction(tx.id, patch);

    // Update customer address in directory if customer found
    if (customerAddress.trim()) {
      const existingCust = state.customers.find(
        (c) => (tx.customer_id && c.id === tx.customer_id) || (customerPhone.trim() && c.phone === customerPhone.trim())
      );
      if (existingCust) {
        updateCustomer(existingCust.id, { address: customerAddress.trim() });
      }
    }

    // Update phone sold price and sold_date if changed
    if (phone) {
      updatePhone(phone.id, {
        sold_price: phonePriceNum,
        sold_date: newDate,
      });
    }

    toast.success("Sale record updated successfully.");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <Pencil className="size-4 text-primary" />
            Edit Sale — Order #{tx.id.replace(/^tx[-_]/i, "")}
          </DialogTitle>
          <DialogDescription>
            Update customer, payment, pricing, and order details.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSave} className="space-y-5 pt-1">

          {/* ── Customer Details ── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <User className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Customer Details
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="es_customer_name" className="text-xs font-semibold">
                  Customer Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="es_customer_name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Customer name"
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es_customer_phone" className="text-xs font-semibold">
                  Phone Number
                </Label>
                <Input
                  id="es_customer_phone"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="01XXXXXXXXX"
                  className="h-9 text-sm font-mono"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="es_customer_address" className="text-xs font-semibold">
                  Customer Address
                </Label>
                <Input
                  id="es_customer_address"
                  value={customerAddress}
                  onChange={(e) => setCustomerAddress(e.target.value)}
                  placeholder="Street, City, Area / Thana"
                  className="h-9 text-sm"
                />
              </div>
            </div>
          </section>

          <div className="border-t border-border/60" />

          {/* ── Order Details ── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Calendar className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Order Details
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="es_order_date" className="text-xs font-semibold">
                  Order Date &amp; Time <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="es_order_date"
                  type="datetime-local"
                  value={orderDate}
                  onChange={(e) => setOrderDate(e.target.value)}
                  className="h-9 text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="es_memo_no" className="text-xs font-semibold">
                  Memo No.
                </Label>
                <div className="relative">
                  <Receipt className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
                  <Input
                    id="es_memo_no"
                    value={memoNo}
                    onChange={(e) => setMemoNo(e.target.value)}
                    placeholder="e.g. MEM-001"
                    className="h-9 text-sm pl-8"
                  />
                </div>
              </div>
            </div>
          </section>

          <div className="border-t border-border/60" />

          {/* ── Payment ── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <CreditCard className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Payment
              </span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Status</Label>
                <Select
                  value={paymentStatus}
                  onValueChange={(v) => setPaymentStatus(v as PaymentStatus)}
                >
                  <SelectTrigger id="es_payment_status" className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Partial">Partial</SelectItem>
                    <SelectItem value="Pending">Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Payment Method</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={setPaymentMethod}
                >
                  <SelectTrigger id="es_payment_method" className="h-9 text-sm">
                    <SelectValue placeholder="Select method" />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_METHODS.map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {paymentStatus === "Partial" && (
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="es_paid_amount" className="text-xs font-semibold">
                    Amount Already Paid (৳)
                  </Label>
                  <Input
                    id="es_paid_amount"
                    type="number"
                    min={0}
                    value={paidAmount}
                    onChange={(e) => setPaidAmount(e.target.value)}
                    placeholder="0"
                    className="h-9 text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Remaining due:{" "}
                    <span className="font-semibold text-destructive">
                      ৳{Math.max(0, calculatedTotal - (parseFloat(paidAmount) || 0)).toLocaleString()}
                    </span>
                  </p>
                </div>
              )}
            </div>
          </section>

          <div className="border-t border-border/60" />

          {/* ── Pricing ── */}
          <section>
            <div className="flex items-center gap-1.5 mb-3">
              <Smartphone className="size-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Pricing
              </span>
            </div>

            {/* Phone sold price */}
            {phone && (
              <div className="rounded-xl border border-border bg-secondary/20 p-3 mb-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                  <Smartphone className="size-3" />
                  {phone.brand} {phone.model} — Sold Price
                </p>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground font-medium">৳</span>
                  <Input
                    id="es_phone_sold_price"
                    type="number"
                    min={0}
                    value={phoneSoldPrice}
                    onChange={(e) => setPhoneSoldPrice(e.target.value)}
                    className="h-9 text-sm max-w-[180px]"
                  />
                </div>
              </div>
            )}

            {/* Accessory items */}
            {items.filter((i) => i.type === "accessory").length > 0 && (
              <div className="rounded-xl border border-border bg-secondary/20 p-3 space-y-3">
                <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Package className="size-3" />
                  Accessory Items
                </p>
                <div className="divide-y divide-border/50">
                  {items.map((item, idx) => {
                    if (item.type !== "accessory") return null;
                    return (
                      <div key={idx} className="py-2.5 grid gap-2 sm:grid-cols-[1fr_auto_auto] items-center">
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {item.quantity}× {item.name}
                          </p>
                          {item.is_gift && (
                            <span className="text-[10px] text-primary font-semibold">Free Gift</span>
                          )}
                        </div>
                        {!item.is_gift && (
                          <>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Unit Price (৳)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.unit_price}
                                onChange={(e) => updateItemUnitPrice(idx, e.target.value)}
                                className="h-7 text-xs w-24"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground">Cost Price (৳)</Label>
                              <Input
                                type="number"
                                min={0}
                                value={item.cost_price}
                                onChange={(e) => updateItemCostPrice(idx, e.target.value)}
                                className="h-7 text-xs w-24"
                              />
                            </div>
                          </>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Total summary */}
            <div className="mt-3 flex items-center justify-between rounded-xl border border-emerald-500/25 bg-emerald-500/5 px-4 py-2.5 text-sm">
              <span className="text-muted-foreground font-medium">Calculated Order Total</span>
              <span className="font-extrabold text-emerald-600 dark:text-emerald-400">
                ৳{calculatedTotal.toLocaleString()}
              </span>
            </div>
          </section>

          <div className="border-t border-border/60" />

          {/* ── Notes ── */}
          <section>
            <div className="space-y-1.5">
              <Label htmlFor="es_notes" className="text-xs font-semibold">
                Order Notes
              </Label>
              <Textarea
                id="es_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any additional notes for this order..."
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </section>

          {/* ── Footer ── */}
          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button
              type="button"
              variant="ghost"
              className="rounded-xl gap-1.5 text-sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-3.5" />
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl gap-1.5 text-sm bg-primary hover:bg-primary/90"
            >
              <Save className="size-3.5" />
              Save Changes
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
