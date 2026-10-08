import type { FmmState, Phone, PhoneStatus } from "./fmm-types";
import { normalizeImei } from "./fmm-imei";

export type HistoryLinkKind =
  | "customer"
  | "supplier"
  | "transaction"
  | "purchase"
  | "warranty"
  | "exchange"
  | "return";

export interface HistoryLink {
  kind: HistoryLinkKind;
  id: string;
  label: string;
}

export interface PhoneTimelineEvent {
  id: string;
  date: string;
  type:
    | "acquisition"
    | "sale"
    | "exchange_out"
    | "exchange_in"
    | "return"
    | "warranty"
    | "supplier_payment"
    | "inspection"
    | "edit"
    | "audit";
  title: string;
  details: string;
  amount?: number | undefined;
  badge?: string | undefined;
  links: HistoryLink[];
}

export interface PhoneHistorySummary {
  phone: Phone;
  primaryImei: string;
  secondaryImei: string | null;
  currentStatus: PhoneStatus;
  currentHolder: string;
  passThroughCount: number;
  totalDaysInStock: number;
  totalProfit: number;
  events: PhoneTimelineEvent[];
}

function parseDateMs(dateStr?: string | null): number {
  if (!dateStr) return 0;
  const t = new Date(dateStr).getTime();
  return isNaN(t) ? 0 : t;
}

function getSupplierName(state: FmmState, supplierId?: string | null): string {
  if (!supplierId) return "Supplier";
  const s = state.suppliers?.find((sup) => sup.id === supplierId);
  return s?.name || "Supplier";
}

/**
 * Builds a chronological, fully linked passport history for a phone.
 * De-duplicates and derives facts strictly from existing state.
 */
