import { useState, useEffect } from "react";
import { toast } from "sonner";
import { AlertCircle, ArrowLeftRight, CheckCircle2, RotateCcw, ShieldAlert, Sparkles, Truck } from "lucide-react";
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
  const [supplierRefundAmount, setSupplierRefundAmount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (transaction && open) {
      const defaultDeduct = isWithinMonth ? 10 : 15;
      setDeductionPercent(defaultDeduct);
      setCustomPercent("");
      setReason("");
      setDisposition("Restocked");
      setSupplierId(phone?.supplier_id || (state.suppliers[0]?.id ?? ""));
      setSupplierRefundAmount(phone?.purchase_price ? String(phone.purchase_price) : "");
      setNotes("");

      // Estimate new resale price around 90% of original sale price
      const estimatedResale = Math.round(transaction.amount * 0.9);
      setNewResalePrice(String(estimatedResale));
    }
  }, [transaction, open, isWithinMonth, phone, state.suppliers]);

  if (!transaction) return null;

  const originalPrice = transaction.amount;
  const activePercent = deductionPercent === -1 ? Number(customPercent) || 0 : deductionPercent;
  const deductionAmount = Math.round(originalPrice * (activePercent / 100));
  const refundAmount = Math.max(0, originalPrice - deductionAmount);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      toast.error("Please enter a reason for the return.");
      return;
    }
    if (deductionPercent === -1 && (!customPercent || isNaN(Number(customPercent)))) {
      toast.error("Please enter a valid custom deduction percentage.");
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
      notes: notes.trim(),
    });

    toast.success(`Return processed successfully for ${transaction.customer_name}. Refund: ৳${refundAmount.toLocaleString()}`);
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
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-muted-foreground border-t border-border/50">
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
                  <span>Original Sold Price:</span>{" "}
                  <strong className="text-foreground font-semibold"><Taka value={originalPrice} /></strong>
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
                    min="0"
                    max="100"
                    value={customPercent}
                    onChange={(e) => setCustomPercent(e.target.value)}
                    placeholder="e.g. 12"
                    className="mt-1 rounded-xl"
                    autoFocus
                  />
                </div>
              )}

              {/* Live Calculation Ledger */}
              <div className="rounded-xl border border-border/70 bg-secondary/20 p-3.5 space-y-1.5 text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Original Sale Value</span>
                  <span className="font-medium text-foreground"><Taka value={originalPrice} /></span>
                </div>
                <div className="flex justify-between text-amber-600 dark:text-amber-400">
                  <span>Deduction ({activePercent}%)</span>
                  <span>- <Taka value={deductionAmount} /></span>
                </div>
                <div className="border-t border-border pt-1.5 flex justify-between font-bold text-sm">
                  <span className="text-foreground">Net Customer Refund</span>
                  <span className="text-emerald-600 dark:text-emerald-400 text-base font-black"><Taka value={refundAmount} /></span>
                </div>
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

            {/* Disposition Options */}
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Device Disposition After Refund
              </Label>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
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
                    <span>Refund &amp; Restock</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                    Add back to Phone Stock as Available for resale with a new price.
                  </p>
                </label>

                <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
                  disposition === "Refund Only" ? "border-amber-500 bg-amber-500/10" : "border-border bg-secondary/30 hover:bg-secondary/50"
                }`}>
                  <div className="flex items-center gap-2 font-semibold text-xs text-foreground">
                    <input
                      type="radio"
                      name="disposition"
                      checked={disposition === "Refund Only"}
                      onChange={() => setDisposition("Refund Only")}
                      className="accent-amber-500"
                    />
                    <span>Refund Only</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                    Do not restock phone in active inventory. Keep return audit record.
                  </p>
                </label>

                <label className={`flex flex-col p-3 rounded-xl border cursor-pointer transition-all ${
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
                    <span>Return to Supplier</span>
                  </div>
                  <p className="mt-1 text-[11px] text-muted-foreground leading-tight">
                    Ship phone back to wholesale partner/supplier.
                  </p>
                </label>
              </div>

              {/* Contextual Fields based on Disposition */}
              {disposition === "Restocked" && (
                <div className="rounded-xl bg-emerald-500/5 border border-emerald-500/20 p-3 space-y-2 mt-2">
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
                    className="rounded-xl bg-card font-bold text-sm"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Phone will immediately re-appear in Phone Stock with this updated target selling price.
                  </p>
                </div>
              )}

              {disposition === "Returned to Supplier" && (
                <div className="rounded-xl bg-blue-500/5 border border-blue-500/20 p-3 space-y-3 mt-2">
                  <div>
                    <Label htmlFor="pr_supplier" className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                      Select Supplier <span className="text-destructive">*</span>
                    </Label>
                    <select
                      id="pr_supplier"
                      value={supplierId}
                      onChange={(e) => setSupplierId(e.target.value)}
                      className="mt-1 h-9 w-full rounded-xl border border-input bg-card px-3 text-xs"
                    >
                      <option value="">Select Supplier</option>
                      {state.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.contact})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <Label htmlFor="pr_sup_refund" className="text-xs font-semibold text-blue-800 dark:text-blue-300">
                      Supplier Refund / Credit Amount (<TakaSign />)
                    </Label>
                    <Input
                      id="pr_sup_refund"
                      type="number"
                      value={supplierRefundAmount}
                      onChange={(e) => setSupplierRefundAmount(e.target.value)}
                      placeholder="e.g. 62000"
                      className="mt-1 rounded-xl bg-card"
                    />
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
                className="rounded-xl bg-amber-600 hover:bg-amber-700 text-white"
              >
                Confirm Return &amp; Refund <Taka value={refundAmount} />
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
