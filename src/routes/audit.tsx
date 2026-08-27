import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

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

  const actions = ["All", ...new Set(state.audit_log.map((a) => a.action))];
  const rows = state.audit_log.filter((a) => {
    const t = new Date(a.timestamp).getTime();
    if (action !== "All" && a.action !== action) return false;
    if (from && t < new Date(from).getTime()) return false;
    if (to && t > new Date(to).getTime() + 86400000) return false;
    return true;
  });

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
              {rows.map((a) => (
                <tr key={a.id}>
                  <td className="px-5 py-4 whitespace-nowrap">{new Date(a.timestamp).toLocaleString()}</td>
                  <td className="px-5 py-4">
                    <StatusBadge status={a.action} />
                  </td>
                  <td className="px-5 py-4 text-muted-foreground">{a.entity_type}</td>
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
      </div>
    </AppShell>
  );
}
