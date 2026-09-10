import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState, useEffect } from "react";
import {
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Calendar,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  DollarSign,
  FileCheck2,
  FileText,
  Filter,
  History,
  Info,
  Layers,
  Megaphone,
  Package,
  Printer,
  Receipt,
  Repeat,
  RotateCcw,
  ShieldCheck,
  Smartphone,
  TrendingDown,
  TrendingUp,
  Truck,
  Undo2,
  Users,
  Wallet,
  Wrench,
} from "lucide-react";
import { AppShell, PageHeader } from "@/components/fmm/AppShell";
import { BusinessReportPdfDialog } from "@/components/fmm/BusinessReportPdfDialog";
import { ProfitChart } from "@/components/fmm/ProfitChart";
import { SaleDetailDialog } from "@/components/fmm/SaleDetailDialog";
import { StatusBadge } from "@/components/fmm/StatusBadge";
import { Taka } from "@/components/fmm/Taka";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { buildDayReport, buildSeries, monthMatrix, type Granularity } from "@/lib/fmm-analytics";
import {
  generateBusinessReport,
  getReportDateRange,
  getReportHistory,
  saveReportHistory,
  clearReportHistory,
  type ComprehensiveBusinessReport,
  type ReportHistoryItem,
  type ReportPeriodType,
} from "@/lib/fmm-reports";
import {
  accessoryBusinessMetrics,
  overallBusinessMetrics,
  phoneBusinessMetrics,
  stockAgingSummary,
  useFmm,
  getTransactionPayment,
} from "@/lib/fmm-store";
import type { Transaction } from "@/lib/fmm-types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Business & Profit Reports — Faridpur Mobile Mart" },
      {
        name: "description",
        content:
          "Comprehensive financials, gross vs net profit, operating expenses, phone and accessory analytics, stock aging and cash flow analysis.",
      },
      { property: "og:title", content: "Business & Profit Reports — Faridpur Mobile Mart" },
      { property: "og:description", content: "Detailed business financial metrics, gross & net profit, phone & accessory performance." },
    ],
  }),
  component: ReportsPage,
});

const RANGE: Record<Granularity, { count: number; title: string }> = {
  daily: { count: 14, title: "Last 14 days" },
  weekly: { count: 12, title: "Last 12 weeks" },
  monthly: { count: 12, title: "Last 12 months" },
  yearly: { count: 5, title: "Last 5 years" },
};

