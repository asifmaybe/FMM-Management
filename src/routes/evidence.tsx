import { createFileRoute } from "@tanstack/react-router";
import { FileText, Plus, Search, ShieldCheck } from "lucide-react";
import { useMemo, useState } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { CustomerIntakeDialog } from "@/components/fmm/CustomerIntakeDialog";
import { PhoneDetailDialog } from "@/components/fmm/PhoneDetailDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useFmm } from "@/lib/fmm-store";
import { Taka, TakaSign } from "@/components/fmm/Taka";

export const Route = createFileRoute("/evidence")({
  head: () => ({
    meta: [
      { title: "Customer Evidence — Faridpur Mobile Mart" },
      { name: "description", content: "All phones bought from customers with identity documents, NID records and purchase details." },
      { property: "og:title", content: "Customer Evidence — Faridpur Mobile Mart" },
      { property: "og:description", content: "Browse used phone purchases with local identity evidence." },
    ],
  }),
  component: EvidencePage,
});

function EvidencePage() {
  const { state } = useFmm();
  const [query, setQuery] = useState("");
  const [detailPhoneId, setDetailPhoneId] = useState<string | null>(null);
  const [intakeOpen, setIntakeOpen] = useState(false);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return state.customer_purchases
      .map((purchase) => ({
        purchase,
        phone: state.phones.find((p) => p.id === purchase.phone_id) ?? null,
      }))
      .filter(({ purchase, phone }) => {
        if (!q) return true;
        return [purchase.customer_name, purchase.customer_phone, purchase.nid_number, phone?.brand, phone?.model, phone?.imei]
          .filter(Boolean)
          .some((v) => String(v).toLowerCase().includes(q));
      });
  }, [state.customer_purchases, state.phones, query]);

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-6 py-8">
        <PageHeader
          title="Customer Evidence"
          subtitle="Every phone bought from a customer, with identity documents and purchase records."
          actions={
            <Button className="rounded-xl" onClick={() => setIntakeOpen(true)}>
              <Plus className="size-4" /> Add Phone
            </Button>
          }
        />

        <div className="relative mb-5 max-w-sm">
          <Search className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search customer, NID, model or IMEI…"
            className="pl-9"
          />
        </div>

        {rows.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-card py-16 text-center">
            <ShieldCheck className="size-8 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              {state.customer_purchases.length === 0
                ? "No customer purchases yet. Use Add Phone to record the first one."
                : "No records match your search."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {rows.map(({ purchase, phone }) => {
              const docs = [purchase.nid_front_image, purchase.nid_back_image, ...purchase.additional_documents].filter(Boolean);
              const damage = phone
                ? Object.entries(phone.damage_checklist)
                    .filter(([, v]) => v)
                    .map(([k]) => k.replace(/_/g, " "))
                : [];
              return (
                <button
                  key={purchase.id}
                  onClick={() => phone && setDetailPhoneId(phone.id)}
                  className="rounded-xl border border-border bg-card p-5 text-left transition-colors hover:bg-secondary/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold">{purchase.customer_name}</p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {purchase.customer_phone || "No phone"} · NID {purchase.nid_number || "—"}
                      </p>
                    </div>
                    {phone ? <StatusBadge status={phone.status} /> : null}
                  </div>

                  {phone ? (
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                      <span className="font-medium">
                        {phone.brand} {phone.model}
                      </span>
                      <span className="text-muted-foreground">{phone.storage_ram || "—"}</span>
                      <span className="text-muted-foreground">{phone.condition}</span>
                    </div>
                  ) : null}

                  <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    <span>IMEI …{phone?.imei.slice(-4) ?? "—"}</span>
                    <span>Bought for {<Taka value={purchase.purchase_price} />}</span>
                    <span>{new Date(purchase.created_at).toLocaleDateString()}</span>
                  </div>

                  {damage.length ? (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {damage.map((d) => (
                        <span key={d} className="rounded-md bg-danger-soft px-2 py-0.5 text-[11px] text-destructive capitalize">
                          {d}
                        </span>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-3 flex items-center gap-2 border-t border-border pt-3">
                    {docs.slice(0, 4).map((f, i) =>
                      f!.data.startsWith("data:image") ? (
                        <img key={i} src={f!.data} alt={f!.name} className="size-10 rounded-md border border-border object-cover" />
                      ) : (
                        <span key={i} className="flex size-10 items-center justify-center rounded-md border border-border bg-secondary">
                          <FileText className="size-4 text-muted-foreground" />
                        </span>
                      ),
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {docs.length} document{docs.length === 1 ? "" : "s"}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <PhoneDetailDialog phoneId={detailPhoneId} onClose={() => setDetailPhoneId(null)} />
      <CustomerIntakeDialog open={intakeOpen} onOpenChange={setIntakeOpen} />
    </AppShell>
  );
}
