import { useState } from "react";
import { toast } from "sonner";
import { DollarSign } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import { type ExpenseCategory } from "@/lib/fmm-types";
import { TakaSign } from "./Taka";

const CATEGORIES: ExpenseCategory[] = [
  "Shop Rent",
  "Electricity",
  "Internet",
  "Salary",
  "Transport",
  "Repair",
  "Packaging",
  "Marketing",
  "Miscellaneous",
];

const METHODS = ["Cash", "bKash", "Nagad", "Bank", "Other"];

export function AddExpenseDialog({
  open,
  onOpenChange,
  defaultCampaignId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCampaignId?: string | null;
}) {
  const { state, addExpense } = useFmm();

  const [category, setCategory] = useState<ExpenseCategory>("Shop Rent");
  const [customCat, setCustomCat] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [description, setDescription] = useState("");
  const [campaignId, setCampaignId] = useState(defaultCampaignId || "");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = Number(amount);
    if (isNaN(amt) || amt <= 0) {
      toast.error("Please enter a valid expense amount.");
      return;
    }
    if (!description.trim()) {
      toast.error("Please enter a description for this expense.");
      return;
    }

    const finalCat = category === "Miscellaneous" && customCat.trim() ? customCat.trim() : category;

    addExpense({
      category: finalCat,
      amount: amt,
      date: date ? new Date(date).toISOString() : new Date().toISOString(),
      payment_method: paymentMethod,
      description: description.trim(),
      campaign_id: campaignId || null,
    });

    toast.success(`Expense of ${amt.toLocaleString()} ৳ recorded under ${finalCat}.`);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <DollarSign className="size-5 text-primary" />
            Record Operating Expense
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="exp_cat" className="text-xs font-semibold">Expense Category</Label>
            <select
              id="exp_cat"
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="exp_amt" className="text-xs font-semibold">
              Amount (<TakaSign />) <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exp_amt"
              type="number"
              min="1"
              required
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="e.g. 15000"
              className="mt-1 font-bold text-base"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="exp_date" className="text-xs font-semibold">Date</Label>
              <Input
                id="exp_date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="exp_meth" className="text-xs font-semibold">Payment Method</Label>
              <select
                id="exp_meth"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                {METHODS.map((m) => (
                  <option key={m} value={m}>
                    {m}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <Label htmlFor="exp_desc" className="text-xs font-semibold">
              Description / Details <span className="text-destructive">*</span>
            </Label>
            <Input
              id="exp_desc"
              required
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Electric bill for current billing cycle"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="exp_cmp" className="text-xs font-semibold">Associated Campaign (Optional)</Label>
            <select
              id="exp_cmp"
              value={campaignId}
              onChange={(e) => setCampaignId(e.target.value)}
              className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="">None (General Shop Expense)</option>
              {(state.campaigns ?? []).map((cmp) => (
                <option key={cmp.id} value={cmp.id}>
                  {cmp.name} ({cmp.status})
                </option>
              ))}
            </select>
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl">
              Save Expense
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
