import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadState, saveState, seedState, uid } from "./fmm-db";
import type {
  AuditAction,
  BackupRecord,
  CustomerPurchase,
  FmmState,
  PaymentStatus,
  Phone,
  Settings,
  Supplier,
  Transaction,
  TransactionType,
} from "./fmm-types";

interface FmmContextValue {
  state: FmmState;
  ready: boolean;
  addPhone: (p: Omit<Phone, "id" | "created_at" | "updated_at">) => void;
  addSupplier: (s: Omit<Supplier, "id" | "created_at">) => void;
  recordSale: (input: {
    phone_id: string;
    type: TransactionType;
    customer_name: string;
    customer_phone: string;
    amount: number;
    payment_status: PaymentStatus;
    notes?: string;
  }) => void;
  collectPayment: (transaction_id: string) => void;
  saveCustomerPurchase: (
    purchase: Omit<CustomerPurchase, "id" | "created_at" | "phone_id">,
    phone: Omit<Phone, "id" | "created_at" | "updated_at" | "customer_purchase_id" | "source_type" | "status" | "supplier_id">,
  ) => void;
  updateSettings: (patch: Partial<Settings>) => void;
  runBackup: (auto?: boolean) => Promise<BackupRecord | null>;
  restoreBackup: (file: File) => Promise<void>;
  resetData: () => void;
}

const FmmContext = createContext<FmmContextValue | null>(null);

