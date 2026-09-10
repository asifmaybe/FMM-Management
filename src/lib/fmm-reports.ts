import type {
  Accessory,
  CustomerReturn,
  ExchangeRecord,
  Expense,
  FmmState,
  Phone,
  Purchase,
  SupplierPayment,
  Transaction,
  WarrantyClaim,
} from "./fmm-types";
import { getTransactionPayment } from "./fmm-store";
import { getTransactionCost } from "./fmm-analytics";

export type ReportPeriodType = "today" | "yesterday" | "this_week" | "this_month" | "last_month" | "custom";

export interface ReportDateRange {
  start: Date;
  end: Date;
  label: string;
  periodType: ReportPeriodType;
  isDaily: boolean;
}

export interface ExecutiveKPIs {
  totalSalesRevenue: number;
  cashInflow: number;
  customerOutstanding: number;
  supplierOutstanding: number;
  totalPurchases: number;
  totalExpenses: number;
  grossProfit: number;
  netProfit: number;
  totalCOGS: number;
  netCashMovement: number;
}

export interface SalesReportMetrics {
  totalTransactions: number;
  phoneSalesCount: number;
  accessorySalesCount: number;
  bundledSalesCount: number;
  exchangeCount: number;
  returnCount: number;
  paidCount: number;
  partialCount: number;
  pendingCount: number;
  totalSalesRevenue: number;
  amountCollected: number;
  outstandingAmount: number;
  phoneRevenue: number;
  accessoryRevenue: number;
}

export interface ProfitReportMetrics {
  salesRevenue: number;
  cogs: number;
  grossProfit: number;
  grossMarginPercent: number;
  operatingExpenses: number;
  netProfit: number;
  netMarginPercent: number;
}

export interface CashFlowMetrics {
  cashInflow: number;
  cashOutflow: number;
  netCashMovement: number;
  breakdown: {
    customerSalePayments: number;
    purchasePayments: number;
    supplierDirectPayments: number;
    operatingExpenses: number;
    customerIntakes: number;
  };
}

export interface CustomerDueItem {
  customerId?: string | null | undefined;
  customerName: string;
  customerPhone: string;
  dueAmount: number;
  lastDate: string;
  transactionCount: number;
}

export interface CustomerDueMetrics {
  totalPeriodDue: number;
  totalLifetimeDue: number;
  customersWithDueCount: number;
  topDues: CustomerDueItem[];
  aging: {
    days0_30: number;
    days31_60: number;
    days61_90: number;
    days90Plus: number;
  };
}

export interface SupplierReportItem {
  supplierId: string;
  supplierName: string;
  purchaseCount: number;
  totalPurchaseValue: number;
  amountPaid: number;
  amountDue: number;
}

export interface SupplierReportMetrics {
  totalPurchaseValue: number;
  totalSupplierPayments: number;
  purchaseInvoiceOutstanding: number;
  consignmentPayable: number;
  supplierBreakdown: SupplierReportItem[];
}

export interface PurchaseReportMetrics {
  totalPurchasesAmount: number;
  purchaseOrdersCount: number;
  phonePurchasesCount: number;
  accessoryPurchasesCount: number;
  mixedPurchasesCount: number;
  amountPaid: number;
  amountDue: number;
}

export interface ExpenseCategorySummary {
  category: string;
  amount: number;
  count: number;
  percentage: number;
}

export interface ExpenseReportMetrics {
  totalExpenses: number;
  expenseCount: number;
  categories: ExpenseCategorySummary[];
  campaignExpenses: { campaignId: string; campaignName: string; amount: number }[];
}

export interface InventoryReportMetrics {
  phones: {
    availableUnits: number;
    availableCostValue: number;
    soldInPeriodUnits: number;
    inInspectionUnits: number;
  };
  accessories: {
    totalUnits: number;
    totalValuation: number;
    lowStockCount: number;
    outOfStockCount: number;
  };
  lowStockList: {
    id: string;
    name: string;
    quantity: number;
    minThreshold: number;
    supplierName: string;
    purchasePrice: number;
    sellingPrice: number;
  }[];
}

export interface ExchangeReportMetrics {
  exchangeCount: number;
  outgoingPhonesValue: number;
  incomingValuation: number;
  additionalCustomerPayment: number;
  shopOwedToCustomer: number;
}

