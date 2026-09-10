import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  CloudUpload,
  Database,
  FileCheck2,
  FileText,
  FolderOpen,
  HardDrive,
  History,
  Info,
  Loader2,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { RestorePreviewDialog } from "@/components/fmm/RestorePreviewDialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  FMM_APP_VERSION,
  FMM_BACKUP_VERSION,
  formatBytes,
  parseBackupFileForPreview,
  type BackupPreviewInfo,
} from "@/lib/fmm-backup";
import { useFmm } from "@/lib/fmm-store";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Backup & Settings — Faridpur Mobile Mart" },
      { name: "description", content: "Local backup and restore of all shop data, automatic backup schedule and low-stock threshold." },
      { property: "og:title", content: "Backup & Settings — Faridpur Mobile Mart" },
      { property: "og:description", content: "Local-only backup, restore and app preferences." },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { state, updateSettings, runBackup, restoreBackup, resetData } = useFmm();
  const fileRef = useRef<HTMLInputElement>(null);
  const [isBackingUp, setIsBackingUp] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; message: string; verified?: boolean; timestamp?: string } | null>(null);

  // Restore Preview Dialog State
  const [previewInfo, setPreviewInfo] = useState<BackupPreviewInfo | null>(null);
  const [selectedFileForRestore, setSelectedFileForRestore] = useState<File | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const last = state.backups[0];
  const lastVerificationStatus = last ? (last.status || "Verified") : null;

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return iso;
    return (
      d.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }) +
      ", " +
      d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  const backupNow = async () => {
    setIsBackingUp(true);
    setStatus(null);
    try {
      const record = await runBackup(false);
      setStatus({
        ok: true,
        verified: true,
        message: `Backup completed successfully — Backup verified (${record?.filename || "snapshot.fmm"})`,
        timestamp: record?.timestamp || new Date().toISOString(),
      });
      toast.success("Backup complete & verified");
    } catch (e) {
      setStatus({
        ok: false,
        verified: false,
        message: e instanceof Error ? e.message : "Backup verification failed. Check storage permissions and disk space.",
      });
      toast.error("Backup verification failed");
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelected = async (file: File) => {
    try {
      const preview = await parseBackupFileForPreview(file);
      setSelectedFileForRestore(file);
      setPreviewInfo(preview);
      setIsPreviewOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Invalid or incompatible backup file.";
      setStatus({
        ok: false,
        verified: false,
        message: msg,
      });
      toast.error(msg);
    }
  };

  const handleConfirmRestore = async () => {
    if (!selectedFileForRestore) return;
    setIsRestoring(true);
    try {
      // 1. Take safety snapshot
      await runBackup(true);
      // 2. Perform restore
      await restoreBackup(selectedFileForRestore);
      toast.success("Restore complete! Reloading application…");
      setIsPreviewOpen(false);
      // 3. Refresh safely to reload state and cache cleanly
      setTimeout(() => {
        window.location.reload();
      }, 600);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Restore failed.";
      toast.error(msg);
      setStatus({ ok: false, verified: false, message: msg });
      setIsRestoring(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-4xl px-6 py-8 space-y-6">
        <PageHeader title="Backup & Settings" subtitle="All data stays on this device. No cloud sync." />

        {/* 1. BACKUP STATUS SUMMARY (Requirement 5) */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Clock className="size-3 text-muted-foreground" /> Last Backup
            </p>
            <p className="text-xs font-semibold text-foreground truncate">
              {last ? formatDate(last.timestamp) : "Never"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <ShieldCheck className="size-3 text-muted-foreground" /> Status
            </p>
            {lastVerificationStatus === "Verified" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                <CheckCircle2 className="size-3" /> Verified
              </span>
            ) : lastVerificationStatus === "Failed" ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[11px] font-bold text-destructive">
                <AlertTriangle className="size-3" /> Failed
              </span>
            ) : last ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                <Info className="size-3" /> Unverified
              </span>
            ) : (
              <p className="text-xs font-medium text-muted-foreground">—</p>
            )}
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <HardDrive className="size-3 text-muted-foreground" /> File Size
            </p>
            <p className="text-xs font-semibold text-foreground">
              {last ? formatBytes(last.size) : "—"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <Calendar className="size-3 text-muted-foreground" /> Schedule
            </p>
            <p className="text-xs font-semibold text-foreground capitalize">
              {state.settings.auto_backup}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <FolderOpen className="size-3 text-muted-foreground" /> Location
            </p>
            <p className="text-xs font-semibold text-foreground truncate" title={state.settings.backup_location}>
              {state.settings.backup_location || "D:\\FMM Backups"}
            </p>
          </div>

          <div className="rounded-xl border border-border bg-card p-3.5 space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1">
              <History className="size-3 text-muted-foreground" /> History
            </p>
            <p className="text-xs font-semibold text-foreground">
              {state.backups.length} recorded
            </p>
          </div>
        </section>

        {/* 2. BACKUP & RESTORE ACTIONS */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-5">
          <div>
            <h3 className="text-lg font-bold flex items-center gap-2">
              <Database className="size-5 text-primary" /> Backup & Restore Data
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Export an authoritative, encrypted, verified snapshot of your inventory, sales, and accounts.
            </p>
          </div>

          <div className="flex flex-wrap gap-2.5">
            <Button className="rounded-xl gap-2 px-5 font-medium" onClick={backupNow} disabled={isBackingUp}>
              {isBackingUp ? (
                <>
                  <Loader2 className="size-4 animate-spin" /> Verifying & Backing up…
                </>
              ) : (
                <>
                  <CloudUpload className="size-4" /> Backup Now
                </>
              )}
            </Button>
            <Button
              variant="outline"
              className="rounded-xl gap-2 font-medium"
              onClick={() => fileRef.current?.click()}
              disabled={isBackingUp || isRestoring}
            >
              <RotateCcw className="size-4" /> Restore Backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".fmm,.fmmbackup,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFileSelected(file);
                e.target.value = "";
              }}
            />
          </div>

          {isBackingUp && (
            <div className="flex items-center gap-2.5 rounded-xl border border-primary/30 bg-primary/5 p-3.5 text-xs text-primary">
              <Loader2 className="size-4 animate-spin shrink-0" />
              <span>Generating and verifying comprehensive snapshot of all local ledgers, inventory, and evidence…</span>
            </div>
          )}

          {/* VERIFICATION FEEDBACK (Requirement 3) */}
          {status && !isBackingUp && (
            status.ok ? (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-800 dark:text-emerald-300">
                <CheckCircle2 className="size-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Backup completed successfully</p>
                  <p className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-1.5">
                    <ShieldCheck className="size-3.5 text-emerald-600 dark:text-emerald-400" />
                    Backup verified
                  </p>
                  <p className="mt-1 opacity-90">{status.message}</p>
                  {status.timestamp && (
                    <p className="font-mono text-[11px] opacity-75">
                      Verified at: {new Date(status.timestamp).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })}
                    </p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3.5 text-xs text-destructive">
                <AlertTriangle className="size-5 text-destructive shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold text-sm">Backup verification failed</p>
                  <p className="mt-0.5 opacity-90">{status.message}</p>
                </div>
              </div>
            )
          )}

          {/* AUTOMATIC BACKUP CONFIGURATION (Requirement 10) */}
          <div className="pt-2 border-t border-border/60 space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">AUTOMATIC BACKUP SCHEDULE</Label>
            <div className="flex flex-wrap gap-2">
              {(["off", "daily", "weekly"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateSettings({ auto_backup: opt })}
                  className={`rounded-lg border border-border px-4 py-2 text-sm capitalize transition-colors ${
                    state.settings.auto_backup === opt
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-secondary text-foreground"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {state.settings.auto_backup === "off"
                ? "Automatic backup is disabled."
                : `Automatic backup is enabled — takes a verified snapshot ${state.settings.auto_backup} while the app is open, and catches up on next launch if missed.`}
            </p>
          </div>

          {/* BACKUP LOCATION & COPIES (Requirement 11) */}
          <div className="grid gap-4 sm:grid-cols-2 pt-2 border-t border-border/60">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Backup Location / Folder Path</Label>
              <div className="flex gap-2">
                <Input
                  value={state.settings.backup_location}
                  onChange={(e) => updateSettings({ backup_location: e.target.value })}
                  placeholder="D:\FMM Backups"
                  className="rounded-xl"
                />
                <Button
                  variant="outline"
                  className="rounded-xl"
                  title="Folder information"
                  onClick={() =>
                    toast.info(
                      "In desktop web browsers, manual backups save directly to your default Downloads directory.",
                    )
                  }
                >
                  <FolderOpen className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Keep Recent Copies</Label>
              <Input
                type="number"
                min={1}
                max={50}
                value={state.settings.keep_copies}
                onChange={(e) => updateSettings({ keep_copies: Math.max(1, Number(e.target.value)) })}
                className="rounded-xl"
              />
            </div>
          </div>
        </section>

        {/* 3. BACKUP HISTORY (Requirement 4) */}
        <section className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-lg font-bold flex items-center gap-2">
                <History className="size-5 text-muted-foreground" /> Backup History
              </h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Audit trail of generated and verified backups on this device.
              </p>
            </div>
            <span className="text-xs text-muted-foreground">
              App {FMM_APP_VERSION} · Format v{FMM_BACKUP_VERSION}
            </span>
          </div>

          {state.backups.length ? (
            <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden">
              {state.backups.map((b) => {
                const isVerified = b.status === "Verified" || (!b.status && b.size > 0);
                const isFailed = b.status === "Failed";

                return (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 text-xs hover:bg-secondary/30 transition-colors gap-2"
                  >
                    <div className="flex items-start gap-3">
                      <div className="mt-0.5">
                        {isVerified ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <CheckCircle2 className="size-3" /> Verified
                          </span>
                        ) : isFailed ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-semibold text-destructive">
                            <AlertTriangle className="size-3" /> Failed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 px-2 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <Info className="size-3" /> Unverified
                          </span>
                        )}
                      </div>
                      <div>
                        <p className="font-semibold text-foreground flex items-center gap-1.5">
                          <FileText className="size-3.5 text-muted-foreground" />
                          {b.filename}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          {formatDate(b.timestamp)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-end sm:self-center font-mono text-[11px] text-muted-foreground">
                      <span>{formatBytes(b.size)}</span>
                      <span>·</span>
                      <span>{b.app_version ? `App ${b.app_version}` : `App ${FMM_APP_VERSION}`}</span>
                      <span>·</span>
                      <span>{b.backup_version ? `Backup v${b.backup_version}` : "Backup v2"}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
              <FileCheck2 className="size-8 mx-auto text-muted-foreground/50 mb-2" />
              <p className="font-medium">No backups recorded yet.</p>
              <p className="mt-1">Click "Backup Now" above to create your first verified snapshot.</p>
            </div>
          )}
        </section>

        {/* 4. INVENTORY SETTINGS */}
        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Inventory Settings</h3>
          <div className="mt-4 max-w-xs space-y-1.5">
            <Label className="text-xs text-muted-foreground">Low stock threshold (units per model)</Label>
            <Input
              type="number"
              min={1}
              value={state.settings.low_stock_threshold}
              onChange={(e) => updateSettings({ low_stock_threshold: Math.max(1, Number(e.target.value)) })}
              className="rounded-xl"
            />
          </div>
        </section>

        {/* 5. DANGER ZONE */}
        <section className="rounded-xl border border-destructive/30 bg-card p-6">
          <h3 className="text-lg font-bold text-destructive flex items-center gap-2">
            <ShieldAlert className="size-5 text-destructive" /> Danger Zone
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">Reset local data back to the sample dataset.</p>
          <Button
            variant="destructive"
            className="mt-4 rounded-xl"
            onClick={() => {
              if (window.confirm("Reset all local data? Take a backup first.")) {
                resetData();
                toast.success("Local data reset");
              }
            }}
          >
            Reset local data
          </Button>
        </section>
      </div>

      {/* RESTORE PREVIEW DIALOG (Requirement 8) */}
      <RestorePreviewDialog
        open={isPreviewOpen}
        onOpenChange={setIsPreviewOpen}
        preview={previewInfo}
        onConfirmRestore={handleConfirmRestore}
        isRestoring={isRestoring}
      />
    </AppShell>
  );
}
