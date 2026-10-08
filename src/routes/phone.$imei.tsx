import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Box,
  Check,
  Copy,
  DollarSign,
  Download,
  Edit3,
  History,
  PackageCheck,
  Plus,
  Printer,
  RotateCcw,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  Truck,
  User,
  ArrowLeftRight,
  FileText,
  Receipt,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Taka } from "@/components/fmm/Taka";
import { useFmm } from "@/lib/fmm-store";
import { findPhoneByImei, normalizeImei } from "@/lib/fmm-imei";
import { buildPhoneHistory, type HistoryLink } from "@/lib/fmm-phone-history";
import { PhoneHistoryPdfDialog } from "@/components/fmm/PhoneHistoryPdfDialog";
import { EditPhoneDialog } from "@/components/fmm/EditPhoneDialog";
import { SellPhoneDialog } from "@/components/fmm/SellPhoneDialog";
import { AddPhoneDialog } from "@/components/fmm/AddPhoneDialog";
import { formatStorageRam } from "@/lib/utils";
import { toast } from "sonner";

export const Route = createFileRoute("/phone/$imei")({
  head: () => ({
    meta: [
      { title: "Device Passport & IMEI History — Faridpur Mobile Mart" },
      { name: "description", content: "Complete lifecycle history, owner verification, and passport for smartphone IMEI." },
    ],
  }),
  component: PhonePassportPage,
});

