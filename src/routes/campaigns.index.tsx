import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowUpRight,
  Calendar,
  DollarSign,
  Eye,
  Layers,
  Megaphone,
  Plus,
  Receipt,
  Smartphone,
  Tag,
  TrendingUp,
} from "lucide-react";
import { useState, useMemo } from "react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { AddCampaignDialog } from "@/components/fmm/AddCampaignDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Button } from "@/components/ui/button";
import { campaignBusinessMetrics, useFmm } from "@/lib/fmm-store";
import { type Campaign } from "@/lib/fmm-types";
import { Taka } from "@/components/fmm/Taka";

export const Route = createFileRoute("/campaigns/")({
  head: () => ({
    meta: [
      { title: "Campaign Management — Faridpur Mobile Mart" },
      { name: "description", content: "Track special business events, festive campaigns, marketing expenses, linked purchases and profit contribution." },
      { property: "og:title", content: "Campaign Management — Faridpur Mobile Mart" },
      { property: "og:description", content: "Manage business promotional campaigns, track purchases, sales and profit ROI." },
    ],
  }),
  component: CampaignsIndexPage,
});

function CampaignsIndexPage() {
  const { state } = useFmm();
  const [filter, setFilter] = useState("All");
  const [dialogOpen, setDialogOpen] = useState(false);

  const campaignsWithMetrics = useMemo(() => {
    return (state.campaigns ?? []).map((cmp) => {
      const metrics = campaignBusinessMetrics(state, cmp.id);
      return { campaign: cmp, metrics };
    });
  }, [state]);

  const filtered = useMemo(() => {
    return campaignsWithMetrics.filter(({ campaign }) => {
      if (filter === "All") return true;
      return campaign.status === filter;
    });
  }, [campaignsWithMetrics, filter]);

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8">
        <PageHeader
          title="Campaigns & Events"
          subtitle="Temporary business promotions, festive stock campaigns and promotional ROI tracking."
          actions={
            <Button className="rounded-xl gap-1.5" onClick={() => setDialogOpen(true)}>
              <Plus className="size-4" /> Create Campaign
            </Button>
          }
        />

        {/* Filter Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {["All", "Active", "Planned", "Completed", "Cancelled"].map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(s)}
              className={`rounded-lg border px-3.5 py-1.5 text-xs font-semibold transition-colors ${
                filter === s
                  ? "bg-primary text-primary-foreground border-primary"
                  : "border-border bg-card hover:bg-secondary text-foreground"
              }`}
            >
              {s === "All" ? "All Campaigns" : s}
            </button>
          ))}
        </div>

        {/* Campaign Cards Grid */}
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map(({ campaign, metrics }) => {
            const isProfitPositive = (metrics?.netContribution ?? 0) >= 0;
            return (
              <div
                key={campaign.id}
                className="rounded-2xl border border-border bg-card p-6 flex flex-col justify-between hover:border-primary/40 hover:shadow-md transition-all"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-lg font-bold text-foreground leading-snug">{campaign.name}</h3>
                    <StatusBadge status={campaign.status} />
                  </div>

                  <p className="mt-1 text-xs text-muted-foreground line-clamp-2">
                    {campaign.description || "No description provided."}
                  </p>

                  <div className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span>
                      {campaign.start_date} to {campaign.end_date}
                    </span>
                  </div>

                  {/* Financial Metrics Summary */}
                  <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-xl bg-secondary/50 p-3 text-xs">
                    <div>
                      <span className="text-muted-foreground">Sales Revenue:</span>
                      <p className="font-bold text-sm text-foreground mt-0.5">
                        <Taka value={metrics?.totalSalesRevenue ?? 0} />
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Net Contribution:</span>
                      <p className={`font-bold text-sm mt-0.5 ${isProfitPositive ? "text-success" : "text-destructive"}`}>
                        <Taka value={metrics?.netContribution ?? 0} />
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Campaign Expenses:</span>
                      <p className="font-medium text-foreground mt-0.5">
                        <Taka value={metrics?.totalCampaignExpenses ?? 0} />
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Budget:</span>
                      <p className="font-medium text-foreground mt-0.5">
                        {campaign.budget ? <Taka value={campaign.budget} /> : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Product Counts */}
                  <div className="mt-3 flex flex-wrap gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-lg">
                      <Smartphone className="size-3" /> {metrics?.phonesSold ?? 0} phones sold
                    </span>
                    <span className="inline-flex items-center gap-1 bg-secondary px-2 py-0.5 rounded-lg">
                      <Layers className="size-3" /> {metrics?.accessoriesSold ?? 0} accessories sold
                    </span>
                    {(metrics?.freeGiftsList?.length ?? 0) > 0 && (
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-lg font-semibold">
                        🎁 {metrics?.freeGiftsList?.length} gifts
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-6 pt-4 border-t border-border/60 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {metrics?.linkedTransactions.length ?? 0} customer orders
                  </span>
                  <Link
                    to="/campaigns/$campaignId"
                    params={{ campaignId: campaign.id }}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
                  >
                    Open Campaign Details <ArrowUpRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}

          {filtered.length === 0 ? (
            <div className="col-span-full py-16 text-center text-muted-foreground border border-dashed rounded-2xl bg-card">
              <Megaphone className="size-8 mx-auto mb-2 text-muted-foreground/50" />
              <p className="font-medium text-foreground">No campaigns found</p>
              <p className="text-xs mt-1">Create a promotional campaign to link purchases, marketing expenses, and track profit ROI.</p>
            </div>
          ) : null}
        </div>
      </div>

      <AddCampaignDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </AppShell>
  );
}
