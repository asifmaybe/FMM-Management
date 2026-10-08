import { useRef, useState } from "react";
import { Download, Printer, Smartphone, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { jsPDF } from "jspdf";
import { toPng } from "html-to-image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { useFmm } from "@/lib/fmm-store";
import { buildPhoneHistory } from "@/lib/fmm-phone-history";
import { TakaSign } from "@/components/fmm/Taka";

interface PhoneHistoryPdfDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneId: string;
}

export function PhoneHistoryPdfDialog({ open, onOpenChange, phoneId }: PhoneHistoryPdfDialogProps) {
  const { state } = useFmm();
  const [isSaving, setIsSaving] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  const summary = buildPhoneHistory(state, phoneId);
  if (!summary) return null;
  const { phone, primaryImei, secondaryImei, currentStatus, currentHolder, passThroughCount, totalDaysInStock, totalProfit, events } = summary;

  const handleDownloadPdf = async () => {
    if (!printRef.current) return;
    setIsSaving(true);
    const el = printRef.current;
    const fname = `${phone.brand}_${phone.model}_IMEI_${primaryImei}_History_Passport.pdf`;

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
          toast.success("Passport PDF saved!", { description: `Saved as "${fname}"` });
          setIsSaving(false);
          return;
        } catch (e: any) {
          if (e?.name === "AbortError") {
            setIsSaving(false);
            return;
          }
        }
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fname;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Passport PDF downloaded!");
    } catch (err: any) {
      toast.error("Failed to generate PDF: " + err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[92vh] overflow-y-auto p-0 rounded-2xl bg-card border-border flex flex-col">
        {/* Header toolbar */}
        <div className="flex items-center justify-between border-b border-border px-6 py-3.5 bg-card sticky top-0 z-10">
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Smartphone className="size-4 text-primary" />
            <span>Device Passport &amp; Lifetime History</span>
          </DialogTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="rounded-xl gap-1.5 text-xs font-semibold"
              onClick={handlePrint}
            >
              <Printer className="size-3.5" /> Print
            </Button>
            <Button
              size="sm"
              className="rounded-xl gap-1.5 text-xs font-semibold bg-primary text-primary-foreground hover:bg-primary/90"
              onClick={handleDownloadPdf}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="size-3.5 animate-spin" /> : <Download className="size-3.5" />}
              {isSaving ? "Generating..." : "Download PDF"}
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 rounded-xl"
              onClick={() => onOpenChange(false)}
            >
              <X className="size-4" />
            </Button>
          </div>
        </div>

        {/* Printable Document Container */}
        <div className="p-6 overflow-x-auto flex justify-center bg-secondary/15">
          <div
            ref={printRef}
            className="w-[794px] min-h-[1123px] bg-white text-zinc-900 p-10 rounded shadow-md text-xs font-sans print:shadow-none print:w-full print:m-0 print:p-8"
            style={{ boxSizing: "border-box" }}
          >
            {/* Store Letterhead */}
            <div className="border-b-2 border-zinc-900 pb-4 mb-6 flex justify-between items-start">
              <div>
                <h1 className="text-2xl font-black tracking-tight text-zinc-950 uppercase">Faridpur Mobile Mart</h1>
                <p className="text-[11px] font-semibold text-zinc-700 tracking-wide mt-0.5">
                  Premium Pre-Owned &amp; New Smartphones &middot; Certified Quality
                </p>
                <p className="text-[10px] text-zinc-500 mt-0.5">
                  Mujib Sarak, Faridpur &middot; Hotline: 01700-000000
                </p>
              </div>
              <div className="text-right">
                <span className="inline-block bg-zinc-900 text-white font-bold text-[10px] uppercase tracking-widest px-2.5 py-1 rounded">
                  Official IMEI Passport
                </span>
                <p className="text-[10px] text-zinc-500 mt-1">Generated: {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}</p>
              </div>
            </div>

            {/* Device Identity Header */}
            <div className="bg-zinc-50 border border-zinc-200 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center border-b border-zinc-200 pb-3 mb-3">
                <div>
                  <h2 className="text-lg font-bold text-zinc-950">
                    {phone.brand} {phone.model}
                  </h2>
                  <p className="text-[11px] text-zinc-600 font-medium">
                    {phone.storage_ram || "Standard"} &middot; Condition: {phone.condition} {phone.with_box ? "&middot; With Original Box" : ""}
                  </p>
                </div>
                <div className="text-right">
                  <span className="inline-block border border-zinc-800 text-zinc-900 font-bold px-2.5 py-0.5 rounded text-[11px]">
                    Status: {currentStatus}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-4 gap-4 text-[11px]">
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-semibold">Primary IMEI</span>
                  <span className="font-mono font-bold text-zinc-900 text-xs tracking-wider">{primaryImei}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-semibold">Secondary IMEI</span>
                  <span className="font-mono text-zinc-800">{secondaryImei || "—"}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-semibold">Current Holder</span>
                  <span className="font-semibold text-zinc-900">{currentHolder}</span>
                </div>
                <div>
                  <span className="block text-zinc-500 text-[10px] uppercase font-semibold">Shop Pass-throughs</span>
                  <span className="font-bold text-zinc-900">{passThroughCount} Cycle{passThroughCount > 1 ? "s" : ""} ({totalDaysInStock} days in shop)</span>
                </div>
              </div>
            </div>

            {/* Timeline Section */}
            <div className="mb-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-900 border-b border-zinc-300 pb-1.5 mb-3">
                Complete Chronological Lifecycle ({events.length} Recorded Events)
              </h3>

              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-200 text-[10px] uppercase tracking-wider text-zinc-500">
                    <th className="py-2 pr-3 w-28">Date</th>
                    <th className="py-2 pr-3 w-32">Event Type</th>
                    <th className="py-2 pr-3">Activity &amp; Details</th>
                    <th className="py-2 text-right w-24">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100">
                  {events.map((ev, idx) => (
                    <tr key={ev.id || idx} className="hover:bg-zinc-50/50">
                      <td className="py-2.5 pr-3 text-zinc-600 font-mono text-[10px] align-top whitespace-nowrap">
                        {new Date(ev.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <span className="inline-block bg-zinc-100 text-zinc-800 font-semibold px-2 py-0.5 rounded text-[10px]">
                          {ev.badge || ev.type}
                        </span>
                      </td>
                      <td className="py-2.5 pr-3 align-top">
                        <p className="font-bold text-zinc-900 text-[11px]">{ev.title}</p>
                        <p className="text-zinc-600 text-[10px] mt-0.5 leading-normal">{ev.details}</p>
                      </td>
                      <td className="py-2.5 text-right font-mono font-semibold text-zinc-900 align-top whitespace-nowrap">
                        {ev.amount != null ? `${ev.amount.toLocaleString()} ৳` : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Verification & Legal Footer */}
            <div className="border-t border-zinc-200 pt-6 mt-10 flex justify-between items-end text-[10px] text-zinc-500">
              <div>
                <p className="font-semibold text-zinc-700">Faridpur Mobile Mart Authentication</p>
                <p>This record represents the verified immutable history logged for IMEI {primaryImei}.</p>
                <p>For warranty dispute settlement or proof of ownership verification.</p>
              </div>
              <div className="text-center w-48 border-t border-zinc-400 pt-1">
                <p className="font-semibold text-zinc-800">Authorized Signature &amp; Seal</p>
                <p className="text-zinc-400 text-[9px]">Faridpur Mobile Mart</p>
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
