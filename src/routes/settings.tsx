import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, FolderOpen, RotateCcw } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const last = state.backups[0];

  const backupNow = async () => {
    try {
      const record = await runBackup(false);
      setStatus({ ok: true, message: `Backup saved${record ? `: ${record.filename}` : ""}` });
      toast.success("Backup complete");
    } catch {
      setStatus({ ok: false, message: "Backup failed. Check available disk space and folder permissions." });
    }
  };

  const restore = async (file: File) => {
    if (!window.confirm("Restoring replaces all current data on this device. A safety backup is taken first. Continue?")) return;
    try {
      await runBackup(true);
      await restoreBackup(file);
      setStatus({ ok: true, message: `Restored from ${file.name}` });
      toast.success("Restore complete");
    } catch (e) {
      setStatus({ ok: false, message: e instanceof Error ? e.message : "Restore failed." });
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-6 py-8">
        <PageHeader title="Backup & Settings" subtitle="All data stays on this device. No cloud sync." />

        <section className="rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Backup Data</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Last Backup:{" "}
            <span className="font-medium text-foreground">
              {last ? new Date(last.timestamp).toLocaleString() : "Never"}
            </span>
          </p>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button className="rounded-xl" onClick={backupNow}>
              <CloudUpload className="size-4" /> Backup Now
            </Button>
            <Button variant="outline" className="rounded-xl" onClick={() => fileRef.current?.click()}>
              <RotateCcw className="size-4" /> Restore Backup
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept=".fmmbackup,application/json"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void restore(file);
                e.target.value = "";
              }}
            />
          </div>

          {status ? (
            <p className={`mt-3 text-sm ${status.ok ? "text-success" : "text-destructive"}`}>{status.message}</p>
          ) : null}

          <div className="mt-6 space-y-2">
            <Label className="text-xs font-semibold tracking-wide text-muted-foreground">AUTOMATIC BACKUP</Label>
            <div className="flex flex-wrap gap-2">
              {(["off", "daily", "weekly"] as const).map((opt) => (
                <button
                  key={opt}
                  onClick={() => updateSettings({ auto_backup: opt })}
                  className={`rounded-lg border border-border px-4 py-2 text-sm capitalize ${state.settings.auto_backup === opt ? "bg-primary text-primary-foreground" : "hover:bg-secondary"}`}
                >
                  {opt}
                </button>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">
              {state.settings.auto_backup === "off"
                ? "Automatic backup is disabled."
                : `Automatic backup enabled — runs ${state.settings.auto_backup} while the app is open, and catches up on next launch if missed.`}
            </p>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Backup Location</Label>
              <div className="flex gap-2">
                <Input
                  value={state.settings.backup_location}
                  onChange={(e) => updateSettings({ backup_location: e.target.value })}
                  className="rounded-xl"
                />
                <Button
                  variant="outline"
                  className="rounded-xl"
                  onClick={() => toast.info("Backups download to your browser's download folder in the web version.")}
                >
                  <FolderOpen className="size-4" />
                </Button>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Keep recent copies</Label>
              <Input
                type="number"
                min={1}
                value={state.settings.keep_copies}
                onChange={(e) => updateSettings({ keep_copies: Math.max(1, Number(e.target.value)) })}
                className="rounded-xl"
              />
            </div>
          </div>

          {state.backups.length ? (
            <div className="mt-6">
              <p className="text-xs font-semibold tracking-wide text-muted-foreground">RECENT BACKUPS</p>
              <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
                {state.backups.map((b) => (
                  <li key={b.id}>
                    {new Date(b.timestamp).toLocaleString()} — {b.filename} ({Math.round(b.size / 1024)} KB)
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="mt-4 rounded-xl border border-border bg-card p-6">
          <h3 className="text-lg font-bold">Inventory</h3>
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

        <section className="mt-4 rounded-xl border border-destructive/30 bg-card p-6">
          <h3 className="text-lg font-bold text-destructive">Danger zone</h3>
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
    </AppShell>
  );
}
