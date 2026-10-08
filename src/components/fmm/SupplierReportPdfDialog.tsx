import { useEffect, useMemo, useState } from "react";
import { Box, Calendar, Check, ClipboardCopy, ClipboardList, Download, Loader2, Package, Printer, RefreshCcw, Smartphone, X } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Taka } from "@/components/fmm/Taka";
import {
  daysInStock,
  getSupplierPhonesPaymentMap,
  supplierTotalOwed,
  supplierTotalPaid,
  supplierDueBalance,
  useFmm,
} from "@/lib/fmm-store";
import { formatStorageRam } from "@/lib/utils";
import type { Supplier } from "@/lib/fmm-types";

type PeriodType = "all" | "today" | "exact" | "range";

interface SupplierReportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  supplier: Supplier;
  mode?: "phone" | "accessory" | "both";
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function fmtDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function toLocalDateStr(d: Date | string): string {
  const date = new Date(d);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function SupplierReportPdfDialog({
  open,
  onOpenChange,
  supplier,
  mode,
}: SupplierReportPdfDialogProps) {
  const { state } = useFmm();
  const [isSaving, setIsSaving] = useState(false);
  const [stockReportText, setStockReportText] = useState<string | null>(null);
  const [stockReportCopied, setStockReportCopied] = useState(false);
  // Default to "today" filter
  const [periodType, setPeriodType] = useState<PeriodType>("today");
  const [exactDate, setExactDate] = useState(toLocalDateStr(new Date()));
  const [rangeStart, setRangeStart] = useState(() => toLocalDateStr(new Date(Date.now() - 30 * 86400000)));
  const [rangeEnd, setRangeEnd] = useState(toLocalDateStr(new Date()));
  const todayDs = toLocalDateStr(new Date());

  // Reset to "today" whenever modal opens
  useEffect(() => {
    if (open) {
      setPeriodType("today");
    }
  }, [open]);

  // Determine supplier type
  const isAccessorySupplier = mode ? mode === "accessory" : supplier.supplier_type === "Accessory";
  const isPhoneSupplier = !isAccessorySupplier;

  const periodLabel = useMemo(() => {
    if (periodType === "today") return `Today — ${fmtDate(new Date().toISOString())}`;
    if (periodType === "exact") return `Date: ${fmtDate(exactDate)}`;
    if (periodType === "range") return `${fmtDate(rangeStart)} to ${fmtDate(rangeEnd)}`;
    return "All Time";
  }, [periodType, exactDate, rangeStart, rangeEnd]);

  const inPeriod = useMemo(() => (iso: string): boolean => {
    const ds = toLocalDateStr(iso);
    if (periodType === "today") return ds === todayDs;
    if (periodType === "exact") return ds === exactDate;
    if (periodType === "range") return ds >= rangeStart && ds <= rangeEnd;
    return true;
  }, [periodType, exactDate, rangeStart, rangeEnd, todayDs]);

  // Phone supplier specific data
  const allPhones = useMemo(() => {
    if (isAccessorySupplier) return [];
    return state.phones.filter((p) => p.supplier_id === supplier.id);
  }, [state.phones, supplier.id, isAccessorySupplier]);

  const periodPhones = useMemo(
    () => allPhones.filter((p) => inPeriod(p.created_at)),
    [allPhones, inPeriod],
  );

  const paymentMap = useMemo(() => {
    if (isAccessorySupplier) return new Map();
    return getSupplierPhonesPaymentMap(state, supplier.id);
  }, [state, supplier.id, isAccessorySupplier]);

  // All Available (not sold) phones for this individual supplier (used in Section 5 on Today)
  const availablePhones = useMemo(() => {
    if (!isPhoneSupplier) return [];
    return state.phones
      .filter((p) => p.supplier_id === supplier.id && p.status === "Available")
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }, [state.phones, supplier.id, isPhoneSupplier]);

  const totalAvailablePhoneCost = useMemo(
    () => availablePhones.reduce((s, p) => s + p.purchase_price, 0),
    [availablePhones],
  );

  // Accessory supplier specific data
  const allAccessories = useMemo(() => {
    if (isPhoneSupplier) return [];
    return (state.accessories ?? []).filter((a) => a.supplier_id === supplier.id);
  }, [state.accessories, supplier.id, isPhoneSupplier]);

  const accessoryIds = useMemo(() => new Set(allAccessories.map((a) => a.id)), [allAccessories]);

  const allAccPurchaseMoves = useMemo(() => {
    if (isPhoneSupplier) return [];
    return (state.accessory_movements ?? []).filter(
      (m) => m.type === "Purchase" && m.direction === "in" && accessoryIds.has(m.accessory_id),
    );
  }, [state.accessory_movements, accessoryIds, isPhoneSupplier]);

  const periodAccMoves = useMemo(
    () => allAccPurchaseMoves.filter((m) => inPeriod(m.date)),
    [allAccPurchaseMoves, inPeriod],
  );

  const totalAccUnits = useMemo(
    () => allAccessories.reduce((s, a) => s + (a.quantity ?? 0), 0),
    [allAccessories],
  );

  const totalAccStockValue = useMemo(
    () => allAccessories.reduce((s, a) => s + (a.purchase_price ?? 0) * (a.quantity ?? 0), 0),
    [allAccessories],
  );

  const periodAccUnits = useMemo(
    () => periodAccMoves.reduce((s, m) => s + m.quantity, 0),
    [periodAccMoves],
  );

  const periodAccMovTotal = useMemo(
    () => periodAccMoves.reduce((s, m) => s + (m.unit_price ?? 0) * m.quantity, 0),
    [periodAccMoves],
  );

  // Common purchase orders (filtered by supplier product type)
  const allPurchases = useMemo(() => {
    const list = (state.purchases ?? []).filter((p) => p.supplier_id === supplier.id);
    if (isAccessorySupplier) {
      return list.filter(
        (p) => p.type === "Accessory" || (p.items && p.items.some((it) => it.type === "accessory")),
      );
    }
    return list.filter(
      (p) =>
        p.type === "Phone" ||
        (p.phone_ids && p.phone_ids.length > 0) ||
        (p.items && p.items.some((it) => it.type === "phone")),
    );
  }, [state.purchases, supplier.id, isAccessorySupplier]);

  const periodPurchases = useMemo(
    () => allPurchases.filter((p) => inPeriod(p.date)),
    [allPurchases, inPeriod],
  );

  // Supplier payments
  const allPayments = useMemo(
    () => (state.supplier_payments ?? []).filter((sp) => sp.supplier_id === supplier.id),
    [state.supplier_payments, supplier.id],
  );
  const periodPayments = useMemo(
    () => allPayments.filter((sp) => inPeriod(sp.date)),
    [allPayments, inPeriod],
  );

  // Lifetime financial numbers
  const totalOwed = supplierTotalOwed(state, supplier.id);
  const totalPaid = supplierTotalPaid(state, supplier.id);
  const totalDue = supplierDueBalance(state, supplier.id);

  // Period sums
  const periodPhoneCost = periodPhones.reduce((s, p) => s + p.purchase_price, 0);
  const periodPurchaseTotal = periodPurchases.reduce((s, p) => s + p.total_amount + (p.additional_cost || 0), 0);
  const periodPaidInPeriod = periodPayments.reduce((s, sp) => s + sp.amount, 0);

  const handlePrint = () => {
    const el = document.getElementById("fmm-supplier-report");
    if (!el) {
      window.print();
      return;
    }
    const hs = Array.from(document.querySelectorAll('link[rel="stylesheet"],style'))
      .map((e) => e.outerHTML)
      .join("\n");
    const fr = document.createElement("iframe");
    fr.setAttribute(
      "style",
      "position:fixed;top:-9999px;left:-9999px;width:1200px;height:900px;border:0;opacity:0;pointer-events:none;",
    );
    document.body.appendChild(fr);
    const d = fr.contentWindow?.document;
    if (!d) {
      window.print();
      return;
    }
    d.open();
    d.write(
      "<!DOCTYPE html><html><head><meta charset=utf-8/>" +
        hs +
        "<style>@page{size:A4 portrait;margin:12mm;}*{box-sizing:border-box;}body{background:#fff!important;color:#0f172a!important;margin:0!important;font-family:system-ui,sans-serif;print-color-adjust:exact!important;}table{width:100%;border-collapse:collapse;}thead{display:table-header-group;}section{page-break-inside:avoid;}</style></head><body><div id=fmm-supplier-report class='" +
        el.className +
        "'>" +
        el.innerHTML +
        "</div></body></html>",
    );
    d.close();
    setTimeout(() => {
      try {
        fr.contentWindow?.focus();
        fr.contentWindow?.print();
      } catch (e) {
      } finally {
        setTimeout(() => fr.remove(), 1200);
      }
    }, 300);
  };

  const handleSavePdf = async () => {
    const el = document.getElementById("fmm-supplier-report");
    if (!el || isSaving) return;
    setIsSaving(true);
    const n = new Date();
    const pad = (x: number) => String(x).padStart(2, "0");
    const fname = `${supplier.name} ${isAccessorySupplier ? "Accessory" : "Phone"} Report ${pad(n.getDate())}-${pad(n.getMonth() + 1)}-${n.getFullYear()} ${pad(n.getHours() % 12 || 12)}.${pad(n.getMinutes())} ${n.getHours() >= 12 ? "PM" : "AM"} FMM.pdf`;
    try {
      const img = await toPng(el, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: el.scrollWidth,
        height: el.scrollHeight,
        style: { overflow: "visible" },
      });
      const i = new Image();
      i.src = img;
      await new Promise((r) => {
        i.onload = r;
      });
      const pdf = new jsPDF("p", "mm", "a4");
      const pw = pdf.internal.pageSize.getWidth();
      const ph = pdf.internal.pageSize.getHeight();
      const ih = (i.naturalHeight * pw) / i.naturalWidth;
      let hl = ih;
      let pos = 0;
      pdf.addImage(img, "PNG", 0, pos, pw, ih);
      hl -= ph;
      while (hl > 0) {
        pos = hl - ih;
        pdf.addPage();
        pdf.addImage(img, "PNG", 0, pos, pw, ih);
        hl -= ph;
      }
      const blob = pdf.output("blob");
      if ("showSaveFilePicker" in window) {
        try {
          const fh = await (window as any).showSaveFilePicker({
            suggestedName: fname,
            types: [{ description: "PDF", accept: { "application/pdf": [".pdf"] } }],
          });
          const w = await fh.createWritable();
          await w.write(blob);
          await w.close();
          toast.success("PDF saved!", { description: `Saved as "${fname}"`, duration: 5000 });
        } catch (e: unknown) {
          if (e instanceof Error && e.name === "AbortError") return;
          throw e;
        }
      } else {
        pdf.save(fname);
        toast.success("PDF saved to Downloads", { duration: 5000 });
      }
    } catch (err) {
      console.error(err);
      toast.error("Failed to save PDF");
    } finally {
      setIsSaving(false);
    }
  };

  const generateStockReport = () => {
    if (availablePhones.length === 0) {
      setStockReportText("");
      return;
    }
    const lines = availablePhones.map((p, idx) => {
      const specs = formatStorageRam(p.brand, p.storage_ram);
      const label = [p.model, specs && specs !== "—" ? specs : ""].filter(Boolean).join(" ").trim();
      const boxStatus = p.with_box ? "Box" : "No Box";
      // Use serial_number — NEVER IMEI
      const sn = (p.serial_number ?? "").trim();
      const last4 = sn.length > 0 ? sn.slice(-4) : "N/A";
      // Strip any trailing % to avoid double-percent
      const bh = p.battery_health ? p.battery_health.replace(/%+$/, "") : null;
      const bhPart = bh !== null ? `BH ${bh}%` : "BH —";
      return `${idx + 1}/ ${label} - ${boxStatus} - ${last4} - ${bhPart} =`;
    });
    setStockReportText(lines.join("\n"));
  };

  const handleCopyStockReport = async () => {
    if (!stockReportText) return;
    try {
      await navigator.clipboard.writeText(stockReportText);
      setStockReportCopied(true);
      setTimeout(() => setStockReportCopied(false), 2000);
    } catch {
      toast.error("Failed to copy report");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl">
        {/* Sticky Header Toolbar */}
        <div className="sticky top-0 z-20 flex flex-wrap items-center justify-between border-b border-border bg-card/95 px-6 py-3.5 backdrop-blur gap-3 print:hidden">
          <div className="flex items-center gap-2.5">
            <span
              className={`flex size-8 items-center justify-center rounded-lg ${
                isAccessorySupplier
                  ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                  : "bg-primary/10 text-primary"
              }`}
            >
              {isAccessorySupplier ? <Package className="size-4" /> : <Smartphone className="size-4" />}
            </span>
            <div>
              <DialogTitle className="text-base font-bold flex items-center gap-2">
                <span>{supplier.name}</span>
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                    isAccessorySupplier
                      ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      : "bg-primary/10 text-primary"
                  }`}
                >
                  {isAccessorySupplier ? "Accessory Supplier" : "Phone Supplier"}
                </span>
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-0.5">{periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-2 font-semibold"
              onClick={handleSavePdf}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isSaving ? "Saving..." : "Save PDF"}
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-2 bg-primary text-primary-foreground font-semibold"
              onClick={handlePrint}
            >
              <Printer className="size-4" /> Print
            </Button>
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl size-9 p-0"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Period Filter Selector */}
        <div className="px-6 py-4 border-b border-border bg-secondary/30 print:hidden">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wide flex items-center gap-1.5 mr-1">
              <Calendar className="size-3.5" /> Report Period:
            </span>
            {(["today", "all", "exact", "range"] as PeriodType[]).map((p) => (
              <button
                key={p}
                onClick={() => setPeriodType(p)}
                className={
                  "rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors " +
                  (periodType === p
                    ? "bg-primary text-primary-foreground border-primary"
                    : "border-border bg-card hover:bg-secondary")
                }
              >
                {p === "today" ? "Today" : p === "all" ? "All Time" : p === "exact" ? "Exact Date" : "Date Range"}
              </button>
            ))}
          </div>
          {periodType === "exact" && (
            <div className="mt-3 flex items-center gap-2">
              <Label className="text-xs font-medium">Date:</Label>
              <Input
                type="date"
                value={exactDate}
                onChange={(e) => setExactDate(e.target.value)}
                className="h-8 w-44 text-xs rounded-lg"
              />
            </div>
          )}
          {periodType === "range" && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Label className="text-xs font-medium">From:</Label>
              <Input
                type="date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className="h-8 w-40 text-xs rounded-lg"
              />
              <Label className="text-xs font-medium">To:</Label>
              <Input
                type="date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className="h-8 w-40 text-xs rounded-lg"
              />
            </div>
          )}
        </div>

        {/* Available Stock Text Report — Phone Suppliers Only, non-print */}
        {isPhoneSupplier && (
          <div className="px-6 py-4 border-b border-border bg-card print:hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div className="flex items-center gap-2">
                <div className="flex size-7 items-center justify-center rounded-lg bg-emerald-500/10">
                  <ClipboardList className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">Available Stock Text Report</p>
                  <p className="text-xs text-muted-foreground">
                    {availablePhones.length} phone{availablePhones.length !== 1 ? "s" : ""} currently available from {supplier.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {stockReportText !== null && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-xl gap-1.5 text-xs font-semibold"
                    onClick={handleCopyStockReport}
                    disabled={stockReportText === ""}
                  >
                    {stockReportCopied
                      ? <Check className="size-3.5 text-emerald-600" />
                      : <ClipboardCopy className="size-3.5" />}
                    {stockReportCopied ? "Copied!" : "Copy Report"}
                  </Button>
                )}
                <Button
                  size="sm"
                  className="rounded-xl gap-1.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white"
                  onClick={generateStockReport}
                >
                  <RefreshCcw className="size-3.5" /> Generate Stock Report
                </Button>
              </div>
            </div>
            {stockReportText !== null && (
              stockReportText === "" ? (
                <p className="text-xs text-muted-foreground italic py-2 text-center rounded-lg border border-border bg-secondary/30 px-3">
                  No available phones in stock from this supplier.
                </p>
              ) : (
                <textarea
                  readOnly
                  value={stockReportText}
                  rows={Math.min(availablePhones.length + 1, 14)}
                  className="w-full rounded-xl border border-border bg-secondary/30 px-3 py-2.5 text-xs font-mono text-foreground resize-y focus:outline-none focus:ring-2 focus:ring-primary/30"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
              )
            )}
          </div>
        )}

        {/* Printable Report Document */}
        <div id="fmm-supplier-report" className="p-8 sm:p-10 bg-white text-slate-900 space-y-8 font-sans">
          {/* Document Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Faridpur Mobile Mart</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">
                {isAccessorySupplier ? "Accessory Supplier Report" : "Phone Supplier Report"}
              </h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-sm font-semibold text-slate-700">{supplier.name}</p>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 uppercase">
                  {isAccessorySupplier ? "Accessory Partner" : "Phone Partner"}
                </span>
              </div>
              {supplier.contact && <p className="text-xs text-slate-500 mt-0.5">Contact: {supplier.contact}</p>}
              {supplier.notes && <p className="text-xs text-slate-500">Notes: {supplier.notes}</p>}
            </div>
            <div className="text-right text-xs text-slate-600">
              <p>
                <strong className="text-slate-900">Period:</strong> {periodLabel}
              </p>
              <p className="mt-0.5">
                <strong className="text-slate-900">Generated:</strong> {fmtDateTime(new Date().toISOString())}
              </p>
              <p className="mt-0.5 text-[10px] text-slate-400">Faridpur Mobile Mart — Confidential</p>
            </div>
          </div>

          {/* 1. FINANCIAL OVERVIEW (ALL-TIME BALANCES)
              ONLY rendered in 'All Time' view.
              Hidden in Today, Exact Date, and Date Range filters as requested. */}
          {periodType === "all" && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                1. Financial Overview (All-Time Balances)
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Total Owed</p>
                  <p className="text-base font-extrabold text-slate-900 mt-0.5">
                    <Taka value={totalOwed} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Lifetime purchase liability</p>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <p className="text-[10px] uppercase font-bold text-emerald-700">Total Paid</p>
                  <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                    <Taka value={totalPaid} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Across {allPayments.length} payment(s)</p>
                </div>
                <div
                  className={
                    "p-3 rounded-lg border bg-slate-50 " + (totalDue > 0 ? "border-red-300" : "border-slate-200")
                  }
                >
                  <p className={"text-[10px] uppercase font-bold " + (totalDue > 0 ? "text-red-700" : "text-slate-500")}>
                    Outstanding Due
                  </p>
                  <p className={"text-base font-extrabold mt-0.5 " + (totalDue > 0 ? "text-red-700" : "text-slate-900")}>
                    <Taka value={totalDue} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">{totalDue > 0 ? "Unpaid balance" : "Fully settled"}</p>
                </div>
                {isPhoneSupplier ? (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Devices</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">{allPhones.length}</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {allPhones.filter((p) => p.status === "Available").length} available ·{" "}
                      {allPhones.filter((p) => p.status === "Sold").length} sold
                    </p>
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                    <p className="text-[10px] uppercase font-bold text-slate-500">Total Accessories</p>
                    <p className="text-base font-extrabold text-slate-900 mt-0.5">{allAccessories.length} items</p>
                    <p className="text-[10px] text-slate-500 mt-0.5">
                      {totalAccUnits} units in stock (<Taka value={totalAccStockValue} />)
                    </p>
                  </div>
                )}
              </div>
            </section>
          )}

          {/* 1. PERIOD SUMMARY — Rendered when filtering by Today, Exact Date, or Date Range */}
          {periodType !== "all" && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                1. Period Summary — {periodLabel}
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {isPhoneSupplier ? (
                  <>
                    <div className="p-3 rounded-lg border border-slate-200 bg-blue-50">
                      <p className="text-[10px] uppercase font-bold text-blue-700">Phones Acquired</p>
                      <p className="text-base font-extrabold text-blue-700 mt-0.5">{periodPhones.length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Handsets in period</p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Phone Purchase Cost</p>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">
                        <Taka value={periodPhoneCost} />
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Acquisition cost in period</p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-emerald-50">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Paid in Period</p>
                      <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                        <Taka value={periodPaidInPeriod} />
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Across {periodPayments.length} payment(s)</p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Batch Stock Status</p>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">
                        {periodPhones.filter((p) => p.status === "Available").length} /{" "}
                        {periodPhones.filter((p) => p.status === "Sold").length}
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Available / Sold</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="p-3 rounded-lg border border-slate-200 bg-blue-50">
                      <p className="text-[10px] uppercase font-bold text-blue-700">Accessories Restocked</p>
                      <p className="text-base font-extrabold text-blue-700 mt-0.5">{periodAccUnits} units</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Across {periodAccMoves.length} restock movement(s)</p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Restock Purchase Cost</p>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">
                        <Taka value={periodAccMovTotal} />
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Accessory value in period</p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-emerald-50">
                      <p className="text-[10px] uppercase font-bold text-emerald-700">Paid in Period</p>
                      <p className="text-base font-extrabold text-emerald-700 mt-0.5">
                        <Taka value={periodPaidInPeriod} />
                      </p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Across {periodPayments.length} payment(s)</p>
                    </div>
                    <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                      <p className="text-[10px] uppercase font-bold text-slate-500">Linked Catalog Items</p>
                      <p className="text-base font-extrabold text-slate-900 mt-0.5">{allAccessories.length}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5">Active accessory lines</p>
                    </div>
                  </>
                )}
              </div>
            </section>
          )}

          {/* 2. PHONE SUPPLIER ONLY: Phone Purchase Ledger */}
          {isPhoneSupplier && (
            <section className="space-y-3">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                2. Phone Purchase Ledger ({periodPhones.length} units — {periodLabel})
              </h2>
              {periodPhones.length > 0 ? (
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">#</th>
                      <th className="px-3 py-2 text-left font-bold">Date</th>
                      <th className="px-3 py-2 text-left font-bold">IMEI / Serial</th>
                      <th className="px-3 py-2 text-left font-bold">Brand / Model</th>
                      <th className="px-3 py-2 text-left font-bold">Specs</th>
                      <th className="px-3 py-2 text-left font-bold">Condition</th>
                      <th className="px-3 py-2 text-center font-bold">Battery</th>
                      <th className="px-3 py-2 text-right font-bold">Buy Price</th>
                      <th className="px-3 py-2 text-center font-bold">Status</th>
                      <th className="px-3 py-2 text-center font-bold">Payment</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {periodPhones.map((p, idx) => {
                      const pi = paymentMap.get(p.id);
                      return (
                        <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                          <td className="px-3 py-2 font-mono text-slate-700 text-[10px] whitespace-nowrap">
                            <div>{p.imei}</div>
                            {p.serial_number ? (
                              <div className="text-[9px] text-slate-500 font-sans">SN: {p.serial_number}</div>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span>{p.brand} {p.model}</span>
                              {p.with_box ? (
                                <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Includes original box">
                                  <Box className="size-2.5" /> Box
                                </span>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatStorageRam(p.brand, p.storage_ram)}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.condition}</td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            {p.battery_health ? (
                              <span className={"inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] " + (parseInt(p.battery_health) >= 80 ? "bg-emerald-100 text-emerald-800" : parseInt(p.battery_health) >= 60 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>
                                {p.battery_health}%
                              </span>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                          <td className="px-3 py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                            BDT {p.purchase_price.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={
                                "inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] " +
                                (p.status === "Sold"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : p.status === "Available"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-slate-100 text-slate-700")
                              }
                            >
                              {p.status}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-center whitespace-nowrap">
                            <span
                              className={
                                "inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] " +
                                (pi?.status === "Paid"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : pi?.status === "Due"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800")
                              }
                            >
                              {pi?.status ?? "Not Paid"}
                            </span>
                            {pi && pi.due > 0 ? (
                              <span className="block text-[9px] text-red-700 mt-0.5">
                                Due: BDT {pi.due.toLocaleString()}
                              </span>
                            ) : null}
                          </td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={7} className="px-3 py-2">
                        Total ({periodPhones.length} units)
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        BDT {periodPhoneCost.toLocaleString()}
                      </td>
                      <td colSpan={2} className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  No phones purchased from this supplier in this period.
                </p>
              )}
            </section>
          )}

          {/* 2. ACCESSORY SUPPLIER ONLY: Accessory Purchase History & Current Stock */}
          {isAccessorySupplier && (
            <section className="space-y-4">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
                2. Accessory Purchase History ({periodAccMoves.length} entries — {periodLabel})
              </h2>
              {periodAccMoves.length > 0 ? (
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">#</th>
                      <th className="px-3 py-2 text-left font-bold">Date</th>
                      <th className="px-3 py-2 text-left font-bold">Accessory</th>
                      <th className="px-3 py-2 text-left font-bold">Category</th>
                      <th className="px-3 py-2 text-right font-bold">Qty</th>
                      <th className="px-3 py-2 text-right font-bold">Unit Price</th>
                      <th className="px-3 py-2 text-right font-bold">Total</th>
                      <th className="px-3 py-2 text-left font-bold">Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {periodAccMoves.map((m, idx) => {
                      const acc = state.accessories.find((a) => a.id === m.accessory_id);
                      const lineTotal = (m.unit_price ?? 0) * m.quantity;
                      return (
                        <tr key={m.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                          <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(m.date)}</td>
                          <td className="px-3 py-2 font-semibold text-slate-900">{acc?.name ?? m.accessory_id}</td>
                          <td className="px-3 py-2 text-slate-600">{acc?.category ?? "—"}</td>
                          <td className="px-3 py-2 text-right font-medium">{m.quantity}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            BDT {(m.unit_price ?? 0).toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-right font-semibold text-slate-900">
                            BDT {lineTotal.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-slate-500 text-[10px]">{m.reason || "—"}</td>
                        </tr>
                      );
                    })}
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={6} className="px-3 py-2">
                        Total ({periodAccMoves.length} entries — {periodAccUnits} units)
                      </td>
                      <td className="px-3 py-2 text-right">BDT {periodAccMovTotal.toLocaleString()}</td>
                      <td className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">No accessory purchases in this period.</p>
              )}

              {allAccessories.length > 0 && (
                <div className="mt-4">
                  <h3 className="text-[11px] font-bold uppercase tracking-wide text-slate-600 mb-2 border-t border-slate-200 pt-3">
                    Current Stock from this Supplier ({allAccessories.length} items)
                  </h3>
                  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-100 text-slate-700">
                      <tr>
                        <th className="px-3 py-2 text-left font-bold">Accessory</th>
                        <th className="px-3 py-2 text-left font-bold">Category</th>
                        <th className="px-3 py-2 text-right font-bold">In Stock</th>
                        <th className="px-3 py-2 text-right font-bold">Min Level</th>
                        <th className="px-3 py-2 text-right font-bold">Buy Price</th>
                        <th className="px-3 py-2 text-center font-bold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {allAccessories.map((a, idx) => (
                        <tr key={a.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                          <td className="px-3 py-2 font-semibold text-slate-900">{a.name}</td>
                          <td className="px-3 py-2 text-slate-600">{a.category}</td>
                          <td
                            className={
                              "px-3 py-2 text-right font-medium " +
                              (a.quantity <= a.min_threshold ? "text-red-700" : "text-slate-900")
                            }
                          >
                            {a.quantity}
                            {a.quantity <= a.min_threshold ? (
                              <span className="ml-1 text-[9px] font-bold text-red-600">LOW</span>
                            ) : null}
                          </td>
                          <td className="px-3 py-2 text-right text-slate-500">{a.min_threshold}</td>
                          <td className="px-3 py-2 text-right text-slate-700">
                            BDT {a.purchase_price.toLocaleString()}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={
                                "inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] " +
                                (a.status === "Active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-100 text-slate-700")
                              }
                            >
                              {a.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          )}

          {/* 3. PURCHASE ORDERS (Filtered by Supplier Type) */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              3. Purchase Orders ({periodPurchases.length} — {periodLabel})
            </h2>
            {periodPurchases.length > 0 ? (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">Date</th>
                    <th className="px-3 py-2 text-left font-bold">Type</th>
                    <th className="px-3 py-2 text-left font-bold">Items</th>
                    <th className="px-3 py-2 text-right font-bold">Total</th>
                    <th className="px-3 py-2 text-right font-bold">Paid</th>
                    <th className="px-3 py-2 text-right font-bold">Due</th>
                    <th className="px-3 py-2 text-center font-bold">Status</th>
                    <th className="px-3 py-2 text-left font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodPurchases.map((pu, idx) => (
                    <tr key={pu.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(pu.date)}</td>
                      <td className="px-3 py-2 text-slate-700">{pu.type}</td>
                      <td className="px-3 py-2 text-slate-600">
                        {pu.phone_ids?.length ? `${pu.phone_ids.length} phone(s)` : ""}
                        {pu.items?.length ? ` ${pu.items.length} item(s)` : ""}
                      </td>
                      <td className="px-3 py-2 text-right font-semibold text-slate-900 whitespace-nowrap">
                        BDT {(pu.total_amount + (pu.additional_cost || 0)).toLocaleString()}
                        {pu.additional_cost > 0 && (
                          <span className="block text-[9px] text-slate-500">
                            +BDT {pu.additional_cost.toLocaleString()} extra
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2 text-right text-emerald-700 font-medium whitespace-nowrap">
                        BDT {pu.paid_amount.toLocaleString()}
                      </td>
                      <td className="px-3 py-2 text-right font-medium whitespace-nowrap">
                        <span className={pu.due_amount > 0 ? "text-red-700" : "text-slate-500"}>
                          BDT {pu.due_amount.toLocaleString()}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center whitespace-nowrap">
                        <span
                          className={
                            "inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] " +
                            (pu.payment_status === "Paid"
                              ? "bg-emerald-100 text-emerald-800"
                              : pu.payment_status === "Due"
                                ? "bg-amber-100 text-amber-800"
                                : "bg-red-100 text-red-800")
                          }
                        >
                          {pu.payment_status}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-slate-500 text-[10px] max-w-[120px] truncate">{pu.notes || "—"}</td>
                    </tr>
                  ))}
                  <tr className="bg-slate-900 text-white font-bold">
                    <td colSpan={3} className="px-3 py-2">
                      Total ({periodPurchases.length} orders)
                    </td>
                    <td className="px-3 py-2 text-right">BDT {periodPurchaseTotal.toLocaleString()}</td>
                    <td className="px-3 py-2 text-right">
                      BDT {periodPurchases.reduce((s, p) => s + p.paid_amount, 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-2 text-right">
                      BDT {periodPurchases.reduce((s, p) => s + p.due_amount, 0).toLocaleString()}
                    </td>
                    <td colSpan={2} className="px-3 py-2"></td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">
                No purchase orders recorded for this supplier in this period.
              </p>
            )}
          </section>

          {/* 4. PAYMENT LEDGER */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              4. Payment Ledger ({periodPayments.length} entries — {periodLabel})
            </h2>
            {periodPayments.length > 0 ? (
              <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-3 py-2 text-left font-bold">#</th>
                    <th className="px-3 py-2 text-left font-bold">Payment Date</th>
                    <th className="px-3 py-2 text-left font-bold">Notes / Reference</th>
                    <th className="px-3 py-2 text-right font-bold">Amount Paid</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {periodPayments.map((sp, idx) => (
                    <tr key={sp.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                      <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                      <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDateTime(sp.date)}</td>
                      <td className="px-3 py-2 text-slate-700">
                        {sp.notes || <span className="italic text-slate-400">No notes</span>}
                      </td>
                      <td className="px-3 py-2 text-right font-bold text-emerald-700 whitespace-nowrap">
                        BDT {sp.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                  <tr className="bg-emerald-900 text-white font-bold">
                    <td colSpan={3} className="px-3 py-2">
                      Total Paid in Period
                    </td>
                    <td className="px-3 py-2 text-right">BDT {periodPaidInPeriod.toLocaleString()}</td>
                  </tr>
                </tbody>
              </table>
            ) : (
              <p className="text-xs text-slate-500 italic py-2">No payments recorded in this period.</p>
            )}
          </section>

          {/* 5. AVAILABLE PHONES IN STOCK (ONLY IN TODAY FILTER) */}
          {isPhoneSupplier && periodType === "today" && (
            <section className="space-y-3">
              <div className="border-b border-slate-200 pb-1 flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  5. Available Phones in Stock ({availablePhones.length} unsold units)
                </h2>
                <span className="text-[10px] font-semibold text-slate-500">
                  Current unsold stock in shop from {supplier.name}
                </span>
              </div>
              {availablePhones.length > 0 ? (
                <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                  <thead className="bg-slate-100 text-slate-700">
                    <tr>
                      <th className="px-3 py-2 text-left font-bold">#</th>
                      <th className="px-3 py-2 text-left font-bold">Added Date</th>
                      <th className="px-3 py-2 text-left font-bold">IMEI / Serial</th>
                      <th className="px-3 py-2 text-left font-bold">Brand / Model</th>
                      <th className="px-3 py-2 text-left font-bold">Specs</th>
                      <th className="px-3 py-2 text-left font-bold">Condition</th>
                      <th className="px-3 py-2 text-center font-bold">Battery</th>
                      <th className="px-3 py-2 text-right font-bold">Purchase Cost</th>
                      <th className="px-3 py-2 text-center font-bold">Status</th>
                      <th className="px-3 py-2 text-right font-bold">Age</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {availablePhones.map((p, idx) => (
                      <tr key={p.id} className={idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"}>
                        <td className="px-3 py-2 text-slate-500">{idx + 1}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{fmtDate(p.created_at)}</td>
                        <td className="px-3 py-2 font-mono text-slate-700 text-[10px] whitespace-nowrap">
                          <div>{p.imei}</div>
                          {p.serial_number ? (
                            <div className="text-[9px] text-slate-500 font-sans">SN: {p.serial_number}</div>
                          ) : null}
                        </td>
                        <td className="px-3 py-2 font-semibold text-slate-900">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span>{p.brand} {p.model}</span>
                            {p.with_box ? (
                              <span className="inline-flex items-center gap-0.5 rounded px-1.5 py-0.5 text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" title="Includes original box">
                                <Box className="size-2.5" /> Box
                              </span>
                            ) : null}
                          </div>
                        </td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{formatStorageRam(p.brand, p.storage_ram)}</td>
                        <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{p.condition}</td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          {p.battery_health ? (
                            <span className={"inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] " + (parseInt(p.battery_health) >= 80 ? "bg-emerald-100 text-emerald-800" : parseInt(p.battery_health) >= 60 ? "bg-amber-100 text-amber-800" : "bg-red-100 text-red-800")}>
                              {p.battery_health}%
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>
                        <td className="px-3 py-2 text-right font-medium text-slate-900 whitespace-nowrap">
                          BDT {p.purchase_price.toLocaleString()}
                        </td>
                        <td className="px-3 py-2 text-center whitespace-nowrap">
                          <span className="inline-flex rounded px-1.5 py-0.5 font-semibold text-[10px] bg-blue-100 text-blue-800">
                            Available
                          </span>
                        </td>
                        <td className="px-3 py-2 text-right text-slate-600 whitespace-nowrap">
                          {daysInStock(p.created_at)} d
                        </td>
                      </tr>
                    ))}
                    <tr className="bg-slate-900 text-white font-bold">
                      <td colSpan={7} className="px-3 py-2">
                        Total Available Stock ({availablePhones.length} units)
                      </td>
                      <td className="px-3 py-2 text-right whitespace-nowrap">
                        BDT {totalAvailablePhoneCost.toLocaleString()}
                      </td>
                      <td colSpan={2} className="px-3 py-2"></td>
                    </tr>
                  </tbody>
                </table>
              ) : (
                <p className="text-xs text-slate-500 italic py-2">
                  No available (unsold) phones currently in stock from this supplier.
                </p>
              )}
            </section>
          )}

          {/* Document Footer */}
          <div className="border-t-2 border-slate-200 pt-4 text-center">
            <p className="text-[10px] text-slate-400">
              Faridpur Mobile Mart — {isAccessorySupplier ? "Accessory Supplier Report" : "Phone Supplier Report"} —{" "}
              {supplier.name} — Generated {fmtDateTime(new Date().toISOString())} — Confidential
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
