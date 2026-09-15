import type { FmmState } from "./fmm-types";

const DB_NAME = "fmm-local";
const STORE = "state";
const KEY = "app-state";

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIndexedDb(): Promise<FmmState | null> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as FmmState) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDb(state: FmmState): Promise<void> {
  try {
    const db = await openDb();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(state, KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (err) {
    console.error("[FMM DB] Failed to save to IndexedDB fallback:", err);
  }
}

export async function loadState(): Promise<FmmState | null> {
  // If running in Electron, use SQLite via window.api
  if (typeof window !== "undefined" && window.api?.loadState) {
    try {
      const electronState = await window.api.loadState();
      if (electronState) return electronState;

      // On first Electron run: check if legacy state exists in IndexedDB and migrate to SQLite
      const legacyState = await loadFromIndexedDb();
      if (legacyState) {
        console.log("[FMM DB] Migrating legacy browser IndexedDB state to Electron SQLite...");
        await window.api.saveState(legacyState);
        return legacyState;
      }
      return null;
    } catch (err) {
      console.error("[FMM DB] Failed to load state from Electron SQLite:", err);
    }
  }

  // Browser / Lovable fallback
  return loadFromIndexedDb();
}

export async function saveState(state: FmmState): Promise<void> {
  // If running in Electron, use SQLite via window.api
  if (typeof window !== "undefined" && window.api?.saveState) {
    try {
      await window.api.saveState(state);
      return;
    } catch (err) {
      console.error("[FMM DB] Failed to save state to Electron SQLite:", err);
    }
  }

  // Browser / Lovable fallback
  return saveToIndexedDb(state);
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

export function emptyState(): FmmState {
  return {
    suppliers: [],
    phones: [],
    accessories: [],
    accessory_movements: [],
    customers: [],
    purchases: [],
    transactions: [],
    supplier_payments: [],
    customer_purchases: [],
    expenses: [],
    campaigns: [],
    warranty_claims: [],
    returns: [],
    exchanges: [],
    audit_log: [],
    backups: [],
    settings: {
      low_stock_threshold: 3,
      auto_backup: "daily",
      backup_location: "D:\\FMM Backups\\",
      keep_copies: 7,
    },
  };
}

