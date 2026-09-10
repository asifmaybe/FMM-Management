import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { ShoppingBag, ShieldCheck, Receipt } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { daysInStock, supplierName, useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import { SellPhoneDialog } from "@/components/fmm/SellPhoneDialog";
import { InspectTradeInDialog } from "@/components/fmm/InspectTradeInDialog";

export function PhoneDetailDialog({ phoneId, onClose }: { phoneId: string | null; onClose: () => void }) {
  const { state } = useFmm();
  const [sellOpen, setSellOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const phone = state.phones.find((p) => p.id === phoneId) ?? null;
  const txs = state.transactions.filter((t) => t.phone_id === phoneId);
  const purchase = state.customer_purchases.find((c) => c.id === phone?.customer_purchase_id);
  // Find originating exchange for "In Inspection" phones
  const linkedExchange = phone?.status === "In Inspection"
    ? (state.exchanges ?? []).find((e) => e.incoming_phone_id === phone.id) ?? null
    : null;
  const outgoingPhone = linkedExchange
    ? state.phones.find((p) => p.id === linkedExchange.outgoing_phone_id) ?? null
    : null;
  const damage = phone
    ? Object.entries(phone.damage_checklist)
        .filter(([, v]) => v)
        .map(([k]) => k.replace(/_/g, " "))
    : [];

  const soldTx = txs.find((t) => t.type === "Sale" || t.type === "Exchange");
  const soldPrice = phone?.sold_price ?? soldTx?.amount;

  return (
    <>
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
                <Info
                  label="Sold Price"
                  value={
                    soldPrice ? (
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                        <Taka value={soldPrice} />
                      </span>
                    ) : (
                      <span className="text-muted-foreground">Not Sold Yet</span>
                    )
                  }
                />
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

              {/* Linked Exchange/Trade-In info for In Inspection phones */}
              {linkedExchange ? (
                <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
                  <p className="text-xs font-semibold tracking-wide text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5" /> TRADE-IN / EXCHANGE ORIGIN
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <p className="text-muted-foreground">Customer</p>
                      <p className="font-semibold text-foreground">{linkedExchange.customer_name}</p>
                      <p className="text-muted-foreground font-mono">{linkedExchange.customer_phone}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Exchange Date</p>
                      <p className="font-semibold text-foreground">{new Date(linkedExchange.date).toLocaleDateString()}</p>
                    </div>
                    {outgoingPhone ? (
                      <div>
                        <p className="text-muted-foreground">Phone Given to Customer</p>
                        <p className="font-semibold text-foreground">{outgoingPhone.brand} {outgoingPhone.model}</p>
                        <p className="text-muted-foreground font-mono">{outgoingPhone.imei}</p>
                      </div>
                    ) : null}
                    <div>
                      <p className="text-muted-foreground">Inspection Status</p>
                      <StatusBadge status={linkedExchange.inspection_status ?? "Pending Inspection"} />
                    </div>
                    {linkedExchange.incoming_valuation ? (
                      <div>
                        <p className="text-muted-foreground">Trade-in Valuation</p>
                        <p className="font-bold text-foreground"><Receipt className="size-3 inline mr-1" />{linkedExchange.incoming_valuation.toLocaleString()} ৳</p>
                      </div>
                    ) : null}
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

              {/* Bottom Right Actions */}
              <div className="mt-2 flex items-center justify-between border-t border-border pt-4">
                <div className="text-xs text-muted-foreground">
                  Status: <span className="font-medium text-foreground">{phone.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  {phone.status === "In Inspection" && (
                    <Button
                      className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm"
                      onClick={() => setInspectOpen(true)}
                    >
                      <ShieldCheck className="size-4" />
                      Inspect Device
                    </Button>
                  )}
                  {phone.status === "Available" && (
                    <Button
                      className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm"
                      onClick={() => setSellOpen(true)}
                    >
                      <ShoppingBag className="size-4" />
                      Sell Phone
                    </Button>
                  )}
                  {phone.status === "Sold" && (
                    <div className="flex items-center gap-2">
                      <Link
                        to="/sales"
                        className="inline-flex items-center gap-1.5 rounded-xl border border-border bg-secondary/70 hover:bg-secondary px-3 py-1.5 text-xs font-semibold text-foreground transition-colors"
                        onClick={onClose}
                      >
                        <Receipt className="size-3.5 text-primary" />
                        View in Sales & Orders &rarr;
                      </Link>
                      <Button
                        variant="outline"
                        size="sm"
                        className="rounded-xl gap-1.5 text-xs"
                        onClick={() => setSellOpen(true)}
                      >
                        <ShoppingBag className="size-3.5" />
                        Update Sale
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      {/* Sale Form Popup */}
      <SellPhoneDialog
        open={sellOpen}
        onOpenChange={setSellOpen}
        phone={phone}
      />

      {/* Inspection Popup */}
      <InspectTradeInDialog
        phone={phone}
        open={inspectOpen}
        onOpenChange={setInspectOpen}
      />
    </>
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
