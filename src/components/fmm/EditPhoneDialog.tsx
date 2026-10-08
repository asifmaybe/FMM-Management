import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import { AlertCircle, AlertTriangle, Box, Check, Edit3, Smartphone, Trash2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { normalizeBatteryHealth, normalizeCycleCount, useFmm } from "@/lib/fmm-store";
import { type Phone, type PhoneCondition, type PhoneStatus, type SourceType, PHONE_BRAND_OPTIONS, PHONE_RAM_OPTIONS, PHONE_ROM_OPTIONS } from "@/lib/fmm-types";
import { checkImeiCollision, isValidImei } from "@/lib/fmm-imei";
import { TakaSign } from "@/components/fmm/Taka";

const conditions: PhoneCondition[] = ["Used - Good", "Used - A", "Used - B", "New", "Refurbished"];
const statuses: PhoneStatus[] = ["Available", "In Inspection", "Sold", "Exchange", "Returned", "Returned to Supplier"];
const sourceTypes: SourceType[] = ["Supplier Purchase", "Buy from Customer", "Own Stock"];

const damageChecklistItems = [
  { key: "screen_scratch", label: "Screen Scratch" },
  { key: "body_dent", label: "Body Dent" },
  { key: "battery_issue", label: "Battery Issue" },
  { key: "camera_blurry", label: "Camera Blurry" },
] as const;

interface EditPhoneDialogProps {
  phone: Phone | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDeleted?: () => void;
}

export function EditPhoneDialog({ phone, open, onOpenChange, onDeleted }: EditPhoneDialogProps) {
  const { state, updatePhone, deletePhone } = useFmm();

  const [rom, setRom] = useState("128GB");
  const [ram, setRam] = useState("8GB");

  const [form, setForm] = useState({
    brand: "",
    model: "",
    imei: "",
    imei_secondary: "",
    serial_number: "",
    cycle_count: "",
    storage_ram: "",
    battery_health: "",
    condition: "Used - Good" as PhoneCondition,
    source_type: "Own Stock" as SourceType,
    supplier_id: "" as string,
    purchase_price: "",
    selling_price: "",
    sold_price: "",
    status: "Available" as PhoneStatus,
    warranty_days: "30",
    condition_notes: "",
    with_box: false,
    damage_checklist: {
      screen_scratch: false,
      body_dent: false,
      battery_issue: false,
      camera_blurry: false,
    },
  });

  const [activeTab, setActiveTab] = useState("general");

  useEffect(() => {
    if (phone && open) {
      const sr = phone.storage_ram || "";
      const parts = sr.split("/").map((s) => s.trim());
      const detectedRom = PHONE_ROM_OPTIONS.find((opt) => parts.some((p) => p.toLowerCase() === opt.toLowerCase())) || parts[0] || "128GB";
      const detectedRam = PHONE_RAM_OPTIONS.find((opt) => parts.some((p) => p.toLowerCase() === opt.toLowerCase())) || parts[1] || "8GB";
      setRom(detectedRom);
      setRam(detectedRam);

      setForm({
        brand: phone.brand || "Apple",
        model: phone.model || "",
        imei: phone.imei || "",
        imei_secondary: phone.imei_secondary || "",
        serial_number: phone.serial_number || "",
        cycle_count: phone.cycle_count != null ? String(phone.cycle_count) : "",
        storage_ram: phone.storage_ram || "",
        battery_health: phone.battery_health || "",
        condition: phone.condition || "Used - Good",
        source_type: phone.source_type || "Own Stock",
        supplier_id: phone.supplier_id || "",
        purchase_price: phone.purchase_price != null ? String(phone.purchase_price) : "",
        selling_price: phone.selling_price != null ? String(phone.selling_price) : "",
        sold_price: phone.sold_price != null ? String(phone.sold_price) : "",
        status: phone.status || "Available",
        warranty_days: phone.warranty_days != null ? String(phone.warranty_days) : "30",
        condition_notes: phone.condition_notes || "",
        with_box: Boolean(phone.with_box),
        damage_checklist: {
          screen_scratch: Boolean(phone.damage_checklist?.screen_scratch),
          body_dent: Boolean(phone.damage_checklist?.body_dent),
          battery_issue: Boolean(phone.damage_checklist?.battery_issue),
          camera_blurry: Boolean(phone.damage_checklist?.camera_blurry),
        },
      });
      setActiveTab("general");
      setAllowInvalidImei(false);
    }
  }, [phone, open]);

  const [allowInvalidImei, setAllowInvalidImei] = useState(false);

  const imeiValidation = useMemo(() => {
    if (!form.imei.trim()) return { valid: true };
    return isValidImei(form.imei);
  }, [form.imei]);

  const collision = useMemo(() => {
    if (!phone || (!form.imei.trim() && !form.imei_secondary.trim())) return { hasCollision: false as const };
    return checkImeiCollision(state, form.imei, form.imei_secondary, phone.id);
  }, [phone, form.imei, form.imei_secondary, state]);

  if (!phone) return null;

  const handleSave = () => {
    if (!form.brand.trim()) {
      toast.error("Brand is required.");
      setActiveTab("general");
      return;
    }
    if (!form.model.trim()) {
      toast.error("Model is required.");
      setActiveTab("general");
      return;
    }
    if (!form.imei.trim()) {
      toast.error("Primary IMEI is required.");
      setActiveTab("general");
      return;
    }
    if (!imeiValidation.valid && !allowInvalidImei) {
      toast.error(`IMEI warning: ${imeiValidation.reason}. Confirm the checkbox to proceed.`);
      setActiveTab("general");
      return;
    }
    if (collision.hasCollision) {
      toast.error(collision.message);
      setActiveTab("general");
      return;
    }
    if (!form.purchase_price || isNaN(Number(form.purchase_price))) {
      toast.error("Valid purchase price is required.");
      setActiveTab("pricing");
      return;
    }

    const patch: Partial<Phone> = {
      brand: form.brand.trim(),
      model: form.model.trim(),
      imei: form.imei.trim(),
      imei_secondary: form.imei_secondary.trim() || null,
      storage_ram: form.brand.trim().toLowerCase() === "apple"
        ? rom
        : [rom, ram].filter(Boolean).join(" / ") || "Standard",
      battery_health: normalizeBatteryHealth(form.battery_health),
      serial_number: form.serial_number.trim() || null,
      cycle_count: normalizeCycleCount(form.cycle_count),
      condition: form.condition,
      source_type: form.source_type,
      supplier_id: form.source_type === "Supplier Purchase" && form.supplier_id ? form.supplier_id : null,
      purchase_price: Number(form.purchase_price),
      selling_price: form.selling_price ? Number(form.selling_price) : null,
      sold_price: form.sold_price ? Number(form.sold_price) : null,
      status: form.status,
      warranty_days: form.warranty_days ? Number(form.warranty_days) : 30,
      condition_notes: form.condition_notes.trim(),
      damage_checklist: form.damage_checklist,
      with_box: form.with_box,
    };

    updatePhone(phone.id, patch);
    toast.success(`Updated ${form.brand} ${form.model} successfully.`);
    onOpenChange(false);
  };

  const handleDelete = () => {
    const confirmMessage = `Are you sure you want to permanently remove "${phone.brand} ${phone.model}" (IMEI: ${phone.imei}) from inventory? This cannot be undone.`;
    if (window.confirm(confirmMessage)) {
      deletePhone(phone.id);
      toast.success(`${phone.brand} ${phone.model} deleted from inventory.`);
      onOpenChange(false);
      if (onDeleted) onDeleted();
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[92vh] overflow-y-auto rounded-2xl p-6">
        <DialogHeader className="border-b border-border pb-4">
          <div className="flex items-center justify-between gap-3">
            <DialogTitle className="flex items-center gap-2 text-xl">
              <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
                <Edit3 className="size-5" />
              </div>
              <span>Edit Phone Details</span>
            </DialogTitle>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Updating {phone.brand} {phone.model} &middot; Original IMEI: <span className="font-mono font-medium text-foreground">{phone.imei}</span>
          </p>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-4">
          <TabsList className="grid grid-cols-3 rounded-xl p-1 bg-secondary/60">
            <TabsTrigger value="general" className="rounded-lg text-xs font-semibold">
              General Info
            </TabsTrigger>
            <TabsTrigger value="pricing" className="rounded-lg text-xs font-semibold">
              Price & Status
            </TabsTrigger>
            <TabsTrigger value="condition" className="rounded-lg text-xs font-semibold">
              Condition & Specs
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: GENERAL INFO */}
          <TabsContent value="general" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Brand *</Label>
                <select
                  value={form.brand}
                  onChange={(e) => setForm({ ...form, brand: e.target.value })}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                >
                  {Array.from(new Set([form.brand, ...PHONE_BRAND_OPTIONS])).filter(Boolean).map((b) => (
                    <option key={b} value={b}>
                      {b}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Model *</Label>
                <Input
                  value={form.model}
                  onChange={(e) => setForm({ ...form, model: e.target.value })}
                  placeholder="e.g. iPhone 14 Pro, Galaxy S23"
                  className="rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Primary IMEI *</Label>
                <Input
                  value={form.imei}
                  onChange={(e) => setForm({ ...form, imei: e.target.value })}
                  placeholder="15-digit IMEI"
                  className={`rounded-xl font-mono text-sm ${
                    collision.hasCollision && collision.field === "primary"
                      ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5"
                      : !imeiValidation.valid
                      ? "border-amber-500/50"
                      : ""
                  }`}
                />
                {!imeiValidation.valid && form.imei.trim() && (
                  <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2 text-xs text-amber-700 dark:text-amber-300 mt-1">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                    <div className="space-y-1">
                      <p className="text-[11px] leading-tight">{imeiValidation.reason}</p>
                      <div className="flex items-center gap-1.5">
                        <Checkbox
                          id="edit-allow-invalid-imei"
                          checked={allowInvalidImei}
                          onCheckedChange={(c) => setAllowInvalidImei(Boolean(c))}
                        />
                        <label htmlFor="edit-allow-invalid-imei" className="text-[10px] font-medium cursor-pointer text-foreground">
                          Allow non-standard IMEI
                        </label>
                      </div>
                    </div>
                  </div>
                )}
                {collision.hasCollision && collision.field === "primary" && (
                  <div className="flex items-start gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive mt-1">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-destructive" />
                    <p className="text-[11px] leading-tight">{collision.message}</p>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Secondary IMEI (Optional)</Label>
                <Input
                  value={form.imei_secondary}
                  onChange={(e) => setForm({ ...form, imei_secondary: e.target.value })}
                  placeholder="e.g. eSIM or second SIM IMEI"
                  className={`rounded-xl font-mono text-sm ${
                    collision.hasCollision && (collision.field === "secondary" || collision.type === "self_conflict")
                      ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5"
                      : ""
                  }`}
                />
                {collision.hasCollision && (collision.field === "secondary" || collision.type === "self_conflict") && (
                  <div className="flex items-start gap-1.5 rounded-xl border border-destructive/40 bg-destructive/10 p-2 text-xs text-destructive mt-1">
                    <AlertCircle className="size-3.5 shrink-0 mt-0.5 text-destructive" />
                    <p className="text-[11px] leading-tight">{collision.message}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">ROM (Storage)</Label>
                <select
                  value={rom}
                  onChange={(e) => setRom(e.target.value)}
                  className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                >
                  {PHONE_ROM_OPTIONS.map((opt) => (
                    <option key={opt} value={opt}>
                      {opt}
                    </option>
                  ))}
                </select>
              </div>
              {form.brand !== "Apple" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">RAM</Label>
                  <select
                    value={ram}
                    onChange={(e) => setRam(e.target.value)}
                    className="h-9 w-full rounded-xl border border-input bg-background px-3 text-sm font-medium"
                  >
                    {PHONE_RAM_OPTIONS.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Battery Health (Optional)</Label>
                <Input
                  value={form.battery_health}
                  onChange={(e) => setForm({ ...form, battery_health: e.target.value })}
                  onBlur={() => {
                    const v = normalizeBatteryHealth(form.battery_health);
                    if (v) setForm((prev) => ({ ...prev, battery_health: v }));
                  }}
                  placeholder="e.g. 88%, 100%, Service"
                  className="rounded-xl"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Packaging</Label>
                <div
                  onClick={() => setForm((prev) => ({ ...prev, with_box: !prev.with_box }))}
                  className={`flex h-9 items-center gap-2.5 rounded-xl border px-3 cursor-pointer transition-colors select-none ${
                    form.with_box
                      ? "border-emerald-500/40 bg-emerald-500/10 text-foreground"
                      : "border-input bg-background hover:bg-secondary/50 text-muted-foreground"
                  }`}
                >
                  <Checkbox
                    id="edit-phone-with-box"
                    checked={form.with_box}
                    onCheckedChange={(checked) => setForm((prev) => ({ ...prev, with_box: Boolean(checked) }))}
                    onClick={(e) => e.stopPropagation()}
                  />
                  <Box className={`size-3.5 ${form.with_box ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                  <label htmlFor="edit-phone-with-box" className="text-xs font-semibold cursor-pointer text-foreground">
                    With Box
                  </label>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Serial Number (Optional)</Label>
                <Input
                  value={form.serial_number}
                  onChange={(e) => setForm({ ...form, serial_number: e.target.value })}
                  placeholder="e.g. F17X..."
                  className="rounded-xl font-mono text-sm"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Cycle Count (Optional)</Label>
                <Input
                  type="number"
                  min="0"
                  value={form.cycle_count}
                  onChange={(e) => setForm({ ...form, cycle_count: e.target.value })}
                  placeholder="e.g. 142"
                  className="rounded-xl"
                />
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: PRICING & STATUS */}
          <TabsContent value="pricing" className="space-y-4 pt-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Purchase Price (Cost) *</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    <TakaSign />
                  </span>
                  <Input
                    type="number"
                    value={form.purchase_price}
                    onChange={(e) => setForm({ ...form, purchase_price: e.target.value })}
                    placeholder="0"
                    className="rounded-xl pl-8"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Selling / Asking Price</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                    <TakaSign />
                  </span>
                  <Input
                    type="number"
                    value={form.selling_price}
                    onChange={(e) => setForm({ ...form, selling_price: e.target.value })}
                    placeholder="0"
                    className="rounded-xl pl-8"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Stock Status</Label>
                <select
                  value={form.status}
                  onChange={(e) => setForm({ ...form, status: e.target.value as PhoneStatus })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {statuses.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {form.status === "Sold" ? (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Final Sold Price</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-muted-foreground">
                      <TakaSign />
                    </span>
                    <Input
                      type="number"
                      value={form.sold_price}
                      onChange={(e) => setForm({ ...form, sold_price: e.target.value })}
                      placeholder="Actual sold amount"
                      className="rounded-xl pl-8 font-semibold text-emerald-600"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Warranty (Days)</Label>
                  <Input
                    type="number"
                    value={form.warranty_days}
                    onChange={(e) => setForm({ ...form, warranty_days: e.target.value })}
                    placeholder="30"
                    className="rounded-xl"
                  />
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">Source Type</Label>
                <select
                  value={form.source_type}
                  onChange={(e) => setForm({ ...form, source_type: e.target.value as SourceType })}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                >
                  {sourceTypes.map((st) => (
                    <option key={st} value={st}>
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {form.source_type === "Supplier Purchase" && (
                <div className="space-y-1.5">
                  <Label className="text-xs font-medium">Supplier</Label>
                  <select
                    value={form.supplier_id}
                    onChange={(e) => setForm({ ...form, supplier_id: e.target.value })}
                    className="w-full rounded-xl border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
                  >
                    <option value="">Select a supplier...</option>
                    {state.suppliers.filter((s) => s.supplier_type === "Phone").map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} ({s.status})
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: CONDITION & SPECS */}
          <TabsContent value="condition" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label className="text-xs font-medium">Cosmetic Condition</Label>
              <div className="flex flex-wrap gap-2">
                {conditions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, condition: c })}
                    className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition-all ${
                      form.condition === c
                        ? "border-primary bg-primary/10 text-primary font-bold shadow-xs"
                        : "border-border bg-card text-muted-foreground hover:bg-secondary"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-xs font-medium">Physical Defect Checklist</Label>
              <div className="grid grid-cols-2 gap-2.5 rounded-xl border border-border bg-secondary/20 p-3">
                {damageChecklistItems.map((item) => (
                  <label
                    key={item.key}
                    className="flex cursor-pointer items-center gap-2 text-xs font-medium text-foreground select-none"
                  >
                    <input
                      type="checkbox"
                      checked={form.damage_checklist[item.key]}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          damage_checklist: {
                            ...form.damage_checklist,
                            [item.key]: e.target.checked,
                          },
                        })
                      }
                      className="size-4 rounded border-border text-primary focus:ring-primary"
                    />
                    <span>{item.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Condition & Repair Notes</Label>
              <Textarea
                value={form.condition_notes}
                onChange={(e) => setForm({ ...form, condition_notes: e.target.value })}
                placeholder="Details on scratches, display replacements, original accessories included, etc."
                rows={3}
                className="rounded-xl resize-none text-xs"
              />
            </div>
          </TabsContent>
        </Tabs>

        <DialogFooter className="mt-6 flex flex-row items-center justify-between border-t border-border pt-4 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-destructive hover:bg-destructive/10 hover:text-destructive rounded-xl gap-1.5 text-xs"
            onClick={handleDelete}
          >
            <Trash2 className="size-4" />
            Delete Phone
          </Button>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="rounded-xl text-xs"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="rounded-xl bg-primary hover:bg-primary/90 gap-1.5 text-xs font-semibold"
              onClick={handleSave}
            >
              <Check className="size-4" />
              Save Changes
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
