import { Camera, FileText, Plus, ShieldCheck } from "lucide-react";
import { useEffect, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/fmm/AddPhoneDialog";
import { useFmm } from "@/lib/fmm-store";
import type { PhoneCondition, StoredFile } from "@/lib/fmm-types";
import { TakaSign } from "@/components/fmm/Taka";

const steps = ["Customer Info", "Identity Verification", "Phone Details"];
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

export function CustomerIntakeDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const { saveCustomerPurchase } = useFmm();
  const [step, setStep] = useState(0);
  const [customer, setCustomer] = useState({ name: "", phone: "", address: "", nid: "" });
  const [nidFront, setNidFront] = useState<StoredFile | null>(null);
  const [nidBack, setNidBack] = useState<StoredFile | null>(null);
  const [docs, setDocs] = useState<StoredFile[]>([]);
  const [photos, setPhotos] = useState<StoredFile[]>([]);
  const [phone, setPhone] = useState({
    brand: "Samsung",
    model: "",
    storage_ram: "",
    condition: "Used - Good" as PhoneCondition,
    imei: "",
    bought_price: "",
    agreed_price: "",
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
      brand: "Samsung",
      model: "",
      storage_ram: "",
      condition: "Used - Good",
      imei: "",
      bought_price: "",
      agreed_price: "",
    });
    setDamage({ screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false });
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const pick = (setter: (f: StoredFile) => void) => async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setter(await readFile(file));
  };

  const save = () => {
    if (!customer.name || !phone.model || !phone.imei || !phone.agreed_price) {
      toast.error("Customer name, model, IMEI and agreed price are required.");
      return;
    }
    saveCustomerPurchase(
      {
        customer_name: customer.name,
        customer_phone: customer.phone,
        customer_address: customer.address,
        nid_number: customer.nid,
        nid_front_image: nidFront,
        nid_back_image: nidBack,
        additional_documents: docs,
        phone_photos: photos,
        purchase_price: Number(phone.agreed_price),
      },
      {
        imei: phone.imei,
        imei_secondary: null,
        battery_health: null,
        brand: phone.brand,
        model: phone.model,
        storage_ram: phone.storage_ram,
        condition: phone.condition,
        purchase_price: Number(phone.agreed_price),
        selling_price: null,
        condition_notes: "",
        damage_checklist: damage,
        warranty_repair_notes: "",
      },
    );
    toast.success("Saved and added to stock");
    onOpenChange(false);
    reset();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl rounded-2xl p-0">
        <DialogHeader className="px-6 pt-6">
          <DialogTitle>Buy from Customer</DialogTitle>
        </DialogHeader>

        <div className="px-6">
          <div className="mb-6 flex flex-wrap items-center gap-4">
            {steps.map((label, i) => (
              <div key={label} className="flex items-center gap-2 text-sm">
                <span
                  className={`flex size-6 items-center justify-center rounded-full text-xs font-semibold ${i <= step ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"}`}
                >
                  {i + 1}
                </span>
                <span className={i === step ? "font-semibold" : "text-muted-foreground"}>{label}</span>
              </div>
            ))}
          </div>

          {step === 0 ? (
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-5 text-lg font-bold">Customer Information</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name">
                  <Input value={customer.name} onChange={(e) => setCustomer({ ...customer, name: e.target.value })} placeholder="e.g. Rahim Uddin" />
                </Field>
                <Field label="Phone Number">
                  <Input value={customer.phone} onChange={(e) => setCustomer({ ...customer, phone: e.target.value })} placeholder="01XXX-XXXXXX" />
                </Field>
                <Field label="Address">
                  <Input value={customer.address} onChange={(e) => setCustomer({ ...customer, address: e.target.value })} placeholder="Street address, Thana, Dist" />
                </Field>
                <Field label="NID Number">
                  <Input value={customer.nid} onChange={(e) => setCustomer({ ...customer, nid: e.target.value })} placeholder="NID 10 or 17-digit" />
                </Field>
              </div>
            </section>
          ) : null}

          {step === 1 ? (
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-1 flex items-center gap-2 text-lg font-bold">
                <ShieldCheck className="size-5" /> Identity Verification
              </h3>
              <p className="mb-5 text-sm text-muted-foreground">
                Upload clear photos of the customer's National ID. Files stay on this device only.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <UploadTile label="NID Front" file={nidFront} onPick={pick(setNidFront)} />
                <UploadTile label="NID Back" file={nidBack} onPick={pick(setNidBack)} />
              </div>
              <div className="mt-4">
                <UploadTile
                  label="Cash Memo / Buying Form"
                  hint="Tap to capture or upload"
                  icon={FileText}
                  file={docs[0] ?? null}
                  onPick={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) setDocs([await readFile(file), ...docs.slice(1)]);
                  }}
                />
              </div>
              <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium">
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
              {docs.length > 1 ? <p className="mt-2 text-xs text-muted-foreground">{docs.length} documents attached</p> : null}
            </section>
          ) : null}

          {step === 2 ? (
            <section className="rounded-xl border border-border bg-card p-6">
              <h3 className="mb-5 text-lg font-bold">Phone Details</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Brand">
                  <Input value={phone.brand} onChange={(e) => setPhone({ ...phone, brand: e.target.value })} />
                </Field>
                <Field label="Model">
                  <Input value={phone.model} onChange={(e) => setPhone({ ...phone, model: e.target.value })} placeholder="e.g. Galaxy S23 Ultra" />
                </Field>
                <Field label="Storage / RAM">
                  <Input value={phone.storage_ram} onChange={(e) => setPhone({ ...phone, storage_ram: e.target.value })} placeholder="e.g. 256GB / 12GB" />
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
                <Field label="IMEI 1 / IMEI 2">
                  <Input value={phone.imei} onChange={(e) => setPhone({ ...phone, imei: e.target.value })} placeholder="Enter 15-digit IMEI" />
                </Field>
                <Field label={<>Bought Price (<TakaSign />)</>}>
                  <Input type="number" value={phone.bought_price} onChange={(e) => setPhone({ ...phone, bought_price: e.target.value })} />
                </Field>
                <Field label={<>Agreed Purchase Price (<TakaSign />)</>}>
                  <Input type="number" value={phone.agreed_price} onChange={(e) => setPhone({ ...phone, agreed_price: e.target.value })} />
                </Field>
                <Field label="Phone Photo">
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

              <p className="mt-6 mb-2 text-xs font-semibold tracking-wide text-muted-foreground">DAMAGE CHECKLIST</p>
              <div className="flex flex-wrap gap-2">
                {damageItems.map((d) => (
                  <button
                    key={d.key}
                    onClick={() => setDamage({ ...damage, [d.key]: !damage[d.key] })}
                    className={`rounded-lg border border-border px-3 py-2 text-sm ${damage[d.key] ? "bg-primary text-primary-foreground" : "bg-card hover:bg-secondary"}`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </section>
          ) : null}
        </div>

        <DialogFooter className="px-6 pb-6">
          <Button variant="outline" className="rounded-xl" onClick={() => (step === 0 ? onOpenChange(false) : setStep(step - 1))}>
            {step === 0 ? "Cancel" : "Back"}
          </Button>
          {step < 2 ? (
            <Button className="rounded-xl" onClick={() => setStep(step + 1)}>
              Continue
            </Button>
          ) : (
            <Button variant="destructive" className="rounded-xl" onClick={save}>
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
  icon: Icon = Camera,
}: {
  label: string;
  hint?: string;
  file: StoredFile | null;
  onPick: (e: ChangeEvent<HTMLInputElement>) => void;
  icon?: typeof Camera;
}) {
  return (
    <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-secondary/40 p-6 text-center hover:bg-secondary">
      {file ? (
        file.data.startsWith("data:image") ? (
          <img src={file.data} alt={label} className="h-24 rounded-lg object-cover" />
        ) : (
          <FileText className="size-6" />
        )
      ) : (
        <Icon className="size-6 text-destructive" />
      )}
      <span className="text-sm font-medium">{file ? file.name : label}</span>
      {hint && !file ? <span className="text-xs text-muted-foreground">{hint}</span> : null}
      <input type="file" accept="image/*,application/pdf" capture="environment" className="hidden" onChange={onPick} />
    </label>
  );
}
