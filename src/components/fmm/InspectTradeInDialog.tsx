import { useState } from "react";
import { CheckCircle2, XCircle, AlertCircle, ShieldCheck } from "lucide-react";
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
import type { Phone } from "@/lib/fmm-types";

interface InspectTradeInDialogProps {
  phone: Phone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InspectTradeInDialog({ phone, open, onOpenChange }: InspectTradeInDialogProps) {
  const { inspectTradeInDevice } = useFmm();
  const [decision, setDecision] = useState<"approve" | "reject">("approve");
  const [resalePrice, setResalePrice] = useState<string>("");
  const [rejectReason, setRejectReason] = useState<string>("");

  if (!phone) return null;

  const handleOpenChange = (isOpen: boolean) => {
    if (isOpen) {
      // Default resale price to purchase price + 15% rounded
      const baseCost = phone.purchase_price || phone.selling_price || 0;
      const defaultResale = Math.round(baseCost * 1.15 / 100) * 100 || baseCost;
      setResalePrice(String(defaultResale || ""));
      setDecision("approve");
      setRejectReason("");
    }
    onOpenChange(isOpen);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (decision === "approve") {
      const price = Number(resalePrice);
      if (!price || price <= 0) {
        toast.error("Please specify a valid resale price.");
        return;
      }
      inspectTradeInDevice(phone.id, {
        action: "Restock",
        new_selling_price: price,
      });
      toast.success(`${phone.brand} ${phone.model} approved and restocked to Available inventory!`);
    } else {
      inspectTradeInDevice(phone.id, {
        action: "Reject",
        ...(rejectReason.trim() ? { condition_notes: rejectReason.trim() } : {}),
      });
      toast.info(`${phone.brand} ${phone.model} marked as rejected / do not stock.`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-5 text-purple-600 dark:text-purple-400" />
            Inspect Trade-In Device
          </DialogTitle>
          <DialogDescription>
            Examine incoming device quality, IMEI authenticity, and decide disposition.
          </DialogDescription>
        </DialogHeader>

        {/* Device Summary Box */}
        <div className="rounded-xl border border-border bg-secondary/30 p-4 space-y-2 text-xs">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-sm font-bold text-foreground">{phone.brand} {phone.model}</p>
              <p className="font-mono text-muted-foreground">IMEI: {phone.imei}</p>
              {phone.imei_secondary && <p className="font-mono text-muted-foreground">IMEI 2: {phone.imei_secondary}</p>}
            </div>
            <span className="rounded-md bg-purple-500/10 px-2 py-0.5 text-[11px] font-semibold text-purple-600 dark:text-purple-400">
              {phone.status}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/60">
            <div>
              <span className="text-muted-foreground">Condition:</span>
              <p className="font-medium text-foreground">{phone.condition || "Used"}</p>
            </div>
            <div>
              <span className="text-muted-foreground">Trade-In Valuation:</span>
              <p className="font-semibold text-foreground"><Taka value={phone.purchase_price || 0} /></p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 pt-2">
          {/* Decision Selector */}
          <div>
            <Label className="text-xs font-semibold">Inspection Disposition</Label>
            <div className="grid grid-cols-2 gap-2 mt-1.5">
              <button
                type="button"
                onClick={() => setDecision("approve")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-colors ${
                  decision === "approve"
                    ? "border-emerald-500 bg-emerald-500/10 text-emerald-950 dark:text-emerald-100"
                    : "border-border hover:bg-secondary/40 text-muted-foreground"
                }`}
              >
                <CheckCircle2 className={`size-4 mt-0.5 shrink-0 ${decision === "approve" ? "text-emerald-600" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs font-bold text-foreground">Approve & Restock</p>
                  <p className="text-[11px] text-muted-foreground">Put in Available stock</p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setDecision("reject")}
                className={`p-3 rounded-xl border text-left flex items-start gap-2 transition-colors ${
                  decision === "reject"
                    ? "border-destructive bg-destructive/10 text-destructive-foreground"
                    : "border-border hover:bg-secondary/40 text-muted-foreground"
                }`}
              >
                <XCircle className={`size-4 mt-0.5 shrink-0 ${decision === "reject" ? "text-destructive" : "text-muted-foreground"}`} />
                <div>
                  <p className="text-xs font-bold text-foreground">Reject / Do Not Stock</p>
                  <p className="text-[11px] text-muted-foreground">Flawed, scrap, or parts</p>
                </div>
              </button>
            </div>
          </div>

          {decision === "approve" ? (
            <div className="space-y-2 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
              <Label htmlFor="resale_price" className="text-xs font-semibold text-foreground">
                Set New Selling Price for Resale (<TakaSign />) <span className="text-destructive">*</span>
              </Label>
              <Input
                id="resale_price"
                type="number"
                min="1"
                required
                value={resalePrice}
                onChange={(e) => setResalePrice(e.target.value)}
                placeholder="e.g. 24000"
                className="h-9 rounded-lg"
              />
              <p className="text-[11px] text-muted-foreground">
                Trade-in cost is ৳{phone.purchase_price || 0}. Setting this price will make the phone available in Phone Stock immediately.
              </p>
            </div>
          ) : (
            <div className="space-y-2 rounded-xl border border-destructive/20 bg-destructive/5 p-3">
              <Label htmlFor="reject_reason" className="text-xs font-semibold text-foreground">
                Reason for Rejection / Scrap Note
              </Label>
              <Input
                id="reject_reason"
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Display backlight bleed, water damage trace"
                className="h-9 rounded-lg"
              />
            </div>
          )}

          <div className="flex justify-end gap-2 pt-2 border-t border-border">
            <Button type="button" variant="ghost" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              type="submit"
              className={`rounded-xl text-white ${
                decision === "approve"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-destructive hover:bg-destructive/90"
              }`}
            >
              {decision === "approve" ? "Confirm & Restock" : "Confirm Rejection"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
