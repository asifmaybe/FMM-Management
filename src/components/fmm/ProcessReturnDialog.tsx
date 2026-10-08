import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertCircle, Package, RotateCcw, Sparkles, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import type { ReturnDisposition, Transaction } from "@/lib/fmm-types";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export function ProcessReturnDialog({
  open,
  onOpenChange,
  transaction,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
}) {
  const { state, processCustomerReturn } = useFmm();

  const phone = transaction ? state.phones.find((p) => p.id === transaction.phone_id) : null;

  // Calculate days elapsed since sale
  const elapsedDays = transaction
    ? Math.max(0, Math.floor((Date.now() - new Date(transaction.date).getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  const isWithinMonth = elapsedDays <= 30;

  const [deductionPercent, setDeductionPercent] = useState<number>(10);
  const [customPercent, setCustomPercent] = useState("");
  const [reason, setReason] = useState("");
  const [disposition, setDisposition] = useState<ReturnDisposition>("Restocked");
  const [newResalePrice, setNewResalePrice] = useState("");
  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes] = useState("");

  const originalSupplierId = phone?.supplier_id ?? null;
  const phonePurchasePrice = phone?.purchase_price ?? 0;

  useEffect(() => {
    if (transaction && open) {
      const defaultDeduct = isWithinMonth ? 10 : 15;
      setDeductionPercent(defaultDeduct);
      setCustomPercent("");
      setReason("");
      setDisposition("Restocked");
      setSupplierId(originalSupplierId || (state.suppliers.filter((s) => s.supplier_type === "Phone")[0]?.id ?? ""));
      setNotes("");

      // Estimate new resale price around 90% of original sale price
      const estimatedResale = Math.round(transaction.amount * 0.9);
      setNewResalePrice(String(estimatedResale));
    }
  }, [transaction, open, isWithinMonth, originalSupplierId, state.suppliers]);

  if (!transaction) return null;

  const originalPrice = transaction.amount;
  const paidAmount =
    transaction.paid_amount !== undefined
      ? transaction.paid_amount
      : transaction.payment_status === "Paid"
      ? transaction.amount
      : 0;
  const dueAmount =
    transaction.due_amount !== undefined
      ? transaction.due_amount
      : Math.max(0, originalPrice - paidAmount);
  const activePercent = deductionPercent === -1 ? Number(customPercent) || 0 : deductionPercent;
  const deductionAmount = Math.round(originalPrice * (activePercent / 100));
  const refundAmount = Math.max(0, paidAmount - deductionAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a reason for the return.");
      return;
    }
    if (deductionPercent === -1 && (customPercent === "" || isNaN(Number(customPercent)) || Number(customPercent) < 0 || Number(customPercent) > 100)) {
      toast.error("Please enter a valid deduction % between 0 and 100.");
      return;
    }
    if (disposition === "Restocked" && (!newResalePrice || Number(newResalePrice) <= 0)) {
      toast.error("Please specify the new resale selling price for restocking.");
      return;
    }
    if (disposition === "Returned to Supplier" && !supplierId) {
      toast.error("Please select the supplier for return.");
      return;
    }

    processCustomerReturn(transaction.id, {
      return_date: new Date().toISOString(),
      reason: reason.trim(),
      deduction_percentage: activePercent,
      deduction_amount: deductionAmount,
      refund_amount: refundAmount,
      disposition,
      new_resale_price: disposition === "Restocked" ? Number(newResalePrice) : undefined,
      supplier_id: disposition === "Returned to Supplier" ? supplierId : undefined,
      supplier_refund_amount: disposition === "Returned to Supplier" ? phonePurchasePrice : undefined,
      notes: notes.trim(),
    });

    if (disposition === "Restocked") {
      toast.success(`Return processed. Phone restocked as Own Stock. Net Refund ৳${refundAmount.toLocaleString()} deducted from profit.`);
    } else {
      toast.success(`Return processed. Phone transferred back to supplier. Supplier balance recalculated.`);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] flex flex-col rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border shrink-0">
          <DialogTitle className="flex items-center gap-2">
            <RotateCcw className="size-5 text-amber-500" />
            Process Customer Return — {phone ? `${phone.brand} ${phone.model}` : "Sold Device"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {/* Sale Reference Banner */}
            <div className="rounded-xl border border-border bg-secondary/30 p-3.5 space-y-2 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-foreground">
                  Order #{transaction.id.slice(-6)} · {transaction.customer_name} ({transaction.customer_phone})
                </span>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-bold ${
                  isWithinMonth ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                }`}>
                  <Sparkles className="size-3" /> {elapsedDays} days elapsed ({isWithinMonth ? "Within 1 month" : "Over 1 month"})
                </span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-muted-foreground border-t border-border/50">
                <div>
                  <span>IMEI:</span> <strong className="font-mono text-foreground">{phone?.imei || "—"}</strong>
                </div>
                <div>
                  <span>Sale Date:</span>{" "}
                  <strong className="text-foreground">
                    {new Date(transaction.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  </strong>
                </div>
                <div>
                  <span>Sold Price:</span>{" "}
                  <strong className="text-foreground font-semibold"><Taka value={originalPrice} /></strong>
                </div>
                <div>
                  <span>Purchase Cost:</span>{" "}
                  <strong className="text-foreground"><Taka value={phonePurchasePrice} /></strong>
                </div>
              </div>
            </div>

            {/* Deduction Policy Selection */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center justify-between">
                <span>Select Return Policy Deduction</span>
                <span className="text-muted-foreground lowercase font-normal">Business standard rule</span>
              </Label>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => setDeductionPercent(10)}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    deductionPercent === 10
                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                      : "border-border bg-secondary/30 hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className="text-base font-bold">10%</div>
                  <div className="text-[10px] mt-0.5">Within 1 Month</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeductionPercent(15)}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    deductionPercent === 15
                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                      : "border-border bg-secondary/30 hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className="text-base font-bold">15%</div>
                  <div className="text-[10px] mt-0.5">Standard &gt; 1M</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeductionPercent(20)}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    deductionPercent === 20
                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                      : "border-border bg-secondary/30 hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className="text-base font-bold">20%</div>
                  <div className="text-[10px] mt-0.5">Extended &gt; 1M</div>
                </button>

                <button
                  type="button"
                  onClick={() => setDeductionPercent(-1)}
                  className={`rounded-xl border p-2.5 text-center transition-all ${
                    deductionPercent === -1
                      ? "border-primary bg-primary/10 text-primary font-bold ring-1 ring-primary"
                      : "border-border bg-secondary/30 hover:bg-secondary text-muted-foreground"
                  }`}
                >
                  <div className="text-base font-bold">Custom</div>
                  <div className="text-[10px] mt-0.5">Manual %</div>
                </button>
              </div>

              {deductionPercent === -1 && (
                <div className="pt-2">
                  <Label htmlFor="pr_custom_pct" className="text-xs font-medium">Custom Deduction Percentage (%)</Label>
                  <Input
                    id="pr_custom_pct"
                    type="number"
                    step="any"
                    min="0"
                    max="100"
                    value={customPercent}
                    onChange={(e) => setCustomPercent(e.target.value)}
                    placeholder="e.g. 0, 1, 25"
                    className="mt-1 rounded-xl"
                    autoFocus
                  />
                </div>
              )}

              {/* Live Calculation Ledger */}
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Original Sold Value</span>
                  <span className="font-medium text-foreground"><Taka value={originalPrice} /></span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Actual Cash Collected from Customer</span>
                  <span className="font-semibold text-foreground"><Taka value={paidAmount} /></span>
                </div>
                {dueAmount > 0 && (
                  <div className="flex justify-between text-amber-600 dark:text-amber-400 font-medium">
                    <span>Outstanding Due (Cancelled upon return)</span>
                    <span><Taka value={dueAmount} /></span>
                  </div>
                )}
                <div className="flex justify-between text-destructive">
                  <span>Deduction Fee ({activePercent}% of original value)</span>
                  <span>- <Taka value={deductionAmount} /></span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-foreground">Net Cash Refund to Customer</span>
                  <span className={`text-base font-black ${refundAmount > 0 ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`}>
                    <Taka value={refundAmount} />
                  </span>
                </div>
                {paidAmount < deductionAmount && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 pt-1 leading-snug">
                    * Cash collected (<Taka value={paidAmount} />) is less than the deduction fee (<Taka value={deductionAmount} />). No cash refund is payable; outstanding customer due (<Taka value={dueAmount} />) is cleared.
                  </p>
                )}
              </div>
            </div>

            {/* Return Reason */}
            <div>
              <Label htmlFor="pr_reason" className="text-xs font-medium">
                Return Reason <span className="text-destructive">*</span>
              </Label>
              <Input
                id="pr_reason"
                required
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Customer wanted larger display / changed mind"
                className="mt-1 rounded-xl"
              />
            </div>

            {/* Disposition Options — Only 2 options */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Device Disposition After Refund
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  disposition === "Restocked" ? "border-emerald-600 bg-emerald-500/10" : "border-border bg-secondary/30 hover:bg-secondary/50"
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <input
                      type="radio"
                      name="disposition"
                      checked={disposition === "Restocked"}
                      onChange={() => setDisposition("Restocked")}
                      className="accent-emerald-600"
                    />
                    <Package className="size-3.5 text-emerald-600" />
                    <span>Refund &amp; Restock</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                    Phone re-enters stock as <strong>Own Stock</strong>. Net Refund (<Taka value={refundAmount} />) becomes the new purchase cost — deducted from Net Profit.
                  </p>
                </label>

                <label className={`flex flex-col p-3.5 rounded-xl border cursor-pointer transition-all ${
                  disposition === "Returned to Supplier" ? "border-blue-500 bg-blue-500/10" : "border-border bg-secondary/30 hover:bg-secondary/50"
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <input
                      type="radio"
                      name="disposition"
                      checked={disposition === "Returned to Supplier"}
                      onChange={() => setDisposition("Returned to Supplier")}
                      className="accent-blue-500"
                    />
                    <Truck className="size-3.5 text-blue-500" />
                    <span>Return to Supplier</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-muted-foreground leading-snug">
                    Phone transferred back to supplier. Current Due / Consignment Owed / Total Paid recalculated automatically.
                  </p>
                </label>
              </div>

              {disposition === "Restocked" && (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3.5 space-y-3 mt-2">
                  <div className="flex items-start gap-2 text-[11px] text-emerald-800 dark:text-emerald-300 bg-emerald-500/10 rounded-lg p-2.5">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      Purchase cost set to Net Refund (<strong><Taka value={refundAmount} /></strong>). Deducted from Net Profit. Source becomes <strong>Own Stock</strong>.
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="pr_new_resale" className="text-xs font-semibold text-emerald-800 dark:text-emerald-300">
                      New Resale Selling Price (<TakaSign />) <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="pr_new_resale"
                      type="number"
                      required
                      value={newResalePrice}
                      onChange={(e) => setNewResalePrice(e.target.value)}
                      placeholder="e.g. 78000"
                      className="mt-1 rounded-xl bg-card font-bold text-sm"
                    />
                    <p className="text-[11px] text-muted-foreground mt-1">
                      Phone will re-appear in Phone Stock with this target selling price.
                    </p>
                  </div>
                </div>
              )}

              {disposition === "Returned to Supplier" && (
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3.5 space-y-3 mt-2">
                  <div className="flex items-start gap-2 text-[11px] text-blue-800 dark:text-blue-300 bg-blue-500/10 rounded-lg p-2.5">
                    <AlertCircle className="size-3.5 mt-0.5 shrink-0" />
                    <span>
                      Supplier's <strong>Current Due</strong>, <strong>Total Consignment Owed</strong> and <strong>Total Paid</strong> recalculated. Original purchase cost (<strong><Taka value={phonePurchasePrice} /></strong>) removed from ledger.
                    </span>
                  </div>
                  <div>
                    <Label htmlFor="pr_supplier" className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                      Supplier <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="pr_supplier"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
                    >
                      <option value="">Select Supplier</option>
                      {state.suppliers.filter((s) => s.supplier_type === "Phone").map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.contact})
                        </option>
                      ))}
                    </select>
                    {originalSupplierId && supplierId === originalSupplierId && (
                      <p className="text-[11px] text-blue-600 dark:text-blue-400 mt-1">
                        ✓ Auto-matched to the original supplier from this phone's purchase record.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>

            <div>
              <Label htmlFor="pr_notes" className="text-xs font-medium">Notes / Settlement Comments (Optional)</Label>
              <Input
                id="pr_notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Customer acknowledged 10% restocking fee, paid via cash"
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
                className={`rounded-xl text-white ${
                  disposition === "Restocked"
                    ? "bg-emerald-600 hover:bg-emerald-700"
                    : "bg-blue-600 hover:bg-blue-700"
                }`}
              >
                {disposition === "Restocked" ? (
                  <>Confirm Return &amp; Restock · Refund <Taka value={refundAmount} /></>
                ) : (
                  <>Confirm Return to Supplier</>
                )}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
