import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AuditEntityLink } from "@/components/fmm/AuditEntityLink";
import { SaleDetailDialog } from "@/components/fmm/SaleDetailDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";
import type { Transaction } from "@/lib/fmm-types";

export const Route = createFileRoute("/audit")({
  head: () => ({
    meta: [
      { title: "Audit Log — Faridpur Mobile Mart" },
      { name: "description", content: "Chronological record of every stock, sale, payment and backup action in the shop." },
      { property: "og:title", content: "Audit Log — Faridpur Mobile Mart" },
      { property: "og:description", content: "Filterable history of all shop activity." },
    ],
  }),
  component: AuditPage,
});

function AuditPage() {
  const { state } = useFmm();
  const [action, setAction] = useState("All");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);

  const actions = ["All", ...new Set(state.audit_log.map((a) => a.action))];
  const rows = state.audit_log.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    if (action !== "All" && a.action !== action) return false;
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 86400000) return false;
    return true;
  });

  // Reset page when filters or page size change
  useEffect(() => {
    setPage(1);
  }, [action, from, to, pageSize]);

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize);

  const handleTransactionOpen = (txId: string) => {
    const tx = state.transactions?.find((t) => t.id === txId);
    if (tx) setSelectedTx(tx);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Audit Log"
          subtitle="Every recorded action, in chronological order."
          actions={
            <>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-sm"
              >
                {actions.map((a) => (
                  <option key={a} value={a}>
                    {a === "All" ? "All actions" : a}
                  </option>
                ))}
              </select>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[150px] rounded-xl" />
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[150px] rounded-xl" />
            </>
          }
        />

        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[700px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                {["Timestamp", "Action", "Entity", "Details", "Amount"].map((h) => (
                  <th key={h} className={`px-5 py-3 font-medium ${h === "Amount" ? "text-right" : ""}`}>
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedRows.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-4 whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.action} />
                  </td>
                  <td className="px-5 py-4 text-sm font-medium">
                    <AuditEntityLink
                      entry={a}
                      onTransactionOpen={handleTransactionOpen}
                      className="text-xs"
                    />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{a.details}</td>
                  <td className="px-5 py-4 text-right font-medium">{a.amount === null ? "—" : <Taka value={a.amount} />}</td>
                </tr>
              ))}
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-10 text-center text-muted-foreground">
                    No entries for this filter.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {rows.length > 0 && (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
            <div className="flex items-center gap-2">
              <span>
                Showing {Math.min((page - 1) * pageSize + 1, rows.length)}–{Math.min(page * pageSize, rows.length)} of {rows.length} entries
              </span>
              <span className="text-muted-foreground/40">|</span>
              <label className="flex items-center gap-1.5">
                <span>Per page:</span>
                <select
                  value={pageSize}
                  onChange={(e) => setPageSize(Number(e.target.value))}
                  className="rounded-lg border border-border bg-card px-2 py-1 text-xs"
                >
                  <option value={20}>20</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </label>
            </div>

            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <div className="px-2 font-medium">
                Page {page} of {totalPages}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="h-8 rounded-lg text-xs"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      <SaleDetailDialog transaction={selectedTx} onClose={() => setSelectedTx(null)} />
    </AppShell>
  );
}

