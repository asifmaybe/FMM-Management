import { useState, useEffect } from "react";
import { toast } from "sonner";
import { User, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { type Customer } from "@/lib/fmm-types";
import { useFmm } from "@/lib/fmm-store";

export function AddCustomerDialog({
  open,
  onOpenChange,
  editCustomer,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCustomer?: Customer | null;
}) {
  const { addCustomer, updateCustomer } = useFmm();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [nid, setNid] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editCustomer) {
      setName(editCustomer.name);
      setPhone(editCustomer.phone);
      setAddress(editCustomer.address);
      setNid(editCustomer.nid_number);
      setNotes(editCustomer.notes);
    } else {
      setName("");
      setPhone("");
      setAddress("");
      setNid("");
      setNotes("");
    }
  }, [editCustomer, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Customer name is required.");
      return;
    }
    if (!phone.trim()) {
      toast.error("Customer phone number is required.");
      return;
    }

    if (editCustomer) {
      updateCustomer(editCustomer.id, {
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        nid_number: nid.trim(),
        notes: notes.trim(),
      });
      toast.success("Customer profile updated.");
    } else {
      addCustomer({
        name: name.trim(),
        phone: phone.trim(),
        address: address.trim(),
        nid_number: nid.trim(),
        notes: notes.trim(),
      });
      toast.success(`Customer ${name.trim()} added.`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Users className="size-5 text-primary" />
            {editCustomer ? "Edit Customer Profile" : "Add New Customer"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="cus_name" className="text-xs font-semibold">
              Customer Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cus_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Jalal Uddin"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cus_phone" className="text-xs font-semibold">
              Phone Number <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cus_phone"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="01XXX-XXXXXX"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cus_addr" className="text-xs font-semibold">Address / Location</Label>
            <Input
              id="cus_addr"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Jhiltuly, Faridpur Sadar"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cus_nid" className="text-xs font-semibold">NID Number (Optional)</Label>
            <Input
              id="cus_nid"
              value={nid}
              onChange={(e) => setNid(e.target.value)}
              placeholder="10 or 17 digit NID"
              className="mt-1 font-mono text-sm"
            />
          </div>

          <div>
            <Label htmlFor="cus_notes" className="text-xs font-semibold">Notes / History</Label>
            <Input
              id="cus_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Regular wholesale accessories buyer"
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl">
              {editCustomer ? "Save Changes" : "Create Profile"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
