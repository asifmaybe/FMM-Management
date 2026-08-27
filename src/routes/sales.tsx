import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, Plus, TrendingUp } from "lucide-react";
import { useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { NewSaleDialog } from "@/components/fmm/NewSaleDialog";
import { Button } from "@/components/ui/button";
import { useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export const Route = createFileRoute("/sales")({
  head: () => ({
    meta: [
      { title: "Transactions — Faridpur Mobile Mart" },
      { name: "description", content: "Record sales and exchanges, track paid and pending payments, and collect outstanding balances." },
      { property: "og:title", content: "Transactions — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage sales and exchange records." },
    ],
  }),
  component: SalesPage,
});

function SalesPage() {
  const { state, collectPayment } = useFmm();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState("All");

  const rows = state.transactions.filter((t) => filter === "All" || t.type === filter || t.payment_status === filter);
  const pending = state.transactions.filter((t) => t.payment_status === "Pending").sort((a, b) => b.amount - a.amount);
  const outstanding = pending.reduce((s, t) => s + t.amount, 0);
  const today = new Date().toDateString();
  const todayTx = state.transactions.filter((t) => new Date(t.date).toDateString() === today);
  const todayTotal = todayTx.reduce((s, t) => s + t.amount, 0);

  const phoneLabel = (id: string) => {
    const p = state.phones.find((x) => x.id === id);
    return p ? { imei: p.imei, model: `${p.brand} ${p.model}` } : { imei: "—", model: "—" };
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Transactions"
          subtitle="Manage sales and exchange records."
          actions={
            <>
              <select
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="h-9 rounded-xl border border-border bg-card px-3 text-sm"
              >
                {["All", "Sale", "Exchange", "Paid", "Pending"].map((f) => (
                  <option key={f} value={f}>
                    {f === "All" ? "All transactions" : f}
                  </option>
                ))}
              </select>
              <Button className="rounded-xl" onClick={() => setOpen(true)}>
                <Plus className="size-4" /> New Sale
              </Button>
            </>
          }
        />

        <div className="grid gap-4 xl:grid-cols-[1.8fr_1fr]">
          <div className="overflow-x-auto rounded-xl border border-border bg-card">
            <table className="w-full min-w-[700px] text-sm">
              <thead className="bg-secondary/60 text-left text-muted-foreground">
                <tr>
                  {["Date", "Type", "IMEI / Model", "Customer", "Amount", "Status"].map((h) => (
                    <th key={h} className="px-5 py-3 font-medium">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((t) => {
                  const p = phoneLabel(t.phone_id);
                  return (
                    <tr key={t.id}>
                      <td className="px-5 py-4 whitespace-nowrap">
                        {new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.type} />
                      </td>
                      <td className="px-5 py-4">
                        <p>{p.imei}</p>
                        <p className="text-muted-foreground">{p.model}</p>
                      </td>
                      <td className="px-5 py-4">
                        <p>{t.customer_name}</p>
                        <p className="text-muted-foreground">{t.customer_phone}</p>
                      </td>
                      <td className="px-5 py-4 font-medium whitespace-nowrap">{<Taka value={t.amount} />}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.payment_status === "Pending" ? "Payment Pending" : "Paid"} />
                      </td>
                    </tr>
                  );
                })}
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                      No transactions yet.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card">
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="size-4 text-destructive" />
                  <h3 className="text-lg font-bold">Outstanding Balances</h3>
                </div>
                <span className="rounded-lg bg-danger-soft px-2.5 py-1 text-xs font-semibold text-destructive">
                  Total: {<Taka value={outstanding} />}
                </span>
              </div>
              <div className="divide-y divide-border">
                {pending.map((t) => {
                  const p = phoneLabel(t.phone_id);
                  return (
                    <div key={t.id} className="flex items-start justify-between gap-3 px-5 py-4">
                      <div>
                        <p className="font-semibold">{t.customer_name}</p>
                        <p className="text-xs text-muted-foreground">
                          {p.model} ({t.type})
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-destructive">{<Taka value={t.amount} />}</p>
                        <button onClick={() => collectPayment(t.id)} className="text-xs underline hover:no-underline">
                          Collect
                        </button>
                      </div>
                    </div>
                  );
                })}
                {pending.length === 0 ? (
                  <p className="px-5 py-6 text-sm text-muted-foreground">No pending payments.</p>
                ) : null}
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground">TODAY'S SALES</p>
                  <p className="mt-1 text-2xl font-bold">{<Taka value={todayTotal} />}</p>
                  <p className="mt-1 flex items-center gap-1 text-xs text-success">
                    <TrendingUp className="size-3.5" /> live total
                  </p>
                </div>
                <div>
                  <p className="text-xs font-semibold tracking-wide text-muted-foreground">DEVICES SOLD</p>
                  <p className="mt-1 text-2xl font-bold">{todayTx.length}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <NewSaleDialog open={open} onOpenChange={setOpen} />
    </AppShell>
  );
}