function PhonePassportPage() {
  const { imei } = Route.useParams();
  const navigate = useNavigate();
  const { state } = useFmm();

  const [copiedImei, setCopiedImei] = useState(false);
  const [pdfOpen, setPdfOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [sellOpen, setSellOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);

  const phone = useMemo(() => findPhoneByImei(state, imei), [state, imei]);
  const historySummary = useMemo(() => (phone ? buildPhoneHistory(state, phone.id) : null), [state, phone]);

  const handleCopyImei = () => {
    if (!phone) return;
    navigator.clipboard.writeText(phone.imei);
    setCopiedImei(true);
    toast.success("IMEI copied to clipboard");
    setTimeout(() => setCopiedImei(false), 2000);
  };

  const handleLinkClick = (link: HistoryLink) => {
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

  if (!phone || !historySummary) {
    return (
      <AppShell>
        <div className="space-y-6 max-w-4xl mx-auto py-8">
          <div className="flex items-center gap-3">
            <Link
              to="/stock"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <h1 className="text-xl font-bold">Device Passport</h1>
              <p className="text-xs text-muted-foreground">IMEI Lookup: {imei}</p>
            </div>
          </div>

          <div className="rounded-2xl border border-dashed border-border bg-card p-12 text-center space-y-4">
            <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-secondary text-muted-foreground">
              <Smartphone className="size-7" />
            </div>
            <div className="space-y-1">
              <h2 className="text-lg font-bold">No Device Found for this IMEI</h2>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                No phone with IMEI <span className="font-mono font-semibold text-foreground">{imei}</span> was found in inventory records.
              </p>
            </div>
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button onClick={() => setAddOpen(true)} className="rounded-xl gap-2 text-xs font-semibold">
                <Plus className="size-4" /> Add Device with this IMEI
              </Button>
              <Link to="/stock">
                <Button variant="outline" className="rounded-xl text-xs">
                  Back to Stock
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <AddPhoneDialog open={addOpen} onOpenChange={setAddOpen} />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl mx-auto pb-12">
        {/* Navigation & Header */}
        <div className="flex items-start justify-between gap-4 flex-wrap pt-2">
          <div className="flex items-center gap-3.5">
            <Link
              to="/stock"
              className="inline-flex size-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-4" />
            </Link>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-2xl font-bold tracking-tight text-foreground">
                  {phone.brand} {phone.model}
                </h1>
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
              </div>
              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
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
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs font-medium"
              onClick={() => setPdfOpen(true)}
            >
              <Printer className="size-3.5" />
              Print / PDF History
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs font-medium"
              onClick={() => setEditOpen(true)}
            >
              <Edit3 className="size-3.5" />
              Edit Device
            </Button>
            {phone.status === "Available" && (
              <Button
                size="sm"
                className="rounded-xl gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                onClick={() => setSellOpen(true)}
              >
                <ShoppingBag className="size-3.5" />
                Sell Phone
              </Button>
            )}
          </div>
        </div>

        {/* Passport Metric Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="text-xs text-muted-foreground uppercase font-semibold block">Current Holder</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block truncate">{historySummary.currentHolder}</span>
            <span className="text-[11px] text-muted-foreground mt-1 block">Status: {phone.status}</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="text-xs text-muted-foreground uppercase font-semibold block">Shop Pass-throughs</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">
              {historySummary.passThroughCount} Cycle{historySummary.passThroughCount > 1 ? "s" : ""}
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 block">Re-entry lifetime record</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="text-xs text-muted-foreground uppercase font-semibold block">Total Days In Shop</span>
            <span className="text-sm font-bold text-foreground mt-0.5 block">{historySummary.totalDaysInStock} days</span>
            <span className="text-[11px] text-muted-foreground mt-1 block">Across all shop cycles</span>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <span className="text-xs text-muted-foreground uppercase font-semibold block">Total Profit / Margin</span>
            <span className={`text-sm font-bold mt-0.5 block ${historySummary.totalProfit >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
              <Taka value={historySummary.totalProfit} />
            </span>
            <span className="text-[11px] text-muted-foreground mt-1 block">Reliable realized margin</span>
          </div>
        </div>

        {/* Content Columns: Left Specs, Right Timeline */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Specs Card */}
          <div className="md:col-span-1 space-y-4">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <h2 className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Device Specifications</h2>
              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-muted-foreground block">Storage &amp; RAM</span>
                  <span className="font-semibold text-foreground text-sm">{formatStorageRam(phone.brand, phone.storage_ram)}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Condition</span>
                  <span className="font-semibold text-foreground">{phone.condition}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Battery Health</span>
                  <span className="font-semibold text-foreground">{phone.battery_health ? `${phone.battery_health}%` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Cycle Count</span>
                  <span className="font-semibold text-foreground">{phone.cycle_count != null ? `${phone.cycle_count} cycles` : "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Serial Number</span>
                  <span className="font-mono font-medium text-foreground">{phone.serial_number || "—"}</span>
                </div>
                <div>
                  <span className="text-muted-foreground block">Purchase Cost</span>
                  <span className="font-semibold text-foreground"><Taka value={phone.purchase_price} /></span>
                </div>
                {phone.selling_price && (
                  <div>
                    <span className="text-muted-foreground block">Target Price</span>
                    <span className="font-semibold text-foreground"><Taka value={phone.selling_price} /></span>
                  </div>
                )}
                {phone.sold_price && (
                  <div>
                    <span className="text-muted-foreground block">Sold Price</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400"><Taka value={phone.sold_price} /></span>
                  </div>
                )}
              </div>
            </div>

            {phone.condition_notes && (
              <div className="rounded-2xl border border-border bg-card p-5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">Condition Notes</h3>
                <p className="text-xs text-foreground leading-relaxed">{phone.condition_notes}</p>
              </div>
            )}
          </div>

          {/* Timeline Card */}
          <div className="md:col-span-2 rounded-2xl border border-border bg-card p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h2 className="text-base font-bold flex items-center gap-2">
                <History className="size-4 text-primary" />
                <span>Permanent Lifecycle Timeline</span>
              </h2>
              <span className="text-xs text-muted-foreground">{historySummary.events.length} events logged</span>
            </div>

            {historySummary.events.length > 0 ? (
              <div className="relative border-l-2 border-border/80 ml-3 pl-6 space-y-6">
                {historySummary.events.map((ev, idx) => (
                  <div key={ev.id || idx} className="relative group">
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
              <div className="text-center py-12 text-xs text-muted-foreground">
                No events recorded for this phone yet.
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <PhoneHistoryPdfDialog open={pdfOpen} onOpenChange={setPdfOpen} phoneId={phone.id} />
      <EditPhoneDialog phone={phone} open={editOpen} onOpenChange={setEditOpen} />
      <SellPhoneDialog phone={phone} open={sellOpen} onOpenChange={setSellOpen} />
    </AppShell>
  );
}
