import { AlertTriangle, CheckCircle2, Clock, Database, FileText, Info, Loader2, RotateCcw, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { BackupPreviewInfo } from "@/lib/fmm-backup";

interface RestorePreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preview: BackupPreviewInfo | null;
  onConfirmRestore: () => Promise<void>;
  isRestoring: boolean;
}

export function RestorePreviewDialog({
  open,
  onOpenChange,
  preview,
  onConfirmRestore,
  isRestoring,
}: RestorePreviewDialogProps) {
  if (!preview) return null;

  const { counts } = preview;
  const backupDate = new Date(preview.createdAt);
  const formattedDate = isNaN(backupDate.getTime())
    ? preview.createdAt
    : backupDate.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      backupDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const recordStats = [
    { label: "Phones", count: counts.phones, color: "text-blue-500" },
    { label: "Accessories", count: counts.accessories, color: "text-indigo-500" },
    { label: "Customers", count: counts.customers, color: "text-emerald-500" },
    { label: "Suppliers", count: counts.suppliers, color: "text-cyan-500" },
    { label: "Transactions", count: counts.transactions, color: "text-violet-500" },
    { label: "Purchases", count: counts.purchases, color: "text-amber-500" },
    { label: "Expenses", count: counts.expenses, color: "text-rose-500" },
    { label: "Campaigns", count: counts.campaigns, color: "text-pink-500" },
    { label: "Warranty Claims", count: counts.warranty_claims, color: "text-orange-500" },
    { label: "Returns", count: counts.returns, color: "text-red-500" },
    { label: "Exchanges", count: counts.exchanges, color: "text-teal-500" },
  ];

  return (
    <Dialog open={open} onOpenChange={(v) => !isRestoring && onOpenChange(v)}>
      <DialogContent className="max-w-2xl rounded-2xl p-6">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-9 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Database className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-xl">Restore Backup Preview</DialogTitle>
              <DialogDescription className="text-xs">
                Inspect backup structure and record counts before replacing local data.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {/* Metadata Summary Banner */}
        <div className="rounded-xl border border-border bg-secondary/40 p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <FileText className="size-4 text-muted-foreground" />
              <span className="font-mono text-xs font-semibold text-foreground">{preview.filename}</span>
            </div>
            <div className="flex items-center gap-2">
              {preview.isLegacy ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2.5 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                  <Info className="size-3" /> Legacy Backup
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2.5 py-0.5 text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                  <ShieldCheck className="size-3" /> Format Verified
                </span>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 text-xs">
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Backup Created</p>
              <p className="font-medium text-foreground mt-0.5 flex items-center gap-1">
                <Clock className="size-3 text-muted-foreground" />
                {formattedDate}
              </p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">File Size</p>
              <p className="font-medium text-foreground mt-0.5">{preview.formattedSize}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">App Version</p>
              <p className="font-medium text-foreground mt-0.5">{preview.appVersion}</p>
            </div>
            <div>
              <p className="text-[10px] text-muted-foreground uppercase font-medium">Backup Schema</p>
              <p className="font-medium text-foreground mt-0.5">v{preview.backupVersion}</p>
            </div>
          </div>
        </div>

        {/* Record Counts Grid */}
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Records in this Backup
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {recordStats.map((stat) => (
              <div
                key={stat.label}
                className="rounded-xl border border-border bg-card p-2.5 transition-colors"
              >
                <p className="text-[11px] text-muted-foreground">{stat.label}</p>
                <p className={`text-base font-bold ${stat.color} mt-0.5`}>
                  {stat.count.toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        </div>

        {/* Caution Warning */}
        <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
          <AlertTriangle className="size-5 shrink-0 mt-0.5 text-destructive" />
          <div className="space-y-1">
            <p className="font-bold text-sm">Action cannot be undone without backup</p>
            <p className="text-xs leading-relaxed opacity-90">
              Restoring this backup will replace the current application data with the selected backup.
              An automatic safety snapshot of your current state will be created first.
            </p>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0 mt-2">
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => onOpenChange(false)}
            disabled={isRestoring}
          >
            Cancel
          </Button>
          <Button
            variant="destructive"
            className="rounded-xl gap-2 font-medium"
            onClick={onConfirmRestore}
            disabled={isRestoring}
          >
            {isRestoring ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Restoring Data…
              </>
            ) : (
              <>
                <RotateCcw className="size-4" />
                Confirm & Restore
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