export function FmmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FmmState>(() => seedState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadState()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) setState(loaded);
        else {
          const seeded = seedState();
          setState(seeded);
          void saveState(seeded);
        }
        setReady(true);
      })
      .catch(() => setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (ready) void saveState(state);
  }, [state, ready]);

  const log = (
    action: AuditAction,
    entity_type: string,
    entity_id: string,
    details: string,
    amount: number | null,
  ) => ({
    id: uid("au"),
    timestamp: new Date().toISOString(),
    action,
    entity_type,
    entity_id,
    details,
    amount,
  });

  const addPhone = useCallback<FmmContextValue["addPhone"]>((p) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const phone: Phone = { ...p, id: uid("ph"), created_at: now, updated_at: now };
      return {
        ...prev,
        phones: [phone, ...prev.phones],
        audit_log: [
          log("Added", "phone", phone.id, `${phone.brand} ${phone.model} (IMEI: …${phone.imei.slice(-4)})`, phone.purchase_price),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const addSupplier = useCallback<FmmContextValue["addSupplier"]>((s) => {
    setState((prev) => {
      const supplier: Supplier = { ...s, id: uid("sup"), created_at: new Date().toISOString() };
      return {
        ...prev,
        suppliers: [...prev.suppliers, supplier],
        audit_log: [
          log("Added", "supplier", supplier.id, `Supplier ${supplier.name} added (${supplier.status})`, null),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const recordSale = useCallback<FmmContextValue["recordSale"]>((input) => {
    setState((prev) => {
      const phone = prev.phones.find((p) => p.id === input.phone_id);
      if (!phone) return prev;
      const now = new Date().toISOString();
      const tx: Transaction = {
        id: uid("tx"),
        phone_id: phone.id,
        type: input.type,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        amount: input.amount,
        payment_status: input.payment_status,
        date: now,
        notes: input.notes ?? "",
      };
      const status: Phone["status"] =
        input.payment_status === "Pending" ? "Payment Pending" : input.type === "Exchange" ? "Exchange" : "Sold";
      const label = `${phone.brand} ${phone.model} (IMEI: …${phone.imei.slice(-4)})`;
      return {
        ...prev,
        phones: prev.phones.map((p) =>
          p.id === phone.id ? { ...p, status, selling_price: input.amount, updated_at: now } : p,
        ),
        transactions: [tx, ...prev.transactions],
        audit_log: [
          log(
            input.payment_status === "Pending" ? "Payment Pending" : input.type === "Exchange" ? "Exchange" : "Sold",
            "transaction",
            tx.id,
            label,
            input.amount,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const collectPayment = useCallback<FmmContextValue["collectPayment"]>((transaction_id) => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === transaction_id);
      if (!tx) return prev;
      const now = new Date().toISOString();
      const phone = prev.phones.find((p) => p.id === tx.phone_id);
      return {
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === transaction_id ? { ...t, payment_status: "Paid" as PaymentStatus } : t,
        ),
        phones: prev.phones.map((p) =>
          p.id === tx.phone_id ? { ...p, status: tx.type === "Exchange" ? "Exchange" : "Sold", updated_at: now } : p,
        ),
        audit_log: [
          log(
            "Payment Collected",
            "transaction",
            tx.id,
            `${tx.customer_name} — ${phone ? `${phone.brand} ${phone.model}` : "device"}`,
            tx.amount,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const saveCustomerPurchase = useCallback<FmmContextValue["saveCustomerPurchase"]>((purchase, phoneInput) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const purchaseId = uid("cp");
      const phone: Phone = {
        ...phoneInput,
        id: uid("ph"),
        source_type: "Buy from Customer",
        supplier_id: null,
        customer_purchase_id: purchaseId,
        status: "Available",
        created_at: now,
        updated_at: now,
      };
      const record: CustomerPurchase = { ...purchase, id: purchaseId, phone_id: phone.id, created_at: now };
      return {
        ...prev,
        phones: [phone, ...prev.phones],
        customer_purchases: [record, ...prev.customer_purchases],
        audit_log: [
          log(
            "Bought from Customer",
            "customer_purchase",
            purchaseId,
            `${phone.brand} ${phone.model} from ${record.customer_name}`,
            record.purchase_price,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const updateSettings = useCallback<FmmContextValue["updateSettings"]>((patch) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const runBackup = useCallback<FmmContextValue["runBackup"]>(
    async (auto = false) => {
      let created: BackupRecord | null = null;
      setState((prev) => {
        const now = new Date();
        const payload = JSON.stringify({ format: "fmmbackup", version: 1, created_at: now.toISOString(), data: prev });
        const filename = `fmm-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.fmmbackup`;
        created = { id: uid("bk"), timestamp: now.toISOString(), filename, size: payload.length };
        if (!auto && typeof window !== "undefined") {
          const url = URL.createObjectURL(new Blob([payload], { type: "application/json" }));
          const a = document.createElement("a");
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
        const backups = [created, ...prev.backups].slice(0, Math.max(1, prev.settings.keep_copies));
        return {
          ...prev,
          backups,
          audit_log: [
            log("Backup", "backup", created.id, `${auto ? "Automatic" : "Manual"} backup — ${filename}`, null),
            ...prev.audit_log,
          ],
        };
      });
      return created;
    },
    [],
  );

  const restoreBackup = useCallback<FmmContextValue["restoreBackup"]>(async (file) => {
    const text = await file.text();
    const parsed = JSON.parse(text) as { format?: string; data?: FmmState };
    if (parsed.format !== "fmmbackup" || !parsed.data?.phones) {
      throw new Error("This file is not a valid .fmmbackup package.");
    }
    setState((prev) => ({
      ...parsed.data!,
      audit_log: [
        log("Restore", "backup", "restore", `Restored backup from ${file.name}`, null),
        ...(parsed.data!.audit_log ?? prev.audit_log),
      ],
    }));
  }, []);

  const resetData = useCallback(() => setState(seedState()), []);

  // Automatic local backup scheduling (runs while the app is open, catches up on launch)
  useEffect(() => {
    if (!ready) return;
    if (state.settings.auto_backup === "off") return;
    const intervalMs = state.settings.auto_backup === "daily" ? 86400000 : 7 * 86400000;
    const last = state.backups[0]?.timestamp;
    if (!last || Date.now() - new Date(last).getTime() >= intervalMs) {
      void runBackup(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, state.settings.auto_backup]);

  const value = useMemo<FmmContextValue>(
    () => ({
      state,
      ready,
      addPhone,
      addSupplier,
      recordSale,
      collectPayment,
      saveCustomerPurchase,
      updateSettings,
      runBackup,
      restoreBackup,
      resetData,
    }),
    [state, ready, addPhone, addSupplier, recordSale, collectPayment, saveCustomerPurchase, updateSettings, runBackup, restoreBackup, resetData],
  );

  return (
    <FmmContext.Provider value={value}>
      {ready ? (
        children
      ) : (
        <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">
          Loading local data…
        </div>
      )}
    </FmmContext.Provider>
  );
}

export function useFmm() {
  const ctx = useContext(FmmContext);
  if (!ctx) throw new Error("useFmm must be used inside FmmProvider");
  return ctx;
}

export function taka(n: number): string {
  return Math.round(n).toLocaleString("en-US");
}

export function daysInStock(created_at: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000));
}

export function supplierName(state: FmmState, phone: Phone): string {
  if (phone.source_type === "Buy from Customer") return "Bought from Customer";
  return state.suppliers.find((s) => s.id === phone.supplier_id)?.name ?? "—";
}
