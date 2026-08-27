import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { daysInStock, supplierName, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export function PhoneDetailDialog({ phoneId, onClose }: { phoneId: string | null; onClose: () => void }) {
  const { state } = useFmm();
  const phone = state.phones.find((p) => p.id === phoneId) ?? null;
  const txs = state.transactions.filter((t) => t.phone_id === phoneId);
  const purchase = state.customer_purchases.find((c) => c.id === phone?.customer_purchase_id);
  const damage = phone
    ? Object.entries(phone.damage_checklist)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/_/g, " "))
    : [];

  return (
    <Dialog open={!!phone} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-2xl rounded-2xl">
        {phone ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3">
                {phone.brand} {phone.model}
                <StatusBadge status={phone.status} />
              </DialogTitle>
            </DialogHeader>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Info label="IMEI" value={phone.imei} />
                {phone.imei_secondary ? (
                  <div className="mt-1.5">
                    <Info label="Secondary IMEI" value={phone.imei_secondary} />
                  </div>
                ) : null}
              </div>
              {!/apple|iphone/i.test(phone.brand) ? <Info label="Specs" value={phone.storage_ram || "—"} /> : null}
              <Info label="Battery Health" value={phone.battery_health || "—"} />
              <Info label="Condition" value={phone.condition} />
              <Info label="Source" value={`${phone.source_type} · ${supplierName(state, phone)}`} />
              <Info label="Purchase Price" value={<Taka value={phone.purchase_price} />} />
              <Info label="Selling Price" value={phone.selling_price ? <Taka value={phone.selling_price} /> : "—"} />
              <Info label="Days in stock" value={String(daysInStock(phone.created_at))} />
              <Info label="Added" value={new Date(phone.created_at).toLocaleString()} />
            </div>

            {damage.length ? (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">DAMAGE</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {damage.map((d) => (
                    <span key={d} className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs text-destructive capitalize">
                      {d}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {purchase ? (
              <div className="rounded-xl border border-border p-4">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground">CUSTOMER INTAKE</p>
                <p className="mt-2 text-sm">
                  {purchase.customer_name} · {purchase.customer_phone} · NID {purchase.nid_number || "—"}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {[purchase.nid_front_image, purchase.nid_back_image, ...purchase.additional_documents, ...purchase.phone_photos]
                    .filter(Boolean)
                    .map((f, i) => (
                      <img key={i} src={f!.data} alt={f!.name} className="size-20 rounded-lg border border-border object-cover" />
                    ))}
                </div>
              </div>
            ) : null}

            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">HISTORY</p>
              <ul className="mt-2 space-y-2 text-sm">
                <li className="text-muted-foreground">
                  {new Date(phone.created_at).toLocaleDateString()} — Purchased for {<Taka value={phone.purchase_price} />}
                </li>
                {txs.map((t) => (
                  <li key={t.id} className="text-muted-foreground">
                    {new Date(t.date).toLocaleDateString()} — {t.type} to {t.customer_name} · {<Taka value={t.amount} />} ·{" "}
                    {t.payment_status}
                  </li>
                ))}
              </ul>
            </div>
          </>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}
