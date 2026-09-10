import { useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowLeftRight,
  Calendar,
  Gift,
  HandCoins,
  Receipt,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  Tag,
  User,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import { useFmm, getTransactionPayment } from "@/lib/fmm-store";
import { CollectDueDialog } from "@/components/fmm/CollectDueDialog";
import { ProcessReturnDialog } from "@/components/fmm/ProcessReturnDialog";
import { InspectTradeInDialog } from "@/components/fmm/InspectTradeInDialog";
import type { Transaction } from "@/lib/fmm-types";

interface SaleDetailDialogProps {
  transaction: Transaction | null;
  onClose: () => void;
}

export function SaleDetailDialog({ transaction, onClose }: SaleDetailDialogProps) {
  const { state } = useFmm();
  const [collectOpen, setCollectOpen] = useState(false);
  const [returnOpen, setReturnOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);

  if (!transaction) return null;

  // Re-fetch transaction from state to stay reactive to updates
  const tx = state.transactions.find((t) => t.id === transaction.id) ?? transaction;
  const phone = tx.phone_id ? state.phones.find((p) => p.id === tx.phone_id) : null;
  const tradeInPhone = tx.trade_in
    ? (state.phones.find((p) => p.id === tx.trade_in?.incoming_phone_id) ?? null)
    : null;
  const campaign = tx.campaign_id
    ? state.campaigns.find((c) => c.id === tx.campaign_id)
    : null;

  const pay = getTransactionPayment(tx);
  const hasDue = pay.hasDue;
  const isReturned = Boolean(tx.return_info);
  const isTradeInInInspection = tradeInPhone?.status === "In Inspection";

  // Calculate gross profit for staff insights
  let totalCost = 0;
  if (phone) {
    totalCost += phone.purchase_price || 0;
  }
  if (tx.items && tx.items.length > 0) {
    totalCost += tx.items.reduce((sum, item) => sum + (item.cost_price || 0) * (item.quantity || 1), 0);
  }
  const grossProfit = pay.total - totalCost;

  return (
    <>
      <Dialog open={Boolean(transaction)} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl">
          <DialogHeader>
            <div className="flex flex-wrap items-center justify-between gap-3 pr-6">
              <DialogTitle className="flex items-center gap-2.5 text-base font-bold">
                <Receipt className="size-5 text-primary" />
                <span>
                  Order #{tx.id.replace(/^tx[-_]/i, "")}
                  {phone ? ` · ${phone.brand} ${phone.model}` : ` · ${tx.customer_name}`}
                </span>
              </DialogTitle>
              <div className="flex flex-wrap items-center gap-1.5">
                <StatusBadge status={tx.type} />
                <StatusBadge status={pay.status} />
                {isReturned && <StatusBadge status="Returned" />}
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-5 pt-1 text-sm">
            {/* Top Key Figures Card */}
            <div className="grid grid-cols-3 gap-3 rounded-xl border border-border bg-secondary/30 p-4 text-center">
              <div className="rounded-lg bg-card p-2.5 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                  Total Amount
                </span>
                <p className="mt-1 text-base font-bold text-foreground">
                  <Taka value={pay.total} />
                </p>
              </div>
              <div className="rounded-lg bg-card p-2.5 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                  Paid Amount
                </span>
                <p className="mt-1 text-base font-bold text-success">
                  <Taka value={pay.paid} />
                </p>
              </div>
              <div className="rounded-lg bg-card p-2.5 border border-border/60">
                <span className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wide block">
                  Outstanding Due
                </span>
                <p className={`mt-1 text-base font-bold ${hasDue ? "text-destructive" : "text-success"}`}>
                  <Taka value={pay.due} />
                </p>
              </div>
            </div>

            {/* General Order & Customer Info */}
            <div className="grid gap-4 sm:grid-cols-2">
              <Info
                icon={<User className="size-3.5 text-muted-foreground" />}
                label="Customer"
                value={
                  <div>
                    <p className="font-semibold text-foreground">{tx.customer_name}</p>
                    <p className="font-mono text-xs text-muted-foreground">{tx.customer_phone}</p>
                  </div>
                }
              />
              <Info
                icon={<Calendar className="size-3.5 text-muted-foreground" />}
                label="Order Date"
                value={new Date(tx.date).toLocaleString("en-US", {
                  dateStyle: "medium",
                  timeStyle: "short",
                })}
              />
              <Info
                icon={<Tag className="size-3.5 text-muted-foreground" />}
                label="Order Type"
                value={
                  <span className="font-medium text-foreground">
                    {tx.type} {tx.trade_in ? "(With Trade-In Device)" : ""}
                  </span>
                }
              />
              <Info
                label="Payment Status"
                value={
                  <div className="flex items-center gap-2">
                    <StatusBadge status={pay.status} />
                    {hasDue ? (
                      <span className="text-xs text-destructive font-medium">
                        (৳{pay.due} remaining)
                      </span>
                    ) : (
                      <span className="text-xs text-success font-medium">(Cleared)</span>
                    )}
                  </div>
                }
              />
            </div>

            {/* Sold Phone Details */}
            {phone && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2">
                  <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase flex items-center gap-1.5">
                    <Smartphone className="size-3.5 text-primary" /> Sold Mobile Device
                  </span>
                  <StatusBadge status={phone.status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Model</span>
                    <p className="font-bold text-foreground text-sm">{phone.brand} {phone.model}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">IMEI Number</span>
                    <p className="font-mono font-medium text-foreground">{phone.imei}</p>
                    {phone.imei_secondary && (
                      <p className="font-mono text-[10px] text-muted-foreground">IMEI 2: {phone.imei_secondary}</p>
                    )}
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Storage / RAM</span>
                    <p className="font-medium text-foreground">{phone.storage_ram || "—"}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Condition & Battery</span>
                    <p className="font-medium text-foreground">
                      {phone.condition} · Battery {phone.battery_health || "—"}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Purchase Cost</span>
                    <p className="font-medium text-foreground"><Taka value={phone.purchase_price} /></p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Unit Sold Price</span>
                    <p className="font-semibold text-emerald-600"><Taka value={phone.sold_price || tx.amount} /></p>
                  </div>
                </div>
              </div>
            )}

            {/* Itemized Sale Items / Combo Accessories */}
            {tx.items && tx.items.length > 0 && (
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Order Items Breakdown ({tx.items.length})
                </p>
                <div className="divide-y divide-border/60">
                  {tx.items.map((item, idx) => (
                    <div key={idx} className="py-2 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        {item.is_gift ? (
                          <span className="rounded bg-primary/10 px-1.5 py-0.5 text-[10px] font-semibold text-primary flex items-center gap-1">
                            <Gift className="size-3" /> Free Gift
                          </span>
                        ) : null}
                        <div>
                          <p className="font-medium text-foreground">
                            {item.quantity}x {item.name}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            Rate: <Taka value={item.unit_price} />
                          </p>
                        </div>
                      </div>
                      <p className={`font-semibold ${item.is_gift ? "text-primary" : "text-foreground"}`}>
                        {item.is_gift ? "৳0 (Free)" : <Taka value={item.subtotal} />}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trade-In Exchange Details */}
            {tx.trade_in && (
              <div className="rounded-xl border border-purple-500/20 bg-purple-500/5 p-4 space-y-3">
                <div className="flex items-center justify-between border-b border-purple-500/20 pb-2">
                  <span className="text-xs font-semibold tracking-wide text-purple-700 dark:text-purple-300 uppercase flex items-center gap-1.5">
                    <ArrowLeftRight className="size-3.5" /> Trade-In Device Exchanged
                  </span>
                  <StatusBadge status={tradeInPhone?.status ?? tx.trade_in.inspection_status} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Incoming Device</span>
                    <p className="font-bold text-foreground text-sm">
                      {tx.trade_in.incoming_brand} {tx.trade_in.incoming_model}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Incoming IMEI</span>
                    <p className="font-mono font-medium text-foreground">{tx.trade_in.incoming_imei}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Trade-In Valuation</span>
                    <p className="font-semibold text-foreground"><Taka value={tx.trade_in.incoming_valuation} /></p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Direction & Settlement</span>
                    <p className="font-semibold text-foreground">
                      {tx.trade_in.difference_direction === "customer_pays_shop"
                        ? `Customer paid +৳${tx.trade_in.settlement_amount}`
                        : `Shop paid customer -৳${tx.trade_in.settlement_amount}`}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Customer Return Banner */}
            {tx.return_info && (
              <div className="rounded-xl border border-rose-500/20 bg-rose-500/5 p-4 space-y-2">
                <div className="flex items-center justify-between border-b border-rose-500/20 pb-2">
                  <span className="text-xs font-semibold tracking-wide text-rose-700 dark:text-rose-300 uppercase flex items-center gap-1.5">
                    <RotateCcw className="size-3.5" /> Customer Return Record
                  </span>
                  <StatusBadge status={tx.return_info.disposition} />
                </div>
                <div className="grid gap-3 sm:grid-cols-2 text-xs">
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Return Date</span>
                    <p className="font-medium text-foreground">
                      {new Date(tx.return_info.return_date).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Return Reason</span>
                    <p className="font-medium text-foreground">{tx.return_info.reason}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Deduction Applied</span>
                    <p className="font-semibold text-muted-foreground">
                      {tx.return_info.deduction_percentage}% (<Taka value={tx.return_info.deduction_amount} />)
                    </p>
                  </div>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Net Refund Issued</span>
                    <p className="font-bold text-destructive">
                      <Taka value={tx.return_info.refund_amount} />
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Campaign Association */}
            {campaign && (
              <div className="flex items-center justify-between rounded-xl border border-primary/20 bg-primary/5 p-3 text-xs">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏷️</span>
                  <div>
                    <span className="text-muted-foreground block text-[11px]">Linked Campaign</span>
                    <p className="font-bold text-foreground">{campaign.name}</p>
                  </div>
                </div>
                <Link
                  to="/campaigns/$campaignId"
                  params={{ campaignId: campaign.id }}
                  className="text-xs font-semibold text-primary hover:underline"
                >
                  View Campaign &rarr;
                </Link>
              </div>
            )}

            {/* Transaction & Device History */}
            <div>
              <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">HISTORY</p>
              <ul className="mt-2 space-y-2 text-xs">
                {phone && (
                  <li className="text-muted-foreground flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-muted-foreground/60 shrink-0" />
                    <span>
                      {new Date(phone.created_at).toLocaleDateString()} — Device acquired into stock for <Taka value={phone.purchase_price} />
                    </span>
                  </li>
                )}
                <li className="text-muted-foreground flex items-center gap-2">
                  <span className="size-1.5 rounded-full bg-emerald-500 shrink-0" />
                  <span>
                    {new Date(tx.date).toLocaleDateString()} — {tx.type} to {tx.customer_name} · <Taka value={tx.amount} /> · {tx.payment_status}
                  </span>
                </li>
                {tx.return_info && (
                  <li className="text-muted-foreground flex items-center gap-2">
                    <span className="size-1.5 rounded-full bg-rose-500 shrink-0" />
                    <span>
                      {new Date(tx.return_info.return_date).toLocaleDateString()} — Customer return processed · Net refund <Taka value={tx.return_info.refund_amount} /> · {tx.return_info.disposition}
                    </span>
                  </li>
                )}
              </ul>
            </div>

            {/* Notes */}
            {tx.notes && (
              <div>
                <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">ORDER NOTES</p>
                <p className="mt-1 text-xs text-foreground bg-secondary/30 p-2.5 rounded-lg border border-border">
                  {tx.notes}
                </p>
              </div>
            )}

            {/* Bottom Margin Insight for Store Manager */}
            {totalCost > 0 && (
              <div className="flex items-center justify-between rounded-lg bg-secondary/40 px-3 py-2 text-xs border border-border/60 text-muted-foreground">
                <span>Estimated Transaction Gross Margin:</span>
                <span className={`font-semibold ${grossProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                  <Taka value={grossProfit} /> ({tx.amount > 0 ? Math.round((grossProfit / tx.amount) * 100) : 0}%)
                </span>
              </div>
            )}
          </div>

          {/* Action Footer */}
          <div className="mt-4 flex flex-wrap items-center justify-between border-t border-border pt-4 gap-2">
            <div className="text-xs text-muted-foreground">
              Order ID: <span className="font-mono font-medium text-foreground">{tx.id}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {hasDue && (
                <Button
                  size="sm"
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-xs"
                  onClick={() => setCollectOpen(true)}
                >
                  <HandCoins className="size-3.5" />
                  Collect Due
                </Button>
              )}

              {phone && !isReturned && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5 text-xs text-rose-600 border-rose-500/30 hover:bg-rose-500/10"
                  onClick={() => setReturnOpen(true)}
                >
                  <RotateCcw className="size-3.5" />
                  Return Device
                </Button>
              )}

              {isTradeInInInspection && tradeInPhone && (
                <Button
                  size="sm"
                  variant="outline"
                  className="rounded-xl gap-1.5 text-xs text-purple-600 border-purple-500/30 hover:bg-purple-500/10"
                  onClick={() => setInspectOpen(true)}
                >
                  <ShieldCheck className="size-3.5" />
                  Inspect Trade-In
                </Button>
              )}

              <Button variant="ghost" size="sm" className="rounded-xl text-xs" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Sub-Dialogs triggered from SaleDetailDialog */}
      <CollectDueDialog
        transaction={tx}
        open={collectOpen}
        onOpenChange={setCollectOpen}
      />
      <ProcessReturnDialog
        transaction={tx}
        open={returnOpen}
        onOpenChange={setReturnOpen}
      />
      <InspectTradeInDialog
        phone={tradeInPhone}
        open={inspectOpen}
        onOpenChange={setInspectOpen}
      />
    </>
  );
}

function Info({
  label,
  value,
  icon,
}: {
  label: string;
  value: React.ReactNode;
  icon?: React.ReactNode;
}) {
  return (
    <div>
      <div className="flex items-center gap-1 text-xs text-muted-foreground">
        {icon}
        <span>{label}</span>
      </div>
      <div className="mt-1 text-sm font-medium">{value}</div>
    </div>
  );
}
