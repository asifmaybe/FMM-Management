import { useState } from "react";
import {
  Download,
  Headphones,
  Loader2,
  Printer,
  X,
  FileText,
  Calendar,
  Building2,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Boxes,
  Receipt,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ComprehensiveBusinessReport } from "@/lib/fmm-reports";
import { useFmm, getTransactionPayment } from "@/lib/fmm-store";
import { getTransactionCost } from "@/lib/fmm-analytics";
import { Taka } from "./Taka";

interface BusinessReportPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: ComprehensiveBusinessReport | null;
  onPrinted?: () => void;
}

export function BusinessReportPdfDialog({
  open,
  onOpenChange,
  report,
  onPrinted,
}: BusinessReportPdfDialogProps) {
  if (!report) return null;

  const { state } = useFmm();
  const [isSaving, setIsSaving] = useState(false);

  const handlePrint = () => {
    onPrinted?.();
    const reportEl = document.getElementById("fmm-printable-report");
    if (!reportEl) {
      window.print();
      return;
    }

    // Collect all stylesheets from head so Tailwind classes apply identically
    const headStyles = Array.from(document.querySelectorAll('link[rel="stylesheet"], style'))
      .map((el) => el.outerHTML)
      .join("\n");

    const iframe = document.createElement("iframe");
    iframe.id = "fmm-print-frame";
    iframe.setAttribute(
      "style",
      "position:fixed;top:-10000px;left:-10000px;width:1024px;height:768px;border:0;opacity:0;pointer-events:none;"
    );
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      window.print();
      return;
    }

    doc.open();
    doc.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Faridpur Mobile Mart &mdash; Executive Business Report</title>
  ${headStyles}
  <style>
    @page {
      size: A4 portrait;
      margin: 10mm 12mm 12mm 12mm;
    }
    * {
      box-sizing: border-box;
    }
    html, body {
      background: #ffffff !important;
      color: #0f172a !important;
      margin: 0 !important;
      padding: 0 !important;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #fmm-printable-report {
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      box-shadow: none !important;
      border: 0 !important;
      border-radius: 0 !important;
    }
    section {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    table {
      break-inside: auto !important;
      width: 100% !important;
      border-collapse: collapse !important;
    }
    thead {
      display: table-header-group !important;
    }
    tr {
      break-inside: avoid !important;
      page-break-inside: avoid !important;
    }
    h1, h2, h3 {
      break-after: avoid !important;
      page-break-after: avoid !important;
    }
  </style>
</head>
<body class="bg-white text-slate-900">
  <div id="fmm-printable-report" class="${reportEl.className}">
    ${reportEl.innerHTML}
  </div>
</body>
</html>`);
    doc.close();

    // Allow CSS layout and typography to settle before triggering print dialog
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.error("Print error:", err);
      } finally {
        setTimeout(() => {
          iframe.remove();
        }, 1200);
      }
    }, 300);
  };

  const handleSavePdf = async () => {
    const reportEl = document.getElementById("fmm-printable-report");
    if (!reportEl || isSaving) return;
    setIsSaving(true);

    // Build the filename: Reports DD-MM-YYYY HH.MM.SS AM/PM Faridpur Mobile Mart.pdf
    const now = new Date();
    const pad = (n: number) => String(n).padStart(2, "0");
    const day = pad(now.getDate());
    const month = pad(now.getMonth() + 1);
    const year = now.getFullYear();
    const rawHours = now.getHours();
    const ampm = rawHours >= 12 ? "PM" : "AM";
    const hours = pad(rawHours % 12 === 0 ? 12 : rawHours % 12);
    const minutes = pad(now.getMinutes());
    const seconds = pad(now.getSeconds());
    const fname = `Reports ${day}-${month}-${year} ${hours}.${minutes}.${seconds} ${ampm} Faridpur Mobile Mart.pdf`;

    try {
      // html-to-image uses native browser SVG foreignObject rendering
      const imgData = await toPng(reportEl, {
        quality: 1,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        width: reportEl.scrollWidth,
        height: reportEl.scrollHeight,
        style: {
          overflow: "visible",
        },
      });

      // Calculate how many A4 pages we need
      const img = new Image();
      img.src = imgData;
      await new Promise((res) => { img.onload = res; });

      const pdf = new jsPDF("p", "mm", "a4");
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const imgHeight = (img.naturalHeight * pdfWidth) / img.naturalWidth;
      let heightLeft = imgHeight;
      let position = 0;

      pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
      heightLeft -= pdfHeight;
      while (heightLeft > 0) {
        position = heightLeft - imgHeight;
        pdf.addPage();
        pdf.addImage(imgData, "PNG", 0, position, pdfWidth, imgHeight);
        heightLeft -= pdfHeight;
      }

      const pdfBlob = pdf.output("blob");

      // Use File System Access API if available
      if ("showSaveFilePicker" in window) {
        try {
          const fileHandle = await (window as Window & typeof globalThis & {
            showSaveFilePicker: (opts: object) => Promise<FileSystemFileHandle>;
          }).showSaveFilePicker({
            suggestedName: fname,
            types: [{ description: "PDF Document", accept: { "application/pdf": [".pdf"] } }],
          });
          const writable = await fileHandle.createWritable();
          await writable.write(pdfBlob);
          await writable.close();
          toast.success("PDF saved successfully!", {
            description: `Saved as "${fname}"`,
            duration: 5000,
          });
        } catch (pickerErr: unknown) {
          if (pickerErr instanceof Error && pickerErr.name === "AbortError") return;
          throw pickerErr;
        }
      } else {
        pdf.save(fname);
        toast.success("PDF saved to Downloads", {
          description: `"${fname}" was saved to your Downloads folder.`,
          duration: 5000,
        });
      }
    } catch (err) {
      console.error("Save PDF error:", err);
      toast.error("Failed to save PDF", {
        description: "Something went wrong while generating the PDF. Please try again.",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const {
    executive,
    sales,
    profit,
    cashFlow,
    customerDue,
    inventory,
    dailyClosing,
  } = report;

  // Format human-readable date & reference ID
  const reportDate = new Date(report.generatedAt);
  const formattedGenerated = reportDate.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[94vh] overflow-y-auto p-0 rounded-2xl print:m-0 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:border-0 bg-white border border-border shadow-2xl">
        {/* Modal Controls Bar (Hidden in Print) */}
        <div className="sticky top-0 z-30 flex items-center justify-between border-b border-border/80 bg-background/95 px-6 py-3.5 backdrop-blur-md print:hidden shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center size-9 rounded-xl bg-primary/10 text-primary border border-primary/20">
              <FileText className="size-4.5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <DialogTitle className="text-base font-bold text-foreground">
                  Executive Business Report
                </DialogTitle>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <ShieldCheck className="size-3" /> Audited Statement
                </span>
              </div>
              <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Calendar className="size-3" /> {report.range.label}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-2 font-semibold shadow-sm hover:bg-accent"
              onClick={handleSavePdf}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isSaving ? "Generating PDF…" : "Save as PDF"}
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-2 bg-primary text-primary-foreground font-semibold shadow-sm"
              onClick={handlePrint}
            >
              <Printer className="size-4" /> Print Report
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="rounded-xl size-9 p-0 text-muted-foreground hover:text-foreground"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Presentation Frame */}
        <div className="p-4 sm:p-8 bg-slate-50 border-t border-border print:p-0 flex justify-center">
          <div
            id="fmm-printable-report"
            className="w-full max-w-4xl bg-white text-slate-900 rounded-xl shadow-xl ring-1 ring-slate-900/10 p-8 sm:p-12 space-y-7 font-sans print:p-0 print:shadow-none print:ring-0 print:rounded-none print:max-w-none print:space-y-6"
          >
            {/* Top Brand Stripe */}
            <div className="h-1.5 w-full bg-gradient-to-r from-red-600 via-rose-500 to-amber-500 rounded-t" />

            {/* Document Header */}
            <div className="border-b-2 border-slate-900 pb-5 flex flex-wrap items-start justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black tracking-widest uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                    Official Statement
                  </span>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Bara Bazar, Faridpur · Retail & Wholesale Hub
                  </span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 uppercase">
                  Faridpur Mobile Mart
                </h1>
                <p className="text-xs font-semibold text-slate-700 tracking-wide">
                  EXECUTIVE MANAGEMENT & FINANCIAL AUDIT STATEMENT
                </p>
                <p className="text-[11px] text-slate-500 max-w-md">
                  Authoritative multi-tier business ledger, revenue breakdown, gross/net profits, actual cash flows, and inventory asset valuation.
                </p>
              </div>

              <div className="text-right text-xs space-y-1 sm:min-w-[220px]">
                <div className="p-2.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1">
                  <p className="text-[10px] uppercase font-bold text-slate-400">Audit Scope</p>
                  <p className="text-xs font-bold text-slate-900">{report.range.label}</p>
                  <div className="border-t border-slate-200/80 pt-1 text-[11px] text-slate-600">
                    <span>Generated: </span>
                    <strong className="text-slate-800">{formattedGenerated}</strong>
                  </div>
                  <p className="text-[10px] text-emerald-700 font-semibold flex items-center justify-end gap-1">
                    <CheckCircle2 className="size-3" /> System Verified Ledger
                  </p>
                </div>
              </div>
            </div>

            {/* 1. Executive Summary KPIs */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">1</span>
                  Executive Financial Summary
                </h2>
                <span className="text-[10px] font-medium text-slate-500">Key Performance Indicators</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                {/* Sales Revenue */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 border-t-4 border-t-slate-800">
                  <p className="text-[10px] uppercase font-bold text-slate-500">Sales Revenue</p>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    <Taka value={executive.totalSalesRevenue} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Net realized billings</p>
                </div>

                {/* Cash Inflow */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 border-t-4 border-t-emerald-600">
                  <p className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                    <ArrowDownRight className="size-3 text-emerald-600" /> Cash Inflow
                  </p>
                  <p className="text-lg font-black text-emerald-700 mt-1">
                    <Taka value={executive.cashInflow} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Collected on sales</p>
                </div>

                {/* Customer Due */}
                <div className="p-3.5 rounded-xl border border-amber-200 bg-amber-50/40 border-t-4 border-t-amber-600">
                  <p className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                    <AlertTriangle className="size-3 text-amber-600" /> Customer Due
                  </p>
                  <p className="text-lg font-black text-amber-700 mt-1">
                    <Taka value={executive.customerOutstanding} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Receivable in period</p>
                </div>

                {/* Supplier Due */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 border-t-4 border-t-rose-600">
                  <p className="text-[10px] uppercase font-bold text-rose-800">Supplier Due</p>
                  <p className="text-lg font-black text-rose-700 mt-1">
                    <Taka value={executive.supplierOutstanding} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Invoice payables</p>
                </div>

                {/* Purchases */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 border-t-4 border-t-indigo-600">
                  <p className="text-[10px] uppercase font-bold text-indigo-800">Total Purchases</p>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    <Taka value={executive.totalPurchases} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Procurement volume</p>
                </div>

                {/* Expenses */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 border-t-4 border-t-slate-600">
                  <p className="text-[10px] uppercase font-bold text-slate-600">Operating Expenses</p>
                  <p className="text-lg font-black text-slate-900 mt-1">
                    <Taka value={executive.totalExpenses} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Shop rent & overhead</p>
                </div>

                {/* Gross Profit */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/50 border-t-4 border-t-emerald-600">
                  <div className="flex items-center justify-between">
                    <p className="text-[10px] uppercase font-bold text-emerald-800">Gross Profit</p>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800">
                      {profit.grossMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className="text-lg font-black text-emerald-700 mt-1">
                    <Taka value={executive.grossProfit} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Product gross margin</p>
                </div>

                {/* Net Profit */}
                <div
                  className={`p-3.5 rounded-xl border border-t-4 ${
                    executive.netProfit >= 0
                      ? "border-blue-200 bg-blue-50/50 border-t-blue-700"
                      : "border-rose-200 bg-rose-50/50 border-t-rose-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <p className={`text-[10px] uppercase font-bold ${executive.netProfit >= 0 ? "text-blue-800" : "text-rose-800"}`}>
                      Net Business Profit
                    </p>
                    <span
                      className={`text-[9px] font-bold px-1.5 py-0.2 rounded ${
                        executive.netProfit >= 0 ? "bg-blue-100 text-blue-800" : "bg-rose-100 text-rose-800"
                      }`}
                    >
                      {profit.netMarginPercent.toFixed(1)}%
                    </span>
                  </div>
                  <p className={`text-lg font-black mt-1 ${executive.netProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                    <Taka value={executive.netProfit} />
                  </p>
                  <p className="text-[10px] text-slate-500 mt-0.5">Bottom line net profit</p>
                </div>
              </div>
            </section>

            {/* 2. Profit & Loss Statement */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">2</span>
                  Profit & Loss Statement (Accrual Method)
                </h2>
                <span className="text-[10px] text-slate-500">Standard Accounting Ledger</span>
              </div>

              <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-slate-200">
                    <tr className="bg-slate-100/80 font-bold">
                      <td className="px-4 py-2.5 text-slate-900">1. Gross Realized Billings (Sales Revenue)</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                        <Taka value={profit.salesRevenue} />
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="px-4 py-1.5 text-slate-600 pl-8 text-[11px] flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-slate-400" /> Phone Sales Revenue
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-700 font-medium font-mono text-[11px]">
                        <Taka value={profit.phoneRevenue} />
                      </td>
                    </tr>
                    <tr className="bg-slate-50/40">
                      <td className="px-4 py-1.5 text-slate-600 pl-8 text-[11px] flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-slate-400" /> Accessory Sales Revenue
                      </td>
                      <td className="px-4 py-1.5 text-right text-slate-700 font-medium font-mono text-[11px]">
                        <Taka value={profit.accessoryRevenue} />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-600 pl-8">
                        Less: Cost of Goods Sold (COGS — Inventory Acquisition Basis)
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700 font-medium font-mono">
                        − <Taka value={profit.cogs} />
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/60 font-bold text-emerald-950">
                      <td className="px-4 py-2.5 flex items-center justify-between">
                        <span>2. Gross Profit (Trading Margin)</span>
                        <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                          Margin: {profit.grossMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-emerald-700 font-extrabold">
                        <Taka value={profit.grossProfit} />
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/20">
                      <td className="px-4 py-1.5 text-slate-500 pl-8 text-[11px]">
                        Phone Unit Margin
                      </td>
                      <td className={`px-4 py-1.5 text-right font-semibold font-mono text-[11px] ${profit.phoneGrossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        <Taka value={profit.phoneGrossProfit} />
                      </td>
                    </tr>
                    <tr className="bg-emerald-50/20">
                      <td className="px-4 py-1.5 text-slate-500 pl-8 text-[11px]">
                        Accessory Unit Margin
                      </td>
                      <td className={`px-4 py-1.5 text-right font-semibold font-mono text-[11px] ${profit.accessoryGrossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                        <Taka value={profit.accessoryGrossProfit} />
                      </td>
                    </tr>
                    <tr>
                      <td className="px-4 py-2 text-slate-600 pl-8">
                        Less: Operating Expenses (Rent, Salaries, Utilities, Shop Maintenance)
                      </td>
                      <td className="px-4 py-2 text-right text-slate-700 font-medium font-mono">
                        − <Taka value={profit.operatingExpenses} />
                      </td>
                    </tr>
                    {profit.restockedReturnCost > 0 && (
                      <tr>
                        <td className="px-4 py-2 text-slate-600 pl-8">
                          Less: Customer Return Restocking Cost
                        </td>
                        <td className="px-4 py-2 text-right text-slate-700 font-medium font-mono">
                          − <Taka value={profit.restockedReturnCost} />
                        </td>
                      </tr>
                    )}
                    <tr className="bg-slate-100 border-t-2 border-b-2 border-slate-300 text-slate-900 font-black text-sm">
                      <td className="px-4 py-3 flex items-center justify-between">
                        <span>3. Net Business Profit (Bottom Line)</span>
                        <span className="text-[10px] font-bold text-slate-700 bg-slate-200 px-2.5 py-0.5 rounded-full">
                          Net Margin: {profit.netMarginPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className={`px-4 py-3 text-right font-mono text-base font-black ${profit.netProfit >= 0 ? "text-slate-900" : "text-rose-700"}`}>
                        <Taka value={profit.netProfit} />
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>

            {/* 3. Cash Flow Movement */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">3</span>
                  Cash Flow Statement (Actual Realized Liquid Cash)
                </h2>
                <span className="text-[10px] text-slate-500">Inflows vs Outflows</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 text-xs">
                {/* Inflows */}
                <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-2">
                  <div className="flex items-center justify-between border-b border-emerald-200 pb-1.5">
                    <p className="font-bold text-emerald-800 flex items-center gap-1.5">
                      <ArrowDownRight className="size-3.5 text-emerald-600" /> Cash Inflows
                    </p>
                    <span className="text-[10px] font-semibold text-emerald-700">Collections</span>
                  </div>
                  <div className="space-y-1 text-slate-600 pt-0.5">
                    <div className="flex justify-between">
                      <span>Customer Sales Paid:</span>
                      <span className="font-mono font-medium text-slate-900">
                        <Taka value={cashFlow.breakdown.customerSalePayments} />
                      </span>
                    </div>
                  </div>
                  <div className="border-t border-emerald-200 pt-2 flex justify-between font-bold text-slate-900">
                    <span>Total Realized Inflow:</span>
                    <span className="font-mono text-emerald-700 font-extrabold">
                      <Taka value={cashFlow.cashInflow} />
                    </span>
                  </div>
                </div>

                {/* Outflows */}
                <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/30 space-y-2">
                  <div className="flex items-center justify-between border-b border-rose-200 pb-1.5">
                    <p className="font-bold text-rose-800 flex items-center gap-1.5">
                      <ArrowUpRight className="size-3.5 text-rose-600" /> Cash Outflows
                    </p>
                    <span className="text-[10px] font-semibold text-rose-700">Disbursements</span>
                  </div>
                  <div className="space-y-1 text-slate-600 pt-0.5">
                    <div className="flex justify-between">
                      <span>Purchase Payments:</span>
                      <span className="font-mono font-medium text-slate-900"><Taka value={cashFlow.breakdown.purchasePayments} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Direct Supplier Paid:</span>
                      <span className="font-mono font-medium text-slate-900"><Taka value={cashFlow.breakdown.supplierDirectPayments} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Operating Expenses:</span>
                      <span className="font-mono font-medium text-slate-900"><Taka value={cashFlow.breakdown.operatingExpenses} /></span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer Buybacks:</span>
                      <span className="font-mono font-medium text-slate-900"><Taka value={cashFlow.breakdown.customerIntakes} /></span>
                    </div>
                  </div>
                  <div className="border-t border-rose-200 pt-2 flex justify-between font-bold text-slate-900">
                    <span>Total Realized Outflow:</span>
                    <span className="font-mono text-rose-700 font-extrabold">
                      <Taka value={cashFlow.cashOutflow} />
                    </span>
                  </div>
                </div>

                {/* Net Movement */}
                <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/80 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                      <p className="font-bold text-slate-800">Net Cash Movement</p>
                      <span className="text-[10px] text-slate-500 font-mono">Inflow − Outflow</span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-2">
                      Liquid money balance change during the specified reporting interval.
                    </p>
                  </div>
                  <div className="mt-4 pt-2 border-t border-slate-200">
                    <p className="text-[10px] uppercase font-bold text-slate-400">Net Liquid Delta</p>
                    <p
                      className={`text-2xl font-black mt-0.5 font-mono ${
                        cashFlow.netCashMovement >= 0 ? "text-emerald-700" : "text-rose-700"
                      }`}
                    >
                      <Taka value={cashFlow.netCashMovement} />
                    </p>
                  </div>
                </div>
              </div>
            </section>

            {/* 4. Sales & Orders Activity */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">4</span>
                  Sales & Transaction Activity
                </h2>
                <span className="text-[10px] text-slate-500">Volume Analysis</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Total Transactions</span>
                  <strong className="text-base font-black text-slate-900 mt-0.5 block">{sales.totalTransactions}</strong>
                  <span className="text-[10px] text-slate-400">Recorded orders</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Phone Billings</span>
                  <strong className="text-base font-black text-slate-900 mt-0.5 block font-mono"><Taka value={sales.phoneRevenue} /></strong>
                  <span className="text-[10px] text-slate-400">Hardware sales</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Accessory Billings</span>
                  <strong className="text-base font-black text-slate-900 mt-0.5 block font-mono"><Taka value={sales.accessoryRevenue} /></strong>
                  <span className="text-[10px] text-slate-400">Add-ons & parts</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Exchanges & Trade-ins</span>
                  <strong className="text-base font-black text-slate-900 mt-0.5 block">{sales.exchangeCount}</strong>
                  <span className="text-[10px] text-slate-400">Device trades</span>
                </div>
              </div>
            </section>

            {/* 5. Customer Due & Aging Analysis */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">5</span>
                  Customer Due & Aging Ledger
                </h2>
                <span className="text-xs font-black text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200 font-mono">
                  Total Shop Due: <Taka value={customerDue.totalLifetimeDue} />
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
                <div className="p-2.5 rounded-lg bg-emerald-50/50 border border-emerald-200">
                  <p className="text-[10px] uppercase font-bold text-emerald-800 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-emerald-500" /> 0–30 Days (Current)
                  </p>
                  <p className="font-extrabold text-slate-900 mt-1 font-mono text-sm"><Taka value={customerDue.aging.days0_30} /></p>
                  <p className="text-[9px] text-emerald-700 mt-0.5">Fresh receivable</p>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                  <p className="text-[10px] uppercase font-bold text-slate-600 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-slate-400" /> 31–60 Days
                  </p>
                  <p className="font-extrabold text-slate-900 mt-1 font-mono text-sm"><Taka value={customerDue.aging.days31_60} /></p>
                  <p className="text-[9px] text-slate-500 mt-0.5">Moderate age</p>
                </div>
                <div className="p-2.5 rounded-lg bg-amber-50/50 border border-amber-200">
                  <p className="text-[10px] uppercase font-bold text-amber-800 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-amber-500" /> 61–90 Days
                  </p>
                  <p className="font-extrabold text-amber-800 mt-1 font-mono text-sm"><Taka value={customerDue.aging.days61_90} /></p>
                  <p className="text-[9px] text-amber-700 mt-0.5">Follow-up needed</p>
                </div>
                <div className="p-2.5 rounded-lg bg-rose-50/50 border border-rose-200">
                  <p className="text-[10px] uppercase font-bold text-rose-800 flex items-center gap-1">
                    <span className="size-2 rounded-full bg-rose-500" /> 90+ Days (Critical)
                  </p>
                  <p className="font-extrabold text-rose-800 mt-1 font-mono text-sm"><Taka value={customerDue.aging.days90Plus} /></p>
                  <p className="text-[9px] text-rose-700 mt-0.5">High recovery risk</p>
                </div>
              </div>
            </section>

            {/* 6. Inventory Valuation & Reorder Alerts */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">6</span>
                  Inventory Status & Asset Valuation
                </h2>
                <span className="text-[10px] text-slate-500">Live Stock Snapshot</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Available Phones</span>
                  <strong className="text-sm font-black text-slate-900 mt-0.5 block font-mono">
                    {inventory.phones.availableUnits} units
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">Cost: <Taka value={inventory.phones.availableCostValue} /></span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Phones Sold in Period</span>
                  <strong className="text-sm font-black text-slate-900 mt-0.5 block font-mono">
                    {inventory.phones.soldInPeriodUnits} units
                  </strong>
                  <span className="text-[10px] text-slate-400">Inventory turnover</span>
                </div>
                <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Accessory Valuation</span>
                  <strong className="text-sm font-black text-slate-900 mt-0.5 block font-mono">
                    {inventory.accessories.totalUnits} units
                  </strong>
                  <span className="text-[10px] text-slate-500 font-mono">Cost: <Taka value={inventory.accessories.totalValuation} /></span>
                </div>
                <div className="p-3 rounded-lg border border-rose-200 bg-rose-50/30">
                  <span className="text-[10px] uppercase font-bold text-rose-800 block">Low / Out of Stock</span>
                  <strong className="text-sm font-black text-rose-700 mt-0.5 block font-mono">
                    {inventory.accessories.lowStockCount} items
                  </strong>
                  <span className="text-[10px] text-rose-600">Reorder recommended</span>
                </div>
              </div>
            </section>

            {/* 7. Daily Register Closing Summary (If applicable) */}
            {dailyClosing && (
              <section className="space-y-2 p-4 rounded-xl border border-slate-300 bg-slate-50/90 shadow-2xs">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">7</span>
                  Daily Business Register Closing Snapshot
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Sales Revenue:</span>
                    <strong className="font-mono text-slate-900 text-sm"><Taka value={dailyClosing.salesRevenue} /></strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-700 font-semibold block">Cash Collected:</span>
                    <strong className="font-mono text-emerald-700 text-sm"><Taka value={dailyClosing.cashCollected} /></strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Purchases Paid:</span>
                    <strong className="font-mono text-slate-900 text-sm"><Taka value={dailyClosing.purchases} /></strong>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Daily Expenses:</span>
                    <strong className="font-mono text-slate-900 text-sm"><Taka value={dailyClosing.expenses} /></strong>
                  </div>
                </div>
              </section>
            )}

            {/* 8. Detailed Transactions Table */}
            <section className="space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-1.5">
                <h2 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                  <span className="inline-flex items-center justify-center size-4 rounded bg-slate-100 text-slate-700 border border-slate-300 text-[9px] font-bold">
                    {dailyClosing ? "8" : "7"}
                  </span>
                  Period Transactions ({report.transactions.length} records)
                </h2>
                <span className="text-[10px] text-slate-400">Displaying top records</span>
              </div>

              {report.transactions.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-2">No transactions recorded in this period.</p>
              ) : (
                <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <table className="w-full text-xs">
                    <thead className="bg-slate-100/90 text-slate-700 font-bold border-b border-slate-200 text-left">
                      <tr>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Customer</th>
                        <th className="p-2.5">Type</th>
                        <th className="p-2.5 text-right">Revenue</th>
                        <th className="p-2.5 text-right">Profit</th>
                        <th className="p-2.5 text-right">Paid</th>
                        <th className="p-2.5 text-right">Due</th>
                        <th className="p-2.5 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {report.transactions.slice(0, 50).map((t) => {
                        const pay = getTransactionPayment(t);
                        const cost = getTransactionCost(state, t);
                        const itemProfit = pay.total - cost;
                        const accessoryItems = (t.items ?? []).filter((it) => it.type === "accessory");
                        const hasAccessories =
                          accessoryItems.length > 0 || t.phone_id === "acc_multi";
                        const accessorySummary = accessoryItems.length > 0
                          ? accessoryItems.map((it) => `${it.quantity || 1}x ${it.name}`).join(", ")
                          : "Accessory included";

                        return (
                          <tr key={t.id} className="even:bg-slate-50/50 hover:bg-slate-100/40">
                            <td className="p-2.5 font-mono text-[11px] text-slate-600">
                              {new Date(t.date).toLocaleDateString("en-GB")}
                            </td>
                            <td className="p-2.5 font-semibold text-slate-900">{t.customer_name}</td>
                            <td className="p-2.5 text-slate-600">
                              <div className="flex items-center gap-1.5">
                                <span className="font-medium text-slate-800 capitalize">{t.type}</span>
                                {hasAccessories && (
                                  <span
                                    className="inline-flex items-center justify-center size-4 rounded bg-indigo-50 border border-indigo-200 text-indigo-600 shrink-0"
                                    title={accessorySummary ? `Accessories: ${accessorySummary}` : "Includes accessories"}
                                  >
                                    <Headphones className="size-2.5" />
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="p-2.5 text-right font-semibold font-mono text-slate-900">
                              <Taka value={pay.total} />
                            </td>
                            <td className={`p-2.5 text-right font-bold font-mono ${itemProfit >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                              <Taka value={itemProfit} />
                            </td>
                            <td className="p-2.5 text-right text-emerald-700 font-medium font-mono">
                              <Taka value={pay.paid} />
                            </td>
                            <td className="p-2.5 text-right text-amber-700 font-medium font-mono">
                              <Taka value={pay.due} />
                            </td>
                            <td className="p-2.5 text-center">
                              <span
                                className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                  pay.status === "Paid"
                                    ? "bg-emerald-100 text-emerald-800"
                                    : pay.status === "Partial"
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-rose-100 text-rose-800"
                                }`}
                              >
                                {pay.status.toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
              {report.transactions.length > 50 && (
                <p className="text-[10px] text-slate-400 italic text-right">
                  Showing first 50 of {report.transactions.length} transactions. Complete table available in application.
                </p>
              )}
            </section>

            {/* 9. Executive Sign-Off & Verification Stamp */}
            <section className="pt-6 border-t-2 border-slate-200 space-y-6">
              <div className="grid grid-cols-3 gap-6 text-center text-xs text-slate-600">
                <div className="space-y-4">
                  <div className="border-b border-dashed border-slate-300 pb-8" />
                  <div>
                    <p className="font-bold text-slate-800">Prepared By</p>
                    <p className="text-[10px] text-slate-400">Accounts Officer</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-dashed border-slate-300 pb-8" />
                  <div>
                    <p className="font-bold text-slate-800">Verified By</p>
                    <p className="text-[10px] text-slate-400">Store Manager</p>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="border-b border-dashed border-slate-300 pb-8" />
                  <div>
                    <p className="font-bold text-slate-800">Approved & Certified</p>
                    <p className="text-[10px] text-slate-400">Proprietor / Partner</p>
                  </div>
                </div>
              </div>
            </section>

            {/* Official Footer */}
            <div className="border-t border-slate-200 pt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] text-slate-400">
              <span>Faridpur Mobile Mart Management System · Encrypted Ledger</span>
              <span>Generated on {formattedGenerated} · Confidential Business Record</span>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
