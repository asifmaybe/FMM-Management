import { useState } from "react";
import { toast } from "sonner";
import { RotateCcw, ShieldAlert, Wrench } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useFmm } from "@/lib/fmm-store";
import type { ReturnAction, WarrantyStatus } from "@/lib/fmm-types";

export function RecordWarrantyDialog({
  open,
  onOpenChange,
  defaultCustomerId,
  defaultPhoneId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultCustomerId?: string | null | undefined;
  defaultPhoneId?: string | null | undefined;
}) {
  const { state, recordWarrantyClaim, recordReturn } = useFmm();
  const [tab, setTab] = useState<"claim" | "return">("claim");

  // Form State
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(defaultCustomerId || "");
  const [selectedPhoneId, setSelectedPhoneId] = useState<string>(defaultPhoneId || "");
  const [issueDescription, setIssueDescription] = useState("");
  const [claimStatus, setClaimStatus] = useState<WarrantyStatus>("Pending Inspection");
  const [repairCost, setRepairCost] = useState("0");
  const [customerCharge, setCustomerCharge] = useState("0");
  const [returnReason, setReturnReason] = useState("");
  const [returnAction, setReturnAction] = useState<ReturnAction>("Exchange");
  const [refundAmount, setRefundAmount] = useState("0");
  const [notes, setNotes] = useState("");

  const handleCustomerSelect = (cusId: string) => {
    setSelectedCustomerId(cusId);
    const cus = state.customers.find((c) => c.id === cusId);
    if (cus) {
      setCustomerName(cus.name);
      setCustomerPhone(cus.phone);
    }
  };

  const handlePhoneSelect = (phId: string) => {
    setSelectedPhoneId(phId);
    const ph = state.phones.find((p) => p.id === phId);
    if (ph) {
      const tx = state.transactions.find((t) => t.phone_id === ph.id || (t.items && t.items.some((i) => i.id === ph.id)));
      if (tx) {
        setCustomerName(tx.customer_name);
        setCustomerPhone(tx.customer_phone);
        if (tx.customer_id) setSelectedCustomerId(tx.customer_id);
      }
    }
  };

  const handleSubmitClaim = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!issueDescription.trim()) {
      toast.error("Please provide an issue description.");
      return;
    }

    recordWarrantyClaim({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_id: selectedCustomerId || null,
      phone_id: selectedPhoneId || null,
      accessory_id: null,
      transaction_id: null,
      claim_date: new Date().toISOString(),
      issue_description: issueDescription.trim(),
      status: claimStatus,
      repair_cost: Number(repairCost) || 0,
      customer_charge: Number(customerCharge) || 0,
      notes: notes.trim(),
    });

    toast.success("Warranty claim recorded.");
    onOpenChange(false);
  };

  const handleSubmitReturn = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!returnReason.trim()) {
      toast.error("Please provide a return reason.");
      return;
    }

    recordReturn({
      customer_name: customerName.trim(),
      customer_phone: customerPhone.trim(),
      customer_id: selectedCustomerId || null,
      phone_id: selectedPhoneId || null,
      accessory_id: null,
      transaction_id: null,
      return_date: new Date().toISOString(),
      reason: returnReason.trim(),
      action: returnAction,
      refund_amount: Number(refundAmount) || 0,
      notes: notes.trim(),
    });

    toast.success("Customer return processed.");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <ShieldAlert className="size-5 text-primary" />
            Warranty & Returns Service
          </DialogTitle>
        </DialogHeader>

        <Tabs value={tab} onValueChange={(v) => setTab(v as "claim" | "return")}>
          <TabsList className="grid grid-cols-2 mb-4">
            <TabsTrigger value="claim" className="flex items-center gap-1.5">
              <Wrench className="size-3.5" /> Warranty Repair Claim
            </TabsTrigger>
            <TabsTrigger value="return" className="flex items-center gap-1.5">
              <RotateCcw className="size-3.5" /> Customer Return
            </TabsTrigger>
          </TabsList>

          {/* 1. WARRANTY CLAIM FORM */}
          <TabsContent value="claim">
            <form onSubmit={handleSubmitClaim} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Select Phone Device (Optional)</Label>
                  <select
                    value={selectedPhoneId}
                    onChange={(e) => handlePhoneSelect(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs"
                  >
                    <option value="">-- Choose phone --</option>
                    {state.phones.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.brand} {p.model} ({p.imei.slice(-6)}) - {p.status}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Existing Customer (Optional)</Label>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => handleCustomerSelect(e.target.value)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs"
                  >
                    <option value="">-- Choose customer --</option>
                    {state.customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.phone})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Customer Name *</Label>
                  <Input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Sabbir Rahman"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Customer Phone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 01711-223344"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Issue / Defect Description *</Label>
                <Textarea
                  required
                  value={issueDescription}
                  onChange={(e) => setIssueDescription(e.target.value)}
                  placeholder="e.g. Screen flickering after 2 weeks of use, charging port loose"
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Claim Status</Label>
                  <select
                    value={claimStatus}
                    onChange={(e) => setClaimStatus(e.target.value as WarrantyStatus)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-2 text-xs"
                  >
                    <option value="Pending Inspection">Pending Inspection</option>
                    <option value="In Repair">In Repair</option>
                    <option value="Repaired">Repaired</option>
                    <option value="Replaced">Replaced</option>
                    <option value="Resolved">Resolved</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Shop Repair Cost (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={repairCost}
                    onChange={(e) => setRepairCost(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Customer Charge (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={customerCharge}
                    onChange={(e) => setCustomerCharge(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Additional Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Sent to third party service center in Dhaka"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl bg-primary text-primary-foreground">
                  Record Claim
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>

          {/* 2. CUSTOMER RETURN FORM */}
          <TabsContent value="return">
            <form onSubmit={handleSubmitReturn} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Customer Name *</Label>
                  <Input
                    required
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="e.g. Jalal Uddin"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Customer Phone</Label>
                  <Input
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="e.g. 01933-889900"
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Return Reason *</Label>
                <Textarea
                  required
                  value={returnReason}
                  onChange={(e) => setReturnReason(e.target.value)}
                  placeholder="e.g. Defective camera sensor, customer unhappy with condition"
                  rows={2}
                  className="rounded-xl text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Resolution Action</Label>
                  <select
                    value={returnAction}
                    onChange={(e) => setReturnAction(e.target.value as ReturnAction)}
                    className="w-full h-9 rounded-xl border border-border bg-card px-3 text-xs"
                  >
                    <option value="Exchange">Exchange Unit</option>
                    <option value="Refund">Full/Partial Refund</option>
                    <option value="Repair">Send for Repair</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Refund Amount (৳)</Label>
                  <Input
                    type="number"
                    min="0"
                    value={refundAmount}
                    onChange={(e) => setRefundAmount(e.target.value)}
                    className="h-9 rounded-xl text-xs"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes</Label>
                <Input
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g. Exchanged with another unit from shelf"
                  className="h-9 rounded-xl text-xs"
                />
              </div>

              <DialogFooter className="pt-2">
                <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="rounded-xl bg-primary text-primary-foreground">
                  Process Return
                </Button>
              </DialogFooter>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
