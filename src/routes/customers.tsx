import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  Edit2,
  Eye,
  FileText,
  History,
  Info,
  Maximize2,
  Phone,
  Receipt,
  Search,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Users,
  X,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AddCustomerDialog } from "@/components/fmm/AddCustomerDialog";
import { RecordWarrantyDialog } from "@/components/fmm/RecordWarrantyDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { useFmm } from "@/lib/fmm-store";
import { type Customer, type StoredFile, type WarrantyStatus } from "@/lib/fmm-types";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/customers")({
  head: () => ({
    meta: [
      { title: "Customer Management — Faridpur Mobile Mart" },
      { name: "description", content: "Persistent customer profiles, purchase history, device intakes, NID evidence, warranty claims and ledger." },
      { property: "og:title", content: "Customer Management — Faridpur Mobile Mart" },
      { property: "og:description", content: "Customer directory, transaction history and identity documentation." },
    ],
  }),
  component: CustomersPage,
});

function CustomersPage() {
  const { state, updateWarrantyClaim } = useFmm();

  const [search, setSearch] = useState("");
  const [onlyDue, setOnlyDue] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [warrantyOpen, setWarrantyOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; doc: StoredFile } | null>(null);

  const customerStats = useMemo(() => {
    const list = state.customers ?? [];
    let totalSpend = 0;
    let totalOutstanding = 0;

    const enriched = list.map((c) => {
      const txs = (state.transactions ?? []).filter(
        (t) => t.customer_id === c.id || (t.customer_phone && t.customer_phone === c.phone) || t.customer_name === c.name,
      );
      const paidTxs = txs.filter((t) => t.payment_status === "Paid");
      const pendingTxs = txs.filter((t) => t.payment_status === "Pending");

      const spent = paidTxs.reduce((s, t) => s + t.amount, 0);
      const due = pendingTxs.reduce((s, t) => s + (t.due_amount ?? t.amount), 0);

      totalSpend += spent;
      totalOutstanding += due;

      const salesToFMM = (state.customer_purchases ?? []).filter(
        (cp) => cp.customer_id === c.id || (cp.customer_phone && cp.customer_phone === c.phone) || cp.customer_name === c.name,
      );

      const claims = (state.warranty_claims ?? []).filter(
        (w) => w.customer_id === c.id || (w.customer_phone && w.customer_phone === c.phone) || w.customer_name === c.name,
      );

      const hasNidEvidence = salesToFMM.some(
        (cp) => !!cp.nid_front_image || !!cp.nid_back_image || cp.additional_documents.length > 0,
      );

      return {
        customer: c,
        transactionsCount: txs.length,
        totalSpent: spent,
        totalDue: due,
        salesToFMMCount: salesToFMM.length,
        claimsCount: claims.length,
        hasNidEvidence,
        transactions: txs,
        customerPurchases: salesToFMM,
        warrantyClaims: claims,
      };
    });

    const debtorsCount = enriched.filter((e) => e.totalDue > 0).length;

    return { enriched, totalSpend, totalOutstanding, debtorsCount };
  }, [state.customers, state.transactions, state.customer_purchases, state.warranty_claims]);

  const filteredCustomers = useMemo(() => {
    const q = search.trim().toLowerCase();
    return customerStats.enriched.filter(({ customer, customerPurchases, transactions, totalDue }) => {
      if (onlyDue && totalDue <= 0) return false;
      if (!q) return true;
      const matchBasic =
        customer.name.toLowerCase().includes(q) ||
        customer.phone.toLowerCase().includes(q) ||
        (customer.address && customer.address.toLowerCase().includes(q)) ||
        (customer.nid_number && customer.nid_number.toLowerCase().includes(q));

      if (matchBasic) return true;

      // Match by phone IMEI/Brand/Model from intake or purchases
      const matchIntake = customerPurchases.some((cp) => {
        const ph = state.phones.find((p) => p.id === cp.phone_id);
        return (
          ph?.imei.toLowerCase().includes(q) ||
          ph?.brand.toLowerCase().includes(q) ||
          ph?.model.toLowerCase().includes(q)
        );
      });

      const matchTxs = transactions.some((t) => {
        const ph = state.phones.find((p) => p.id === t.phone_id);
        return (
          ph?.imei.toLowerCase().includes(q) ||
          ph?.brand.toLowerCase().includes(q) ||
          ph?.model.toLowerCase().includes(q) ||
          (t.items && t.items.some((it) => it.name.toLowerCase().includes(q)))
        );
      });

      return matchIntake || matchTxs;
    });
  }, [customerStats.enriched, search, onlyDue, state.phones]);

  const activeCustomerDetails = useMemo(() => {
    if (!selectedCustomer) return null;
    return customerStats.enriched.find((e) => e.customer.id === selectedCustomer.id) || null;
  }, [selectedCustomer, customerStats.enriched]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Customer Directory"
          subtitle="Persistent customer profiles, transaction history, warranty claims and ledger."
          actions={
            customerStats.totalOutstanding > 0 ? (
              <button
                type="button"
                onClick={() => setOnlyDue((prev) => !prev)}
                className={`flex items-center gap-3.5 rounded-2xl border px-4 py-2 text-left transition-all shadow-xs cursor-pointer ${
                  onlyDue
                    ? "border-destructive bg-destructive/10 ring-2 ring-destructive/20"
                    : "border-border bg-card hover:border-destructive/40 hover:bg-secondary/40"
                }`}
                title="Click to toggle filtering customers with outstanding dues"
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-destructive/15 text-destructive">
                  <AlertTriangle className="size-4.5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                      Outstanding Dues
                    </span>
                    <span className="rounded-full bg-destructive/15 px-1.5 py-0.2 text-[10px] font-bold text-destructive">
                      {customerStats.debtorsCount} {customerStats.debtorsCount === 1 ? "customer" : "customers"}
                    </span>
                  </div>
                  <p className="text-xl font-black text-destructive leading-tight">
                    <Taka value={customerStats.totalOutstanding} />
                  </p>
                </div>
              </button>
            ) : (
              <div className="flex items-center gap-2 rounded-2xl border border-border bg-card px-4 py-2.5 text-xs text-muted-foreground shadow-xs">
                <span className="size-2 rounded-full bg-emerald-500" />
                <span>All Customer Accounts Cleared (৳0 Due)</span>
              </div>
            )
          }
        />

        {/* Search & Quick Filters */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone, NID, or IMEI…"
              className="pl-9 h-9 text-xs rounded-xl"
            />
          </div>

          {customerStats.debtorsCount > 0 ? (
            <Button
              variant={onlyDue ? "destructive" : "outline"}
              size="sm"
              className="h-9 rounded-xl text-xs gap-1.5"
              onClick={() => setOnlyDue((prev) => !prev)}
            >
              <AlertTriangle className="size-3.5" />
              {onlyDue ? "Showing Dues Only" : "Filter: Has Outstanding Due"}
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-bold ${
                  onlyDue ? "bg-white/20 text-white" : "bg-destructive/15 text-destructive"
                }`}
              >
                {customerStats.debtorsCount}
              </span>
            </Button>
          ) : null}
        </div>

        {/* Customers Table */}
        <div className="overflow-x-auto rounded-xl border border-border bg-card">
          <table className="w-full min-w-[850px] text-sm">
            <thead className="bg-secondary/60 text-left text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Customer Profile</th>
                <th className="px-5 py-3 font-medium">Contact & NID Evidence</th>
                <th className="px-5 py-3 font-medium">Location</th>
                <th className="px-5 py-3 text-center font-medium">Activity</th>
                <th className="px-5 py-3 text-right font-medium">Total Spend</th>
                <th className="px-5 py-3 text-right font-medium">Due Balance</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCustomers.map(({ customer, transactionsCount, totalSpent, totalDue, salesToFMMCount, hasNidEvidence }) => (
                <tr key={customer.id} className="hover:bg-secondary/20 transition-colors">
                  <td className="px-5 py-4">
                    <p className="font-semibold text-foreground">{customer.name}</p>
                    {customer.notes ? <p className="text-xs text-muted-foreground line-clamp-1">{customer.notes}</p> : null}
                  </td>
                  <td className="px-5 py-4">
                    <p className="font-mono text-xs font-medium">{customer.phone}</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      {customer.nid_number ? <span className="font-mono text-xs text-muted-foreground">NID: {customer.nid_number}</span> : null}
                      {hasNidEvidence ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-emerald-500/10 px-1.5 py-0.2 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                          <ShieldCheck className="size-3" /> NID Attached
                        </span>
                      ) : null}
                    </div>
                  </td>
                  <td className="px-5 py-4 text-muted-foreground text-xs">{customer.address || "—"}</td>
                  <td className="px-5 py-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-secondary text-foreground">
                      {transactionsCount} orders {salesToFMMCount > 0 ? `· +${salesToFMMCount} intake` : ""}
                    </span>
                  </td>
                  <td className="px-5 py-4 text-right font-semibold text-foreground"><Taka value={totalSpent} /></td>
                  <td className="px-5 py-4 text-right">
                    {totalDue > 0 ? (
                      <span className="font-bold text-destructive"><Taka value={totalDue} /></span>
                    ) : (
                      <span className="text-xs text-success font-medium">Cleared</span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-8 rounded-lg text-xs gap-1"
                        onClick={() => setSelectedCustomer(customer)}
                      >
                        <Eye className="size-3.5" /> View
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-8 rounded-lg text-xs"
                        onClick={() => {
                          setEditingCustomer(customer);
                          setAddOpen(true);
                        }}
                      >
                        <Edit2 className="size-3.5" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-muted-foreground">
                    No customers found matching your search.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit Customer Dialog */}
      <AddCustomerDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        editCustomer={editingCustomer}
      />

      {/* Full Resolution Document Viewer Dialog */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl rounded-2xl p-4">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <FileText className="size-4 text-primary" />
              {previewDoc?.title}
            </DialogTitle>
          </DialogHeader>
          <div className="mt-2 flex items-center justify-center rounded-xl bg-secondary/30 p-2 overflow-hidden max-h-[70vh]">
            {previewDoc?.doc.data.startsWith("data:image") ? (
              <img
                src={previewDoc.doc.data}
                alt={previewDoc.title}
                className="max-h-[65vh] w-auto max-w-full rounded-lg object-contain shadow-sm"
              />
            ) : (
              <div className="py-12 text-center text-sm text-muted-foreground">
                <FileText className="size-12 mx-auto mb-2 text-muted-foreground/60" />
                <p className="font-medium">{previewDoc?.doc.name}</p>
                <p className="text-xs mt-1">Binary document attachment</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Customer Profile & History Sheet */}
      <Sheet open={!!selectedCustomer} onOpenChange={(open) => !open && setSelectedCustomer(null)}>
        <SheetContent className="sm:max-w-xl flex flex-col p-0">
          <SheetHeader className="p-6 pb-4 border-b border-border">
            <SheetTitle className="flex items-center gap-2">
              <Users className="size-5 text-primary" />
              {activeCustomerDetails?.customer.name}
            </SheetTitle>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground mt-1">
              <span>Phone: <strong className="text-foreground">{activeCustomerDetails?.customer.phone}</strong></span>
              {activeCustomerDetails?.customer.nid_number ? <span>NID: <strong className="text-foreground">{activeCustomerDetails?.customer.nid_number}</strong></span> : null}
              {activeCustomerDetails?.customer.address ? <span>Address: <strong className="text-foreground">{activeCustomerDetails?.customer.address}</strong></span> : null}
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Quick Metrics */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-border bg-card p-3.5">
                <span className="text-xs text-muted-foreground">Total Purchases</span>
                <p className="text-xl font-bold mt-1 text-foreground"><Taka value={activeCustomerDetails?.totalSpent ?? 0} /></p>
              </div>
              <div className="rounded-xl border border-border bg-card p-3.5">
                <span className="text-xs text-muted-foreground">Due Balance</span>
                <p className={`text-xl font-bold mt-1 ${(activeCustomerDetails?.totalDue ?? 0) > 0 ? "text-destructive" : "text-success"}`}>
                  <Taka value={activeCustomerDetails?.totalDue ?? 0} />
                </p>
              </div>
            </div>

            {/* Devices Sold to FMM & Evidence Documents */}
            <div>
              <div className="mb-3 flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Smartphone className="size-3.5" /> Devices Sold to FMM & Evidence ({activeCustomerDetails?.customerPurchases.length ?? 0})
                </h4>
              </div>
              <div className="space-y-3">
                {activeCustomerDetails?.customerPurchases.map((cp) => {
                  const ph = state.phones.find((p) => p.id === cp.phone_id);
                  const damage = ph
                    ? Object.entries(ph.damage_checklist)
                        .filter(([, v]) => v)
                        .map(([k]) => k.replace(/_/g, " "))
                    : [];

                  const docs: { title: string; file: StoredFile }[] = [];
                  if (cp.nid_front_image) docs.push({ title: "NID Front", file: cp.nid_front_image });
                  if (cp.nid_back_image) docs.push({ title: "NID Back", file: cp.nid_back_image });
                  cp.additional_documents.forEach((d, idx) => docs.push({ title: d.name || `Document #${idx + 1}`, file: d }));
                  cp.phone_photos.forEach((p, idx) => docs.push({ title: `Device Photo #${idx + 1}`, file: p }));

                  return (
                    <div key={cp.id} className="rounded-xl border border-border bg-card p-4 text-xs space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <span className="font-semibold text-sm">{ph ? `${ph.brand} ${ph.model}` : "Device"}</span>
                          {ph ? <p className="font-mono text-muted-foreground mt-0.5">IMEI: {ph.imei}</p> : null}
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            Intake Date: {new Date(cp.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <span className="font-bold text-sm text-success"><Taka value={cp.purchase_price} /></span>
                          {ph ? <div className="mt-1"><StatusBadge status={ph.status} /></div> : null}
                        </div>
                      </div>

                      {/* Damage Checklist Tags */}
                      {damage.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          {damage.map((d) => (
                            <span key={d} className="rounded-md bg-danger-soft px-2 py-0.5 text-[10px] text-destructive capitalize font-medium">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : null}

                      {/* Document & NID Evidence Gallery */}
                      {docs.length > 0 && (
                        <div className="border-t border-border pt-2.5">
                          <p className="text-[11px] font-semibold text-muted-foreground mb-2 flex items-center gap-1">
                            <ShieldCheck className="size-3 text-emerald-600" /> Identity Documents & Evidence ({docs.length})
                          </p>
                          <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                            {docs.map((docItem, idx) => (
                              <button
                                key={idx}
                                type="button"
                                onClick={() => setPreviewDoc({ title: `${docItem.title} — ${cp.customer_name}`, doc: docItem.file })}
                                className="group relative flex flex-col items-center rounded-lg border border-border bg-secondary/50 p-1.5 text-center transition hover:border-primary hover:bg-secondary"
                              >
                                {docItem.file.data.startsWith("data:image") ? (
                                  <div className="relative aspect-video w-full overflow-hidden rounded bg-background">
                                    <img
                                      src={docItem.file.data}
                                      alt={docItem.title}
                                      className="h-full w-full object-cover transition-transform group-hover:scale-105"
                                    />
                                    <span className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity text-white">
                                      <Maximize2 className="size-3.5" />
                                    </span>
                                  </div>
                                ) : (
                                  <div className="flex aspect-video w-full items-center justify-center rounded bg-background">
                                    <FileText className="size-5 text-muted-foreground" />
                                  </div>
                                )}
                                <span className="mt-1 line-clamp-1 text-[10px] font-medium text-foreground">
                                  {docItem.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
                {activeCustomerDetails?.customerPurchases.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No devices sold to FMM.</p>
                ) : null}
              </div>
            </div>

            {/* Purchases & Transactions */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-1.5">
                <Receipt className="size-3.5" /> Purchase & Transaction History ({activeCustomerDetails?.transactions.length ?? 0})
              </h4>
              <div className="space-y-2.5">
                {activeCustomerDetails?.transactions.map((t) => {
                  const phone = state.phones.find((p) => p.id === t.phone_id);
                  return (
                    <div key={t.id} className="rounded-xl border border-border bg-card p-3.5 text-xs">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-semibold text-sm">
                            {t.items && t.items.length > 0 ? t.items.map((it) => it.name).join(", ") : phone ? `${phone.brand} ${phone.model}` : "Transaction"}
                          </span>
                          <p className="text-muted-foreground mt-0.5">{new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })} · Method: {t.payment_method || "Cash"}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-sm text-foreground"><Taka value={t.amount} /></p>
                          <StatusBadge status={t.payment_status === "Pending" ? "Payment Pending" : "Paid"} className="mt-1" />
                        </div>
                      </div>
                    </div>
                  );
                })}
                {activeCustomerDetails?.transactions.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No purchases recorded.</p>
                ) : null}
              </div>
            </div>

            {/* Warranty Claims */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <ShieldAlert className="size-3.5" /> Warranty & Repairs ({activeCustomerDetails?.warrantyClaims.length ?? 0})
                </h4>
                <Button
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 text-xs rounded-lg gap-1"
                  onClick={() => setWarrantyOpen(true)}
                >
                  + Add Claim
                </Button>
              </div>

              <div className="space-y-2.5">
                {activeCustomerDetails?.warrantyClaims.map((w) => (
                  <div key={w.id} className="rounded-xl border border-border bg-card p-3.5 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="font-semibold">{w.issue_description}</span>
                        <p className="text-muted-foreground mt-0.5">{new Date(w.claim_date).toLocaleDateString()}</p>
                      </div>
                      <select
                        value={w.status}
                        onChange={(e) => {
                          updateWarrantyClaim(w.id, { status: e.target.value as WarrantyStatus });
                        }}
                        className="h-7 rounded-lg border border-border bg-card px-2 text-[11px] font-medium"
                      >
                        <option value="Pending Inspection">Pending Inspection</option>
                        <option value="In Repair">In Repair</option>
                        <option value="Repaired">Repaired</option>
                        <option value="Replaced">Replaced</option>
                        <option value="Resolved">Resolved</option>
                        <option value="Rejected">Rejected</option>
                      </select>
                    </div>
                  </div>
                ))}
                {activeCustomerDetails?.warrantyClaims.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No warranty claims for this customer.</p>
                ) : null}
              </div>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <RecordWarrantyDialog
        open={warrantyOpen}
        onOpenChange={setWarrantyOpen}
        defaultCustomerId={selectedCustomer?.id}
      />
    </AppShell>
  );
}
