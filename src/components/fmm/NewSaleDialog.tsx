import { useState } from "react";
import { toast } from "sonner";
import { Field } from "@/components/fmm/AddPhoneDialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import type { PaymentStatus, TransactionType } from "@/lib/fmm-types";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export function NewSaleDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, recordSale } = useFmm();
  const available = state.phones.filter((p) => p.status === "Available");
  const [form, setForm] = useState({
    phone_id: "",
    type: "Sale" as TransactionType,
    customer_name: "",
    customer_phone: "",
    amount: "",
    payment_status: "Paid" as PaymentStatus,
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.phone_id || !form.customer_name || !form.amount) {
      toast.error("Phone, customer name and amount are required.");
      return;
    }
    recordSale({
      phone_id: form.phone_id,
      type: form.type,
      customer_name: form.customer_name,
      customer_phone: form.customer_phone,
      amount: Number(form.amount),
      payment_status: form.payment_status,
      notes: form.notes,
    });
    toast.success("Transaction recorded");
    onOpenChange(false);
    setForm((f) => ({ ...f, phone_id: "", customer_name: "", customer_phone: "", amount: "", notes: "" }));
  };

  const selectedPhone = available.find((p) => p.id === form.phone_id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg rounded-2xl">
        <DialogHeader>
          <DialogTitle>New Sale / Exchange</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Phone from available stock">
              <select
                value={form.phone_id}
                onChange={(e) => {
                  const phone = available.find((p) => p.id === e.target.value);
                  setForm((f) => ({
                    ...f,
                    phone_id: e.target.value,
                    amount: phone?.selling_price ? String(phone.selling_price) : f.amount,
                  }));
                }}
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="">Select a phone…</option>
                {available.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.brand} {p.model} — {p.imei}
                  </option>
                ))}
              </select>
            </Field>
          </div>

          {selectedPhone ? (
            <div className="sm:col-span-2 grid grid-cols-2 gap-2 rounded-xl bg-secondary/50 p-3 text-xs">
              <div>
                <span className="text-muted-foreground">Purchase Rate (Supplier Floor):</span>{" "}
                <span className="font-semibold text-foreground"><Taka value={selectedPhone.purchase_price} /></span>
              </div>
              <div>
                <span className="text-muted-foreground">Asking Rate:</span>{" "}
                <span className="font-semibold text-foreground">
                  {selectedPhone.selling_price ? <Taka value={selectedPhone.selling_price} /> : "—"}
                </span>
              </div>
            </div>
          ) : null}

          <Field label="Type">
            <select
              value={form.type}
              onChange={(e) => set("type", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option>Sale</option>
              <option>Exchange</option>
            </select>
          </Field>
          <Field label="Payment status">
            <select
              value={form.payment_status}
              onChange={(e) => set("payment_status", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option>Paid</option>
              <option>Pending</option>
            </select>
          </Field>
          <Field label="Customer name">
            <Input value={form.customer_name} onChange={(e) => set("customer_name", e.target.value)} placeholder="Rahim Ali" />
          </Field>
          <Field label="Customer phone">
            <Input value={form.customer_phone} onChange={(e) => set("customer_phone", e.target.value)} placeholder="01XXX-XXXXXX" />
          </Field>
          <Field label={<>Sold Rate / Amount (<TakaSign />)</>}>
            <Input type="number" required value={form.amount} onChange={(e) => set("amount", e.target.value)} placeholder="Final closing sold rate" />
          </Field>
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Payment method or terms" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Save transaction
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
