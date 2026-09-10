import { useState, useEffect } from "react";
import { HandCoins, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import type { Transaction } from "@/lib/fmm-types";

interface CollectDueDialogProps {
  transaction: Transaction | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CollectDueDialog({ transaction, open, onOpenChange }: CollectDueDialogProps) {
  const { collectPayment } = useFmm();
  const [collectionAmount, setCollectionAmount] = useState<string>("");

  const currentDue = transaction ? (transaction.due_amount ?? (transaction.payment_status === "Paid" ? 0 : transaction.amount)) : 0;
  const currentPaid = transaction ? (transaction.paid_amount ?? (transaction.payment_status === "Paid" ? transaction.amount : 0)) : 0;

  useEffect(() => {
    if (open && transaction) {
      setCollectionAmount(String(currentDue));
    }
  }, [open, transaction, currentDue]);

  if (!transaction) return null;

  const enteredNum = Math.max(0, Number(collectionAmount) || 0);
  const remainingAfter = Math.max(0, currentDue - enteredNum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (enteredNum <= 0) {
      toast.error("Please enter a collection amount greater than 0.");
      return;
    }
    if (enteredNum > currentDue) {
      toast.error(`Collection amount cannot exceed the outstanding due of ৳${currentDue}.`);
      return;
    }

    collectPayment(transaction.id, enteredNum);
    toast.success(
      remainingAfter === 0
        ? `Full balance of ৳${enteredNum} collected! Order marked Paid.`
        : `Partial payment of ৳${enteredNum} collected. Remaining due: ৳${remainingAfter}.`
    );
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <HandCoins className="size-5 text-emerald-600 dark:text-emerald-400" />
            Collect Outstanding Balance
          </DialogTitle>
          <DialogDescription>
            Record full or partial customer balance payment for this order.
          </DialogDescription>
        </DialogHeader>

        {/* Order Summary */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-foreground">{transaction.customer_name}</p>
              <p className="font-mono text-muted-foreground">{transaction.customer_phone}</p>
            </div>
            <span className="rounded-md bg-amber-500/10 px-2 py-0.5 text-[11px] font-semibold text-amber-600 dark:text-amber-400">
              {transaction.payment_status}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-border/60 text-center">
            <div className="rounded-lg bg-card p-2">
              <span className="text-muted-foreground block text-[10px]">Total Order</span>
              <p className="font-bold text-foreground text-xs mt-0.5"><Taka value={transaction.amount} /></p>
            </div>
            <div className="rounded-lg bg-card p-2">
              <span className="text-muted-foreground block text-[10px]">Already Paid</span>
              <p className="font-bold text-emerald-600 text-xs mt-0.5"><Taka value={currentPaid} /></p>
            </div>
            <div className="rounded-lg bg-card p-2">
              <span className="text-muted-foreground block text-[10px]">Current Due</span>
              <p className="font-bold text-destructive text-xs mt-0.5"><Taka value={currentDue} /></p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="collect_amount" className="text-xs font-semibold text-foreground">
                Amount Being Collected Now (<TakaSign />) <span className="text-destructive">*</span>
              </Label>
              <button
                type="button"
                onClick={() => setCollectionAmount(String(currentDue))}
                className="text-[11px] text-primary hover:underline font-medium"
              >
                Pay Full (৳{currentDue})
              </button>
            </div>
            <Input
              id="collect_amount"
              type="number"
              min="1"
              max={currentDue}
              required
              value={collectionAmount}
              onChange={(e) => setCollectionAmount(e.target.value)}
              placeholder="e.g. 5000"
              className="h-10 text-base font-semibold"
            />
          </div>

          {/* Real-time breakdown */}
          <div className="rounded-xl border border-border bg-card p-3 flex justify-between items-center text-xs">
            <span className="text-muted-foreground">Remaining Due After:</span>
            {remainingAfter === 0 ? (
              <span className="font-bold text-emerald-600 flex items-center gap-1">
                <CheckCircle2 className="size-3.5" /> ৳0 (Cleared / Paid in Full)
              </span>
            ) : (
              <span className="font-bold text-amber-600">
                <Taka value={remainingAfter} /> (Partial)
              </span>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            >
              <HandCoins className="size-3.5" />
              Collect <Taka value={enteredNum} />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
