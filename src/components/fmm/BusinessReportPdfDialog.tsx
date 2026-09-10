import { useState } from "react";
import { Download, Loader2, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { ComprehensiveBusinessReport } from "@/lib/fmm-reports";
import { getTransactionPayment } from "@/lib/fmm-store";
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
      margin: 12mm 12mm 14mm 12mm;
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
      // html-to-image uses native browser SVG foreignObject rendering,
      // which correctly handles oklch colors and Tailwind v4 CSS variables
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

      // Use File System Access API if available (opens native "Save As" dialog)
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
          // User cancelled the file picker — not an error
          if (pickerErr instanceof Error && pickerErr.name === "AbortError") return;
          throw pickerErr;
        }
      } else {
        // Fallback for browsers without File System Access API
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

  const { executive, sales, profit, cashFlow, customerDue, suppliers, purchases, expenses, inventory, exchanges, returns, warranty, dailyClosing } = report;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl print:m-0 print:p-0 print:max-w-none print:max-h-none print:shadow-none print:border-0">
        {/* Modal Controls Bar (Hidden in Print) */}
        <div className="sticky top-0 z-20 flex items-center justify-between border-b border-border bg-card/95 px-6 py-3.5 backdrop-blur print:hidden">
          <div>
            <DialogTitle className="text-base font-bold">Business Report Preview</DialogTitle>
            <p className="text-xs text-muted-foreground">{report.range.label}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              className="rounded-xl gap-2 font-semibold hover:bg-slate-100 dark:hover:bg-slate-800"
              onClick={handleSavePdf}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-4 animate-spin" /> : <Download className="size-4" />}
              {isSaving ? "Saving..." : "Save as PDF"}
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-2 bg-primary text-primary-foreground font-semibold shadow-sm"
              onClick={handlePrint}
            >
              <Printer className="size-4" /> Print
            </Button>
            <Button size="sm" variant="outline" className="rounded-xl size-9 p-0" onClick={() => onOpenChange(false)}>
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div id="fmm-printable-report" className="p-8 sm:p-10 bg-white text-slate-900 space-y-8 font-sans print:p-0 print:space-y-6">
          {/* Header */}
          <div className="border-b-2 border-slate-900 pb-5 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-slate-500">Faridpur Mobile Mart</p>
              <h1 className="text-2xl font-black tracking-tight text-slate-900 mt-0.5">Executive Business Report</h1>
              <p className="text-xs text-slate-600 mt-1">
                Authoritative business performance, revenue, profit, cash flow and inventory ledger.
              </p>
            </div>
            <div className="text-right text-xs text-slate-600">
              <p><strong className="text-slate-900">Period:</strong> {report.range.label}</p>
              <p className="mt-0.5"><strong className="text-slate-900">Generated:</strong> {new Date(report.generatedAt).toLocaleString("en-GB")}</p>
              <p className="mt-0.5 text-[10px] text-slate-400">System Source of Truth · Confidential</p>
            </div>
          </div>

          {/* 1. Executive Summary KPIs */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              1. Executive Financial Summary
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-slate-500">Sales Revenue</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5"><Taka value={executive.totalSalesRevenue} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Net realized billings</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Cash Inflow</p>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5"><Taka value={executive.cashInflow} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Collected on sales</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-amber-700">Customer Due</p>
                <p className="text-base font-extrabold text-amber-700 mt-0.5"><Taka value={executive.customerOutstanding} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Receivable in period</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-rose-700">Supplier Due</p>
                <p className="text-base font-extrabold text-rose-700 mt-0.5"><Taka value={executive.supplierOutstanding} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Invoice payables</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Purchases</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5"><Taka value={executive.totalPurchases} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Procurement volume</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-slate-500">Operating Expenses</p>
                <p className="text-base font-extrabold text-slate-900 mt-0.5"><Taka value={executive.totalExpenses} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Shop rent & overhead</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-emerald-700">Gross Profit</p>
                <p className="text-base font-extrabold text-emerald-700 mt-0.5"><Taka value={executive.grossProfit} /></p>
                <p className="text-[10px] text-slate-500 mt-0.5">Margin: {profit.grossMarginPercent.toFixed(1)}%</p>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50">
                <p className="text-[10px] uppercase font-bold text-blue-700">Net Business Profit</p>
                <p className={`text-base font-extrabold mt-0.5 ${executive.netProfit >= 0 ? "text-blue-700" : "text-rose-700"}`}>
                  <Taka value={executive.netProfit} />
                </p>
                <p className="text-[10px] text-slate-500 mt-0.5">Margin: {profit.netMarginPercent.toFixed(1)}%</p>
              </div>
            </div>
          </section>

          {/* 2. Profit & Loss Statement */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              2. Profit & Loss Statement (Accrual Method)
            </h2>
            <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
              <tbody className="divide-y divide-slate-200">
                <tr className="bg-slate-50 font-bold">
                  <td className="px-4 py-2 text-slate-800">Sales Revenue (Gross Billings)</td>
                  <td className="px-4 py-2 text-right text-slate-900"><Taka value={profit.salesRevenue} /></td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-600 pl-8">Less: Cost of Goods Sold (COGS)</td>
                  <td className="px-4 py-2 text-right text-slate-600 font-medium">− <Taka value={profit.cogs} /></td>
                </tr>
                <tr className="bg-emerald-50/60 font-bold text-emerald-900">
                  <td className="px-4 py-2">Gross Profit (Product Margin)</td>
                  <td className="px-4 py-2 text-right text-emerald-700"><Taka value={profit.grossProfit} /></td>
                </tr>
                <tr>
                  <td className="px-4 py-2 text-slate-600 pl-8">Less: Operating Expenses (Rent, Salary, Utilities, Bills)</td>
                  <td className="px-4 py-2 text-right text-slate-600 font-medium">− <Taka value={profit.operatingExpenses} /></td>
                </tr>
                <tr className="bg-slate-900 text-white font-black text-sm">
                  <td className="px-4 py-2.5">Net Business Profit</td>
                  <td className="px-4 py-2.5 text-right"><Taka value={profit.netProfit} /></td>
                </tr>
              </tbody>
            </table>
          </section>

          {/* 3. Cash Flow Movement */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              3. Cash Flow Statement (Actual Cash Inflows vs Outflows)
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 rounded-lg border border-slate-200 space-y-1.5">
                <p className="font-bold text-emerald-700">Cash Inflows</p>
                <div className="flex justify-between text-slate-600">
                  <span>Customer Sales Collected:</span>
                  <span className="font-medium"><Taka value={cashFlow.breakdown.customerSalePayments} /></span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                  <span>Total Inflow:</span>
                  <span className="text-emerald-700"><Taka value={cashFlow.cashInflow} /></span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 space-y-1.5">
                <p className="font-bold text-rose-700">Cash Outflows</p>
                <div className="flex justify-between text-slate-600">
                  <span>Purchase Payments:</span>
                  <span className="font-medium"><Taka value={cashFlow.breakdown.purchasePayments} /></span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Direct Supplier Paid:</span>
                  <span className="font-medium"><Taka value={cashFlow.breakdown.supplierDirectPayments} /></span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Operating Expenses:</span>
                  <span className="font-medium"><Taka value={cashFlow.breakdown.operatingExpenses} /></span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Customer Buybacks:</span>
                  <span className="font-medium"><Taka value={cashFlow.breakdown.customerIntakes} /></span>
                </div>
                <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-slate-900">
                  <span>Total Outflow:</span>
                  <span className="text-rose-700"><Taka value={cashFlow.cashOutflow} /></span>
                </div>
              </div>

              <div className="p-3 rounded-lg border border-slate-200 bg-slate-50 flex flex-col justify-between">
                <div>
                  <p className="font-bold text-slate-700">Net Cash Movement</p>
                  <p className="text-[11px] text-slate-500 mt-1">Inflow minus Outflow during period</p>
                </div>
                <div className="mt-4 border-t border-slate-200 pt-2">
                  <p className={`text-xl font-black ${cashFlow.netCashMovement >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
                    <Taka value={cashFlow.netCashMovement} />
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* 4. Sales & Orders Breakdown */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              4. Sales & Transaction Activity
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Transactions:</span> <strong className="text-slate-900">{sales.totalTransactions}</strong>
              </div>
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Phone Revenue:</span> <strong className="text-slate-900"><Taka value={sales.phoneRevenue} /></strong>
              </div>
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Accessory Revenue:</span> <strong className="text-slate-900"><Taka value={sales.accessoryRevenue} /></strong>
              </div>
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Exchanges / Trade-ins:</span> <strong className="text-slate-900">{sales.exchangeCount}</strong>
              </div>
            </div>
          </section>

          {/* 5. Customer Outstanding & Aging */}
          <section className="space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-1">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-700">
                5. Customer Due & Aging Analysis
              </h2>
              <span className="text-xs font-bold text-amber-700">
                Total Shop Due: <Taka value={customerDue.totalLifetimeDue} />
              </span>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500">0–30 Days (Fresh)</p>
                <p className="font-bold text-slate-900 mt-0.5"><Taka value={customerDue.aging.days0_30} /></p>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500">31–60 Days</p>
                <p className="font-bold text-slate-900 mt-0.5"><Taka value={customerDue.aging.days31_60} /></p>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500">61–90 Days</p>
                <p className="font-bold text-amber-700 mt-0.5"><Taka value={customerDue.aging.days61_90} /></p>
              </div>
              <div className="p-2 rounded bg-slate-50 border border-slate-200">
                <p className="text-[10px] text-slate-500">90+ Days (Critical)</p>
                <p className="font-bold text-rose-700 mt-0.5"><Taka value={customerDue.aging.days90Plus} /></p>
              </div>
            </div>
          </section>

          {/* 6. Inventory & Low Stock Summary */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              6. Inventory Status & Reorder Alerts
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Available Phones:</span>{" "}
                <strong className="text-slate-900">{inventory.phones.availableUnits} units (<Taka value={inventory.phones.availableCostValue} />)</strong>
              </div>
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Phones Sold in Period:</span>{" "}
                <strong className="text-slate-900">{inventory.phones.soldInPeriodUnits} units</strong>
              </div>
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Accessory Stock:</span>{" "}
                <strong className="text-slate-900">{inventory.accessories.totalUnits} units (<Taka value={inventory.accessories.totalValuation} />)</strong>
              </div>
              <div className="p-2.5 rounded border border-slate-200">
                <span className="text-slate-500">Low / Out of Stock:</span>{" "}
                <strong className="text-rose-700">{inventory.accessories.lowStockCount} items</strong>
              </div>
            </div>
          </section>

          {/* 7. Daily Closing (If applicable) */}
          {dailyClosing && (
            <section className="space-y-2 p-3.5 rounded-lg border border-slate-300 bg-slate-50">
              <h2 className="text-xs font-black uppercase tracking-wider text-slate-800">
                7. Daily Business Register Closing Summary
              </h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                <div><span>Sales Revenue:</span> <strong className="ml-1"><Taka value={dailyClosing.salesRevenue} /></strong></div>
                <div><span>Cash Collected:</span> <strong className="ml-1 text-emerald-700"><Taka value={dailyClosing.cashCollected} /></strong></div>
                <div><span>Purchases Paid:</span> <strong className="ml-1"><Taka value={dailyClosing.purchases} /></strong></div>
                <div><span>Expenses:</span> <strong className="ml-1"><Taka value={dailyClosing.expenses} /></strong></div>
              </div>
            </section>
          )}

          {/* 8. Detailed Transactions Table */}
          <section className="space-y-3">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-700 border-b border-slate-200 pb-1">
              8. Period Transactions ({report.transactions.length} records)
            </h2>
            {report.transactions.length === 0 ? (
              <p className="text-xs text-slate-500 italic">No transactions recorded in this period.</p>
            ) : (
              <table className="w-full text-xs border border-slate-200">
                <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-left">
                  <tr>
                    <th className="p-2">Date</th>
                    <th className="p-2">Customer</th>
                    <th className="p-2">Type</th>
                    <th className="p-2 text-right">Revenue</th>
                    <th className="p-2 text-right">Paid</th>
                    <th className="p-2 text-right">Due</th>
                    <th className="p-2 text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {report.transactions.slice(0, 50).map((t) => {
                    const pay = getTransactionPayment(t);
                    return (
                      <tr key={t.id}>
                        <td className="p-2 font-mono text-[11px]">{new Date(t.date).toLocaleDateString("en-GB")}</td>
                        <td className="p-2 font-medium text-slate-900">{t.customer_name}</td>
                        <td className="p-2 text-slate-600">{t.type}</td>
                        <td className="p-2 text-right font-semibold"><Taka value={pay.total} /></td>
                        <td className="p-2 text-right text-emerald-700 font-medium"><Taka value={pay.paid} /></td>
                        <td className="p-2 text-right text-amber-700 font-medium"><Taka value={pay.due} /></td>
                        <td className="p-2 text-center font-bold">{pay.status}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            {report.transactions.length > 50 && (
              <p className="text-[10px] text-slate-400 italic text-right">
                Showing first 50 of {report.transactions.length} transactions. Complete table available in app.
              </p>
            )}
          </section>

          {/* Footer */}
          <div className="border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400">
            Faridpur Mobile Mart Management Application · Single Source of Truth Reporting
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
