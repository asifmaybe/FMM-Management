import { useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import {
  Box,
  ShoppingBag,
  ShieldCheck,
  Receipt,
  Pencil,
  Copy,
  Check,
  Printer,
  History,
  Info as InfoIcon,
  RotateCcw,
  ArrowLeftRight,
  DollarSign,
  PackageCheck,
  FileText,
  User,
  Truck,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { daysInStock, formatBatteryHealth, supplierName, useFmm } from "@/lib/fmm-store";
import { formatStorageRam } from "@/lib/utils";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import { SellPhoneDialog } from "@/components/fmm/SellPhoneDialog";
import { InspectTradeInDialog } from "@/components/fmm/InspectTradeInDialog";
import { EditPhoneDialog } from "@/components/fmm/EditPhoneDialog";
import { buildPhoneHistory, type HistoryLink } from "@/lib/fmm-phone-history";
import { PhoneHistoryPdfDialog } from "@/components/fmm/PhoneHistoryPdfDialog";
import { toast } from "sonner";

export function PhoneDetailDialog({
  phoneId,
  onClose,
  initialTab = "overview",
}: {
  phoneId: string | null;
  onClose: () => void;
  initialTab?: "overview" | "history";
}) {
  const { state } = useFmm();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<string>(initialTab);
  const [sellOpen, setSellOpen] = useState(false);
  const [inspectOpen, setInspectOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [copiedImei, setCopiedImei] = useState(false);

  const phone = state.phones.find((p) => p.id === phoneId) ?? null;
  const historySummary = phoneId ? buildPhoneHistory(state, phoneId) : null;

  if (!phone) return null;

  const txs = state.transactions.filter(
    (t) => t.phone_id === phone.id || (t.items && t.items.some((i) => i.id === phone.id))
  );
  const purchase = state.customer_purchases.find((c) => c.id === phone?.customer_purchase_id);
  const linkedExchange = phone?.status === "In Inspection"
    ? (state.exchanges ?? []).find((e) => e.incoming_phone_id === phone.id) ?? null
    : null;
  const outgoingPhone = linkedExchange
    ? state.phones.find((p) => p.id === linkedExchange.outgoing_phone_id) ?? null
    : null;

  const damage = Object.entries(phone.damage_checklist || {})
    .filter(([, v]) => v)
    .map(([k]) => k.replace(/_/g, " "));

  const soldTx = txs.find((t) => t.type === "Sale" || t.type === "Exchange");
  const soldPrice = phone.sold_price ?? soldTx?.amount;

  const handleCopyImei = () => {
    navigator.clipboard.writeText(phone.imei);
    setCopiedImei(true);
    toast.success("IMEI copied to clipboard");
    setTimeout(() => setCopiedImei(false), 2000);
  };

  const handleLinkClick = (link: HistoryLink) => {
    onClose();
    if (link.kind === "customer") {
      navigate({ to: "/customers", search: { q: link.label } as any });
    } else if (link.kind === "supplier") {
      navigate({ to: "/suppliers/$supplierId", params: { supplierId: link.id } as any });
    } else if (link.kind === "transaction") {
      navigate({ to: "/sales", search: { q: link.label } as any });
    } else if (link.kind === "purchase") {
      navigate({ to: "/purchases" });
    } else if (link.kind === "warranty") {
      navigate({ to: "/sales" });
    } else if (link.kind === "exchange") {
      navigate({ to: "/sales" });
    } else if (link.kind === "return") {
      navigate({ to: "/sales" });
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case "acquisition":
        return <PackageCheck className="size-4 text-emerald-600 dark:text-emerald-400" />;
      case "sale":
        return <ShoppingBag className="size-4 text-blue-600 dark:text-blue-400" />;
      case "exchange_out":
      case "exchange_in":
        return <ArrowLeftRight className="size-4 text-purple-600 dark:text-purple-400" />;
      case "return":
        return <RotateCcw className="size-4 text-amber-600 dark:text-amber-400" />;
      case "warranty":
        return <ShieldCheck className="size-4 text-rose-600 dark:text-rose-400" />;
      case "supplier_payment":
        return <DollarSign className="size-4 text-emerald-600 dark:text-emerald-400" />;
      default:
        return <FileText className="size-4 text-zinc-500" />;
    }
  };

  return (
    <>
      <Dialog open={!!phone} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-3xl rounded-2xl p-0 overflow-hidden flex flex-col max-h-[92vh]">
          {/* Header */}
          <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-card">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <DialogTitle className="text-xl flex items-center gap-2.5 flex-wrap">
                  <span className="font-bold">{phone.brand} {phone.model}</span>
                  <StatusBadge status={phone.status} />
                  {phone.with_box ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-xs font-semibold text-emerald-600 dark:text-emerald-400">
                      <Box className="size-3" /> With Box
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-border bg-secondary/50 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                      No Box
                    </span>
                  )}
                </DialogTitle>
                <div className="flex items-center gap-3 mt-1.5 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1 font-mono font-medium text-foreground">
                    IMEI: {phone.imei}
                    <button
                      type="button"
                      onClick={handleCopyImei}
                      className="p-1 hover:text-primary transition-colors rounded hover:bg-secondary"
                      title="Copy IMEI"
                    >
                      {copiedImei ? <Check className="size-3.5 text-emerald-500" /> : <Copy className="size-3.5" />}
                    </button>
                  </span>
                  {phone.imei_secondary && (
                    <span className="font-mono">IMEI 2: {phone.imei_secondary}</span>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-medium"
                  onClick={() => setPdfOpen(true)}
                >
                  <Printer className="size-3.5" />
                  Print / PDF Passport
                </Button>
              </div>
            </div>

            {/* Passport Identity Metric Bar */}
            {historySummary && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mt-3 pt-3 border-t border-border/60 text-xs">
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Current Holder</span>
                  <span className="font-semibold text-foreground truncate block">{historySummary.currentHolder}</span>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Shop Cycles</span>
                  <span className="font-semibold text-foreground block">
                    {historySummary.passThroughCount} Cycle{historySummary.passThroughCount > 1 ? "s" : ""}
                  </span>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Total Days In Shop</span>
                  <span className="font-semibold text-foreground block">{historySummary.totalDaysInStock} days</span>
                </div>
                <div className="rounded-xl border border-border/70 bg-secondary/30 p-2.5">
                  <span className="text-[10px] text-muted-foreground uppercase font-semibold block">Cycle Profit</span>
                  <span className={`font-semibold block ${historySummary.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                    <Taka value={historySummary.totalProfit} />
                  </span>
                </div>
              </div>
            )}
          </DialogHeader>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 flex flex-col overflow-hidden">
            <div className="px-6 border-b border-border bg-card">
              <TabsList className="bg-transparent h-10 p-0 gap-6">
                <TabsTrigger
                  value="overview"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-xs font-semibold data-[state=active]:text-foreground"
                >
                  <InfoIcon className="size-3.5 mr-1.5" /> Overview &amp; Specs
                </TabsTrigger>
                <TabsTrigger
                  value="history"
                  className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-2 text-xs font-semibold data-[state=active]:text-foreground"
                >
                  <History className="size-3.5 mr-1.5" /> Complete History ({historySummary?.events.length ?? 0})
                </TabsTrigger>
              </TabsList>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* TAB 1: OVERVIEW */}
              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid gap-4 sm:grid-cols-2">
                  <Info label="Specs (Storage / RAM)" value={formatStorageRam(phone.brand, phone.storage_ram)} />
                  <Info label="Battery Health" value={formatBatteryHealth(phone.battery_health)} />
                  <Info label="Cycle Count" value={phone.cycle_count != null ? `${phone.cycle_count} cycles` : "—"} />
                  <Info label="Serial Number" value={phone.serial_number ? <span className="font-mono">{phone.serial_number}</span> : "—"} />
                  <Info label="Condition" value={phone.condition} />
                  <Info
                    label="Packaging / Box"
                    value={
                      phone.with_box ? (
                        <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-600 dark:text-emerald-400">
                          <Box className="size-3.5" /> With Box (Included)
                        </span>
                      ) : (
                        <span className="text-muted-foreground">No Box (Device only)</span>
                      )
                    }
                  />
                  <Info label="Source" value={`${phone.source_type} · ${supplierName(state, phone)}`} />
                  <Info label="Purchase Cost" value={<Taka value={phone.purchase_price} />} />
                  <Info label="Target Selling Price" value={phone.selling_price ? <Taka value={phone.selling_price} /> : "—"} />
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
                  {phone.status === "Sold" || phone.status === "Exchange" ? (
                    <Info
                      label="Sold Date"
                      value={
                        phone.sold_date
                          ? new Date(phone.sold_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : txs[0]?.date
                          ? new Date(txs[0].date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
                          : "—"
                      }
                    />
                  ) : null}
                  <Info label="Days in stock (Current cycle)" value={String(daysInStock(phone.created_at))} />
                  <Info label="Date Added" value={new Date(phone.created_at).toLocaleString()} />
                </div>

                {phone.condition_notes ? (
                  <div className="rounded-xl border border-border bg-secondary/20 p-3.5">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Condition Notes</p>
                    <p className="text-xs text-foreground mt-1">{phone.condition_notes}</p>
                  </div>
                ) : null}

                {damage.length ? (
                  <div>
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Damage Checklist</p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {damage.map((d) => (
                        <span key={d} className="rounded-lg bg-destructive/10 px-2.5 py-1 text-xs text-destructive font-medium capitalize">
                          {d}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}

                {purchase ? (
                  <div className="rounded-xl border border-border p-4 space-y-2">
                    <p className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Customer Intake Details</p>
                    <p className="text-xs text-foreground">
                      <strong>{purchase.customer_name}</strong> &middot; {purchase.customer_phone} &middot; NID: {purchase.nid_number || "—"}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {[purchase.nid_front_image, purchase.nid_back_image, ...purchase.additional_documents, ...purchase.phone_photos]
                        .filter(Boolean)
                        .map((f, i) => (
                          <img key={i} src={f!.data} alt={f!.name} className="size-20 rounded-lg border border-border object-cover" />
                        ))}
                    </div>
                  </div>
                ) : null}

                {linkedExchange ? (
                  <div className="rounded-xl border border-purple-500/30 bg-purple-500/5 p-4 space-y-2">
                    <p className="text-xs font-semibold tracking-wide text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                      <ShieldCheck className="size-3.5" /> Trade-in / Exchange Origin
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
                          <p className="text-muted-foreground">Phone Given Out</p>
                          <p className="font-semibold text-foreground">{outgoingPhone.brand} {outgoingPhone.model}</p>
                          <p className="text-muted-foreground font-mono">{outgoingPhone.imei}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-muted-foreground">Trade-in Valuation</p>
                        <p className="font-bold text-foreground">{linkedExchange.incoming_valuation.toLocaleString()} ৳</p>
                      </div>
                    </div>
                  </div>
                ) : null}
              </TabsContent>

              {/* TAB 2: HISTORY TIMELINE */}
              <TabsContent value="history" className="mt-0">
                {historySummary && historySummary.events.length > 0 ? (
                  <div className="relative border-l-2 border-border/80 ml-3 pl-6 space-y-6">
                    {historySummary.events.map((ev, idx) => (
                      <div key={ev.id || idx} className="relative group">
                        {/* Dot / Icon */}
                        <div className="absolute -left-[37px] top-0 size-7 rounded-full border-2 border-border bg-card flex items-center justify-center shadow-xs">
                          {getEventIcon(ev.type)}
                        </div>

                        <div className="rounded-xl border border-border/70 bg-card p-4 transition-colors hover:border-border">
                          <div className="flex items-start justify-between gap-2 flex-wrap mb-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-foreground text-sm">{ev.title}</span>
                              {ev.badge && (
                                <span className="inline-flex items-center rounded-full bg-secondary px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                                  {ev.badge}
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] font-mono text-muted-foreground">
                              {new Date(ev.date).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                                year: "numeric",
                              })}
                            </span>
                          </div>

                          <p className="text-xs text-muted-foreground leading-relaxed">{ev.details}</p>

                          {ev.amount != null && (
                            <div className="mt-2 text-xs font-semibold text-foreground flex items-center gap-1">
                              <span>Amount:</span>
                              <span className="font-mono text-primary"><Taka value={ev.amount} /></span>
                            </div>
                          )}

                          {ev.links && ev.links.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-border/50 flex flex-wrap gap-2">
                              {ev.links.map((link, lIdx) => (
                                <button
                                  key={lIdx}
                                  type="button"
                                  onClick={() => handleLinkClick(link)}
                                  className="inline-flex items-center gap-1 rounded-lg border border-border/80 bg-secondary/50 px-2.5 py-1 text-[11px] font-medium text-foreground hover:bg-secondary hover:text-primary transition-colors cursor-pointer"
                                >
                                  {link.kind === "customer" && <User className="size-3" />}
                                  {link.kind === "supplier" && <Truck className="size-3" />}
                                  {link.kind === "transaction" && <Receipt className="size-3" />}
                                  {link.kind === "purchase" && <PackageCheck className="size-3" />}
                                  {link.kind === "warranty" && <ShieldCheck className="size-3" />}
                                  <span>{link.label} &rarr;</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-10 text-xs text-muted-foreground">
                    No history events recorded yet.
                  </div>
                )}
              </TabsContent>
            </div>
          </Tabs>

          {/* Footer Actions */}
          <div className="px-6 py-3.5 border-t border-border bg-card flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Status: <span className="font-medium text-foreground">{phone.status}</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="rounded-xl gap-1.5 text-xs font-medium"
                onClick={() => setEditOpen(true)}
              >
                <Pencil className="size-3.5" />
                Edit Details
              </Button>
              {phone.status === "In Inspection" && (
                <Button
                  className="rounded-xl bg-purple-600 hover:bg-purple-700 text-white gap-1.5 shadow-sm text-xs font-medium"
                  size="sm"
                  onClick={() => setInspectOpen(true)}
                >
                  <ShieldCheck className="size-4" />
                  Inspect Device
                </Button>
              )}
              {phone.status === "Available" && (
                <Button
                  className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 shadow-sm text-xs font-medium"
                  size="sm"
                  onClick={() => setSellOpen(true)}
                >
                  <ShoppingBag className="size-4" />
                  Sell Phone
                </Button>
              )}
              {phone.status === "Sold" && (
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs"
                  onClick={() => setSellOpen(true)}
                >
                  <ShoppingBag className="size-3.5" />
                  Update Sale
                </Button>
              )}
            </div>
          </div>
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

      {/* Edit Phone Popup */}
      <EditPhoneDialog
        phone={phone}
        open={editOpen}
        onOpenChange={setEditOpen}
        onDeleted={onClose}
      />

      {/* PDF Dialog */}
      {phone && (
        <PhoneHistoryPdfDialog
          open={pdfOpen}
          onOpenChange={setPdfOpen}
          phoneId={phone.id}
        />
      )}
    </>
  );
}

function Info({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm font-medium mt-0.5">{value}</div>
    </div>
  );
}
