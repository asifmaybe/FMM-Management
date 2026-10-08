import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { AlertCircle, Box, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { normalizeBatteryHealth, normalizeCycleCount, useFmm } from "@/lib/fmm-store";
import { type PhoneCondition, PHONE_BRAND_OPTIONS, PHONE_RAM_OPTIONS, PHONE_ROM_OPTIONS } from "@/lib/fmm-types";
import { TakaSign } from "@/components/fmm/Taka";

const conditions: PhoneCondition[] = ["Used - Good", "Used - A", "Used - B", "New", "Refurbished"];

export function AddPhoneDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, addPhone } = useFmm();

  // Phone Fields
  const [phone, setPhone] = useState({
    brand: "Apple",
    model: "",
    rom: "128GB",
    ram: "8GB",
    condition: "Used - Good" as PhoneCondition,
    imei: "",
    imei_secondary: "",
    serial_number: "",
    cycle_count: "",
    battery_health: "",
    purchase_price: "",
    selling_price: "",
    condition_notes: "",
    with_box: false,
  });

  const reset = () => {
    setPhone({
      brand: "Apple",
      model: "",
      rom: "128GB",
      ram: "8GB",
      condition: "Used - Good",
      imei: "",
      imei_secondary: "",
      serial_number: "",
      cycle_count: "",
      battery_health: "",
      purchase_price: "",
      selling_price: "",
      condition_notes: "",
      with_box: false,
    });
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const isApple = phone.brand === "Apple";

  const getFormattedStorageRam = () => {
    const rom = phone.rom.trim();
    const ram = phone.ram.trim();
    if (isApple) return rom || "N/A";
    if (rom && ram) return `${rom} / ${ram}`;
    return rom || ram || "N/A";
  };

  // Duplicate IMEI Detection
  const cleanImei = (val: string) => val.replace(/[\s-]/g, "").toLowerCase();

  const duplicatePhone = useMemo(() => {
    const target = cleanImei(phone.imei);
    if (!target) return null;
    return (
      (state.phones ?? []).find(
        (p) =>
          cleanImei(p.imei) === target ||
          (p.imei_secondary && cleanImei(p.imei_secondary) === target),
      ) || null
    );
  }, [phone.imei, state.phones]);

  const duplicateSecondaryPhone = useMemo(() => {
    const target = cleanImei(phone.imei_secondary);
    if (!target) return null;
    const primTarget = cleanImei(phone.imei);
    if (primTarget && target === primTarget) {
      return { isSelfConflict: true, brand: "", model: "", status: "" };
    }
    const match = (state.phones ?? []).find(
      (p) =>
        cleanImei(p.imei) === target ||
        (p.imei_secondary && cleanImei(p.imei_secondary) === target),
    );
    if (match) return { isSelfConflict: false, brand: match.brand, model: match.model, status: match.status };
    return null;
  }, [phone.imei, phone.imei_secondary, state.phones]);

  const handleSubmit = () => {
    if (!phone.imei.trim() || !phone.brand.trim() || !phone.model.trim() || !phone.purchase_price) {
      toast.error("IMEI, brand, model, and purchase cost are required.");
      return;
    }

    if (duplicatePhone) {
      toast.error(`IMEI "${phone.imei.trim()}" already exists in inventory (${duplicatePhone.brand} ${duplicatePhone.model}). Duplicate IMEIs are not allowed.`);
      return;
    }

    if (duplicateSecondaryPhone) {
      toast.error(
        duplicateSecondaryPhone.isSelfConflict
          ? "Secondary IMEI cannot match Primary IMEI."
          : `Secondary IMEI already in use by ${duplicateSecondaryPhone.brand} ${duplicateSecondaryPhone.model}.`
      );
      return;
    }

    addPhone({
      imei: phone.imei.trim(),
      imei_secondary: phone.imei_secondary.trim() || null,
      serial_number: phone.serial_number.trim() || null,
      cycle_count: normalizeCycleCount(phone.cycle_count),
      battery_health: normalizeBatteryHealth(phone.battery_health),
      brand: phone.brand.trim(),
      model: phone.model.trim(),
      storage_ram: getFormattedStorageRam(),
      condition: phone.condition,
      source_type: "Own Stock",
      supplier_id: null,
      customer_purchase_id: null,
      purchase_price: Number(phone.purchase_price),
      selling_price: phone.selling_price ? Number(phone.selling_price) : null,
      status: "Available",
      condition_notes: phone.condition_notes.trim(),
      damage_checklist: { screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false },
      warranty_repair_notes: "",
      with_box: phone.with_box,
    });

    toast.success(`${phone.brand} ${phone.model} added to Stock.`);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="px-6 pt-6 pb-3 border-b border-border bg-card">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl flex items-center gap-2">
              <Smartphone className="size-5 text-primary" />
              Add Phone to Inventory
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Enter device details and IMEI to record a new phone into stock.
          </p>
        </DialogHeader>

        <div className="px-6 flex-1 overflow-y-auto py-4">
          <section className="rounded-xl border border-border bg-card p-6 space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Brand *">
                <select
                  value={phone.brand}
                  onChange={(e) => setPhone({ ...phone, brand: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm font-medium"
                >
                  {PHONE_BRAND_OPTIONS.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </Field>
              <Field label="Model *">
                <Input
                  value={phone.model}
                  onChange={(e) => setPhone({ ...phone, model: e.target.value })}
                  placeholder="e.g. iPhone 15 Pro Max"
                />
              </Field>
              <Field label="ROM (Storage)">
                <select
                  value={phone.rom}
                  onChange={(e) => setPhone({ ...phone, rom: e.target.value })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm font-medium"
                >
                  {PHONE_ROM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>{opt}</option>
                  ))}
                </select>
              </Field>
              {!isApple && (
                <Field label="RAM">
                  <select
                    value={phone.ram}
                    onChange={(e) => setPhone({ ...phone, ram: e.target.value })}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm font-medium"
                  >
                    {PHONE_RAM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>{opt}</option>
                    ))}
                  </select>
                </Field>
              )}
              <Field label="Condition">
                <select
                  value={phone.condition}
                  onChange={(e) => setPhone({ ...phone, condition: e.target.value as PhoneCondition })}
                  className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                >
                  {conditions.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </Field>
              <Field label="IMEI 1 *">
                <Input
                  value={phone.imei}
                  onChange={(e) => setPhone({ ...phone, imei: e.target.value })}
                  placeholder="15-digit primary IMEI"
                  className={`font-mono text-xs transition-colors ${
                    duplicatePhone
                      ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5 font-semibold"
                      : ""
                  }`}
                />
                {duplicatePhone && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                    <div className="space-y-0.5">
                      <div className="font-semibold flex items-center gap-1.5">
                        <span>Duplicate IMEI Detected</span>
                        <span className="inline-flex items-center rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                          Already Exists
                        </span>
                      </div>
                      <p className="text-[11px] text-foreground/85 leading-relaxed">
                        This IMEI is already registered to <strong className="text-foreground font-semibold">{duplicatePhone.brand} {duplicatePhone.model}</strong> (Status: <span className="font-semibold underline decoration-destructive/50">{duplicatePhone.status}</span>). Duplicate IMEIs are not allowed.
                      </p>
                    </div>
                  </div>
                )}
              </Field>
              <Field label="Secondary IMEI (optional)">
                <Input
                  value={phone.imei_secondary}
                  onChange={(e) => setPhone({ ...phone, imei_secondary: e.target.value })}
                  placeholder="Optional 2nd IMEI"
                  className={`font-mono text-xs transition-colors ${
                    duplicateSecondaryPhone
                      ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5 font-semibold"
                      : ""
                  }`}
                />
                {duplicateSecondaryPhone && (
                  <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                    <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-destructive">
                        {duplicateSecondaryPhone.isSelfConflict
                          ? "Secondary IMEI cannot match Primary IMEI"
                          : "Duplicate Secondary IMEI"}
                      </div>
                      <p className="text-[11px] text-foreground/85 leading-relaxed">
                        {duplicateSecondaryPhone.isSelfConflict
                          ? "Primary and secondary IMEI cannot be identical."
                          : `This secondary IMEI is already in use by ${duplicateSecondaryPhone.brand} ${duplicateSecondaryPhone.model} (${duplicateSecondaryPhone.status}).`}
                      </p>
                    </div>
                  </div>
                )}
              </Field>
              <Field label="Battery Health (optional)">
                <Input
                  value={phone.battery_health}
                  onChange={(e) => setPhone({ ...phone, battery_health: e.target.value })}
                  onBlur={() => {
                    const v = normalizeBatteryHealth(phone.battery_health);
                    if (v) setPhone((prev) => ({ ...prev, battery_health: v }));
                  }}
                  placeholder="e.g. 85%"
                />
              </Field>
              <Field label="Serial Number (optional)">
                <Input
                  value={phone.serial_number}
                  onChange={(e) => setPhone({ ...phone, serial_number: e.target.value })}
                  placeholder="e.g. F2LWQ1HFXXXX"
                  className="font-mono text-xs"
                />
              </Field>
              <Field label="Cycle Count (optional)">
                <Input
                  type="number"
                  min="0"
                  value={phone.cycle_count}
                  onChange={(e) => setPhone({ ...phone, cycle_count: e.target.value })}
                  placeholder="e.g. 120"
                />
              </Field>
              <Field label={<>Cost / Purchase Price (<TakaSign />) *</>}>
                <Input
                  type="number"
                  min="0"
                  required
                  value={phone.purchase_price}
                  onChange={(e) => setPhone({ ...phone, purchase_price: e.target.value })}
                  placeholder="e.g. 85000"
                  className="font-bold text-foreground text-base"
                />
              </Field>
              <Field label={<>Selling Price (<TakaSign />)</>}>
                <Input
                  type="number"
                  value={phone.selling_price}
                  onChange={(e) => setPhone({ ...phone, selling_price: e.target.value })}
                  placeholder="e.g. 98000"
                />
              </Field>
              <div className="sm:col-span-2">
                <Field label="Condition Notes / Details">
                  <Input
                    value={phone.condition_notes}
                    onChange={(e) => setPhone({ ...phone, condition_notes: e.target.value })}
                    placeholder="e.g. Brand new intact box, official warranty"
                  />
                </Field>
              </div>
              <div className="sm:col-span-2">
                <div
                  onClick={() => setPhone((p) => ({ ...p, with_box: !p.with_box }))}
                  className={`flex items-center gap-3 rounded-xl border p-3 cursor-pointer transition-colors select-none ${
                    phone.with_box
                      ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                      : "border-border/80 bg-secondary/30 hover:bg-secondary/60 text-muted-foreground"
                  }`}
                >
                  <Checkbox
                    id="phone-with-box"
                    checked={phone.with_box}
                    onCheckedChange={(checked) => setPhone((p) => ({ ...p, with_box: Boolean(checked) }))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <div className="flex items-center gap-2">
                    <Box className={`size-4 ${phone.with_box ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                    <label htmlFor="phone-with-box" className="text-sm font-semibold cursor-pointer text-foreground">
                      With Box
                    </label>
                    <span className="text-xs">
                      {phone.with_box ? "(Includes original/matching device box)" : "(Phone only, no box)"}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card">
          <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="rounded-xl"
            onClick={handleSubmit}
            disabled={
              !phone.brand.trim() ||
              !phone.model.trim() ||
              !phone.imei.trim() ||
              !phone.purchase_price ||
              Boolean(duplicatePhone) ||
              Boolean(duplicateSecondaryPhone)
            }
          >
            Add Phone to Stock
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function Field({ label, children }: { label: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs text-muted-foreground">{label}</Label>
      {children}
    </div>
  );
}