export interface ReturnsReportMetrics {
  returnCount: number;
  totalRefundAmount: number;
  dispositionBreakdown: {
    restockedCount: number;
    refundOnlyCount: number;
    returnedToSupplierCount: number;
  };
}

export interface WarrantyReportMetrics {
  totalClaims: number;
  openClaims: number;
  resolvedClaims: number;
  totalRepairCost: number;
  totalCustomerCharge: number;
}

export interface DailyClosingMetrics {
  dateLabel: string;
  salesRevenue: number;
  cashCollected: number;
  customerDue: number;
  purchases: number;
  supplierPayments: number;
  expenses: number;
  grossProfit: number;
  netProfit: number;
  netCashMovement: number;
  units: {
    phoneSales: number;
    accessorySales: number;
    exchanges: number;
    returns: number;
  };
}

export interface ComprehensiveBusinessReport {
  range: ReportDateRange;
  generatedAt: string;
  executive: ExecutiveKPIs;
  sales: SalesReportMetrics;
  profit: ProfitReportMetrics;
  cashFlow: CashFlowMetrics;
  customerDue: CustomerDueMetrics;
  suppliers: SupplierReportMetrics;
  purchases: PurchaseReportMetrics;
  expenses: ExpenseReportMetrics;
  inventory: InventoryReportMetrics;
  exchanges: ExchangeReportMetrics;
  returns: ReturnsReportMetrics;
  warranty: WarrantyReportMetrics;
  dailyClosing?: DailyClosingMetrics | undefined;
  transactions: Transaction[];
  filteredPurchases: Purchase[];
  filteredExpenses: Expense[];
  filteredReturns: CustomerReturn[];
  filteredExchanges: ExchangeRecord[];
  filteredWarranty: WarrantyClaim[];
}

export interface ReportHistoryItem {
  id: string;
  generatedAt: string;
  periodLabel: string;
  periodType: ReportPeriodType;
  salesRevenue: number;
  netProfit: number;
  cashInflow: number;
  type: "PDF" | "Summary";
}

// -------------------------------------------------------------
// Date Utility Functions
// -------------------------------------------------------------

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function endOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function getReportDateRange(
  periodType: ReportPeriodType,
  customStart?: string,
  customEnd?: string,
): ReportDateRange {
  const now = new Date();

  switch (periodType) {
    case "today": {
      const s = startOfDay(now);
      const e = endOfDay(now);
      return {
        start: s,
        end: e,
        label: `Today (${s.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })})`,
        periodType,
        isDaily: true,
      };
    }
    case "yesterday": {
      const yesterday = addDays(now, -1);
      const s = startOfDay(yesterday);
      const e = endOfDay(yesterday);
      return {
        start: s,
        end: e,
        label: `Yesterday (${s.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })})`,
        periodType,
        isDaily: true,
      };
    }
    case "this_week": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = addDays(startOfDay(now), -diffToMonday);
      const s = monday;
      const e = endOfDay(now);
      return {
        start: s,
        end: e,
        label: `This Week (${s.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${e.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })})`,
        periodType,
        isDaily: false,
      };
    }
    case "this_month": {
      const s = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      const e = endOfDay(now);
      return {
        start: s,
        end: e,
        label: `This Month (${s.toLocaleDateString("en-GB", { month: "long", year: "numeric" })})`,
        periodType,
        isDaily: false,
      };
    }
    case "last_month": {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      const lastDayOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        start: s,
        end: lastDayOfPrevMonth,
        label: `Last Month (${s.toLocaleDateString("en-GB", { month: "long", year: "numeric" })})`,
        periodType,
        isDaily: false,
      };
    }
    case "custom": {
      const s = customStart ? startOfDay(new Date(customStart)) : startOfDay(addDays(now, -30));
      const e = customEnd ? endOfDay(new Date(customEnd)) : endOfDay(now);
      const isSingleDay = s.toDateString() === e.toDateString();
      return {
        start: s,
        end: e,
        label: isSingleDay
          ? s.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
          : `${s.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} – ${e.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`,
        periodType,
        isDaily: isSingleDay,
      };
    }
  }
}

// -------------------------------------------------------------
// Comprehensive Report Generator
// -------------------------------------------------------------

