import { useState, useEffect, type ChangeEvent } from "react";
import { toast } from "sonner";
import { ArrowLeftRight, Camera, Check, FileText, Plus, ShieldCheck, Smartphone, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Field } from "@/components/fmm/AddPhoneDialog";
import { useFmm } from "@/lib/fmm-store";
import { type PhoneCondition, type StoredFile } from "@/lib/fmm-types";
import { Taka, TakaSign } from "./Taka";
import { StatusBadge } from "./StatusBadge";

const steps = ["Outgoing Phone", "Trade-in Device", "Customer & Settlement"];

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

export function ExchangePhoneDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { state, recordExchange, addCustomer } = useFmm();
  const available = state.phones.filter((p) => p.status === "Available");

  const [step, setStep] = useState(0);

  // Step 1: Outgoing phone from FMM
  const [outgoingId, setOutgoingId] = useState("");
  const [outgoingPrice, setOutgoingPrice] = useState("");

  // Step 2: Incoming trade-in phone from customer
  const [inBrand, setInBrand] = useState("Samsung");
  const [inModel, setInModel] = useState("");
  const [inImei, setInImei] = useState("");
  const [inImeiSecondary, setInImeiSecondary] = useState("");
  const [inStorage, setInStorage] = useState("");
  const [inCondition, setInCondition] = useState<PhoneCondition>("Used - Good");
  const [inBatteryHealth, setInBatteryHealth] = useState("");
  const [inValuation, setInValuation] = useState("");
  const [damage, setDamage] = useState({
    screen_scratch: false,
    body_dent: false,
    battery_issue: false,
    camera_blurry: false,
  });
  const [conditionNotes, setConditionNotes] = useState("");
  const [photos, setPhotos] = useState<StoredFile[]>([]);

  // Step 3: Customer info & evidence
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [nidNumber, setNidNumber] = useState("");
  const [nidFront, setNidFront] = useState<StoredFile | null>(null);
  const [nidBack, setNidBack] = useState<StoredFile | null>(null);
  const [docs, setDocs] = useState<StoredFile[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("Cash");

  const reset = () => {
    setStep(0);
    setOutgoingId(available[0]?.id || "");
    setOutgoingPrice(available[0]?.selling_price ? String(available[0].selling_price) : "");
    setInBrand("Samsung");
    setInModel("");
    setInImei("");
    setInImeiSecondary("");
    setInStorage("");
    setInCondition("Used - Good");
    setInBatteryHealth("");
    setInValuation("");
    setDamage({ screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false });
    setConditionNotes("");
    setPhotos([]);
    setCustomerName("");
    setCustomerPhone("");
    setCustomerAddress("");
    setNidNumber("");
    setNidFront(null);
    setNidBack(null);
    setDocs([]);
    setPaymentMethod("Cash");
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const selectedOutgoing = state.phones.find((p) => p.id === outgoingId);
  const outVal = Number(outgoingPrice) || (selectedOutgoing?.selling_price ?? 0);
  const inVal = Number(inValuation) || 0;
  const netDifference = outVal - inVal;

  const pick = (setter: (f: StoredFile) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setter(await readFile(file));
  };

  const handleOutgoingChange = (id: string) => {
    setOutgoingId(id);
    const ph = state.phones.find((p) => p.id === id);
    if (ph?.selling_price) {
      setOutgoingPrice(String(ph.selling_price));
    } else {
      setOutgoingPrice("");
    }
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 0) {
      if (!outgoingId || !selectedOutgoing) {
        toast.error("Please select an available phone from stock.");
        return false;
      }
      if (!outgoingPrice || Number(outgoingPrice) <= 0) {
        toast.error("Please enter a valid agreed value for the outgoing phone.");
        return false;
      }
    } else if (currentStep === 1) {
      if (!inBrand.trim() || !inModel.trim() || !inImei.trim()) {
        toast.error("Brand, Model, and IMEI are required for the trade-in phone.");
        return false;
      }
      if (!inValuation || Number(inValuation) <= 0) {
        toast.error("Please enter a valid valuation for the trade-in phone.");
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) {
      setStep((s) => s + 1);
    }
  };

  const prevStep = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const submitExchange = () => {
    if (!validateStep(0) || !validateStep(1)) return;
    if (!customerName.trim()) {
      toast.error("Customer full name is required.");
      return;
    }

    // Customer record creation or linking
    let cusId: string | null = null;
    const existing = state.customers?.find(
      (c) => c.phone === customerPhone.trim() || (c.name.toLowerCase() === customerName.trim().toLowerCase() && customerName.trim()),
    );
    if (existing) {
      cusId = existing.id;
    } else {
      cusId = addCustomer({
        name: customerName.trim(),
        phone: customerPhone.trim(),
        address: customerAddress.trim(),
        nid_number: nidNumber.trim(),
        notes: "Registered during device exchange",
      });
    }

    const additionalPaid = Math.max(0, netDifference);

    recordExchange(
      {
        outgoing_phone_id: outgoingId,
        incoming_phone_id: "",
        customer_name: customerName.trim(),
        customer_phone: customerPhone.trim(),
        customer_id: cusId,
        outgoing_value: outVal,
        incoming_valuation: inVal,
        additional_paid: additionalPaid,
        date: new Date().toISOString(),
        notes: `Exchanged ${selectedOutgoing!.brand} ${selectedOutgoing!.model} with trade-in ${inBrand.trim()} ${inModel.trim()} (Valued at ${inVal.toLocaleString()} ৳). Paid via ${paymentMethod}.`,
      },
      {
        imei: inImei.trim(),
        imei_secondary: inImeiSecondary.trim() || null,
        battery_health: inBatteryHealth.trim() || null,
        brand: inBrand.trim(),
        model: inModel.trim(),
        storage_ram: inStorage.trim() || "N/A",
        condition: inCondition,
        source_type: "Buy from Customer",
        supplier_id: null,
        customer_purchase_id: null,
        purchase_price: inVal,
        selling_price: Math.round(inVal * 1.15),
        status: "Available",
        condition_notes: conditionNotes.trim() || `Trade-in exchange for ${selectedOutgoing!.brand} ${selectedOutgoing!.model}`,
        damage_checklist: damage,
        warranty_repair_notes: "",
      },
      outgoingId,
      {
        customer_address: customerAddress.trim(),
        nid_number: nidNumber.trim(),
        nid_front_image: nidFront,
        nid_back_image: nidBack,
        additional_documents: docs,
        phone_photos: photos,
      },
    );

    toast.success(`Exchange successful! ${inBrand.trim()} ${inModel.trim()} added to Phone Stock & Customer Evidence.`);
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[92vh]">
        <DialogHeader className="px-6 pt-6 pb-2">
          <DialogTitle className="flex items-center gap-2 text-xl">
            <ArrowLeftRight className="size-5 text-primary" />
            Device Trade-in &amp; Exchange
          </DialogTitle>
        </DialogHeader>

        <div className="px-6 flex-1 overflow-y-auto pb-4">
          {/* Stepper Header */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {steps.map((label, i) => (
              <button
                key={label}
                type="button"
                onClick={() => {
                  if (i < step || validateStep(step)) setStep(i);
                }}
                className="flex items-center gap-2 text-sm text-left cursor-pointer focus:outline-none"
              >
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${
                    i < step
                      ? "bg-success text-success-foreground"
                      : i === step
                      ? "bg-primary text-primary-foreground"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {i < step ? <Check className="size-3.5" /> : i + 1}
                </span>
                <span className={i === step ? "font-semibold text-foreground" : "text-muted-foreground"}>
                  {label}
                </span>
              </button>
            ))}
          </div>

          {/* STEP 0: Outgoing Phone from Stock */}
          {step === 0 ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold">1. Outgoing Phone (From Stock to Customer)</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Select the device the customer is buying or exchanging with from your available inventory.
                  </p>
                </div>
                {selectedOutgoing ? <StatusBadge status={selectedOutgoing.status} /> : null}
              </div>

              <div>
                <Label htmlFor="exc_out_select" className="text-xs font-medium text-muted-foreground mb-1.5 block">
                  Select Phone from Available Stock *
                </Label>
                <select
                  id="exc_out_select"
                  value={outgoingId}
                  onChange={(e) => handleOutgoingChange(e.target.value)}
                  className="h-10 w-full rounded-xl border border-input bg-transparent px-3 text-sm font-medium"
                >
                  <option value="">Choose an available phone from stock…</option>
                  {available.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.brand} {p.model} ({p.storage_ram}) — IMEI: …{p.imei.slice(-4)} — Sell: {p.selling_price ? `${p.selling_price.toLocaleString()} ৳` : "N/A"}
                    </option>
                  ))}
                </select>
              </div>

              {selectedOutgoing ? (
                <div className="rounded-xl border border-border/80 bg-secondary/30 p-4 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
                    <div>
                      <p className="text-base font-bold text-foreground">
                        {selectedOutgoing.brand} {selectedOutgoing.model}
                      </p>
                      <p className="font-mono text-xs text-muted-foreground">
                        IMEI: {selectedOutgoing.imei} {selectedOutgoing.storage_ram ? `· ${selectedOutgoing.storage_ram}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-xs">
                      <span className="text-muted-foreground">Floor Cost: </span>
                      <strong className="text-foreground"><Taka value={selectedOutgoing.purchase_price} /></strong>
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2 pt-1">
                    <Field label={<>Agreed Selling Value (<TakaSign />) *</>}>
                      <Input
                        type="number"
                        min="1"
                        required
                        value={outgoingPrice}
                        onChange={(e) => setOutgoingPrice(e.target.value)}
                        placeholder="e.g. 75000"
                        className="font-bold text-base h-10 rounded-xl"
                      />
                    </Field>
                    <div className="flex flex-col justify-center text-xs text-muted-foreground space-y-1">
                      <div className="flex justify-between">
                        <span>Original Listed Price:</span>
                        <span className="font-semibold text-foreground">
                          {selectedOutgoing.selling_price ? <Taka value={selectedOutgoing.selling_price} /> : "—"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Condition:</span>
                        <span>{selectedOutgoing.condition}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}
            </section>
          ) : null}

          {/* STEP 1: Trade-in Device (Incoming from Customer) */}
          {step === 1 ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-5">
              <div>
                <h3 className="text-lg font-bold">2. Customer's Trade-in Phone Details</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Enter specifications, IMEI, condition, and valuation for the customer's incoming device.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand *">
                  <Input value={inBrand} onChange={(e) => setInBrand(e.target.value)} placeholder="e.g. Samsung, Apple, Google" />
                </Field>
                <Field label="Model *">
                  <Input value={inModel} onChange={(e) => setInModel(e.target.value)} placeholder="e.g. Galaxy S23 Ultra, iPhone 14" />
                </Field>
                <Field label="Storage / RAM">
                  <Input value={inStorage} onChange={(e) => setInStorage(e.target.value)} placeholder="e.g. 256GB / 12GB" />
                </Field>
                <Field label="Condition">
                  <select
                    value={inCondition}
                    onChange={(e) => setInCondition(e.target.value as PhoneCondition)}
                    className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
                  >
                    {["Used - Good", "Used - A", "Used - B", "New", "Refurbished"].map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="IMEI 1 *">
                  <Input value={inImei} onChange={(e) => setInImei(e.target.value)} placeholder="15-digit primary IMEI" className="font-mono text-xs" />
                </Field>
                <Field label="Secondary IMEI (optional)">
                  <Input value={inImeiSecondary} onChange={(e) => setInImeiSecondary(e.target.value)} placeholder="Optional 2nd IMEI" className="font-mono text-xs" />
                </Field>
                <Field label="Battery Health (optional)">
                  <Input value={inBatteryHealth} onChange={(e) => setInBatteryHealth(e.target.value)} placeholder="e.g. 89%" />
                </Field>
                <Field label={<>Their Phone Valued At (<TakaSign />) *</>}>
                  <Input
                    type="number"
                    min="1"
                    required
                    value={inValuation}
                    onChange={(e) => setInValuation(e.target.value)}
                    placeholder="e.g. 45000"
                    className="font-bold text-success text-base"
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Trade-in Phone Photos">
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

          {/* STEP 2: Customer Info, Identity Evidence & Settlement */}
          {step === 2 ? (
            <section className="rounded-xl border border-border bg-card p-6 space-y-6">
              <div>
                <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
                  <ShieldCheck className="size-5 text-primary" /> 3. Customer Info &amp; Identity Verification
                </h3>
                <p className="text-sm text-muted-foreground">
                  Upload customer's National ID and purchase documents. Customer information is archived directly to Customer Evidence.
                </p>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name *">
                  <Input value={customerName} onChange={(e) => setCustomerName(e.target.value)} placeholder="e.g. Rahim Uddin" />
                </Field>
                <Field label="Phone Number">
                  <Input value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} placeholder="01XXX-XXXXXX" />
                </Field>
                <Field label="Address">
                  <Input value={customerAddress} onChange={(e) => setCustomerAddress(e.target.value)} placeholder="Street address, Thana, Dist" />
                </Field>
                <Field label="NID Number">
                  <Input value={nidNumber} onChange={(e) => setNidNumber(e.target.value)} placeholder="NID 10 or 17-digit" />
                </Field>
              </div>

              {/* NID Uploads */}
              <div className="grid gap-4 sm:grid-cols-2">
                <UploadTile label="NID Front" file={nidFront} onPick={pick(setNidFront)} onClear={() => setNidFront(null)} />
                <UploadTile label="NID Back" file={nidBack} onPick={pick(setNidBack)} onClear={() => setNidBack(null)} />
              </div>

              <div>
                <UploadTile
                  label="Cash Memo / Buying Form"
                  hint="Tap to capture or upload"
                  icon={FileText}
                  file={docs[0] ?? null}
                  onPick={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setDocs([await readFile(file), ...docs.slice(1)]);
                  }}
                  onClear={() => setDocs(docs.slice(1))}
                />
              </div>

              <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-primary hover:underline">
                <Plus className="size-4" /> Add Additional Document
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

              {/* Settlement Summary Box */}
              <div className="rounded-xl border border-primary/40 bg-primary/5 p-4.5 space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-primary">
                    Financial Settlement
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Payment Method:</span>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="h-7 rounded-lg border border-input bg-card px-2 text-xs font-medium"
                    >
                      <option value="Cash">Cash</option>
                      <option value="bKash">bKash</option>
                      <option value="Nagad">Nagad</option>
                      <option value="Bank">Bank Transfer</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
                  <div className="rounded-xl bg-card border border-border p-3">
                    <span className="text-xs text-muted-foreground block">Outgoing Phone</span>
                    <span className="text-xs font-semibold truncate block mt-0.5">{selectedOutgoing?.brand} {selectedOutgoing?.model}</span>
                    <span className="text-base font-bold text-foreground mt-1 block">
                      <Taka value={outVal} />
                    </span>
                  </div>
                  <div className="rounded-xl bg-card border border-border p-3">
                    <span className="text-xs text-muted-foreground block">Customer Trade-in</span>
                    <span className="text-xs font-semibold truncate block mt-0.5">{inBrand} {inModel}</span>
                    <span className="text-base font-bold text-success mt-1 block">
                      <Taka value={inVal} />
                    </span>
                  </div>
                  <div className={`rounded-xl border p-3 ${netDifference > 0 ? "bg-card border-primary" : netDifference < 0 ? "bg-card border-amber-500" : "bg-card border-success"}`}>
                    <span className="text-xs text-muted-foreground block">
                      {netDifference > 0 ? "Customer Pays Shop" : netDifference < 0 ? "Shop Pays Customer" : "Even Trade"}
                    </span>
                    <span className={`text-lg font-bold mt-1.5 block ${netDifference > 0 ? "text-primary" : netDifference < 0 ? "text-amber-500" : "text-success"}`}>
                      <Taka value={Math.abs(netDifference)} />
                    </span>
                  </div>
                </div>
              </div>
            </section>
          ) : null}
        </div>

        {/* Stepper Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border bg-card">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => (step === 0 ? onOpenChange(false) : prevStep())}
          >
            {step === 0 ? "Cancel" : "Back"}
          </Button>

          {step < 2 ? (
            <Button className="rounded-xl" onClick={nextStep}>
              Continue
            </Button>
          ) : (
            <Button
              variant="destructive"
              className="rounded-xl"
              onClick={submitExchange}
              disabled={!customerName.trim() || !inBrand.trim() || !inModel.trim() || inVal <= 0}
            >
              Save &amp; Complete Exchange
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
    <div className="relative">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center hover:bg-secondary transition-colors">
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


