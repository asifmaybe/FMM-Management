import { AlertCircle, Box, Camera, Check, FileText, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/fmm/AddPhoneDialog";
import { useFmm, normalizeCycleCount } from "@/lib/fmm-store";
import { type PhoneCondition, type StoredFile, PHONE_BRAND_OPTIONS, PHONE_RAM_OPTIONS, PHONE_ROM_OPTIONS } from "@/lib/fmm-types";
import { TakaSign } from "@/components/fmm/Taka";
import { processStoredFile, isImageDocument } from "@/lib/fmm-file";
import { checkImeiCollision, isValidImei } from "@/lib/fmm-imei";

const steps = ["Customer Info", "Identity Verification (Optional)", "Phone Details"];

const damageItems = [
  { key: "screen_scratch", label: "Screen Scratch" },
  { key: "body_dent", label: "Body Dent" },
  { key: "battery_issue", label: "Battery Issue" },
  { key: "camera_blurry", label: "Camera Blurry" },
] as const;

const readFile = processStoredFile;

export function CustomerIntakeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { state, saveCustomerPurchase } = useFmm();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", nid: "" });
  const [nidFront, setNidFront] = useState<StoredFile | null>(null);
  const [nidBack, setNidBack] = useState<StoredFile | null>(null);
  const [docs, setDocs] = useState<StoredFile[]>([]);
  const [photos, setPhotos] = useState<StoredFile[]>([]);
  const [phone, setPhone] = useState({
    brand: "Apple",
    model: "",
    rom: "128GB",
    ram: "8GB",
    condition: "Used - Good" as PhoneCondition,
    imei: "",
    serial_number: "",
    cycle_count: "",
    bought_price: "",
    agreed_price: "",
    with_box: false,
  });
  const [damage, setDamage] = useState({ screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false });

  const reset = () => {
    setStep(0);
    setCustomer({ name: "", phone: "", address: "", nid: "" });
    setNidFront(null);
    setNidBack(null);
    setDocs([]);
    setPhotos([]);
    setPhone({
      brand: "Apple",
      model: "",
      rom: "128GB",
      ram: "8GB",
      condition: "Used - Good",
      imei: "",
      serial_number: "",
      cycle_count: "",
      bought_price: "",
      agreed_price: "",
      with_box: false,
    });
    setDamage({ screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false });
    setAllowInvalidImei(false);
  };

  const [allowInvalidImei, setAllowInvalidImei] = useState(false);

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const pick = (setter: (f: StoredFile) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setter(await readFile(file));
  };

  const imeiValidation = useMemo(() => {
    if (!phone.imei.trim()) return { valid: true };
    return isValidImei(phone.imei);
  }, [phone.imei]);

  const collision = useMemo(() => {
    if (!phone.imei.trim()) return { hasCollision: false, inStockConflict: false, canReenter: false, collidingPhone: null };
    return checkImeiCollision(state, phone.imei, null);
  }, [phone.imei, state]);

  const save = () => {
    if (!customer.name.trim() || !phone.model.trim() || !phone.imei.trim() || !phone.agreed_price) {
      toast.error("Customer full name, device model, IMEI, and agreed price are required.");
      return;
    }
    if (!imeiValidation.valid && !allowInvalidImei) {
      toast.error(`IMEI warning: ${imeiValidation.reason}. Confirm the checkbox to proceed.`);
      return;
    }
    if (collision.hasCollision && collision.type === "conflict") {
      toast.error(collision.message);
      return;
    }
    saveCustomerPurchase(
      {
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        customer_address: customer.address.trim(),
        nid_number: customer.nid.trim(),
        nid_front_image: nidFront,
        nid_back_image: nidBack,
        additional_documents: docs,
        phone_photos: photos,
        purchase_price: Number(phone.agreed_price),
      },
      {
        imei: phone.imei.trim(),
        imei_secondary: null,
        battery_health: null,
        serial_number: phone.serial_number.trim() || null,
        cycle_count: normalizeCycleCount(phone.cycle_count),
        brand: phone.brand.trim(),
        model: phone.model.trim(),
        storage_ram: phone.brand.trim().toLowerCase() === "apple"
          ? phone.rom.trim() || "N/A"
          : [phone.rom.trim(), phone.ram.trim()].filter(Boolean).join(" / ") || "N/A",
        condition: phone.condition,
        purchase_price: Number(phone.agreed_price),
        selling_price: null,
        condition_notes: "",
        damage_checklist: damage,
        warranty_repair_notes: "",
        with_box: phone.with_box,
      },
    );
    toast.success(`Bought ${phone.brand} ${phone.model} from ${customer.name}. Saved and added to stock.`);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="px-6 pt-6 pb-2 border-b border-border bg-card">
          <DialogTitle className="text-xl flex items-center gap-2">
            Buy from Customer
          </DialogTitle>
          <p className="text-xs text-muted-foreground mt-0.5">
            Record pre-owned device intake directly from a customer.
          </p>
        </DialogHeader>

        <div className="px-6 flex-1 overflow-y-auto py-4">
          {/* Stepper Header */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {steps.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (i === 0 || customer.name.trim()) setStep(i);
                }}
                className={`flex items-center gap-2 text-xs font-semibold cursor-pointer transition-colors ${
                  i === step ? "text-primary" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-bold ${
                    i < step
                      ? "bg-emerald-500 text-white"
                      : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* STEP 0: Customer Information */}
          {step === 0 ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold">1. Customer Information</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter the seller's contact details. NID number is optional.
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2 pt-1">
                <Field label="Customer Full Name *">
                  <Input
                    value={customer.name}
                    onChange={(e) => setCustomer({ ...customer, name: e.target.value })}
                    placeholder="e.g. Rahim Uddin"
                  />
                </Field>
                <Field label="Phone Number">
                  <Input
                    value={customer.phone}
                    onChange={(e) => setCustomer({ ...customer, phone: e.target.value })}
                    placeholder="01XXX-XXXXXX"
                  />
                </Field>
                <Field label="Address">
                  <Input
                    value={customer.address}
                    onChange={(e) => setCustomer({ ...customer, address: e.target.value })}
                    placeholder="Street address, Thana, Dist"
                  />
                </Field>
                <Field label="NID Number (Optional)">
                  <Input
                    value={customer.nid}
                    onChange={(e) => setCustomer({ ...customer, nid: e.target.value })}
                    placeholder="10 or 17-digit National ID (optional)"
                    className="font-mono text-xs"
                  />
                </Field>
              </div>
            </section>
          ) : null}

          {/* STEP 1: Identity & Purchase Verification (Optional) */}
          {step === 1 ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <ShieldCheck className="size-5 text-primary" /> 2. Identity Verification &amp; Evidence
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Optional: You can upload photos of the customer's National ID and buying cash memo or skip this step.
                  </p>
                </div>
                <span className="rounded-full bg-secondary/80 border border-border px-2.5 py-0.5 text-xs text-muted-foreground font-semibold">
                  Optional
                </span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <UploadTile
                  label="NID Front (Optional)"
                  hint="Customer National ID front side"
                  file={nidFront}
                  onPick={pick(setNidFront)}
                  onClear={() => setNidFront(null)}
                />
                <UploadTile
                  label="NID Back (Optional)"
                  hint="Customer National ID back side"
                  file={nidBack}
                  onPick={pick(setNidBack)}
                  onClear={() => setNidBack(null)}
                />
              </div>

              <div className="space-y-3 pt-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cash Memo / Purchase Receipt / Evidence (Optional)
                  </Label>
                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                    <Plus className="size-3.5" /> Attach Document
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const stored = await readFile(file);
                          setDocs((prev) => [...prev, stored]);
                        }
                      }}
                    />
                  </label>
                </div>

                {docs.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-border bg-secondary/20 p-4 text-center">
                    <FileText className="size-8 mx-auto text-muted-foreground/50 mb-1.5" />
                    <p className="text-xs text-muted-foreground">
                      No cash memo or receipt attached (optional).
                    </p>
                    <label className="mt-2 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-secondary transition-colors">
                      <Plus className="size-3.5" /> Upload Cash Memo / Receipt
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const stored = await readFile(file);
                            setDocs((prev) => [...prev, stored]);
                          }
                        }}
                      />
                    </label>
                  </div>
                ) : (
                  <div className="grid gap-2 sm:grid-cols-2">
                    {docs.map((d, di) => (
                      <div
                        key={di}
                        className="flex items-center justify-between rounded-xl border border-border bg-card p-2.5 text-xs"
                      >
                        <div className="flex items-center gap-2 overflow-hidden">
                          <FileText className="size-4 shrink-0 text-primary" />
                          <span className="truncate font-medium">{d.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => setDocs((prev) => prev.filter((_, idx) => idx !== di))}
                          className="rounded-lg p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors ml-2"
                          title="Remove"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </section>
          ) : null}

          {/* STEP 2: Phone Details */}
          {step === 2 ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold">3. Phone Details &amp; Valuation</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter device specifications, IMEI, and agreed purchase price.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-1">
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
                  <Input value={phone.model} onChange={(e) => setPhone({ ...phone, model: e.target.value })} placeholder="e.g. iPhone 14 Pro, Galaxy S23" />
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
                <Field label="Condition">
                  <select
                    value={phone.condition}
                    onChange={(e) => setPhone({ ...phone, condition: e.target.value as PhoneCondition })}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {["Used - Good", "Used - A", "Used - B"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="IMEI 1 / IMEI 2 *">
                  <Input
                    value={phone.imei}
                    onChange={(e) => setPhone({ ...phone, imei: e.target.value })}
                    placeholder="Enter 15-digit IMEI"
                    className={`font-mono text-xs transition-colors ${
                      collision.hasCollision && collision.type === "conflict"
                        ? "border-destructive focus-visible:ring-destructive text-destructive bg-destructive/5 font-semibold"
                        : !imeiValidation.valid
                        ? "border-amber-500/50 focus-visible:ring-amber-500"
                        : ""
                    }`}
                  />
                  {!imeiValidation.valid && phone.imei.trim() && (
                    <div className="flex items-start gap-2 rounded-xl border border-amber-500/40 bg-amber-500/10 p-2.5 text-xs text-amber-700 dark:text-amber-300 mt-1.5">
                      <AlertCircle className="size-4 shrink-0 mt-0.5 text-amber-600 dark:text-amber-400" />
                      <div className="space-y-1.5">
                        <div className="font-semibold">IMEI Validation Warning</div>
                        <p className="text-[11px] leading-relaxed">
                          {imeiValidation.reason}
                        </p>
                        <div className="flex items-center gap-2 pt-1">
                          <Checkbox
                            id="intake-allow-invalid-imei"
                            checked={allowInvalidImei}
                            onCheckedChange={(c) => setAllowInvalidImei(Boolean(c))}
                          />
                          <label htmlFor="intake-allow-invalid-imei" className="text-[11px] font-medium cursor-pointer text-foreground">
                            Confirm: Allow non-standard IMEI
                          </label>
                        </div>
                      </div>
                    </div>
                  )}
                  {collision.hasCollision && (
                    collision.type === "reenter" ? (
                      <div className="flex items-start gap-2.5 rounded-xl border border-primary/40 bg-primary/5 p-2.5 text-xs mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-primary" />
                        <div className="space-y-1">
                          <div className="font-semibold text-foreground flex items-center gap-1.5">
                            <span>Past Shop Device Recognized</span>
                            <span className="inline-flex items-center rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                              Re-entry
                            </span>
                          </div>
                          <p className="text-[11px] text-muted-foreground leading-relaxed">
                            This device was previously handled by the shop (<strong className="text-foreground">{collision.phone?.brand} {collision.phone?.model}</strong>, status: {collision.phone?.status}). Purchasing will reuse its permanent identity and append a new cycle to its history.
                          </p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2 rounded-xl border border-destructive/40 bg-destructive/10 p-2.5 text-xs text-destructive mt-1.5 animate-in fade-in slide-in-from-top-1 duration-200">
                        <AlertCircle className="size-4 shrink-0 mt-0.5 text-destructive" />
                        <div className="space-y-0.5">
                          <div className="font-semibold flex items-center gap-1.5">
                            <span>Duplicate IMEI In Stock</span>
                            <span className="inline-flex items-center rounded-full bg-destructive/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider">
                              Blocked
                            </span>
                          </div>
                          <p className="text-[11px] text-foreground/85 leading-relaxed">
                            {collision.message}
                          </p>
                        </div>
                      </div>
                    )
                  )}
                </Field>
                <Field label={<>Bought Price (<TakaSign />)</>}>
                  <Input type="number" value={phone.bought_price} onChange={(e) => setPhone({ ...phone, bought_price: e.target.value })} />
                </Field>
                <Field label={<>Agreed Purchase Price (<TakaSign />) *</>}>
                  <Input
                    type="number"
                    min="1"
                    value={phone.agreed_price}
                    onChange={(e) => setPhone({ ...phone, agreed_price: e.target.value })}
                    className="font-bold text-success text-base"
                    placeholder="e.g. 35000"
                  />
                </Field>
                <Field label="Serial Number (Optional)">
                  <Input
                    value={phone.serial_number}
                    onChange={(e) => setPhone({ ...phone, serial_number: e.target.value })}
                    placeholder="e.g. F17..."
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Cycle Count (Optional)">
                  <Input
                    type="number"
                    min="0"
                    value={phone.cycle_count}
                    onChange={(e) => setPhone({ ...phone, cycle_count: e.target.value })}
                    placeholder="e.g. 142"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Phone Photo (Optional)">
                    <input
                      type="file"
                      accept="image/*"
                      className="text-sm"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const stored = await readFile(file);
                          setPhotos((prev) => [...prev, stored]);
                        }
                      }}
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
                      id="intake-with-box"
                      checked={phone.with_box}
                      onCheckedChange={(checked) => setPhone((p) => ({ ...p, with_box: Boolean(checked) }))}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <div className="flex items-center gap-2">
                      <Box className={`size-4 ${phone.with_box ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground"}`} />
                      <label htmlFor="intake-with-box" className="text-sm font-semibold cursor-pointer text-foreground">
                        With Box
                      </label>
                      <span className="text-xs">
                        {phone.with_box ? "(Includes device box)" : "(No box included)"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="pt-2">
                <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground uppercase">DAMAGE CHECKLIST</p>
                <div className="flex flex-wrap gap-2">
                  {damageItems.map((d) => (
                    <button
                      key={d.key}
                      type="button"
                      onClick={() => setDamage({ ...damage, [d.key]: !damage[d.key] })}
                      className={`rounded-lg border border-border px-3 py-2 text-sm transition-colors ${
                        damage[d.key] ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary"
                      }`}
                    >
                      {d.label} {damage[d.key] ? "⚠️" : ""}
                    </button>
                  ))}
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step === 0 ? (
            <Button
              className="rounded-xl"
              onClick={() => {
                if (!customer.name.trim()) {
                  toast.error("Customer full name is required.");
                  return;
                }
                setStep(1);
              }}
            >
              Continue
            </Button>
          ) : step === 1 ? (
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                className="rounded-xl text-muted-foreground hover:text-foreground text-xs"
                onClick={() => setStep(2)}
              >
                Skip Verification →
              </Button>
              <Button className="rounded-xl" onClick={() => setStep(2)}>
                Continue to Phone Details
              </Button>
            </div>
          ) : (
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={save}
              disabled={
                !customer.name.trim() ||
                !phone.model.trim() ||
                !phone.imei.trim() ||
                !phone.agreed_price ||
                Boolean(collision.inStockConflict)
              }
            >
              Save &amp; Add to Stock
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UploadTile({
  label,
  hint,
  file,
  onPick,
  onClear,
  icon: Icon = Camera,
}: {
  label: string;
  hint?: string;
  file: StoredFile | null;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  onClear?: () => void;
  icon?: typeof Camera;
}) {
  return (
    <div className="relative group">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/30 p-5 text-center hover:bg-secondary/60 hover:border-primary/50 transition-all">
        {file ? (
          isImageDocument(file) ? (
            <img src={file.data} alt={label} className="h-24 rounded-lg object-cover shadow-xs" />
          ) : (
            <FileText className="size-8 text-primary" />
          )
        ) : (
          <Icon className="size-8 text-muted-foreground/60 group-hover:text-primary transition-colors" />
        )}
        <span className="text-xs font-semibold text-foreground">{file ? file.name : label}</span>
        {hint && !file ? <span className="text-[11px] text-muted-foreground">{hint}</span> : null}
        <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={onPick} />
      </label>
      {file && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 rounded-full bg-card border border-border p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors shadow-xs"
          title="Remove"
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </div>
  );
}