export function generateBusinessReport(state: FmmState, range: ReportDateRange): ComprehensiveBusinessReport {
  const startMs = range.start.getTime();
  const endMs = range.end.getTime();

  const isWithin = (iso?: string | null) => {
    if (!iso) return false;
    const t = new Date(iso).getTime();
    return t >= startMs && t <= endMs;
  };

  // Filtered collections
  const filteredTxs = (state.transactions ?? []).filter((t) => isWithin(t.date));
  const filteredPurchases = (state.purchases ?? []).filter((p) => isWithin(p.date || p.created_at));
  const filteredExpenses = (state.expenses ?? []).filter((e) => isWithin(e.date || e.created_at));
  const filteredSupplierPayments = (state.supplier_payments ?? []).filter((sp) => isWithin(sp.date || sp.created_at));
  const filteredCustomerPurchases = (state.customer_purchases ?? []).filter((cp) => isWithin(cp.created_at));
  const filteredExchanges = (state.exchanges ?? []).filter((ex) => isWithin(ex.date));
  const filteredReturns = (state.returns ?? []).filter((r) => isWithin(r.return_date || r.created_at));
  const filteredWarranty = (state.warranty_claims ?? []).filter((w) => isWithin(w.claim_date || w.created_at));

  // 1. Sales Metrics
  let totalSalesRevenue = 0;
  let cashInflow = 0;
  let periodCustomerOutstanding = 0;
  let totalCOGS = 0;
  let phoneRevenue = 0;
  let accessoryRevenue = 0;
  let phoneSalesCount = 0;
  let accessorySalesCount = 0;
  let bundledSalesCount = 0;
  let exchangeTxCount = 0;
  let returnTxCount = 0;
  let paidCount = 0;
  let partialCount = 0;
  let pendingCount = 0;

  for (const t of filteredTxs) {
    const pay = getTransactionPayment(t);
    totalSalesRevenue += pay.total;
    cashInflow += pay.paid;
    periodCustomerOutstanding += pay.due;

    const cogs = getTransactionCost(state, t);
    totalCOGS += cogs;

    if (pay.status === "Paid") paidCount++;
    else if (pay.status === "Partial") partialCount++;
    else pendingCount++;

    if (t.type === "Exchange") exchangeTxCount++;
    if (t.type === "Return") returnTxCount++;

    const hasPhone = (t.items && t.items.some((it) => it.type === "phone")) || (t.phone_id && t.phone_id !== "acc_multi");
    const hasAcc = t.items && t.items.some((it) => it.type === "accessory");

    if (hasPhone && hasAcc) bundledSalesCount++;
    else if (hasPhone) phoneSalesCount++;
    else if (hasAcc) accessorySalesCount++;

    if (t.items && t.items.length > 0) {
      for (const it of t.items) {
        if (it.type === "phone") {
          phoneRevenue += it.subtotal ?? it.unit_price * (it.quantity || 1);
        } else if (it.type === "accessory" && !it.is_gift) {
          accessoryRevenue += it.subtotal ?? it.unit_price * (it.quantity || 1);
        }
      }
    } else {
      // Legacy single phone transaction
      phoneRevenue += pay.total;
    }
  }

  // 2. Profit Metrics
  const grossProfit = totalSalesRevenue - totalCOGS;
  const grossMarginPercent = totalSalesRevenue > 0 ? (grossProfit / totalSalesRevenue) * 100 : 0;
  const operatingExpenses = filteredExpenses.reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - operatingExpenses;
  const netMarginPercent = totalSalesRevenue > 0 ? (netProfit / totalSalesRevenue) * 100 : 0;

  // 3. Cash Flow Metrics
  const purchasePayments = filteredPurchases.reduce((s, p) => s + (p.paid_amount || 0), 0);
  const supplierDirectPayments = filteredSupplierPayments.reduce((s, sp) => s + sp.amount, 0);
  const customerIntakes = filteredCustomerPurchases.reduce((s, cp) => s + cp.purchase_price, 0);
  const cashOutflow = purchasePayments + supplierDirectPayments + operatingExpenses + customerIntakes;
  const netCashMovement = cashInflow - cashOutflow;

  // 4. Customer Due & Aging Analysis (Authoritative across transactions)
  let totalLifetimeDue = 0;
  const nowMs = Date.now();
  let agingDays0_30 = 0;
  let agingDays31_60 = 0;
  let agingDays61_90 = 0;
  let agingDays90Plus = 0;

  const customerDueMap = new Map<string, CustomerDueItem>();

  for (const t of state.transactions ?? []) {
    const pay = getTransactionPayment(t);
    if (pay.due > 0) {
      totalLifetimeDue += pay.due;
      const ageDays = Math.max(0, Math.floor((nowMs - new Date(t.date).getTime()) / (1000 * 60 * 60 * 24)));

      if (ageDays <= 30) agingDays0_30 += pay.due;
      else if (ageDays <= 60) agingDays31_60 += pay.due;
      else if (ageDays <= 90) agingDays61_90 += pay.due;
      else agingDays90Plus += pay.due;

      const key = t.customer_phone || t.customer_name || "Unknown Customer";
      const existing = customerDueMap.get(key);
      if (existing) {
        existing.dueAmount += pay.due;
        existing.transactionCount++;
        if (new Date(t.date).getTime() > new Date(existing.lastDate).getTime()) {
          existing.lastDate = t.date;
        }
      } else {
        customerDueMap.set(key, {
          customerId: t.customer_id,
          customerName: t.customer_name || "Customer",
          customerPhone: t.customer_phone || "—",
          dueAmount: pay.due,
          lastDate: t.date,
          transactionCount: 1,
        });
      }
    }
  }

  const topDues = Array.from(customerDueMap.values()).sort((a, b) => b.dueAmount - a.dueAmount);

  // 5. Supplier Metrics
  const totalPurchasesAmount = filteredPurchases.reduce((s, p) => s + p.total_amount, 0);
  const purchaseInvoiceOutstanding = filteredPurchases.reduce((s, p) => s + Math.max(0, p.total_amount - (p.paid_amount || 0)), 0);

  function getSupplierName(sId?: string | null): string {
    if (!sId) return "—";
    const found = (state.suppliers ?? []).find((s) => s.id === sId);
    return found ? found.name : "Supplier";
  }

  // Supplier breakdown
  const supplierBreakdownMap = new Map<string, SupplierReportItem>();
  for (const p of filteredPurchases) {
    const sName = getSupplierName(p.supplier_id);
    const existing = supplierBreakdownMap.get(p.supplier_id);
    const due = Math.max(0, p.total_amount - (p.paid_amount || 0));
    if (existing) {
      existing.purchaseCount++;
      existing.totalPurchaseValue += p.total_amount;
      existing.amountPaid += p.paid_amount || 0;
      existing.amountDue += due;
    } else {
      supplierBreakdownMap.set(p.supplier_id, {
        supplierId: p.supplier_id,
        supplierName: sName,
        purchaseCount: 1,
        totalPurchaseValue: p.total_amount,
        amountPaid: p.paid_amount || 0,
        amountDue: due,
      });
    }
  }

  // 6. Purchases breakdown
  let phonePurchasesCount = 0;
  let accessoryPurchasesCount = 0;
  let mixedPurchasesCount = 0;
  let purchasesPaidTotal = 0;
  let purchasesDueTotal = 0;

  for (const p of filteredPurchases) {
    if (p.type === "Phone") phonePurchasesCount++;
    else if (p.type === "Accessory") accessoryPurchasesCount++;
    else mixedPurchasesCount++;

    purchasesPaidTotal += p.paid_amount || 0;
    purchasesDueTotal += Math.max(0, p.total_amount - (p.paid_amount || 0));
  }

  // 7. Expense Metrics
  const expenseCatMap = new Map<string, { amount: number; count: number }>();
  const campaignExpensesList: { campaignId: string; campaignName: string; amount: number }[] = [];

  for (const e of filteredExpenses) {
    const cat = e.category || "Miscellaneous";
    const cur = expenseCatMap.get(cat) || { amount: 0, count: 0 };
    expenseCatMap.set(cat, { amount: cur.amount + e.amount, count: cur.count + 1 });

    if (e.campaign_id) {
      const cmp = (state.campaigns ?? []).find((c) => c.id === e.campaign_id);
      campaignExpensesList.push({
        campaignId: e.campaign_id,
        campaignName: cmp?.name || "Campaign",
        amount: e.amount,
      });
    }
  }

  const expenseCategories: ExpenseCategorySummary[] = Array.from(expenseCatMap.entries())
    .map(([category, val]) => ({
      category,
      amount: val.amount,
      count: val.count,
      percentage: operatingExpenses > 0 ? (val.amount / operatingExpenses) * 100 : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  // 8. Inventory Metrics (Snapshot from current authoritative inventory)
  const availablePhones = (state.phones ?? []).filter((p) => p.status === "Available");
  const availablePhoneCost = availablePhones.reduce((s, p) => s + p.purchase_price, 0);
  const soldInPeriodPhones = (state.phones ?? []).filter((p) => p.status === "Sold" && isWithin(p.updated_at));
  const inInspectionPhones = (state.phones ?? []).filter((p) => p.status === "In Inspection");

  const accessories = state.accessories ?? [];
  const totalAccUnits = accessories.reduce((s, a) => s + a.quantity, 0);
  const totalAccValuation = accessories.reduce((s, a) => s + a.quantity * a.purchase_price, 0);
  const lowStockAccessories = accessories.filter((a) => a.quantity <= a.min_threshold);
  const outOfStockAccessories = accessories.filter((a) => a.quantity === 0);

  const lowStockList = lowStockAccessories.map((a) => ({
    id: a.id,
    name: a.name,
    quantity: a.quantity,
    minThreshold: a.min_threshold,
    supplierName: getSupplierName(a.supplier_id),
    purchasePrice: a.purchase_price,
    sellingPrice: a.selling_price,
  }));

  // 9. Exchange Metrics
  let outgoingValuationTotal = 0;
  let incomingValuationTotal = 0;
  let additionalPaidTotal = 0;

  for (const ex of filteredExchanges) {
    outgoingValuationTotal += ex.outgoing_value || 0;
    incomingValuationTotal += ex.incoming_valuation || 0;
    additionalPaidTotal += ex.additional_paid || 0;
  }

  // 10. Returns Metrics
  let returnRefundTotal = 0;
  let restockedCount = 0;
  let refundOnlyCount = 0;
  let returnedToSupplierCount = 0;

  for (const r of filteredReturns) {
    returnRefundTotal += r.refund_amount || 0;
    if (r.disposition === "Restocked") restockedCount++;
    else if (r.disposition === "Returned to Supplier") returnedToSupplierCount++;
    else refundOnlyCount++;
  }

  // 11. Warranty Metrics
  const openWarranty = filteredWarranty.filter((w) => w.status !== "Resolved" && w.status !== "Rejected");
  const resolvedWarranty = filteredWarranty.filter((w) => w.status === "Resolved");
  const totalRepairCost = filteredWarranty.reduce((s, w) => s + (w.repair_cost || 0), 0);
  const totalCustomerCharge = filteredWarranty.reduce((s, w) => s + (w.customer_charge || 0), 0);

  // 12. Daily Closing Summary
  let dailyClosing: DailyClosingMetrics | undefined;
  if (range.isDaily) {
    dailyClosing = {
      dateLabel: range.label,
      salesRevenue: totalSalesRevenue,
      cashCollected: cashInflow,
      customerDue: periodCustomerOutstanding,
      purchases: totalPurchasesAmount,
      supplierPayments: supplierDirectPayments + purchasePayments,
      expenses: operatingExpenses,
      grossProfit,
      netProfit,
      netCashMovement,
      units: {
        phoneSales: phoneSalesCount + bundledSalesCount,
        accessorySales: accessorySalesCount,
        exchanges: filteredExchanges.length,
        returns: filteredReturns.length,
      },
    };
  }

  return {
    range,
    generatedAt: new Date().toISOString(),
    executive: {
      totalSalesRevenue,
      cashInflow,
      customerOutstanding: periodCustomerOutstanding,
      supplierOutstanding: purchaseInvoiceOutstanding,
      totalPurchases: totalPurchasesAmount,
      totalExpenses: operatingExpenses,
      grossProfit,
      netProfit,
      totalCOGS,
      netCashMovement,
    },
    sales: {
      totalTransactions: filteredTxs.length,
      phoneSalesCount,
      accessorySalesCount,
      bundledSalesCount,
      exchangeCount: exchangeTxCount,
      returnCount: returnTxCount,
      paidCount,
      partialCount,
      pendingCount,
      totalSalesRevenue,
      amountCollected: cashInflow,
      outstandingAmount: periodCustomerOutstanding,
      phoneRevenue,
      accessoryRevenue,
    },
    profit: {
      salesRevenue: totalSalesRevenue,
      cogs: totalCOGS,
      grossProfit,
      grossMarginPercent,
      operatingExpenses,
      netProfit,
      netMarginPercent,
    },
    cashFlow: {
      cashInflow,
      cashOutflow,
      netCashMovement,
      breakdown: {
        customerSalePayments: cashInflow,
        purchasePayments,
        supplierDirectPayments,
        operatingExpenses,
        customerIntakes,
      },
    },
    customerDue: {
      totalPeriodDue: periodCustomerOutstanding,
      totalLifetimeDue,
      customersWithDueCount: customerDueMap.size,
      topDues: topDues.slice(0, 10),
      aging: {
        days0_30: agingDays0_30,
        days31_60: agingDays31_60,
        days61_90: agingDays61_90,
        days90Plus: agingDays90Plus,
      },
    },
    suppliers: {
      totalPurchaseValue: totalPurchasesAmount,
      totalSupplierPayments: supplierDirectPayments + purchasePayments,
      purchaseInvoiceOutstanding,
      consignmentPayable: 0,
      supplierBreakdown: Array.from(supplierBreakdownMap.values()),
    },
    purchases: {
      totalPurchasesAmount,
      purchaseOrdersCount: filteredPurchases.length,
      phonePurchasesCount,
      accessoryPurchasesCount,
      mixedPurchasesCount,
      amountPaid: purchasesPaidTotal,
      amountDue: purchasesDueTotal,
    },
    expenses: {
      totalExpenses: operatingExpenses,
      expenseCount: filteredExpenses.length,
      categories: expenseCategories,
      campaignExpenses: campaignExpensesList,
    },
    inventory: {
      phones: {
        availableUnits: availablePhones.length,
        availableCostValue: availablePhoneCost,
        soldInPeriodUnits: soldInPeriodPhones.length,
        inInspectionUnits: inInspectionPhones.length,
      },
      accessories: {
        totalUnits: totalAccUnits,
        totalValuation: totalAccValuation,
        lowStockCount: lowStockAccessories.length,
        outOfStockCount: outOfStockAccessories.length,
      },
      lowStockList,
    },
    exchanges: {
      exchangeCount: filteredExchanges.length,
      outgoingPhonesValue: outgoingValuationTotal,
      incomingValuation: incomingValuationTotal,
      additionalCustomerPayment: additionalPaidTotal,
      shopOwedToCustomer: Math.max(0, incomingValuationTotal - outgoingValuationTotal),
    },
    returns: {
      returnCount: filteredReturns.length,
      totalRefundAmount: returnRefundTotal,
      dispositionBreakdown: {
        restockedCount,
        refundOnlyCount,
        returnedToSupplierCount,
      },
    },
    warranty: {
      totalClaims: filteredWarranty.length,
      openClaims: openWarranty.length,
      resolvedClaims: resolvedWarranty.length,
      totalRepairCost,
      totalCustomerCharge,
    },
    dailyClosing,
    transactions: filteredTxs,
    filteredPurchases,
    filteredExpenses,
    filteredReturns,
    filteredExchanges,
    filteredWarranty,
  };
}

// -------------------------------------------------------------
// Report History Storage (Local-Only, Lightweight Metadata)
// -------------------------------------------------------------

const REPORT_HISTORY_KEY = "fmm_report_history";

export function getReportHistory(): ReportHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(REPORT_HISTORY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveReportHistory(item: Omit<ReportHistoryItem, "id">): ReportHistoryItem[] {
  if (typeof window === "undefined") return [];
  try {
    const current = getReportHistory();
    const newItem: ReportHistoryItem = {
      ...item,
      id: `rep_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
    };
    const updated = [newItem, ...current].slice(0, 20); // keep recent 20 entries
    localStorage.setItem(REPORT_HISTORY_KEY, JSON.stringify(updated));
    return updated;
  } catch {
    return [];
  }
}

export function clearReportHistory(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(REPORT_HISTORY_KEY);
  } catch {
    // Ignore error
  }
}
