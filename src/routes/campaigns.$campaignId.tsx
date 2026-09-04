import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowUpRight,
  Calendar,
  CheckCircle2,
  DollarSign,
  Edit2,
  ExternalLink,
  Gift,
  History,
  Layers,
  Link as LinkIcon,
  Megaphone,
  Package,
  Plus,
  Receipt,
  ShoppingCart,
  Smartphone,
  Tag,
  Trash2,
  TrendingUp,
  Truck,
  Unlink,
} from "lucide-react";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AddCampaignDialog } from "@/components/fmm/AddCampaignDialog";
import { AddExpenseDialog } from "@/components/fmm/AddExpenseDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { campaignBusinessMetrics, useFmm } from "@/lib/fmm-store";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/campaigns/$campaignId")({
  head: () => ({
    meta: [
      { title: "Campaign Details — Faridpur Mobile Mart" },
      { name: "description", content: "Complete campaign performance, linked purchases, sales orders, free gifts, marketing expenses and profit contribution." },
      { property: "og:title", content: "Campaign Details — Faridpur Mobile Mart" },
      { property: "og:description", content: "Detailed campaign financials, products, sales and expenses ledger." },
    ],
  }),
  component: CampaignDetailPage,
});

function CampaignDetailPage() {
  const { campaignId } = Route.useParams();
  const { state, updateCampaign, updateExpense } = useFmm();

  const [editOpen, setEditOpen] = useState(false);
  const [expenseOpen, setExpenseOpen] = useState(false);
  const [linkExpenseOpen, setLinkExpenseOpen] = useState(false);
  const [selectedExpenseToLink, setSelectedExpenseToLink] = useState("");
  const [tab, setTab] = useState("overview");

  const campaign = state.campaigns?.find((c) => c.id === campaignId);
  const metrics = useMemo(() => {
    return campaign ? campaignBusinessMetrics(state, campaign.id) : null;
  }, [state, campaign]);

  // Expenses not currently attached to any campaign
  const unlinkedExpenses = useMemo(() => {
    return (state.expenses ?? []).filter((e) => !e.campaign_id);
  }, [state.expenses]);

  if (!campaign || !metrics) {
    return (
      <AppShell>
        <div className="mx-auto max-w-4xl px-6 py-16 text-center">
          <p className="text-muted-foreground">Campaign not found.</p>
          <Link to="/campaigns" className="mt-4 inline-block text-primary hover:underline">
            ← Back to campaigns
          </Link>
        </div>
      </AppShell>
    );
  }

  const isNetPositive = metrics.netContribution >= 0;

  // Breakdown of product COGS for financial summary
  const phoneCOGS = metrics.soldPhonesList.reduce((s, p) => s + (p.costPrice || 0), 0);
  const accCOGS = metrics.soldAccessoriesList.reduce((s, a) => s + a.quantity * (a.costPrice || 0), 0);

  // Build chronological activity timeline including free gifts
  const timelineEvents = useMemo(() => {
    const events: {
      date: string;
      title: string;
      type: "sale" | "gift" | "purchase" | "expense";
      amount: number;
      details: string;
    }[] = [];

    metrics.linkedTransactions.forEach((t) => {
      events.push({
        date: t.date,
        title: `Sale to ${t.customer_name}`,
        type: "sale",
        amount: t.amount,
        details: t.items && t.items.length > 0 ? t.items.map((i) => `${i.is_gift ? "🎁 [Gift] " : ""}${i.quantity}x ${i.name}`).join(", ") : "Device sale",
      });
    });

    metrics.freeGiftsList.forEach((g) => {
      events.push({
        date: g.sale.date,
        title: `🎁 Free Gift: ${g.name} (${g.quantity} unit${g.quantity > 1 ? "s" : ""})`,
        type: "gift",
        amount: g.totalCost,
        details: `Given to ${g.sale.customer_name} (Campaign gift cost: ৳${g.totalCost.toLocaleString()})`,
      });
    });

    metrics.linkedPurchases.forEach((p) => {
      const sup = state.suppliers.find((s) => s.id === p.supplier_id);
      events.push({
        date: p.date,
        title: `Stock Procurement from ${sup?.name || "Supplier"}`,
        type: "purchase",
        amount: p.total_amount,
        details: p.notes || "Supplier purchase batch",
      });
    });

    metrics.linkedExpenses.forEach((e) => {
      events.push({
        date: e.date,
        title: `Expense: ${e.category}`,
        type: "expense",
        amount: e.amount,
        details: e.description,
      });
    });

    return events.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [metrics, state.suppliers]);

  const handleMarkCompleted = () => {
    updateCampaign(campaign.id, { status: "Completed" });
    toast.success(`Campaign "${campaign.name}" marked as Completed.`);
  };

  const handleLinkExistingExpense = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExpenseToLink) {
      toast.error("Please select an expense to link.");
      return;
    }
    updateExpense(selectedExpenseToLink, { campaign_id: campaign.id });
    toast.success("Expense successfully linked to campaign.");
    setSelectedExpenseToLink("");
    setLinkExpenseOpen(false);
  };

  const handleUnlinkExpense = (expenseId: string, desc: string) => {
    updateExpense(expenseId, { campaign_id: null });
    toast.success(`Expense "${desc}" unlinked from campaign.`);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <Link
          to="/campaigns"
          className="mb-4 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="size-3.5" /> Back to campaigns
        </Link>

        {/* Campaign Header */}
        <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-3xl font-bold tracking-tight">{campaign.name}</h2>
              <StatusBadge status={campaign.status} />
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{campaign.description || "No description provided."}</p>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="size-3.5" /> {campaign.start_date} to {campaign.end_date}
              </span>
              {campaign.budget ? (
                <span>Budget: <strong className="text-foreground"><Taka value={campaign.budget} /></strong></span>
              ) : null}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={() => setExpenseOpen(true)}>
              <Plus className="size-3.5" /> Add Campaign Expense
            </Button>
            {campaign.status === "Active" ? (
              <Button variant="outline" className="rounded-xl gap-1.5 text-xs text-success border-success/40 hover:bg-success/10" onClick={handleMarkCompleted}>
                <CheckCircle2 className="size-3.5" /> Mark Completed
              </Button>
            ) : null}
            <Button variant="outline" className="rounded-xl gap-1.5 text-xs" onClick={() => setEditOpen(true)}>
              <Edit2 className="size-3.5" /> Edit
            </Button>
          </div>
        </div>

        {/* Financial Summary Scorecard */}
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5 mb-6">
          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">SALES REVENUE</span>
            <p className="mt-2 text-2xl font-bold text-foreground"><Taka value={metrics.totalSalesRevenue} /></p>
            <p className="mt-1 text-[11px] text-muted-foreground">From {metrics.linkedTransactions.length} orders (Gifts: ৳0)</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">PRODUCT COGS</span>
            <p className="mt-2 text-2xl font-bold text-foreground"><Taka value={metrics.totalProductCOGS} /></p>
            <p className="mt-1 text-[11px] text-muted-foreground">Phones + accessories + gift cost</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">FREE GIFTS COST</span>
            <p className="mt-2 text-2xl font-bold text-primary"><Taka value={metrics.freeGiftCost} /></p>
            <p className="mt-1 text-[11px] text-muted-foreground">{metrics.freeGiftsList.length} gifts distributed</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">CAMPAIGN EXPENSES</span>
            <p className="mt-2 text-2xl font-bold text-destructive"><Taka value={metrics.totalCampaignExpenses} /></p>
            <p className="mt-1 text-[11px] text-muted-foreground">Marketing & promotions</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4">
            <span className="text-[11px] font-semibold tracking-wide text-muted-foreground">NET CONTRIBUTION</span>
            <p className={`mt-2 text-2xl font-bold ${isNetPositive ? "text-success" : "text-destructive"}`}>
              <Taka value={metrics.netContribution} />
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">Net profit after all costs</p>
          </div>
        </div>

        {/* Detail Tabs */}
        <Tabs value={tab} onValueChange={setTab} className="space-y-4">
          <TabsList className="flex flex-wrap h-auto gap-1 bg-secondary/50 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="sales">Sales & Orders ({metrics.linkedTransactions.length})</TabsTrigger>
            <TabsTrigger value="products">Products ({metrics.soldPhonesList.length + metrics.soldAccessoriesList.length})</TabsTrigger>
            <TabsTrigger value="gifts">Free Gifts ({metrics.freeGiftsList.length})</TabsTrigger>
            <TabsTrigger value="expenses">Expenses ({metrics.linkedExpenses.length})</TabsTrigger>
            <TabsTrigger value="financials">Financial Summary</TabsTrigger>
            <TabsTrigger value="timeline">Activity Timeline ({timelineEvents.length})</TabsTrigger>
          </TabsList>

          {/* 1. Overview Tab */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <TrendingUp className="size-4 text-primary" /> Campaign Performance Breakdown
                </h4>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Phones Sold Through Campaign:</span>
                    <span className="font-semibold">{metrics.phonesSold} units</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Accessories Sold Through Campaign:</span>
                    <span className="font-semibold">{metrics.accessoriesSold} units</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Free Bonus Gifts Distributed:</span>
                    <span className="font-semibold text-primary">{metrics.freeGiftsList.length} items</span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Gross Sales Revenue:</span>
                    <span className="font-semibold"><Taka value={metrics.totalSalesRevenue} /></span>
                  </div>
                  <div className="flex justify-between py-1.5 border-b border-border/50">
                    <span className="text-muted-foreground">Gross Profit (Margin):</span>
                    <span className="font-semibold text-success"><Taka value={metrics.grossProfit} /></span>
                  </div>
                  <div className="flex justify-between py-1.5">
                    <span className="text-muted-foreground">Net Campaign Profit:</span>
                    <span className={`font-bold ${isNetPositive ? "text-success" : "text-destructive"}`}>
                      <Taka value={metrics.netContribution} />
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-5 space-y-3">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Megaphone className="size-4 text-primary" /> Strategy, Target & Budget
                </h4>
                <p className="text-xs text-muted-foreground leading-relaxed whitespace-pre-wrap">
                  {campaign.notes || "No additional strategy notes recorded for this campaign."}
                </p>
                {campaign.budget ? (
                  <div className="mt-4 pt-3 border-t border-border/50 space-y-2">
                    <div className="flex justify-between text-xs">
                      <span className="text-muted-foreground">Budget Spent:</span>
                      <span className="font-semibold">
                        <Taka value={metrics.totalCampaignExpenses} /> of <Taka value={campaign.budget} /> ({Math.round((metrics.totalCampaignExpenses / campaign.budget) * 100)}%)
                      </span>
                    </div>
                    <div className="w-full bg-secondary rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-primary h-2 rounded-full"
                        style={{ width: `${Math.min(100, Math.round((metrics.totalCampaignExpenses / campaign.budget) * 100))}%` }}
                      />
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </TabsContent>

          {/* 2. Sales Tab */}
          <TabsContent value="sales">
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 font-medium">Items & Gifts</th>
                    <th className="px-5 py-3 font-medium">Payment</th>
                    <th className="px-5 py-3 text-right font-medium">Customer Paid</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.linkedTransactions.map((t) => (
                    <tr key={t.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                        {new Date(t.date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-semibold">
                        {t.customer_name}
                        {t.customer_phone ? <p className="font-mono text-xs font-normal text-muted-foreground">{t.customer_phone}</p> : null}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        {t.items && t.items.length > 0 ? (
                          <div className="flex flex-wrap gap-1">
                            {t.items.map((i, idx) => (
                              <span
                                key={idx}
                                className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${
                                  i.is_gift ? "bg-primary/10 text-primary font-semibold" : "bg-secondary text-foreground"
                                }`}
                              >
                                {i.is_gift ? "🎁 " : ""}{i.quantity}x {i.name}{i.is_gift ? " (Free)" : ""}
                              </span>
                            ))}
                          </div>
                        ) : (
                          "Device sale"
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <StatusBadge status={t.payment_status === "Pending" ? "Payment Pending" : "Paid"} />
                      </td>
                      <td className="px-5 py-4 text-right font-bold"><Taka value={t.amount} /></td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          to="/sales"
                          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium"
                        >
                          Sales Ledger <ExternalLink className="size-3" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {metrics.linkedTransactions.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-10 text-center text-muted-foreground">
                        No sales linked to this campaign yet. Record a sale and link this campaign to track results.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 3. Products Tab (Authoritative Phones & Accessories Sold) */}
          <TabsContent value="products" className="space-y-6">
            {/* Phones Sold Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Smartphone className="size-4 text-primary" />
                  Phones Sold Through Campaign ({metrics.soldPhonesList.length})
                </h4>
                <Link to="/stock" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Manage Phone Stock <ExternalLink className="size-3" />
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Phone Details</th>
                    <th className="px-5 py-3 font-medium">IMEI</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 text-right font-medium">Cost Price</th>
                    <th className="px-5 py-3 text-right font-medium">Sold Price</th>
                    <th className="px-5 py-3 text-right font-medium">Gross Margin</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.soldPhonesList.map((item, idx) => {
                    const margin = item.soldPrice - item.costPrice;
                    return (
                      <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                        <td className="px-5 py-3.5 font-semibold text-foreground">{item.name}</td>
                        <td className="px-5 py-3.5 font-mono text-xs text-muted-foreground">{item.phone?.imei || "—"}</td>
                        <td className="px-5 py-3.5 text-xs text-muted-foreground">{item.sale.customer_name}</td>
                        <td className="px-5 py-3.5 text-right text-muted-foreground"><Taka value={item.costPrice} /></td>
                        <td className="px-5 py-3.5 text-right font-medium"><Taka value={item.soldPrice} /></td>
                        <td className={`px-5 py-3.5 text-right font-bold ${margin >= 0 ? "text-success" : "text-destructive"}`}>
                          <Taka value={margin} />
                        </td>
                      </tr>
                    );
                  })}
                  {metrics.soldPhonesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-xs">
                        No phone sales recorded for this campaign yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>

            {/* Accessories Sold Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="p-4 bg-secondary/30 border-b border-border flex items-center justify-between">
                <h4 className="text-sm font-semibold flex items-center gap-2">
                  <Layers className="size-4 text-primary" />
                  Accessories Sold Through Campaign ({metrics.soldAccessoriesList.length})
                </h4>
                <Link to="/accessories" className="text-xs text-primary hover:underline flex items-center gap-1">
                  Manage Accessories <ExternalLink className="size-3" />
                </Link>
              </div>
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Accessory Item</th>
                    <th className="px-5 py-3 font-medium">Customer</th>
                    <th className="px-5 py-3 text-right font-medium">Quantity</th>
                    <th className="px-5 py-3 text-right font-medium">Unit Price</th>
                    <th className="px-5 py-3 text-right font-medium">Unit Cost</th>
                    <th className="px-5 py-3 text-right font-medium">Total Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.soldAccessoriesList.map((item, idx) => (
                    <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-3.5 font-semibold text-foreground">{item.name}</td>
                      <td className="px-5 py-3.5 text-xs text-muted-foreground">{item.sale.customer_name}</td>
                      <td className="px-5 py-3.5 text-right">{item.quantity}</td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground"><Taka value={item.unitPrice} /></td>
                      <td className="px-5 py-3.5 text-right text-muted-foreground"><Taka value={item.costPrice} /></td>
                      <td className="px-5 py-3.5 text-right font-bold text-foreground"><Taka value={item.subtotal} /></td>
                    </tr>
                  ))}
                  {metrics.soldAccessoriesList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground text-xs">
                        No accessory items sold in this campaign yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 4. Free Gifts / Bonus Items Tab */}
          <TabsContent value="gifts" className="space-y-4">
            {/* Free Gifts Summary Scorecards */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">GIFTS DISTRIBUTED</span>
                <p className="mt-2 text-2xl font-bold text-foreground">
                  {metrics.freeGiftsList.reduce((s, g) => s + g.quantity, 0)} <span className="text-sm font-normal text-muted-foreground">units</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">Across {metrics.freeGiftsList.length} customer gifts</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">CAMPAIGN GIFT COST (COGS)</span>
                <p className="mt-2 text-2xl font-bold text-primary"><Taka value={metrics.freeGiftCost} /></p>
                <p className="mt-1 text-xs text-muted-foreground">Inventory acquisition cost borne by campaign</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">CUSTOMER REVENUE BILLED</span>
                <p className="mt-2 text-2xl font-bold text-success"><Taka value={0} /></p>
                <p className="mt-1 text-xs text-muted-foreground">100% Free promotion (Customer pays ৳0)</p>
              </div>
            </div>

            {/* Free Gifts Detailed Table */}
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Gift Item</th>
                    <th className="px-5 py-3 font-medium">Recipient / Sale</th>
                    <th className="px-5 py-3 text-right font-medium">Quantity</th>
                    <th className="px-5 py-3 text-right font-medium">Unit Inventory Cost</th>
                    <th className="px-5 py-3 text-right font-medium">Campaign Cost</th>
                    <th className="px-5 py-3 text-right font-medium">Customer Paid</th>
                    <th className="px-5 py-3 text-right font-medium">Stock Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.freeGiftsList.map((g, idx) => (
                    <tr key={idx} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4 font-semibold text-foreground flex items-center gap-1.5">
                        <Gift className="size-4 text-primary shrink-0" />
                        {g.name}
                      </td>
                      <td className="px-5 py-4 text-xs">
                        <p className="font-medium text-foreground">{g.sale.customer_name}</p>
                        <p className="text-muted-foreground font-mono">{new Date(g.sale.date).toLocaleDateString()}</p>
                      </td>
                      <td className="px-5 py-4 text-right font-medium">{g.quantity}</td>
                      <td className="px-5 py-4 text-right text-muted-foreground"><Taka value={g.costPrice} /></td>
                      <td className="px-5 py-4 text-right font-bold text-primary"><Taka value={g.totalCost} /></td>
                      <td className="px-5 py-4 text-right font-semibold text-success">৳0 (Free)</td>
                      <td className="px-5 py-4 text-right">
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
                          Campaign Gift (Out)
                        </span>
                      </td>
                    </tr>
                  ))}
                  {metrics.freeGiftsList.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-muted-foreground">
                        No free gifts distributed in this campaign yet. When selling a phone or accessory, check &ldquo;Offer as Free Gift&rdquo; to bundle promotional items without charging the customer.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 5. Expenses Tab */}
          <TabsContent value="expenses" className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">
                All marketing, advertising, banners, and operational expenses dedicated to this campaign.
              </p>
              <div className="flex items-center gap-2">
                {unlinkedExpenses.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="rounded-xl text-xs gap-1.5"
                    onClick={() => setLinkExpenseOpen(true)}
                  >
                    <LinkIcon className="size-3.5" /> Link Existing Expense ({unlinkedExpenses.length} unlinked)
                  </Button>
                )}
                <Button
                  size="sm"
                  className="rounded-xl text-xs gap-1.5"
                  onClick={() => setExpenseOpen(true)}
                >
                  <Plus className="size-3.5" /> Add New Campaign Expense
                </Button>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-secondary/60 text-left text-muted-foreground">
                  <tr>
                    <th className="px-5 py-3 font-medium">Date</th>
                    <th className="px-5 py-3 font-medium">Category</th>
                    <th className="px-5 py-3 font-medium">Description</th>
                    <th className="px-5 py-3 font-medium">Payment Method</th>
                    <th className="px-5 py-3 text-right font-medium">Amount</th>
                    <th className="px-5 py-3 text-right font-medium">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {metrics.linkedExpenses.map((e) => (
                    <tr key={e.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap text-muted-foreground">
                        {new Date(e.date).toLocaleDateString()}
                      </td>
                      <td className="px-5 py-4 font-semibold">{e.category}</td>
                      <td className="px-5 py-4 text-muted-foreground">{e.description}</td>
                      <td className="px-5 py-4 text-xs text-muted-foreground">{e.payment_method}</td>
                      <td className="px-5 py-4 text-right font-bold text-destructive"><Taka value={e.amount} /></td>
                      <td className="px-5 py-4 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs text-muted-foreground hover:text-destructive gap-1"
                          onClick={() => handleUnlinkExpense(e.id, e.description)}
                          title="Unlink from this campaign"
                        >
                          <Unlink className="size-3.5" /> Unlink
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {metrics.linkedExpenses.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                        No expenses linked to this campaign yet.
                      </td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </TabsContent>

          {/* 6. Financial Summary Tab (Complete P&L) */}
          <TabsContent value="financials" className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <h4 className="text-base font-bold text-foreground">Campaign Profit & Loss Statement (Authoritative Ledger)</h4>
              <p className="text-xs text-muted-foreground">
                Derives exclusively from authoritative customer transactions, inventory COGS, free gift costs, and linked expense vouchers.
              </p>

              <div className="divide-y divide-border text-sm">
                <div className="flex justify-between py-3">
                  <span className="font-semibold text-foreground">Gross Sales Revenue (Phones & Accessories)</span>
                  <span className="font-bold text-foreground">+<Taka value={metrics.totalSalesRevenue} /></span>
                </div>

                <div className="pl-4 py-2 flex justify-between text-xs text-muted-foreground">
                  <span>Less: Phone Stock Inventory Cost ({metrics.phonesSold} units)</span>
                  <span>-<Taka value={phoneCOGS} /></span>
                </div>

                <div className="pl-4 py-2 flex justify-between text-xs text-muted-foreground">
                  <span>Less: Accessory Stock Inventory Cost ({metrics.accessoriesSold} units)</span>
                  <span>-<Taka value={accCOGS} /></span>
                </div>

                <div className="pl-4 py-2 flex justify-between text-xs text-primary">
                  <span>Less: Free Promotional Gift Items Cost ({metrics.freeGiftsList.length} gifts distributed)</span>
                  <span>-<Taka value={metrics.freeGiftCost} /></span>
                </div>

                <div className="flex justify-between py-3 bg-secondary/30 px-3 rounded-lg font-semibold">
                  <span>Total Cost of Goods Sold (COGS)</span>
                  <span>-<Taka value={metrics.totalProductCOGS} /></span>
                </div>

                <div className="flex justify-between py-3 font-semibold text-foreground">
                  <span>Gross Campaign Profit</span>
                  <span className="font-bold text-success"><Taka value={metrics.grossProfit} /></span>
                </div>

                <div className="flex justify-between py-3 text-destructive">
                  <span>Less: Campaign Marketing & Operating Expenses ({metrics.linkedExpenses.length} vouchers)</span>
                  <span className="font-bold">-<Taka value={metrics.totalCampaignExpenses} /></span>
                </div>

                <div className={`flex justify-between py-4 px-4 rounded-xl text-lg font-bold ${isNetPositive ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
                  <span>Net Campaign Contribution / Profit</span>
                  <span><Taka value={metrics.netContribution} /></span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* 7. Activity Timeline Tab */}
          <TabsContent value="timeline">
            <div className="rounded-xl border border-border bg-card p-6">
              <div className="space-y-4">
                {timelineEvents.map((ev, idx) => (
                  <div key={idx} className="flex items-start gap-3 text-xs">
                    <span className="w-24 text-muted-foreground shrink-0 pt-0.5">
                      {new Date(ev.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </span>
                    <div
                      className={`size-2.5 rounded-full mt-1.5 shrink-0 ${
                        ev.type === "sale"
                          ? "bg-success"
                          : ev.type === "gift"
                          ? "bg-primary"
                          : ev.type === "expense"
                          ? "bg-destructive"
                          : "bg-blue-500"
                      }`}
                    />
                    <div className="flex-1 rounded-lg bg-secondary/30 p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold text-foreground text-sm">{ev.title}</span>
                        <span
                          className={`font-bold ${
                            ev.type === "sale"
                              ? "text-success"
                              : ev.type === "expense" || ev.type === "gift"
                              ? "text-destructive"
                              : "text-foreground"
                          }`}
                        >
                          <Taka value={ev.amount} />
                        </span>
                      </div>
                      <p className="text-muted-foreground mt-0.5">{ev.details}</p>
                    </div>
                  </div>
                ))}
                {timelineEvents.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-8">No timeline activity recorded yet.</p>
                ) : null}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Edit Campaign Dialog */}
      <AddCampaignDialog open={editOpen} onOpenChange={setEditOpen} editCampaign={campaign} />

      {/* Add Campaign Expense Dialog */}
      <AddExpenseDialog open={expenseOpen} onOpenChange={setExpenseOpen} defaultCampaignId={campaign.id} />

      {/* Link Existing Expense Dialog */}
      <Dialog open={linkExpenseOpen} onOpenChange={setLinkExpenseOpen}>
        <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-4 border-b border-border">
            <DialogTitle className="flex items-center gap-2">
              <LinkIcon className="size-5 text-primary" />
              Link Existing Expense to Campaign
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleLinkExistingExpense} className="p-6 space-y-4">
            <div>
              <Label className="text-xs font-semibold">Select Unlinked Expense</Label>
              <select
                value={selectedExpenseToLink}
                onChange={(e) => setSelectedExpenseToLink(e.target.value)}
                required
                className="mt-1 h-9 w-full rounded-md border border-input bg-transparent px-3 text-xs"
              >
                <option value="">— Select an expense —</option>
                {unlinkedExpenses.map((e) => (
                  <option key={e.id} value={e.id}>
                    {new Date(e.date).toLocaleDateString()} · {e.category}: {e.description} (৳{e.amount.toLocaleString()})
                  </option>
                ))}
              </select>
            </div>

            <DialogFooter className="pt-2 gap-2">
              <Button type="button" variant="outline" className="rounded-xl" onClick={() => setLinkExpenseOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="rounded-xl">
                Link to Campaign
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}