function ReportsPage() {
  const { state } = useFmm();

  // Period Selector State
  const [periodType, setPeriodType] = useState<ReportPeriodType>("today");
  const [customStart, setCustomStart] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [customEnd, setCustomEnd] = useState(() => new Date().toISOString().slice(0, 10));

  // Domain Tabs
  const [activeTab, setActiveTab] = useState("executive");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [month, setMonth] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [selectedCalendarDay, setSelectedCalendarDay] = useState(() => new Date());
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);
  const [selectedAgingBucket, setSelectedAgingBucket] = useState<"0-7 days" | "8-30 days" | "31-60 days" | "61-90 days" | "90+ days">("31-60 days");

  // PDF Preview and History State
  const [isPdfOpen, setIsPdfOpen] = useState(false);
  const [historyList, setHistoryList] = useState<ReportHistoryItem[]>([]);

  useEffect(() => {
    setHistoryList(getReportHistory());
  }, []);

  // Compute Active Report Date Range and Comprehensive Report
  const dateRange = useMemo(
    () => getReportDateRange(periodType, customStart, customEnd),
    [periodType, customStart, customEnd],
  );

  const businessReport = useMemo(
    () => generateBusinessReport(state, dateRange),
    [state, dateRange],
  );

  // Existing domain metrics
  const phoneMetrics = useMemo(() => phoneBusinessMetrics(state), [state]);
  const accMetrics = useMemo(() => accessoryBusinessMetrics(state), [state]);
  const aging = useMemo(() => stockAgingSummary(state.phones ?? []), [state.phones]);
  const series = useMemo(() => buildSeries(state, granularity, RANGE[granularity].count), [state, granularity]);

  // Calendar day report
  const dayReport = useMemo(() => buildDayReport(state, selectedCalendarDay), [state, selectedCalendarDay]);
  const days = useMemo(() => monthMatrix(month), [month]);
  const dayTotals = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of days) map.set(d.toDateString(), buildDayReport(state, d).transactions.length);
    return map;
  }, [days, state]);

  const handlePrintPdf = () => {
    const updated = saveReportHistory({
      generatedAt: new Date().toISOString(),
      periodLabel: dateRange.label,
      periodType: dateRange.periodType,
      salesRevenue: businessReport.executive.totalSalesRevenue,
      netProfit: businessReport.executive.netProfit,
      cashInflow: businessReport.executive.cashInflow,
      type: "PDF",
    });
    setHistoryList(updated);
  };

  const { executive, sales, profit, cashFlow, customerDue, suppliers, purchases, expenses, inventory, exchanges, returns, warranty, dailyClosing } = businessReport;

  return (
    <AppShell>
      <div className="mx-auto max-w-[1400px] px-6 py-8 space-y-6">
        {/* Page Header with Action */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <PageHeader
            title="Business Intelligence & Reports"
            subtitle="Executive financial performance, accrual profit, cash flow, domain analytics and stock aging."
          />
          <div className="flex items-center gap-2 self-start sm:self-center">
            <Button
              className="rounded-xl gap-2 font-semibold shadow-sm"
              onClick={() => setIsPdfOpen(true)}
            >
              <Printer className="size-4" /> Generate PDF Report
            </Button>
          </div>
        </div>

        {/* 1. REPORT PERIOD SELECTOR (Requirement 3) */}
        <section className="rounded-2xl border border-border bg-card p-4 space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="size-3.5 text-primary" /> Report Period:
              </span>
              <span className="text-xs font-semibold text-foreground">{dateRange.label}</span>
            </div>

            <div className="flex flex-wrap gap-1.5 bg-secondary/60 p-1 rounded-xl border border-border/50">
              {(
                [
                  { key: "today", label: "Today" },
                  { key: "yesterday", label: "Yesterday" },
                  { key: "this_week", label: "This Week" },
                  { key: "this_month", label: "This Month" },
                  { key: "last_month", label: "Last Month" },
                  { key: "custom", label: "Custom" },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => setPeriodType(opt.key)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${
                    periodType === opt.key
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                      : "text-muted-foreground hover:text-foreground hover:bg-secondary"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Custom Date Pickers */}
          {periodType === "custom" && (
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-border/60 text-xs">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">From:</span>
                <Input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="h-8 w-36 rounded-lg text-xs"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">To:</span>
                <Input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="h-8 w-36 rounded-lg text-xs"
                />
              </div>
            </div>
          )}
        </section>

        {/* 2. EXECUTIVE SUMMARY (8 REQUIRED KPIS - Requirement 3) */}
        <section className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-8 gap-3">
          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Sales Revenue</p>
            <p className="text-xl font-extrabold text-foreground truncate"><Taka value={executive.totalSalesRevenue} /></p>
            <p className="text-[10px] text-muted-foreground">Realized billings</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Cash Inflow</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate"><Taka value={executive.cashInflow} /></p>
            <p className="text-[10px] text-muted-foreground">Customer cash paid</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400">Customer Due</p>
            <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400 truncate"><Taka value={executive.customerOutstanding} /></p>
            <p className="text-[10px] text-muted-foreground">Receivable in period</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-rose-600 dark:text-rose-400">Supplier Due</p>
            <p className="text-xl font-extrabold text-rose-600 dark:text-rose-400 truncate"><Taka value={executive.supplierOutstanding} /></p>
            <p className="text-[10px] text-muted-foreground">Invoice payables</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Purchases</p>
            <p className="text-xl font-extrabold text-foreground truncate"><Taka value={executive.totalPurchases} /></p>
            <p className="text-[10px] text-muted-foreground">Procured volume</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Expenses</p>
            <p className="text-xl font-extrabold text-destructive truncate"><Taka value={executive.totalExpenses} /></p>
            <p className="text-[10px] text-muted-foreground">Rent, bills & salaries</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">Gross Profit</p>
            <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400 truncate"><Taka value={executive.grossProfit} /></p>
            <p className="text-[10px] text-muted-foreground">Margin: {profit.grossMarginPercent.toFixed(1)}%</p>
          </div>

          <div className="rounded-xl border border-border bg-card p-4 space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400">Net Profit</p>
            <p className={`text-xl font-extrabold truncate ${executive.netProfit >= 0 ? "text-blue-600 dark:text-blue-400" : "text-rose-600 dark:text-rose-400"}`}>
              <Taka value={executive.netProfit} />
            </p>
            <p className="text-[10px] text-muted-foreground">Margin: {profit.netMarginPercent.toFixed(1)}%</p>
          </div>
        </section>

        {/* 3. DAILY CLOSING SUMMARY (Requirement 18 - Appears when viewing a daily period) */}
        {dailyClosing && (
          <section className="rounded-2xl border border-primary/30 bg-primary/5 p-5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-primary/20 pb-2.5">
              <div className="flex items-center gap-2">
                <FileCheck2 className="size-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">Daily Business Closing Summary — {dailyClosing.dateLabel}</h3>
              </div>
              <span className="text-[11px] font-medium text-primary bg-primary/10 px-2.5 py-0.5 rounded-full">
                Daily Register Reconciled
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3 text-xs">
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Sales Revenue</p>
                <p className="font-bold text-foreground mt-0.5"><Taka value={dailyClosing.salesRevenue} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Cash Collected</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5"><Taka value={dailyClosing.cashCollected} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Customer Due</p>
                <p className="font-bold text-amber-600 dark:text-amber-400 mt-0.5"><Taka value={dailyClosing.customerDue} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Purchases Total</p>
                <p className="font-bold text-foreground mt-0.5"><Taka value={dailyClosing.purchases} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Supplier Paid</p>
                <p className="font-bold text-rose-600 dark:text-rose-400 mt-0.5"><Taka value={dailyClosing.supplierPayments} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Expenses Paid</p>
                <p className="font-bold text-destructive mt-0.5"><Taka value={dailyClosing.expenses} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Gross Profit</p>
                <p className="font-bold text-emerald-600 dark:text-emerald-400 mt-0.5"><Taka value={dailyClosing.grossProfit} /></p>
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground uppercase">Net Cash Movement</p>
                <p className={`font-bold mt-0.5 ${dailyClosing.netCashMovement >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                  <Taka value={dailyClosing.netCashMovement} />
                </p>
              </div>
            </div>

            <div className="pt-2 border-t border-primary/20 flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
              <span>Activity Units:</span>
              <span className="font-semibold text-foreground">{dailyClosing.units.phoneSales} Phone Sales</span>
              <span>·</span>
              <span className="font-semibold text-foreground">{dailyClosing.units.accessorySales} Accessory Sales</span>
              <span>·</span>
              <span className="font-semibold text-foreground">{dailyClosing.units.exchanges} Exchanges</span>
              <span>·</span>
              <span className="font-semibold text-foreground">{dailyClosing.units.returns} Customer Returns</span>
            </div>
          </section>
        )}

        {/* 4. DOMAIN TABS */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-secondary/60 p-1 rounded-xl flex-wrap">
            <TabsTrigger value="executive" className="rounded-lg text-xs font-semibold">Executive & P&L</TabsTrigger>
            <TabsTrigger value="sales" className="rounded-lg text-xs font-semibold">Sales & Cash Flow</TabsTrigger>
            <TabsTrigger value="dues" className="rounded-lg text-xs font-semibold">Customer & Supplier Dues</TabsTrigger>
            <TabsTrigger value="inventory" className="rounded-lg text-xs font-semibold">Inventory & Aging</TabsTrigger>
            <TabsTrigger value="transactions" className="rounded-lg text-xs font-semibold">
              Period Transactions ({businessReport.transactions.length})
            </TabsTrigger>
            <TabsTrigger value="calendar" className="rounded-lg text-xs font-semibold">Day Calendar</TabsTrigger>
            <TabsTrigger value="history" className="rounded-lg text-xs font-semibold">Report History</TabsTrigger>
          </TabsList>

          {/* TAB 1: EXECUTIVE & P&L */}
          <TabsContent value="executive" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Profit & Loss Statement (Requirement 7) */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <TrendingUp className="size-4 text-emerald-500" />
                    Profit & Loss Statement (Accrual Method)
                  </h3>
                  <span className="text-xs text-muted-foreground">{dateRange.label}</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="flex justify-between items-center py-2 border-b border-border/60">
                    <span className="font-bold text-foreground text-sm">Sales Revenue</span>
                    <span className="font-bold text-foreground text-sm"><Taka value={profit.salesRevenue} /></span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 text-muted-foreground pl-4">
                    <span>Less: Cost of Goods Sold (COGS)</span>
                    <span className="font-medium text-destructive">− <Taka value={profit.cogs} /></span>
                  </div>
                  <div className="flex justify-between items-center py-2.5 px-3 rounded-xl bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 font-bold">
                    <span>Gross Profit (Product Margin)</span>
                    <span><Taka value={profit.grossProfit} /></span>
                  </div>
                  <div className="flex justify-between items-center py-1.5 text-muted-foreground pl-4">
                    <span>Less: Operating Expenses (Rent, Bills, Salaries)</span>
                    <span className="font-medium text-destructive">− <Taka value={profit.operatingExpenses} /></span>
                  </div>
                  <div className={`flex justify-between items-center py-3 px-4 rounded-xl text-sm font-black ${profit.netProfit >= 0 ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>
                    <span>Net Business Profit</span>
                    <span><Taka value={profit.netProfit} /></span>
                  </div>
                </div>
              </div>

              {/* Cash Flow Statement (Requirement 8) */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Wallet className="size-4 text-primary" />
                    Cash Flow Movement (Inflow vs Outflow)
                  </h3>
                  <span className="text-xs text-muted-foreground">Actual Cash Position</span>
                </div>

                <div className="space-y-3 text-xs">
                  <div className="p-3 rounded-xl bg-secondary/40 space-y-1.5">
                    <p className="font-bold text-emerald-600 dark:text-emerald-400">Total Cash Inflow</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Customer Sales Collections:</span>
                      <span className="font-bold text-foreground"><Taka value={cashFlow.breakdown.customerSalePayments} /></span>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-secondary/40 space-y-1.5">
                    <p className="font-bold text-destructive">Total Cash Outflow</p>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Procurement Payments:</span>
                      <span className="font-medium text-foreground"><Taka value={cashFlow.breakdown.purchasePayments} /></span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Direct Supplier Payments:</span>
                      <span className="font-medium text-foreground"><Taka value={cashFlow.breakdown.supplierDirectPayments} /></span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Operating Expenses:</span>
                      <span className="font-medium text-foreground"><Taka value={cashFlow.breakdown.operatingExpenses} /></span>
                    </div>
                    <div className="flex justify-between text-muted-foreground">
                      <span>Customer Buybacks / Intakes:</span>
                      <span className="font-medium text-foreground"><Taka value={cashFlow.breakdown.customerIntakes} /></span>
                    </div>
                    <div className="pt-1.5 border-t border-border flex justify-between font-bold text-foreground">
                      <span>Total Outflows:</span>
                      <span className="text-destructive"><Taka value={cashFlow.cashOutflow} /></span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 rounded-xl border border-border bg-card">
                    <div>
                      <p className="font-bold text-foreground">Net Cash Movement</p>
                      <p className="text-[11px] text-muted-foreground">Inflow minus Outflow</p>
                    </div>
                    <p className={`text-xl font-extrabold ${cashFlow.netCashMovement >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-destructive"}`}>
                      <Taka value={cashFlow.netCashMovement} />
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Profit & Sales Trend Chart (Requirement 19) */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold tracking-wide">SALES & PROFIT TREND</h3>
                  <p className="text-xs text-muted-foreground">{RANGE[granularity].title}</p>
                </div>

                <div className="flex rounded-lg border border-border p-0.5 bg-secondary/40">
                  {(["daily", "weekly", "monthly", "yearly"] as Granularity[]).map((g) => (
                    <button
                      key={g}
                      onClick={() => setGranularity(g)}
                      className={`px-3 py-1 text-xs capitalize rounded-md font-medium transition-colors ${
                        granularity === g ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>
              <ProfitChart data={series} height={300} />
            </div>

            {/* Exchanges, Returns & Warranty Summary (Requirements 15, 16, 17) */}
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Repeat className="size-3.5 text-primary" /> Exchanges / Trade-Ins
                </h4>
                <p className="text-2xl font-black text-foreground">{exchanges.exchangeCount}</p>
                <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span>Outgoing Phone Value:</span>
                    <span className="font-semibold text-foreground"><Taka value={exchanges.outgoingPhonesValue} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Trade-In Valuation:</span>
                    <span className="font-semibold text-foreground"><Taka value={exchanges.incomingValuation} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Customer Paid Difference:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400"><Taka value={exchanges.additionalCustomerPayment} /></span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Undo2 className="size-3.5 text-rose-500" /> Customer Returns
                </h4>
                <p className="text-2xl font-black text-foreground">{returns.returnCount}</p>
                <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span>Total Refunds:</span>
                    <span className="font-semibold text-destructive"><Taka value={returns.totalRefundAmount} /></span>
                  </div>
                  <div className="flex justify-between">
                    <span>Restocked:</span>
                    <span className="font-semibold text-foreground">{returns.dispositionBreakdown.restockedCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Returned to Supplier:</span>
                    <span className="font-semibold text-foreground">{returns.dispositionBreakdown.returnedToSupplierCount}</span>
                  </div>
                </div>
              </div>

              <div className="rounded-xl border border-border bg-card p-4 space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Wrench className="size-3.5 text-amber-500" /> Warranty Claims
                </h4>
                <p className="text-2xl font-black text-foreground">{warranty.totalClaims}</p>
                <div className="space-y-1 text-xs text-muted-foreground pt-1 border-t border-border/60">
                  <div className="flex justify-between">
                    <span>Open Claims:</span>
                    <span className="font-semibold text-amber-600 dark:text-amber-400">{warranty.openClaims}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Resolved:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400">{warranty.resolvedClaims}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Shop Repair Cost:</span>
                    <span className="font-semibold text-destructive"><Taka value={warranty.totalRepairCost} /></span>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: SALES & CASH FLOW */}
          <TabsContent value="sales" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Transactions in Period</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{sales.totalTransactions}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {sales.paidCount} Paid · {sales.partialCount} Partial · {sales.pendingCount} Pending
                </p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Phone Sales Revenue</p>
                <p className="text-2xl font-bold mt-1 text-foreground"><Taka value={sales.phoneRevenue} /></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{sales.phoneSalesCount} phone-only sales</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Accessory Sales Revenue</p>
                <p className="text-2xl font-bold mt-1 text-foreground"><Taka value={sales.accessoryRevenue} /></p>
                <p className="text-[11px] text-muted-foreground mt-0.5">{sales.accessorySalesCount} accessory sales</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <p className="text-xs text-muted-foreground">Bundled Multi-Item Sales</p>
                <p className="text-2xl font-bold mt-1 text-foreground">{sales.bundledSalesCount}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">Phone + Accessory bundles</p>
              </div>
            </div>

            {/* Operating Expenses Breakdown (Requirement 12) */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <Receipt className="size-4 text-destructive" />
                    Operating Expenses by Category
                  </h3>
                  <p className="text-xs text-muted-foreground">Total: <Taka value={expenses.totalExpenses} /> across {expenses.expenseCount} entries</p>
                </div>
                <Link to="/expenses" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                  Manage in Expenses <ArrowUpRight className="size-3" />
                </Link>
              </div>

              {expenses.categories.length === 0 ? (
                <p className="p-6 text-xs text-muted-foreground text-center">No operating expenses recorded in this period.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {expenses.categories.map((cat) => (
                    <div key={cat.category} className="p-3.5 rounded-xl border border-border bg-secondary/30 space-y-1">
                      <div className="flex justify-between text-xs font-semibold">
                        <span>{cat.category}</span>
                        <span>{cat.percentage.toFixed(0)}%</span>
                      </div>
                      <p className="text-lg font-bold text-foreground"><Taka value={cat.amount} /></p>
                      <p className="text-[11px] text-muted-foreground">{cat.count} payments recorded</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Campaign Expenses if any */}
              {expenses.campaignExpenses.length > 0 && (
                <div className="pt-3 border-t border-border space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Campaign-Linked Expenses</p>
                  <div className="flex flex-wrap gap-2">
                    {expenses.campaignExpenses.map((c) => (
                      <span key={c.campaignId} className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-primary/10 text-primary text-xs font-medium">
                        <Megaphone className="size-3" /> {c.campaignName}: <Taka value={c.amount} />
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 3: CUSTOMER & SUPPLIER DUES */}
          <TabsContent value="dues" className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {/* Customer Due & Aging Analysis (Requirement 9) */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Users className="size-4 text-amber-500" />
                      Customer Outstanding & Aging
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Total Shop Outstanding: <strong className="text-amber-600 dark:text-amber-400"><Taka value={customerDue.totalLifetimeDue} /></strong> ({customerDue.customersWithDueCount} customers)
                    </p>
                  </div>
                  <Link to="/customers" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    Customers <ArrowUpRight className="size-3" />
                  </Link>
                </div>

                {/* Aging Buckets */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 rounded-xl border border-border bg-secondary/30">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">0–30 Days (Fresh)</p>
                    <p className="text-base font-bold text-foreground mt-0.5"><Taka value={customerDue.aging.days0_30} /></p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-secondary/30">
                    <p className="text-[10px] uppercase text-muted-foreground font-semibold">31–60 Days</p>
                    <p className="text-base font-bold text-foreground mt-0.5"><Taka value={customerDue.aging.days31_60} /></p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-secondary/30">
                    <p className="text-[10px] uppercase text-amber-600 dark:text-amber-400 font-semibold">61–90 Days</p>
                    <p className="text-base font-bold text-amber-600 dark:text-amber-400 mt-0.5"><Taka value={customerDue.aging.days61_90} /></p>
                  </div>
                  <div className="p-3 rounded-xl border border-destructive/20 bg-danger-soft/20">
                    <p className="text-[10px] uppercase text-destructive font-semibold">90+ Days (Critical)</p>
                    <p className="text-base font-bold text-destructive mt-0.5"><Taka value={customerDue.aging.days90Plus} /></p>
                  </div>
                </div>

                {/* Top Dues Table */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Largest Customer Balances</p>
                  {customerDue.topDues.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4">No customer dues pending.</p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden text-xs">
                      {customerDue.topDues.slice(0, 5).map((c) => (
                        <div key={c.customerPhone + c.customerName} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                          <div>
                            <p className="font-semibold text-foreground">{c.customerName}</p>
                            <p className="text-[11px] text-muted-foreground">{c.customerPhone}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-bold text-destructive"><Taka value={c.dueAmount} /></p>
                            <p className="text-[10px] text-muted-foreground">Last: {new Date(c.lastDate).toLocaleDateString("en-GB")}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Supplier Report (Requirement 10) */}
              <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-2">
                      <Truck className="size-4 text-primary" />
                      Supplier Invoices & Payables
                    </h3>
                    <p className="text-xs text-muted-foreground">
                      Outstanding in Period: <strong className="text-rose-600 dark:text-rose-400"><Taka value={suppliers.purchaseInvoiceOutstanding} /></strong>
                    </p>
                  </div>
                  <Link to="/suppliers" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    Suppliers <ArrowUpRight className="size-3" />
                  </Link>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 rounded-xl border border-border bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Total Purchases Value</p>
                    <p className="text-lg font-bold text-foreground mt-0.5"><Taka value={suppliers.totalPurchaseValue} /></p>
                  </div>
                  <div className="p-3 rounded-xl border border-border bg-secondary/30">
                    <p className="text-[10px] text-muted-foreground uppercase font-semibold">Payments to Suppliers</p>
                    <p className="text-lg font-bold text-emerald-600 dark:text-emerald-400 mt-0.5"><Taka value={suppliers.totalSupplierPayments} /></p>
                  </div>
                </div>

                {/* Supplier Breakdown Table */}
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Purchases by Supplier in Period</p>
                  {suppliers.supplierBreakdown.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic py-4">No supplier procurement recorded in this period.</p>
                  ) : (
                    <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden text-xs">
                      {suppliers.supplierBreakdown.map((s) => (
                        <div key={s.supplierId} className="p-3 flex items-center justify-between hover:bg-secondary/30 transition-colors">
                          <div>
                            <p className="font-semibold text-foreground">{s.supplierName}</p>
                            <p className="text-[11px] text-muted-foreground">{s.purchaseCount} purchase order(s)</p>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-foreground"><Taka value={s.totalPurchaseValue} /></p>
                            <p className="text-[11px] text-muted-foreground">
                              Paid: <span className="text-emerald-600 dark:text-emerald-400 font-medium"><Taka value={s.amountPaid} /></span> · Due: <span className="text-destructive font-medium"><Taka value={s.amountDue} /></span>
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 4: INVENTORY & AGING */}
          <TabsContent value="inventory" className="space-y-6">
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">AVAILABLE PHONE STOCK</span>
                <p className="mt-2 text-3xl font-bold">{inventory.phones.availableUnits} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Valuation: <Taka value={inventory.phones.availableCostValue} /></p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">PHONES SOLD IN PERIOD</span>
                <p className="mt-2 text-3xl font-bold">{inventory.phones.soldInPeriodUnits} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Removed from stock</p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">ACCESSORY INVENTORY</span>
                <p className="mt-2 text-3xl font-bold">{inventory.accessories.totalUnits} <span className="text-xs font-normal text-muted-foreground">units</span></p>
                <p className="mt-1 text-xs text-muted-foreground">Valuation: <Taka value={inventory.accessories.totalValuation} /></p>
              </div>

              <div className="rounded-xl border border-border bg-card p-4">
                <span className="text-xs font-semibold text-muted-foreground">LOW STOCK ALERTS</span>
                <p className={`mt-2 text-3xl font-bold ${inventory.accessories.lowStockCount > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"}`}>
                  {inventory.accessories.lowStockCount} <span className="text-xs font-normal text-muted-foreground">items</span>
                </p>
                <p className="mt-1 text-xs text-muted-foreground">At or below reorder threshold</p>
              </div>
            </div>

            {/* Low Stock Reorder List (Requirement 14) */}
            {inventory.lowStockList.length > 0 && (
              <div className="rounded-2xl border border-destructive/30 bg-card p-5 space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="font-bold text-sm text-destructive flex items-center gap-2">
                    <AlertTriangle className="size-4" />
                    Low Stock Products Requiring Reorder
                  </h4>
                  <Link to="/accessories" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                    Manage Accessories <ArrowUpRight className="size-3" />
                  </Link>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {inventory.lowStockList.map((a) => (
                    <Link
                      key={a.id}
                      to="/accessories"
                      search={{ search: a.name }}
                      className="p-3 rounded-xl bg-danger-soft/20 border border-destructive/20 text-xs hover:border-destructive hover:bg-danger-soft/30 transition-colors block group"
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-semibold text-foreground group-hover:text-destructive transition-colors">{a.name}</p>
                        <ArrowUpRight className="size-3 text-destructive opacity-0 group-hover:opacity-100 transition-opacity" />
                      </div>
                      <p className="text-muted-foreground mt-0.5">
                        In Stock: <strong className="text-destructive">{a.quantity}</strong> (Min Threshold: {a.minThreshold})
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">Supplier: {a.supplierName}</p>
                    </Link>
                  ))}
                </div>
              </div>
            )}

            {/* Stock Aging Analysis */}
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold flex items-center gap-2">
                  <Clock className="size-4 text-primary" />
                  Phone Stock Aging Analysis
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Fast-moving inventory vs slow-moving/dead stock categorized by acquisition date.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-5">
                {(
                  [
                    { key: "0-7 days", label: "Fresh Stock (0-7d)", color: "text-success bg-success-soft/30 border-success/30" },
                    { key: "8-30 days", label: "Normal (8-30d)", color: "text-foreground bg-secondary/60 border-border" },
                    { key: "31-60 days", label: "Aging (31-60d)", color: "text-warning bg-warning-soft/30 border-warning/30" },
                    { key: "61-90 days", label: "Slow Moving (61-90d)", color: "text-destructive bg-danger-soft/30 border-destructive/30" },
                    { key: "90+ days", label: "Dead Stock (90d+)", color: "text-destructive bg-danger-soft border-destructive/50" },
                  ] as const
                ).map(({ key, label, color }) => {
                  const list = aging[key] || [];
                  const val = list.reduce((s, p) => s + p.purchase_price, 0);
                  const isSelected = selectedAgingBucket === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSelectedAgingBucket(key)}
                      className={`rounded-xl border p-3.5 text-left transition-all ${color} ${
                        isSelected ? "ring-2 ring-primary shadow-sm" : "hover:opacity-90"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold">{label}</span>
                        {isSelected && <span className="size-2 rounded-full bg-primary" />}
                      </div>
                      <p className="text-2xl font-bold mt-2">{list.length} <span className="text-xs font-normal">units</span></p>
                      <p className="text-xs mt-1 opacity-80"><Taka value={val} /></p>
                    </button>
                  );
                })}
              </div>

              {/* Selected Aging Bucket Details Table */}
              <div className="rounded-xl border border-border bg-secondary/20 overflow-hidden">
                <div className="px-4 py-3 border-b border-border bg-secondary/40 flex items-center justify-between">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-foreground">
                    {selectedAgingBucket} Available Inventory ({aging[selectedAgingBucket]?.length ?? 0} units)
                  </h4>
                  {aging[selectedAgingBucket]?.length > 0 && (
                    <Link to="/stock" className="text-xs text-primary font-semibold hover:underline flex items-center gap-1">
                      View in Stock <ArrowUpRight className="size-3" />
                    </Link>
                  )}
                </div>

                {aging[selectedAgingBucket]?.length === 0 ? (
                  <p className="p-6 text-xs text-muted-foreground text-center">
                    No available phones in this aging bucket.
                  </p>
                ) : (
                  <div className="overflow-x-auto max-h-72">
                    <table className="w-full text-xs">
                      <thead className="border-b border-border bg-secondary/30 text-left text-muted-foreground">
                        <tr>
                          <th className="px-4 py-2.5 font-medium">Device / Model</th>
                          <th className="px-4 py-2.5 font-medium">IMEI</th>
                          <th className="px-4 py-2.5 font-medium">Specs</th>
                          <th className="px-4 py-2.5 text-right font-medium">Cost</th>
                          <th className="px-4 py-2.5 text-right font-medium">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/60">
                        {aging[selectedAgingBucket].map((p) => (
                          <tr key={p.id} className="hover:bg-secondary/40 transition-colors">
                            <td className="px-4 py-2.5 font-semibold text-foreground">{p.brand} {p.model}</td>
                            <td className="px-4 py-2.5 font-mono text-muted-foreground">{p.imei}</td>
                            <td className="px-4 py-2.5 text-muted-foreground">{p.storage_ram} · {p.condition}</td>
                            <td className="px-4 py-2.5 text-right font-medium"><Taka value={p.purchase_price} /></td>
                            <td className="px-4 py-2.5 text-right">
                              <Link to="/stock" search={{ q: p.imei }} className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                                Stock Details <ArrowUpRight className="size-3" />
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </TabsContent>

          {/* TAB 5: DETAILED TRANSACTIONS TABLE (Requirement 20) */}
          <TabsContent value="transactions" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold">Period Transactions</h3>
                  <p className="text-xs text-muted-foreground">Click any transaction to open full sale details and invoice</p>
                </div>
                <span className="text-xs text-muted-foreground font-semibold">
                  {businessReport.transactions.length} record(s)
                </span>
              </div>

              {businessReport.transactions.length === 0 ? (
                <p className="p-10 text-center text-sm text-muted-foreground">No transactions recorded in this period.</p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="border-b border-border bg-secondary/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-4 py-3 font-semibold">Date & Time</th>
                        <th className="px-4 py-3 font-semibold">Customer</th>
                        <th className="px-4 py-3 font-semibold">Items / Device</th>
                        <th className="px-4 py-3 font-semibold">Type</th>
                        <th className="px-4 py-3 text-right font-semibold">Sales Revenue</th>
                        <th className="px-4 py-3 text-right font-semibold">Paid</th>
                        <th className="px-4 py-3 text-right font-semibold">Due</th>
                        <th className="px-4 py-3 text-center font-semibold">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {businessReport.transactions.map((t) => {
                        const pay = getTransactionPayment(t);
                        const phone = state.phones.find((p) => p.id === t.phone_id);
                        const summaryDesc = t.items && t.items.length > 0
                          ? t.items.map((it) => it.name).join(", ")
                          : phone ? `${phone.brand} ${phone.model}` : "Item";

                        return (
                          <tr
                            key={t.id}
                            onClick={() => setSelectedTx(t)}
                            className="cursor-pointer hover:bg-secondary/40 transition-colors group"
                          >
                            <td className="px-4 py-3 font-mono text-[11px] text-muted-foreground">
                              {new Date(t.date).toLocaleDateString("en-GB")}{" "}
                              {new Date(t.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </td>
                            <td className="px-4 py-3 font-semibold text-foreground group-hover:text-primary transition-colors">
                              {t.customer_name}
                              <p className="text-[10px] text-muted-foreground font-normal">{t.customer_phone}</p>
                            </td>
                            <td className="px-4 py-3 text-muted-foreground max-w-xs truncate" title={summaryDesc}>
                              {summaryDesc}
                            </td>
                            <td className="px-4 py-3 text-muted-foreground font-medium">{t.type}</td>
                            <td className="px-4 py-3 text-right font-bold text-foreground"><Taka value={pay.total} /></td>
                            <td className="px-4 py-3 text-right font-medium text-emerald-600 dark:text-emerald-400"><Taka value={pay.paid} /></td>
                            <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400"><Taka value={pay.due} /></td>
                            <td className="px-4 py-3 text-center"><StatusBadge status={pay.status} /></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </TabsContent>

          {/* TAB 6: DAY CALENDAR REPORT */}
          <TabsContent value="calendar" className="space-y-6">
            <div className="grid gap-4 xl:grid-cols-[380px_1fr]">
              <div className="rounded-2xl border border-border bg-card p-5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CalendarDays className="size-4 text-muted-foreground" />
                    <h3 className="text-sm font-bold tracking-wide">
                      {month.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
                    </h3>
                  </div>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous month"
                      className="rounded-lg p-1.5 hover:bg-secondary"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() - 1, 1))}
                    >
                      <ChevronLeft className="size-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next month"
                      className="rounded-lg p-1.5 hover:bg-secondary"
                      onClick={() => setMonth(new Date(month.getFullYear(), month.getMonth() + 1, 1))}
                    >
                      <ChevronRight className="size-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-7 gap-1 text-center text-[11px] text-muted-foreground font-medium">
                  {["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"].map((d) => (
                    <span key={d} className="py-1">{d}</span>
                  ))}
                </div>
                <div className="mt-1 grid grid-cols-7 gap-1">
                  {days.map((d) => {
                    const inMonth = d.getMonth() === month.getMonth();
                    const isSelected = d.toDateString() === selectedCalendarDay.toDateString();
                    const isToday = d.toDateString() === new Date().toDateString();
                    const count = dayTotals.get(d.toDateString()) ?? 0;
                    return (
                      <button
                        key={d.toISOString()}
                        type="button"
                        onClick={() => setSelectedCalendarDay(d)}
                        className={cn(
                          "relative aspect-square rounded-lg text-sm transition-colors",
                          inMonth ? "text-foreground" : "text-muted-foreground/40",
                          isSelected ? "bg-primary text-primary-foreground font-bold" : "hover:bg-secondary",
                          !isSelected && isToday && "ring-1 ring-primary",
                        )}
                      >
                        {d.getDate()}
                        {count > 0 ? (
                          <span
                            className={cn(
                              "absolute bottom-1.5 left-1/2 size-1.5 -translate-x-1/2 rounded-full",
                              isSelected ? "bg-primary-foreground" : "bg-primary",
                            )}
                          />
                        ) : null}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-4 text-xs text-muted-foreground">A dot marks days with recorded transactions.</p>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-5">
                  <h3 className="text-sm font-bold tracking-wide">
                    DAY REPORT — {dayReport.date.toLocaleDateString("en-US", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
                  </h3>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
                    {[
                      { label: "Sales Revenue", value: <Taka value={dayReport.revenue} /> },
                      { label: "Cash Inflow", value: <Taka value={dayReport.cashInflow} /> },
                      { label: "Gross Profit", value: <Taka value={dayReport.profit} /> },
                      { label: "Pending Dues", value: <Taka value={dayReport.pending} /> },
                      { label: "Stock Purchased", value: <Taka value={dayReport.purchaseSpend} /> },
                    ].map((s) => (
                      <div key={s.label} className="rounded-xl border border-border p-3 bg-secondary/20">
                        <p className="text-xs text-muted-foreground">{s.label}</p>
                        <p className="mt-1 text-lg font-bold text-foreground">{s.value}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border border-border bg-card overflow-hidden">
                  <h3 className="border-b border-border px-5 py-4 text-sm font-bold tracking-wide">Day's Transactions</h3>
                  {dayReport.transactions.length === 0 ? (
                    <p className="px-5 py-6 text-sm text-muted-foreground">No transactions recorded on this date.</p>
                  ) : (
                    <table className="w-full text-xs">
                      <thead className="border-b border-border text-left text-muted-foreground bg-secondary/30">
                        <tr>
                          <th className="px-5 py-3 font-medium">Customer</th>
                          <th className="px-5 py-3 font-medium">Device / Item</th>
                          <th className="px-5 py-3 font-medium">Status</th>
                          <th className="px-5 py-3 text-right font-medium">Amount</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {dayReport.transactions.map((t) => {
                          const phone = state.phones.find((p) => p.id === t.phone_id);
                          return (
                            <tr
                              key={t.id}
                              onClick={() => setSelectedTx(t)}
                              className="cursor-pointer hover:bg-secondary/40 transition-colors group"
                            >
                              <td className="px-5 py-3 font-semibold group-hover:text-primary transition-colors">{t.customer_name}</td>
                              <td className="px-5 py-3 text-muted-foreground">{phone ? `${phone.brand} ${phone.model}` : "Item"}</td>
                              <td className="px-5 py-3"><StatusBadge status={t.payment_status} /></td>
                              <td className="px-5 py-3 text-right font-bold text-foreground"><Taka value={t.amount} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 7: REPORT HISTORY (Requirement 23) */}
          <TabsContent value="history" className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div>
                  <h3 className="text-base font-bold flex items-center gap-2">
                    <History className="size-4 text-primary" /> Report Generation History
                  </h3>
                  <p className="text-xs text-muted-foreground">Audit record of recently generated business reports</p>
                </div>
                {historyList.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => {
                      clearReportHistory();
                      setHistoryList([]);
                    }}
                  >
                    Clear History
                  </Button>
                )}
              </div>

              {historyList.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground space-y-2">
                  <FileText className="size-8 mx-auto text-muted-foreground/40" />
                  <p className="font-semibold">No report history recorded yet.</p>
                  <p>Generate a PDF report using the "Generate PDF Report" button to create an audit record.</p>
                </div>
              ) : (
                <div className="divide-y divide-border/60 rounded-xl border border-border overflow-hidden text-xs">
                  {historyList.map((h) => (
                    <div key={h.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-secondary/30 transition-colors">
                      <div>
                        <p className="font-bold text-foreground text-sm flex items-center gap-2">
                          <FileText className="size-4 text-primary" /> {h.periodLabel}
                        </p>
                        <p className="text-[11px] text-muted-foreground mt-0.5">
                          Generated: {new Date(h.generatedAt).toLocaleString("en-GB")}
                        </p>
                      </div>

                      <div className="flex items-center gap-4 text-xs">
                        <div className="text-right">
                          <p className="font-semibold text-foreground">Sales: <Taka value={h.salesRevenue} /></p>
                          <p className="text-[11px] text-muted-foreground">
                            Profit: <span className="font-medium text-emerald-600 dark:text-emerald-400"><Taka value={h.netProfit} /></span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          className="rounded-xl text-xs gap-1.5"
                          onClick={() => setIsPdfOpen(true)}
                        >
                          <Printer className="size-3.5" /> View / Print
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </div>

      {/* Sale Detail Dialog */}
      <SaleDetailDialog transaction={selectedTx} onClose={() => setSelectedTx(null)} />

      {/* Business Report PDF Modal */}
      <BusinessReportPdfDialog
        open={isPdfOpen}
        onOpenChange={setIsPdfOpen}
        report={businessReport}
        onPrinted={handlePrintPdf}
      />
    </AppShell>
  );
}