export function buildPhoneHistory(state: FmmState, phoneId: string): PhoneHistorySummary | null {
  const phone = (state.phones ?? []).find((p) => p.id === phoneId);
  if (!phone) return null;

  const events: PhoneTimelineEvent[] = [];
  const seenEventKeys = new Set<string>();

  const addEvent = (ev: PhoneTimelineEvent) => {
    const key = `${ev.type}_${ev.date.slice(0, 10)}_${ev.title}_${ev.amount ?? 0}`;
    if (seenEventKeys.has(key)) return;
    seenEventKeys.add(key);
    events.push(ev);
  };

  // 1. Initial Acquisition / Creation
  const supName = phone.supplier_id ? getSupplierName(state, phone.supplier_id) : "";
  const initialLinks: HistoryLink[] = [];
  if (phone.supplier_id) {
    initialLinks.push({ kind: "supplier", id: phone.supplier_id, label: supName });
  }

  let acqTitle = "Device Added to Inventory";
  let acqDetails = `Initial intake as ${phone.source_type}. Condition: ${phone.condition}.`;
  if (phone.source_type === "Supplier Purchase" && phone.supplier_id) {
    acqTitle = `Stock In: Purchased from ${supName}`;
    acqDetails = `Sourced from ${supName} at purchase cost. Condition: ${phone.condition}.`;
  } else if (phone.source_type === "Buy from Customer") {
    acqTitle = "Stock In: Purchased from Customer";
    acqDetails = `Customer intake device. Condition: ${phone.condition}.`;
  }

  addEvent({
    id: `acq_${phone.id}`,
    date: phone.created_at || new Date().toISOString(),
    type: "acquisition",
    title: acqTitle,
    details: acqDetails,
    amount: phone.purchase_price,
    badge: phone.source_type,
    links: initialLinks,
  });

  // 2. Supplier Purchases linking this phone
  (state.purchases ?? []).forEach((pur) => {
    const matchesPhone =
      (pur.phone_ids && pur.phone_ids.includes(phone.id)) ||
      (pur.items && pur.items.some((it) => it.id === phone.id));
    if (matchesPhone) {
      const sName = getSupplierName(state, pur.supplier_id);
      addEvent({
        id: `pur_${pur.id}`,
        date: pur.date || pur.created_at,
        type: "acquisition",
        title: `Supplier Purchase Invoice: ${sName}`,
        details: `Purchased from ${sName}. Invoice ref: ${pur.id.slice(0, 8)}. Total purchase amount: ${pur.total_amount}.`,
        amount: pur.total_amount,
        badge: "Purchase",
        links: [
          { kind: "purchase", id: pur.id, label: `Purchase #${pur.id.slice(0, 6)}` },
          { kind: "supplier", id: pur.supplier_id, label: sName },
        ],
      });
    }
  });

  // 3. Customer Purchases (Intake records)
  (state.customer_purchases ?? []).forEach((cp) => {
    if (cp.phone_id === phone.id) {
      const links: HistoryLink[] = [];
      if (cp.customer_id) {
        links.push({ kind: "customer", id: cp.customer_id, label: cp.customer_name });
      }
      addEvent({
        id: `cp_${cp.id}`,
        date: cp.created_at,
        type: "acquisition",
        title: `Bought from Customer: ${cp.customer_name}`,
        details: `Customer intake with Phone: ${cp.customer_phone}${cp.nid_number ? `, NID: ${cp.nid_number}` : ""}.`,
        amount: cp.purchase_price,
        badge: "Buy from Customer",
        links,
      });
    }
  });

  // 4. Sales / Transactions
  let latestSoldCustomer = "";
  (state.transactions ?? []).forEach((tx) => {
    const itemMatch = tx.items?.find((i) => i.id === phone.id || (i.type === "phone" && i.id === phone.id));
    const directMatch = tx.phone_id === phone.id;
    const tradeInMatch = tx.trade_in && tx.trade_in.incoming_phone_id === phone.id;

    if (itemMatch || directMatch) {
      const itemPrice = itemMatch ? itemMatch.unit_price : (tx.amount || phone.sold_price || 0);
      latestSoldCustomer = tx.customer_name || latestSoldCustomer;
      const links: HistoryLink[] = [
        { kind: "transaction", id: tx.id, label: tx.memo_no ? `Memo #${tx.memo_no}` : `Sale #${tx.id.slice(0, 6)}` },
      ];
      if (tx.customer_id) {
        links.push({ kind: "customer", id: tx.customer_id, label: tx.customer_name });
      }

      addEvent({
        id: `sale_${tx.id}`,
        date: tx.date || phone.sold_date || new Date().toISOString(),
        type: "sale",
        title: `Sold to ${tx.customer_name || "Customer"}`,
        details: `Sold under ${tx.memo_no ? `Memo #${tx.memo_no}` : "Sales Order"}. Payment status: ${tx.payment_status} (Paid: ${tx.paid_amount ?? tx.amount}, Due: ${tx.due_amount ?? 0}).`,
        amount: itemPrice,
        badge: `Sold (${tx.payment_status})`,
        links,
      });

      // Transaction payment history entries
      if (tx.payment_history && tx.payment_history.length > 0) {
        tx.payment_history.forEach((ph, pIdx) => {
          addEvent({
            id: `pay_${tx.id}_${pIdx}`,
            date: ph.date,
            type: "audit",
            title: `Payment Received: ${tx.customer_name}`,
            details: `Collected ${ph.amount} via ${ph.payment_method || "Cash"} for ${tx.memo_no ? `Memo #${tx.memo_no}` : "transaction"}. ${ph.notes || ""}`,
            amount: ph.amount,
            badge: "Due Payment",
            links: [
              { kind: "transaction", id: tx.id, label: `Memo #${tx.memo_no || tx.id.slice(0, 6)}` },
            ],
          });
        });
      }
    }

    if (tradeInMatch) {
      const links: HistoryLink[] = [
        { kind: "transaction", id: tx.id, label: tx.memo_no ? `Memo #${tx.memo_no}` : "Transaction" },
      ];
      if (tx.customer_id) {
        links.push({ kind: "customer", id: tx.customer_id, label: tx.customer_name });
      }

      addEvent({
        id: `tradein_${tx.id}`,
        date: tx.date || new Date().toISOString(),
        type: "exchange_in",
        title: `Trade-in Received from ${tx.customer_name}`,
        details: `Received as trade-in item valued at ${tx.trade_in?.incoming_valuation ?? 0} against ${tx.memo_no ? `Memo #${tx.memo_no}` : "sale"}.`,
        amount: tx.trade_in?.incoming_valuation,
        badge: "Trade-in Intake",
        links,
      });
    }
  });

  // 5. Exchanges
  (state.exchanges ?? []).forEach((ex) => {
    if (ex.outgoing_phone_id === phone.id) {
      addEvent({
        id: `ex_out_${ex.id}`,
        date: ex.date || ex.created_at,
        type: "exchange_out",
        title: `Exchanged Out to ${ex.customer_name}`,
        details: `Given to customer in exchange deal. Agreed valuation: ${ex.outgoing_value}.`,
        amount: ex.outgoing_value,
        badge: "Exchange Out",
        links: [
          { kind: "exchange", id: ex.id, label: `Exchange #${ex.id.slice(0, 6)}` },
          ...(ex.customer_id ? [{ kind: "customer" as const, id: ex.customer_id, label: ex.customer_name }] : []),
        ],
      });
    }

    if (ex.incoming_phone_id === phone.id) {
      addEvent({
        id: `ex_in_${ex.id}`,
        date: ex.date || ex.created_at,
        type: "exchange_in",
        title: `Exchanged In from ${ex.customer_name}`,
        details: `Received as incoming trade-in device. Agreed intake valuation: ${ex.incoming_valuation}. Status: ${ex.inspection_status || "Pending"}.`,
        amount: ex.incoming_valuation,
        badge: "Exchange In",
        links: [
          { kind: "exchange", id: ex.id, label: `Exchange #${ex.id.slice(0, 6)}` },
          ...(ex.customer_id ? [{ kind: "customer" as const, id: ex.customer_id, label: ex.customer_name }] : []),
        ],
      });
    }
  });

  // 6. Customer Returns
  (state.returns ?? []).forEach((ret) => {
    if (ret.phone_id === phone.id) {
      addEvent({
        id: `ret_${ret.id}`,
        date: ret.return_date || ret.created_at,
        type: "return",
        title: `Customer Return: ${ret.customer_name}`,
        details: `Returned with reason: "${ret.notes || "No reason specified"}". Refunded: ${ret.refund_amount}. Disposition: ${ret.disposition || "Restocked"}.`,
        amount: ret.refund_amount,
        badge: `Return (${ret.disposition || "Restocked"})`,
        links: [
          { kind: "return", id: ret.id, label: `Return #${ret.id.slice(0, 6)}` },
          ...(ret.customer_id ? [{ kind: "customer" as const, id: ret.customer_id, label: ret.customer_name }] : []),
          ...(ret.supplier_id ? [{ kind: "supplier" as const, id: ret.supplier_id, label: getSupplierName(state, ret.supplier_id) }] : []),
        ],
      });
    }
  });

  // 7. Warranty Claims
  (state.warranty_claims ?? []).forEach((wc) => {
    if (wc.phone_id === phone.id) {
      addEvent({
        id: `wc_${wc.id}`,
        date: wc.claim_date || wc.created_at,
        type: "warranty",
        title: `Warranty Claim: ${wc.customer_name}`,
        details: `Issue: ${wc.issue_description}. Status: ${wc.status}.`,
        badge: `Warranty (${wc.status})`,
        links: [
          { kind: "warranty", id: wc.id, label: `Warranty #${wc.id.slice(0, 6)}` },
          ...(wc.customer_id ? [{ kind: "customer" as const, id: wc.customer_id, label: wc.customer_name }] : []),
        ],
      });
    }
  });

  // 8. Supplier Payments for this phone
  (state.supplier_payments ?? []).forEach((sp) => {
    if (sp.phone_id === phone.id) {
      const sName = getSupplierName(state, sp.supplier_id);
      addEvent({
        id: `sp_${sp.id}`,
        date: sp.date || sp.created_at,
        type: "supplier_payment",
        title: `Supplier Payment: Paid ${sp.amount} to ${sName}`,
        details: `Cleared due balance for this phone. Note: ${sp.notes || "N/A"}.`,
        amount: sp.amount,
        badge: "Supplier Paid",
        links: [
          { kind: "supplier", id: sp.supplier_id, label: sName },
        ],
      });
    }
  });

  // 9. Audit Entries matching entity_id === phone.id or mentioning IMEI
  const normImei = normalizeImei(phone.imei);
  (state.audit_log ?? []).forEach((aud) => {
    const isDirectMatch = aud.entity_id === phone.id;
    const isImeiTextMatch =
      normImei &&
      aud.details &&
      (aud.details.includes(phone.imei) || (phone.imei_secondary && aud.details.includes(phone.imei_secondary)));

    if (isDirectMatch || isImeiTextMatch) {
      addEvent({
        id: `aud_${aud.id}`,
        date: aud.timestamp,
        type: aud.action === "Phone Updated" ? "edit" : "audit",
        title: `Audit: ${aud.action}`,
        details: aud.details,
        amount: aud.amount != null ? aud.amount : undefined,
        badge: aud.action,
        links: [],
      });
    }
  });

  // Sort chronologically (newest first)
  events.sort((a, b) => parseDateMs(b.date) - parseDateMs(a.date));

  // Compute metrics:
  // Pass-through cycles count
  const acqCount = events.filter((e) => e.type === "acquisition" || e.type === "exchange_in").length;
  const passThroughCount = Math.max(1, acqCount);

  // Current holder
  let currentHolder = "In Stock";
  if (phone.status === "Available") {
    currentHolder = "In Stock (Shop Shelf)";
  } else if (phone.status === "In Inspection") {
    currentHolder = "In Inspection (Shop)";
  } else if (phone.status === "Returned to Supplier") {
    currentHolder = `Returned to Supplier (${supName || "Supplier"})`;
  } else if (phone.status === "Sold") {
    currentHolder = `Sold to ${latestSoldCustomer || "Customer"}`;
  } else if (phone.status === "Exchange") {
    currentHolder = `Exchanged to ${latestSoldCustomer || "Customer"}`;
  } else if (phone.status === "Returned") {
    currentHolder = "Returned by Customer";
  }

  // Total days in stock across cycles
  // Estimated from acquisition events to sale events or now
  let totalDaysInStock = 0;
  const chronological = [...events].reverse();
  let currentCycleStart: number | null = null;

  for (const ev of chronological) {
    const ms = parseDateMs(ev.date);
    if (!ms) continue;

    if (ev.type === "acquisition" || ev.type === "exchange_in") {
      if (currentCycleStart === null) {
        currentCycleStart = ms;
      }
    } else if (ev.type === "sale" || ev.type === "exchange_out" || (ev.type === "return" && ev.badge?.includes("Supplier"))) {
      if (currentCycleStart !== null) {
        const days = Math.max(0, Math.round((ms - currentCycleStart) / (1000 * 60 * 60 * 24)));
        totalDaysInStock += days;
        currentCycleStart = null;
      }
    }
  }

  // If currently still in stock
  if (currentCycleStart !== null && (phone.status === "Available" || phone.status === "In Inspection")) {
    const days = Math.max(0, Math.round((Date.now() - currentCycleStart) / (1000 * 60 * 60 * 24)));
    totalDaysInStock += days;
  }

  // Total profit/loss across cycles from reliable data model fields:
  // If sold_price exists: sold_price - purchase_price
  let totalProfit = 0;
  if (phone.sold_price != null && phone.purchase_price != null) {
    totalProfit += (phone.sold_price - phone.purchase_price);
  }

  return {
    phone,
    primaryImei: phone.imei,
    secondaryImei: phone.imei_secondary || null,
    currentStatus: phone.status,
    currentHolder,
    passThroughCount,
    totalDaysInStock: Math.max(1, totalDaysInStock),
    totalProfit,
    events,
  };
}
