import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import { type Campaign, type CampaignStatus } from "@/lib/fmm-types";
import { TakaSign } from "./Taka";

export function AddCampaignDialog({
  open,
  onOpenChange,
  editCampaign,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editCampaign?: Campaign | null;
}) {
  const { addCampaign, updateCampaign } = useFmm();

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
  const [status, setStatus] = useState<CampaignStatus>("Active");
  const [budget, setBudget] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    if (editCampaign) {
      setName(editCampaign.name);
      setDescription(editCampaign.description);
      setStartDate(editCampaign.start_date);
      setEndDate(editCampaign.end_date);
      setStatus(editCampaign.status);
      setBudget(editCampaign.budget ? String(editCampaign.budget) : "");
      setNotes(editCampaign.notes);
    } else {
      setName("");
      setDescription("");
      setStartDate(new Date().toISOString().slice(0, 10));
      setEndDate(new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10));
      setStatus("Active");
      setBudget("");
      setNotes("");
    }
  }, [editCampaign, open]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Campaign name is required.");
      return;
    }

    if (editCampaign) {
      updateCampaign(editCampaign.id, {
        name: name.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        status,
        budget: budget ? Number(budget) : null,
        notes: notes.trim(),
      });
      toast.success("Campaign updated.");
    } else {
      const id = addCampaign({
        name: name.trim(),
        description: description.trim(),
        start_date: startDate,
        end_date: endDate,
        status,
        budget: budget ? Number(budget) : null,
        notes: notes.trim(),
      });
      toast.success(`Campaign "${name.trim()}" created.`);
    }

    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-4 border-b border-border">
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="size-5 text-primary" />
            {editCampaign ? "Edit Campaign" : "Create New Business Campaign"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <Label htmlFor="cmp_name" className="text-xs font-semibold">
              Campaign Name <span className="text-destructive">*</span>
            </Label>
            <Input
              id="cmp_name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Eid-ul-Adha Special Campaign"
              className="mt-1"
            />
          </div>

          <div>
            <Label htmlFor="cmp_desc" className="text-xs font-semibold">Description / Goals</Label>
            <Input
              id="cmp_desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="e.g. Combo offers on chargers, trade-in discounts"
              className="mt-1"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cmp_start" className="text-xs font-semibold">Start Date</Label>
              <Input
                id="cmp_start"
                type="date"
                required
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="cmp_end" className="text-xs font-semibold">End Date</Label>
              <Input
                id="cmp_end"
                type="date"
                required
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="cmp_status" className="text-xs font-semibold">Status</Label>
              <select
                id="cmp_status"
                value={status}
                onChange={(e) => setStatus(e.target.value as CampaignStatus)}
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="Active">Active</option>
                <option value="Planned">Planned / Upcoming</option>
                <option value="Completed">Completed</option>
                <option value="Cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <Label htmlFor="cmp_budget" className="text-xs font-semibold">Budget (<TakaSign />)</Label>
              <Input
                id="cmp_budget"
                type="number"
                min="0"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                placeholder="e.g. 25000"
                className="mt-1 font-semibold"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="cmp_notes" className="text-xs font-semibold">Target / Notes</Label>
            <Input
              id="cmp_notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Target: 20 flagship phones, 100 fast chargers"
              className="mt-1"
            />
          </div>

          <DialogFooter className="pt-2 flex items-center justify-between sm:justify-end gap-2">
            <Button type="button" variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" className="rounded-xl">
              {editCampaign ? "Save Changes" : "Launch Campaign"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
