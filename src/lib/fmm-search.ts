/**
 * fmm-search.ts - Universal Advanced Search Engine for FMM Management
 */

import type { FmmState } from "./fmm-types";
import { normalizeImei } from "./fmm-imei";

export type SearchCategory =
  | "phones"
  | "accessories"
  | "customers"
  | "suppliers"
  | "campaigns"
  | "transactions"
  | "purchases"
  | "expenses"
  | "warranty"
  | "exchanges";

export interface SearchResult {
  id: string;
  category: SearchCategory;
  title: string;
  subtitle: string;
  meta?: string | undefined;
  badge?: string | undefined;
  score: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw: any;
}

/** Parsed operators for field-specific search */
export interface SearchOperators {
  imei?: string;
  name?: string;
  phone?: string;
  status?: string;
  supplier?: string;
  category?: string;
  brand?: string;
  model?: string;
}

export interface ParsedQuery {
  raw: string;
  operators: SearchOperators;
  freeTokens: string[];
  looksLikeImei: boolean;
}

const OPERATOR_KEYS = new Set(["imei", "name", "phone", "status", "supplier", "category", "brand", "model"]);

export function parseQuery(raw: string): ParsedQuery {
  const tokens = raw.trim().toLowerCase().split(/\s+/).filter(Boolean);
  const operators: SearchOperators = {};
  const freeTokens: string[] = [];

  for (const tok of tokens) {
    const colonIdx = tok.indexOf(":");
    if (colonIdx > 0) {
      const key = tok.slice(0, colonIdx);
      const val = tok.slice(colonIdx + 1);
      if (OPERATOR_KEYS.has(key) && val) {
        (operators as Record<string, string>)[key] = val;
        continue;
      }
    }
    freeTokens.push(tok);
  }

  const allFree = freeTokens.join("");
  const looksLikeImei = /^\d{6,}$/.test(allFree) || /^[0-9\s-]{8,}$/.test(raw.trim());

  return { raw, operators, freeTokens, looksLikeImei };
}

function scoreToken(candidate: string, token: string): number {
  if (!candidate) return 0;
  const c = candidate.toLowerCase();
  if (c === token) return 100;
  if (c.startsWith(token)) return 80;
  if (c.includes(token)) return 50;
  return 0;
}

function andScore(fields: string[], tokens: string[]): number {
  if (tokens.length === 0) return 0;
  let total = 0;
  for (const tok of tokens) {
    let best = 0;
    for (const f of fields) {
      const s = scoreToken(f, tok);
      if (s > best) best = s;
    }
    if (best === 0) return 0;
    total += best;
  }
  return total;
}

function imeiScore(imei: string, query: string): number {
  const norm = normalizeImei(imei);
  const q = query.replace(/[\s-]/g, "");
  if (!norm || !q) return 0;
  if (norm === q) return 100;
  if (norm.startsWith(q)) return 85;
  if (norm.endsWith(q)) return 80;
  if (norm.includes(q)) return 60;
  return 0;
}

