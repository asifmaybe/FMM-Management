import { useState, useEffect, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Box, Camera, Check, FileText, Plus, ShieldCheck, Smartphone, Trash2, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useFmm } from "@/lib/fmm-store";
import type { PhoneCondition, StoredFile } from "@/lib/fmm-types";
import { TakaSign } from "@/components/fmm/Taka";

const conditions: PhoneCondition[] = ["Used - Good", "Used - A", "Used - B", "New", "Refurbished"];

const customerSteps = ["Customer Info", "Identity Verification", "Phone Details & Payout"];

const damageItems = [
  { key: "screen_scratch", label: "Screen Scratch" },
  { key: "body_dent", label: "Body Dent" },
  { key: "battery_issue", label: "Battery Issue" },
  { key: "camera_blurry", label: "Camera Blurry" },
] as const;

function readFile(file: File): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, data: String(reader.result) });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function AddPhoneDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { addPhone, saveCustomerPurchase } = useFmm();

  // Mode: "customer" (Buy from Customer) vs "own_stock" (Own Shop Stock)
  const [sourceMode, setSourceMode] = useState<"customer" | "own_stock">("customer");
  const [customerStep, setCustomerStep] = useState(0);

  // Common Phone Fields
  const [phone, setPhone] = useState({
    brand: "Samsung",
    model: "",
    storage_ram: "",
    condition: "Used - Good" as PhoneCondition,
    imei: "",
    imei_secondary: "",
    battery_health: "",
    purchase_price: "",
    selling_price: "",
    condition_notes: "",
  });

  // Customer Info & Documents
  const [customer, setCustomer] = useState({
    name: "",
    phone: "",
    address: "",
    nid: "",
  });
  const [nidFront, setNidFront] = useState<StoredFile | null>(null);
  const [nidBack, setNidBack] = useState<StoredFile | null>(null);
  const [docs, setDocs] = useState<StoredFile[]>([]);
  const [photos, setPhotos] = useState<StoredFile[]>([]);
  const [damage, setDamage] = useState({
    screen_scratch: false,
    body_dent: false,
    battery_issue: false,
    camera_blurry: false,
  });

  const reset = () => {
    setCustomerStep(0);
    setPhone({
      brand: "Samsung",
      model: "",
      storage_ram: "",
      condition: "Used - Good",
      imei: "",
      imei_secondary: "",
      battery_health: "",
      purchase_price: "",
      selling_price: "",
      condition_notes: "",
    });
    setCustomer({ name: "", phone: "", address: "", nid: "" });
    setNidFront(null);
    setNidBack(null);
    setDocs([]);
    setPhotos([]);
    setDamage({ screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false });
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const pickFile = (setter: (f: StoredFile) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setter(await readFile(file));
  };

  const handleOwnStockSubmit = () => {
    if (!phone.imei.trim() || !phone.brand.trim() || !phone.model.trim() || !phone.purchase_price) {
      toast.error("IMEI, brand, model, and purchase cost are required.");
      return;
    }

    addPhone({
      imei: phone.imei.trim(),
      imei_secondary: phone.imei_secondary.trim() || null,
      battery_health: phone.battery_health.trim() || null,
      brand: phone.brand.trim(),
      model: phone.model.trim(),
      storage_ram: phone.storage_ram.trim() || "N/A",
      condition: phone.condition,
      source_type: "Own Stock",
      supplier_id: null,
      customer_purchase_id: null,
      purchase_price: Number(phone.purchase_price),
      selling_price: phone.selling_price ? Number(phone.selling_price) : null,
      status: "Available",
      condition_notes: phone.condition_notes.trim(),
      damage_checklist: damage,
      warranty_repair_notes: "",
    });

    toast.success(`${phone.brand} ${phone.model} added to Own Stock.`);
    onOpenChange(false);
    reset();
  };

  const handleCustomerSubmit = () => {
    if (!customer.name.trim()) {
      toast.error("Customer full name is required.");
      return;
    }
    if (!phone.model.trim() || !phone.imei.trim() || !phone.purchase_price) {
      toast.error("Model, IMEI, and agreed purchase price are required.");
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
        purchase_price: Number(phone.purchase_price),
      },
      {
        imei: phone.imei.trim(),
        imei_secondary: phone.imei_secondary.trim() || null,
        battery_health: phone.battery_health.trim() || null,
        brand: phone.brand.trim(),
        model: phone.model.trim(),
        storage_ram: phone.storage_ram.trim() || "N/A",
        condition: phone.condition,
        purchase_price: Number(phone.purchase_price),
        selling_price: phone.selling_price ? Number(phone.selling_price) : null,
        condition_notes: phone.condition_notes.trim(),
        damage_checklist: damage,
        warranty_repair_notes: "",
      },
    );

    toast.success(`Bought ${phone.brand} ${phone.model} from ${customer.name}. Added to Stock & Customer Evidence.`);
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

          {/* Source Mode Toggle */}
          <div className="mt-3 grid grid-cols-2 gap-2 rounded-xl bg-secondary/60 p-1">
            <button
              type="button"
              onClick={() => setSourceMode("customer")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                sourceMode === "customer"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <User className="size-4 text-primary" />
              Buy from Customer
            </button>
            <button
              type="button"
              onClick={() => setSourceMode("own_stock")}
              className={`flex items-center justify-center gap-2 rounded-lg py-2 text-xs font-semibold transition-all ${
                sourceMode === "own_stock"
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <Box className="size-4 text-primary" />
              Own Stock
            </button>
          </div>
        </DialogHeader>

        <div className="px-6 flex-1 overflow-y-auto py-4">
          {/* ========================================================================= */}
          {/* OPTION 1: BUY FROM CUSTOMER                                               */}
          {/* ========================================================================= */}
          {sourceMode === "customer" ? (
            <div className="space-y-5">
              {/* Stepper Header */}
              <div className="flex flex-wrap items-center gap-4">
                {customerSteps.map((label, i) => (
                  <button
                    key={label}
                    type="button"
                    onClick={() => setCustomerStep(i)}
                    className="flex items-center gap-2 text-sm text-left cursor-pointer focus:outline-none"
                  >
                    <span
                      className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                        i < customerStep
                          ? "bg-success text-success-foreground"
                          : i === customerStep
                          ? "bg-primary text-primary-foreground"
                          : "bg-secondary text-muted-foreground"
                      }`}
                    >
                      {i < customerStep ? <Check className="size-3.5" /> : i + 1}
                    </span>
                    <span className={i === customerStep ? "font-semibold text-foreground" : "text-muted-foreground"}>
                      {label}
                    </span>
                  </button>
                ))}
              </div>

              {/* Step 0: Customer Info */}
              {customerStep === 0 ? (
                <section className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h3 className="text-lg font-bold">1. Customer Information</h3>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Enter the seller's contact and identity information.
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
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
                        placeholder="Street address, Thana, District"
                      />
                    </Field>
                    <Field label="NID Number">
                      <Input
                        value={customer.nid}
                        onChange={(e) => setCustomer({ ...customer, nid: e.target.value })}
                        placeholder="10 or 17 digit National ID"
                        className="font-mono text-xs"
                      />
                    </Field>
                  </div>
                </section>
              ) : null}

              {/* Step 1: Identity Verification Documents */}
              {customerStep === 1 ? (
                <section className="rounded-xl border border-border bg-card p-6 space-y-4">
                  <h3 className="flex items-center gap-2 text-lg font-bold">
                    <ShieldCheck className="size-5 text-primary" /> 2. Identity Verification &amp; Documents
                  </h3>
                  <p className="text-xs text-muted-foreground -mt-2">
                    Upload photos of the customer's National ID and buying cash memo. Archived directly to Customer Evidence.
                  </p>

                  <div className="grid gap-4 sm:grid-cols-2 pt-2">
                    <UploadTile label="NID Front Photo" file={nidFront} onPick={pickFile(setNidFront)} onClear={() => setNidFront(null)} />
                    <UploadTile label="NID Back Photo" file={nidBack} onPick={pickFile(setNidBack)} onClear={() => setNidBack(null)} />
                  </div>

                  <div className="pt-2">
                    <UploadTile
                      label="Cash Memo / Buying Form"
                      hint="Tap to upload cash memo or receipt"
                      icon={FileText}
                      file={docs[0] ?? null}
                      onPick={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) setDocs([await readFile(file), ...docs.slice(1)]);
                      }}
                      onClear={() => setDocs(docs.slice(1))}
                    />
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-primary hover:underline pt-1">
                    <Plus className="size-3.5" /> Attach Additional Document
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) setDocs([...docs, await readFile(file)]);
                      }}
                    />
                  </label>
                  {docs.length > 1 ? <p className="text-xs text-muted-foreground">{docs.length} documents attached</p> : null}
                </section>
              ) : null}

              {/* Step 2: Phone Details & Payout */}
              {customerStep === 2 ? (
                <section className="rounded-xl border border-border bg-card p-6 space-y-5">
                  <div>
                    <h3 className="text-lg font-bold">3. Phone Details &amp; Purchase Price</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      Enter device specifications, IMEI, condition, and purchase amount paid to the customer.
                    </p>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Brand *">
                      <Input
                        value={phone.brand}
                        onChange={(e) => setPhone({ ...phone, brand: e.target.value })}
                        placeholder="e.g. Samsung, Apple, Xiaomi"
                      />
                    </Field>
                    <Field label="Model *">
                      <Input
                        value={phone.model}
                        onChange={(e) => setPhone({ ...phone, model: e.target.value })}
                        placeholder="e.g. Galaxy S23 Ultra, iPhone 14"
                      />
                    </Field>
                    <Field label="Storage / RAM">
                      <Input
                        value={phone.storage_ram}
                        onChange={(e) => setPhone({ ...phone, storage_ram: e.target.value })}
                        placeholder="e.g. 256GB / 12GB"
                      />
                    </Field>
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
                        className="font-mono text-xs"
                      />
                    </Field>
                    <Field label="Secondary IMEI (optional)">
                      <Input
                        value={phone.imei_secondary}
                        onChange={(e) => setPhone({ ...phone, imei_secondary: e.target.value })}
                        placeholder="Optional 2nd IMEI"
                        className="font-mono text-xs"
                      />
                    </Field>
                    <Field label="Battery Health (optional)">
                      <Input
                        value={phone.battery_health}
                        onChange={(e) => setPhone({ ...phone, battery_health: e.target.value })}
                        placeholder="e.g. 91%"
                      />
                    </Field>
                    <Field label={<>Agreed Purchase Price (<TakaSign />) * (Paid to Customer)</>}>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={phone.purchase_price}
                        onChange={(e) => setPhone({ ...phone, purchase_price: e.target.value })}
                        placeholder="e.g. 40000"
                        className="font-bold text-success text-base"
                      />
                    </Field>
                    <Field label={<>Expected Selling Price (<TakaSign />)</>}>
                      <Input
                        type="number"
                        value={phone.selling_price}
                        onChange={(e) => setPhone({ ...phone, selling_price: e.target.value })}
                        placeholder="e.g. 46000"
                      />
                    </Field>
                    <Field label="Condition / Purchase Notes">
                      <Input
                        value={phone.condition_notes}
                        onChange={(e) => setPhone({ ...phone, condition_notes: e.target.value })}
                        placeholder="e.g. Full box with original charger"
                      />
                    </Field>
                    <div className="sm:col-span-2">
                      <Field label="Phone Photos">
                        <input
                          type="file"
                          accept="image/*"
                          className="text-sm"
                          onChange={async (e) => {
                            const file = e.target.files?.[0];
                            if (file) setPhotos([...photos, await readFile(file)]);
                          }}
                        />
                      </Field>
                    </div>
                  </div>

                  {/* Damage Checklist */}
                  <div>
                    <p className="mb-2 text-xs font-semibold tracking-wide text-muted-foreground">DAMAGE CHECKLIST</p>
                    <div className="flex flex-wrap gap-2">
                      {damageItems.map((d) => (
                        <button
                          key={d.key}
                          type="button"
                          onClick={() => setDamage({ ...damage, [d.key]: !damage[d.key] })}
                          className={`rounded-lg border px-3 py-2 text-sm transition-colors ${
                            damage[d.key] ? "bg-primary text-primary-foreground border-primary" : "bg-card hover:bg-secondary border-border"
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
          ) : null}

          {/* ========================================================================= */}
          {/* OPTION 2: OWN STOCK ENTRY                                                 */}
          {/* ========================================================================= */}
          {sourceMode === "own_stock" ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="text-lg font-bold">Own Stock Device Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Directly record a device into inventory under own shop stock.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 pt-2">
                <Field label="Brand *">
                  <Input
                    value={phone.brand}
                    onChange={(e) => setPhone({ ...phone, brand: e.target.value })}
                    placeholder="e.g. Apple, Samsung, Google"
                  />
                </Field>
                <Field label="Model *">
                  <Input
                    value={phone.model}
                    onChange={(e) => setPhone({ ...phone, model: e.target.value })}
                    placeholder="e.g. iPhone 15 Pro Max"
                  />
                </Field>
                <Field label="Storage / RAM">
                  <Input
                    value={phone.storage_ram}
                    onChange={(e) => setPhone({ ...phone, storage_ram: e.target.value })}
                    placeholder="e.g. 256GB / 8GB"
                  />
                </Field>
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
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Secondary IMEI (optional)">
                  <Input
                    value={phone.imei_secondary}
                    onChange={(e) => setPhone({ ...phone, imei_secondary: e.target.value })}
                    placeholder="Optional 2nd IMEI"
                    className="font-mono text-xs"
                  />
                </Field>
                <Field label="Battery Health (optional)">
                  <Input
                    value={phone.battery_health}
                    onChange={(e) => setPhone({ ...phone, battery_health: e.target.value })}
                    placeholder="e.g. 100%"
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
                <Field label="Condition Notes / Details">
                  <Input
                    value={phone.condition_notes}
                    onChange={(e) => setPhone({ ...phone, condition_notes: e.target.value })}
                    placeholder="e.g. Brand new intact box, official warranty"
                  />
                </Field>
              </div>
            </section>
          ) : null}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card">
          {sourceMode === "customer" ? (
            <>
              <Button
                variant="outline"
                className="rounded-xl"
                onClick={() => (customerStep === 0 ? onOpenChange(false) : setCustomerStep(customerStep - 1))}
              >
                {customerStep === 0 ? "Cancel" : "Back"}
              </Button>
              {customerStep < 2 ? (
                <Button className="rounded-xl" onClick={() => setCustomerStep(customerStep + 1)}>
                  Continue
                </Button>
              ) : (
                <Button
                  variant="destructive"
                  className="rounded-xl"
                  onClick={handleCustomerSubmit}
                  disabled={!customer.name.trim() || !phone.model.trim() || !phone.imei.trim() || !phone.purchase_price}
                >
                  Save &amp; Add to Stock
                </Button>
              )}
            </>
          ) : (
            <>
              <Button variant="outline" className="rounded-xl" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                className="rounded-xl"
                onClick={handleOwnStockSubmit}
                disabled={!phone.brand.trim() || !phone.model.trim() || !phone.imei.trim() || !phone.purchase_price}
              >
                Add to Own Stock
              </Button>
            </>
          )}
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
    <div className="relative">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-5 text-center hover:bg-secondary transition-colors">
        {file ? (
          file.data.startsWith("data:image") ? (
            <img src={file.data} alt={label} className="h-24 rounded-lg object-cover" />
          ) : (
            <FileText className="size-6 text-primary" />
          )
        ) : (
          <Icon className="size-6 text-destructive" />
        )}
        <span className="text-sm font-medium">{file ? file.name : label}</span>
        {hint && !file ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
        <input type="file" accept="image/*,application/pdf" className="hidden" onChange={onPick} />
      </label>
      {file && onClear ? (
        <button
          type="button"
          onClick={onClear}
          className="absolute top-2 right-2 rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
          title="Remove"
        >
          <Trash2 className="size-4" />
        </button>
      ) : null}
    </div>
  );
}

