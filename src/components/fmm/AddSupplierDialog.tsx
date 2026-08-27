import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/fmm/AddPhoneDialog";
import { useFmm } from "@/lib/fmm-store";
import type { SupplierStatus } from "@/lib/fmm-types";

const statuses: SupplierStatus[] = ["Active Partner", "Pending Review"];

export function AddSupplierDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addSupplier } = useFmm();
  const [form, setForm] = useState({
    name: "",
    contact: "",
    status: "Active Partner" as SupplierStatus,
    notes: "",
  });

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = () => {
    if (!form.name.trim() || !form.contact.trim()) {
      toast.error("Supplier name and contact number are required.");
      return;
    }
    addSupplier({
      name: form.name.trim(),
      contact: form.contact.trim(),
      status: form.status,
      notes: form.notes.trim(),
    });
    toast.success(`${form.name.trim()} added to suppliers`);
    onOpenChange(false);
    setForm({ name: "", contact: "", status: "Active Partner", notes: "" });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl rounded-2xl">
        <DialogHeader>
          <DialogTitle>Add Supplier</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Supplier Name">
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Zakaria Traders" />
          </Field>
          <Field label="Contact Number">
            <Input value={form.contact} onChange={(e) => set("contact", e.target.value)} placeholder="01XXX-XXXXXX" />
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => set("status", e.target.value)}
              className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              {statuses.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Notes">
            <Input value={form.notes} onChange={(e) => set("notes", e.target.value)} placeholder="e.g. Dhaka wholesale" />
          </Field>
        </div>
        <DialogFooter>
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button className="rounded-xl" onClick={submit}>
            Save Supplier
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