export function searchAll(state: FmmState, rawQuery: string): SearchResult[] {
  const pq = parseQuery(rawQuery);
  if (pq.freeTokens.length === 0 && Object.keys(pq.operators).length === 0) return [];

  const results: SearchResult[] = [];
  const push = (r: SearchResult) => { if (r.score > 0) results.push(r); };

  // ---- 1. PHONES ----
  for (const p of state.phones ?? []) {
    let score = 0;
    const ops = pq.operators;

    if (ops.imei) {
      score = imeiScore(p.imei, ops.imei);
      if (!score && p.imei_secondary) score = imeiScore(p.imei_secondary, ops.imei);
    } else if (ops.status) {
      score = scoreToken(p.status, ops.status);
    } else if (ops.brand) {
      score = scoreToken(p.brand, ops.brand);
    } else if (ops.model) {
      score = scoreToken(p.model, ops.model);
    } else if (ops.supplier) {
      const sup = state.suppliers?.find((s) => s.id === p.supplier_id);
      if (sup) score = scoreToken(sup.name, ops.supplier) || scoreToken(sup.contact, ops.supplier);
    } else {
      const imeiField = normalizeImei(p.imei);
      const imei2Field = p.imei_secondary ? normalizeImei(p.imei_secondary) : "";
      const fields = [
        p.brand, p.model, p.storage_ram ?? "", p.serial_number ?? "",
        p.imei, imeiField, imei2Field, p.status, p.condition, p.source_type ?? "",
      ].filter(Boolean) as string[];

      if (pq.looksLikeImei) {
        const imeiSc = imeiScore(p.imei, pq.freeTokens.join(""));
        const imei2Sc = p.imei_secondary ? imeiScore(p.imei_secondary, pq.freeTokens.join("")) : 0;
        score = Math.max(imeiSc, imei2Sc, andScore(fields, pq.freeTokens));
      } else {
        score = andScore(fields, pq.freeTokens);
      }
    }

    const sup = state.suppliers?.find((s) => s.id === p.supplier_id);
    push({
      id: p.id,
      category: "phones",
      title: `${p.brand} ${p.model}`,
      subtitle: `IMEI: ${p.imei}${p.imei_secondary ? ` / ${p.imei_secondary}` : ""}`,
      meta: sup ? `Supplier: ${sup.name}` : undefined,
      badge: p.status,
      score,
      raw: p,
    });
  }

  // ---- 2. ACCESSORIES ----
  for (const a of state.accessories ?? []) {
    let score = 0;
    const ops = pq.operators;
    if (ops.status) {
      score = scoreToken(a.status ?? "", ops.status);
    } else if (ops.brand) {
      score = scoreToken(a.brand, ops.brand);
    } else if (ops.category) {
      score = scoreToken(a.category, ops.category);
    } else {
      score = andScore([a.name, a.brand, a.model_sku, a.category, a.status ?? ""], pq.freeTokens);
    }
    push({
      id: a.id, category: "accessories",
      title: a.name,
      subtitle: `${a.category} · ${a.brand} · SKU: ${a.model_sku}`,
      meta: `${a.quantity} ${a.unit} in stock`,
      badge: a.status,
      score, raw: a,
    });
  }

  // ---- 3. CUSTOMERS ----
  for (const c of state.customers ?? []) {
    let score = 0;
    const ops = pq.operators;
    if (ops.name) {
      score = scoreToken(c.name, ops.name);
    } else if (ops.phone) {
      score = scoreToken(c.phone, ops.phone);
    } else {
      score = andScore([c.name, c.phone, c.nid_number ?? "", c.address ?? ""], pq.freeTokens);
    }
    push({
      id: c.id, category: "customers",
      title: c.name, subtitle: c.phone,
      meta: c.address || undefined,
      score, raw: c,
    });
  }

  // ---- 4. SUPPLIERS ----
  for (const s of state.suppliers ?? []) {
    let score = 0;
    const ops = pq.operators;
    if (ops.name) {
      score = scoreToken(s.name, ops.name);
    } else if (ops.phone) {
      score = scoreToken(s.contact, ops.phone);
    } else if (ops.status) {
      score = scoreToken(s.status, ops.status);
    } else {
      score = andScore([s.name, s.contact, s.notes ?? "", s.status], pq.freeTokens);
    }
    push({ id: s.id, category: "suppliers", title: s.name, subtitle: s.contact, badge: s.status, score, raw: s });
  }

  // ---- 5. CAMPAIGNS ----
  for (const cmp of state.campaigns ?? []) {
    const ops = pq.operators;
    let score = ops.status
      ? scoreToken(cmp.status, ops.status)
      : andScore([cmp.name, cmp.description ?? "", cmp.status], pq.freeTokens);
    push({ id: cmp.id, category: "campaigns", title: cmp.name, subtitle: `${cmp.start_date} to ${cmp.end_date}`, badge: cmp.status, score, raw: cmp });
  }

  // ---- 6. TRANSACTIONS ----
  for (const t of state.transactions ?? []) {
    let score = 0;
    const ops = pq.operators;
    if (ops.name) {
      score = scoreToken(t.customer_name, ops.name);
    } else if (ops.phone) {
      score = scoreToken(t.customer_phone, ops.phone);
    } else if (ops.status) {
      score = scoreToken(t.payment_status, ops.status);
    } else if (ops.imei) {
      const phoneMatch = t.items?.some((item) => {
        const ph = state.phones?.find((p) => p.id === item.id);
        if (!ph) return false;
        return imeiScore(ph.imei, ops.imei!) > 0 ||
          (ph.imei_secondary ? imeiScore(ph.imei_secondary, ops.imei!) > 0 : false);
      });
      score = phoneMatch ? 70 : 0;
    } else {
      score = andScore([t.customer_name, t.customer_phone, t.memo_no ?? "", t.id, t.payment_status], pq.freeTokens);
    }
    push({
      id: t.id, category: "transactions",
      title: t.customer_name, subtitle: t.memo_no ? `Memo #${t.memo_no}` : t.id.slice(0, 8),
      meta: new Date(t.date).toLocaleDateString(), badge: t.payment_status, score, raw: t,
    });
  }

  // ---- 7. PURCHASES ----
  for (const p of state.purchases ?? []) {
    const sup = state.suppliers?.find((s) => s.id === p.supplier_id);
    const ops = pq.operators;
    let score = 0;
    if (ops.supplier) {
      score = sup ? scoreToken(sup.name, ops.supplier) : 0;
    } else if (ops.status) {
      score = scoreToken(p.payment_status, ops.status);
    } else {
      score = andScore([sup?.name ?? "", p.notes ?? "", p.id, p.payment_status], pq.freeTokens);
    }
    push({
      id: p.id, category: "purchases",
      title: sup?.name ?? "Purchase", subtitle: p.id.slice(0, 8),
      badge: p.payment_status, score, raw: p,
    });
  }

  // ---- 8. EXPENSES ----
  for (const e of state.expenses ?? []) {
    const ops = pq.operators;
    let score = ops.category
      ? scoreToken(e.category, ops.category)
      : andScore([e.description, e.category, e.payment_method ?? ""], pq.freeTokens);
    push({
      id: e.id, category: "expenses",
      title: e.description, subtitle: e.category,
      meta: new Date(e.date).toLocaleDateString(), score, raw: e,
    });
  }

  // ---- 9. WARRANTY CLAIMS ----
  for (const w of state.warranty_claims ?? []) {
    let score = 0;
    const ops = pq.operators;
    if (ops.name) {
      score = scoreToken(w.customer_name, ops.name);
    } else if (ops.phone) {
      score = scoreToken(w.customer_phone, ops.phone);
    } else if (ops.status) {
      score = scoreToken(w.status, ops.status);
    } else if (ops.imei) {
      const ph = state.phones?.find((p) => p.id === w.phone_id);
      score = ph ? (imeiScore(ph.imei, ops.imei) || (ph.imei_secondary ? imeiScore(ph.imei_secondary, ops.imei) : 0)) : 0;
    } else {
      score = andScore([w.customer_name, w.customer_phone, w.issue_description, w.status, w.notes ?? ""], pq.freeTokens);
    }
    push({ id: w.id, category: "warranty", title: `Warranty: ${w.customer_name}`, subtitle: w.issue_description, badge: w.status, score, raw: w });
  }

  // ---- 10. EXCHANGES ----
  for (const ex of state.exchanges ?? []) {
    const inPh = state.phones?.find((p) => p.id === ex.incoming_phone_id);
    const outPh = state.phones?.find((p) => p.id === ex.outgoing_phone_id);
    let score = 0;
    const ops = pq.operators;
    if (ops.name) {
      score = scoreToken(ex.customer_name, ops.name);
    } else if (ops.phone) {
      score = scoreToken(ex.customer_phone, ops.phone);
    } else if (ops.imei) {
      const inScore = inPh ? imeiScore(inPh.imei, ops.imei) : 0;
      const outScore = outPh ? imeiScore(outPh.imei, ops.imei) : 0;
      score = Math.max(inScore, outScore);
    } else {
      const inLabel = inPh ? `${inPh.brand} ${inPh.model} ${inPh.imei}` : "";
      const outLabel = outPh ? `${outPh.brand} ${outPh.model} ${outPh.imei}` : "";
      score = andScore([ex.customer_name, ex.customer_phone, ex.notes ?? "", inLabel, outLabel], pq.freeTokens);
    }
    push({
      id: ex.id, category: "exchanges",
      title: `Exchange: ${ex.customer_name}`,
      subtitle: inPh ? `Trade-in: ${inPh.brand} ${inPh.model}` : "Exchange",
      badge: ex.inspection_status, score, raw: ex,
    });
  }

  results.sort((a, b) => b.score - a.score);
  return results;
}

export function groupedSearch(state: FmmState, rawQuery: string, maxPerGroup = 5): Map<SearchCategory, SearchResult[]> {
  const all = searchAll(state, rawQuery);
  const map = new Map<SearchCategory, SearchResult[]>();
  for (const r of all) {
    const group = map.get(r.category) ?? [];
    if (group.length < maxPerGroup) {
      group.push(r);
      map.set(r.category, group);
    }
  }
  return map;
}

export function matchesQuery(fields: string[], rawQuery: string): boolean {
  const pq = parseQuery(rawQuery);
  if (pq.freeTokens.length === 0 && Object.keys(pq.operators).length === 0) return true;
  return andScore(fields, pq.freeTokens) > 0;
}
