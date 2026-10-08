import type { FmmState } from "./fmm-types";
import { generateDemoState } from "./fmm-demo-data";

export const IS_DEV = import.meta.env.DEV;

// In dev server, store data in an isolated database "fmm-dev-db"
// This guarantees that the original production data in "fmm-local" and Electron SQLite ("fmm.db")
// are completely unaffected and isolated.
export const DB_NAME = IS_DEV ? "fmm-dev-db" : "fmm-local";
const STORE = "state";
const KEY = "app-state";

function openDb(name: string = DB_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(name, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function loadFromIndexedDb(name: string = DB_NAME): Promise<FmmState | null> {
  try {
    const db = await openDb(name);
    return new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
      req.onsuccess = () => resolve((req.result as FmmState) ?? null);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return null;
  }
}

async function saveToIndexedDb(state: FmmState, name: string = DB_NAME): Promise<void> {
  try {
    const db = await openDb(name);
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

      // On first Electron run: check if legacy state exists in production IndexedDB and migrate to SQLite
      // NEVER migrate dev demo database!
      const legacyState = await loadFromIndexedDb("fmm-local");
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

  // Browser / Dev server fallback
  const loaded = await loadFromIndexedDb(DB_NAME);
  if (loaded) return loaded;

  // In dev environment, automatically seed isolated database with rich demo data
  if (IS_DEV) {
    console.log("[FMM DB] Dev server detected — seeding isolated demo database (fmm-dev-db)...");
    const demo = generateDemoState();
    await saveToIndexedDb(demo, DB_NAME);
    return demo;
  }

  return null;
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

  // Browser / Lovable / Dev server fallback
  return saveToIndexedDb(state, DB_NAME);
}

export async function reloadDemoState(): Promise<FmmState> {
  const demo = generateDemoState();
  if (IS_DEV) {
    await saveToIndexedDb(demo, "fmm-dev-db");
  }
  return demo;
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


