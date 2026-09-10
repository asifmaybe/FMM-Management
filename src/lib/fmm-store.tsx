import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { emptyState, loadState, saveState, seedState, uid } from "./fmm-db";
import type {
  Accessory,
  AccessoryMovement,
  AccessoryMovementType,
  AuditAction,
  AuditEntry,
  BackupRecord,
  Campaign,
  Customer,
  CustomerPurchase,
  CustomerReturn,
  ExchangeRecord,
  Expense,
  FmmState,
  PaymentStatus,
  Phone,
  PhoneStatus,
  Purchase,
  ReturnDisposition,
  SaleItem,
  Settings,
  StoredFile,
  Supplier,
  SupplierPayment,
  Transaction,
  TransactionReturnInfo,
  TransactionTradeIn,
  TransactionType,
  WarrantyClaim,
} from "./fmm-types";
import { FMM_APP_VERSION, FMM_BACKUP_VERSION, verifyBackupPayloadString } from "./fmm-backup";


export interface FmmContextValue {
  state: FmmState;
  ready: boolean;
  addPhone: (p: Omit<Phone, "id" | "created_at" | "updated_at">) => void;
  addPhonesBatch: (
    phones: Omit<Phone, "id" | "created_at" | "updated_at">[],
    purchaseOptions?: {
      supplier_id: string;
      notes?: string;
      campaign_id?: string | null | undefined;
      additional_cost?: number;
      paid_amount?: number;
    },
  ) => Phone[];
  addSupplier: (s: Omit<Supplier, "id" | "created_at">) => void;
  recordSale: (input: {
    phone_id: string;
    type: TransactionType;
    customer_name: string;
    customer_phone: string;
    customer_id?: string | null;
    amount: number;
    payment_status: PaymentStatus;
    payment_method?: string;
    paid_amount?: number;
    due_amount?: number;
    campaign_id?: string | null;
    notes?: string;
    /** Optional accessories bundled with this phone sale */
    accessories?: { accessory_id: string; quantity: number; unit_price: number; is_gift?: boolean | undefined }[];
  }) => void;
  recordSupplierPayment: (input: {
    supplier_id: string;
    amount: number;
    date?: string;
    notes?: string;
    phone_id?: string | null;
    purchase_id?: string | null;
  }) => void;
  collectPayment: (transaction_id: string, amount?: number) => void;
  saveCustomerPurchase: (
    purchase: Omit<CustomerPurchase, "id" | "created_at" | "phone_id">,
    phone: Omit<Phone, "id" | "created_at" | "updated_at" | "customer_purchase_id" | "source_type" | "status" | "supplier_id">,
  ) => void;

  // Accessories actions
  addAccessory: (acc: Omit<Accessory, "id" | "created_at" | "updated_at">, initialMovement?: boolean) => void;
  updateAccessory: (id: string, patch: Partial<Accessory>) => void;
  adjustAccessoryStock: (input: {
    accessory_id: string;
    type: AccessoryMovementType;
    quantity: number;
    direction: "in" | "out";
    unit_price: number;
    date?: string;
    reason: string;
    reference_id?: string | null;
  }) => void;
  recordAccessorySale: (input: {
    items: { accessory_id: string; quantity: number; unit_price: number; is_gift?: boolean | undefined }[];
    customer_name: string;
    customer_phone: string;
    customer_id?: string | null;
    payment_status: PaymentStatus;
    payment_method?: string;
    campaign_id?: string | null;
    notes?: string;
  }) => void;

  // Customers actions
  addCustomer: (cus: Omit<Customer, "id" | "created_at" | "updated_at">) => string;
  updateCustomer: (id: string, patch: Partial<Customer>) => void;

  // Purchases actions
  recordPurchase: (pur: Omit<Purchase, "id" | "created_at">) => void;
  recordPurchasePayment: (purchase_id: string, amount: number, notes?: string) => void;

  // Expenses actions
  addExpense: (exp: Omit<Expense, "id" | "created_at">) => void;
  updateExpense: (id: string, patch: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Campaigns actions
  addCampaign: (cmp: Omit<Campaign, "id" | "created_at" | "updated_at">) => string;
  updateCampaign: (id: string, patch: Partial<Campaign>) => void;
  deleteCampaign: (id: string) => void;

  // Warranty & Returns actions
  recordWarrantyClaim: (claim: Omit<WarrantyClaim, "id" | "created_at">) => void;
  updateWarrantyClaim: (id: string, patch: Partial<WarrantyClaim>) => void;
  recordReturn: (ret: Omit<CustomerReturn, "id" | "created_at">) => void;
  processCustomerReturn: (
    transactionId: string,
    input: {
      return_date?: string | undefined;
      reason: string;
      deduction_percentage: number;
      deduction_amount: number;
      refund_amount: number;
      disposition: ReturnDisposition;
      new_resale_price?: number | undefined;
      supplier_id?: string | null | undefined;
      notes?: string | undefined;
    },
  ) => void;

  // Exchange & Trade-In actions
  recordExchange: (
    exchange: Omit<ExchangeRecord, "id" | "created_at">,
    incomingPhone: Omit<Phone, "id" | "created_at" | "updated_at">,
    outgoingPhoneId: string,
    evidenceInput?: {
      customer_address?: string;
      nid_number?: string;
      nid_front_image?: StoredFile | null;
      nid_back_image?: StoredFile | null;
      additional_documents?: StoredFile[];
      phone_photos?: StoredFile[];
    },
  ) => void;
  inspectTradeInDevice: (
    incomingPhoneId: string,
    decision: { action: "Restock" | "Reject"; new_selling_price?: number | undefined; condition_notes?: string | undefined },
  ) => void;

  // Transaction editing
  updateTransaction: (transactionId: string, patch: Partial<Transaction>) => void;

  // System & Settings
  updateSettings: (patch: Partial<Settings>) => void;
  runBackup: (auto?: boolean) => Promise<BackupRecord | null>;
  restoreBackup: (file: File) => Promise<void>;
  resetData: () => void;
  loadDemoData: () => void;
}

const FmmContext = createContext<FmmContextValue | null>(null);

export function FmmProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<FmmState>(() => emptyState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadState()
      .then((loaded) => {
        if (cancelled) return;
        if (loaded) {
          const defaults = emptyState();
          // Backfill customers from transactions & purchases if empty (only if transactions/purchases exist)
          let customers = loaded.customers ?? [];
          if (customers.length === 0) {
            const customerMap = new Map<string, Customer>();
            (loaded.transactions ?? []).forEach((t) => {
              if (t.customer_name && !customerMap.has(t.customer_phone || t.customer_name)) {
                customerMap.set(t.customer_phone || t.customer_name, {
                  id: uid("cus"),
                  name: t.customer_name,
                  phone: t.customer_phone || "",
                  address: "",
                  nid_number: "",
                  notes: "Auto-migrated customer",
                  created_at: t.date || new Date().toISOString(),
                  updated_at: t.date || new Date().toISOString(),
                });
              }
            });
            (loaded.customer_purchases ?? []).forEach((cp) => {
              if (cp.customer_name && !customerMap.has(cp.customer_phone || cp.customer_name)) {
                customerMap.set(cp.customer_phone || cp.customer_name, {
                  id: uid("cus"),
                  name: cp.customer_name,
                  phone: cp.customer_phone || "",
                  address: cp.customer_address || "",
                  nid_number: cp.nid_number || "",
                  notes: "Device seller",
                  created_at: cp.created_at || new Date().toISOString(),
                  updated_at: cp.created_at || new Date().toISOString(),
                });
              }
            });
            customers = customerMap.size > 0 ? Array.from(customerMap.values()) : [];
          }

          const hydrated: FmmState = {
            ...defaults,
            ...loaded,
            suppliers: loaded.suppliers ?? [],
            phones: (loaded.phones ?? []).map((p) => {
              const isPaymentPending = (p.status as string) === "Payment Pending";
              const status: PhoneStatus = isPaymentPending ? "Sold" : p.status;
              return {
                ...p,
                status,
                sold_price: p.sold_price ?? (status === "Sold" ? (p.selling_price ?? p.purchase_price) : null),
                warranty_days: p.warranty_days ?? 30,
              };
            }),
            accessories: loaded.accessories ?? [],
            accessory_movements: loaded.accessory_movements ?? [],
            customers,
            purchases: loaded.purchases ?? [],
            transactions: (loaded.transactions ?? []).map((t) => {
              const summary = getTransactionPayment(t);
              return {
                ...t,
                amount: summary.total,
                paid_amount: summary.paid,
                due_amount: summary.due,
                payment_status: summary.status,
              };
            }),
            supplier_payments: loaded.supplier_payments ?? [],
            customer_purchases: loaded.customer_purchases ?? [],
            expenses: loaded.expenses ?? [],
            campaigns: loaded.campaigns ?? [],
            warranty_claims: loaded.warranty_claims ?? [],
            returns: loaded.returns ?? [],
            exchanges: loaded.exchanges ?? [],
            audit_log: loaded.audit_log ?? [],
            backups: loaded.backups ?? [],
            settings: loaded.settings ?? defaults.settings,
          };
          setState(hydrated);
        } else {
          const fresh = emptyState();
          setState(fresh);
          void saveState(fresh);
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
  ): AuditEntry => ({
    id: uid("au"),
    timestamp: new Date().toISOString(),
    action,
    entity_type,
    entity_id,
    details,
    amount,
  });

  // -------------------------------------------------------------
  // Phone Actions
  // -------------------------------------------------------------
  const addPhonesBatch = useCallback<FmmContextValue["addPhonesBatch"]>((phoneList, purchaseOptions) => {
    const now = new Date().toISOString();
    const createdPhones: Phone[] = phoneList.map((p) => ({
      ...p,
      id: uid("ph"),
      created_at: now,
      updated_at: now,
    }));
    const phoneIds = createdPhones.map((p) => p.id);
    const totalAmount = createdPhones.reduce((s, p) => s + p.purchase_price, 0);

    let newPurchase: Purchase | null = null;
    if (purchaseOptions && purchaseOptions.supplier_id) {
      const addCost = purchaseOptions.additional_cost ?? 0;
      const initialPaid = purchaseOptions.paid_amount ?? 0;
      const initialDue = Math.max(0, totalAmount + addCost - initialPaid);
      const initialStatus: "Paid" | "Due" | "Not Paid" = initialDue === 0 ? "Paid" : initialPaid > 0 ? "Due" : "Not Paid";

      newPurchase = {
        id: uid("pur"),
        supplier_id: purchaseOptions.supplier_id,
        date: now,
        type: "Phone",
        phone_ids: phoneIds,
        items: createdPhones.map((p) => ({
          type: "phone",
          id: p.id,
          name: `${p.brand} ${p.model}`,
          quantity: 1,
          unit_price: p.purchase_price,
          total: p.purchase_price,
        })),
        total_amount: totalAmount,
        additional_cost: addCost,
        paid_amount: initialPaid,
        due_amount: initialDue,
        payment_status: initialStatus,
        campaign_id: purchaseOptions.campaign_id ?? null,
        notes: purchaseOptions.notes || `Procurement of ${createdPhones.length} phone(s)`,
        created_at: now,
      };
    }

    setState((prev) => {
      const supplier = prev.suppliers.find((s) => s.id === purchaseOptions?.supplier_id);
      const auditLogs: AuditEntry[] = [
        ...createdPhones.map((p) =>
          log("Added", "phone", p.id, `${p.brand} ${p.model} (IMEI: …${p.imei.slice(-4)})`, p.purchase_price),
        ),
      ];
      const supplierPayments = [...(prev.supplier_payments ?? [])];

      if (newPurchase) {
        auditLogs.unshift(
          log("Purchase Created", "purchase", newPurchase.id, `Phone batch from ${supplier?.name || "Supplier"} (${taka(totalAmount)} BDT)`, totalAmount),
        );
        if (newPurchase.paid_amount > 0) {
          supplierPayments.unshift({
            id: uid("sp"),
            supplier_id: newPurchase.supplier_id,
            amount: newPurchase.paid_amount,
            date: now,
            notes: `Advance payment for purchase ${newPurchase.id}`,
            purchase_id: newPurchase.id,
            phone_id: null,
            created_at: now,
          });
          auditLogs.unshift(
            log("Supplier Payment", "purchase", newPurchase.id, `Paid ${taka(newPurchase.paid_amount)} BDT towards purchase order`, newPurchase.paid_amount),
          );
        }
      }

      return {
        ...prev,
        phones: [...createdPhones, ...prev.phones],
        purchases: newPurchase ? [newPurchase, ...(prev.purchases ?? [])] : prev.purchases,
        supplier_payments: supplierPayments,
        audit_log: [...auditLogs, ...prev.audit_log],
      };
    });

    return createdPhones;
  }, []);

  const addPhone = useCallback<FmmContextValue["addPhone"]>((p) => {
    const isSupplierPurchase = p.source_type === "Supplier Purchase" && Boolean(p.supplier_id);
    addPhonesBatch(
      [p],
      isSupplierPurchase && p.supplier_id
        ? {
            supplier_id: p.supplier_id,
            notes: `Phone purchase: ${p.brand} ${p.model} (IMEI: …${p.imei.slice(-4)})`,
            campaign_id: p.campaign_id ?? null,
          }
        : undefined,
    );
  }, [addPhonesBatch]);

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
      const txId = uid("tx");

      // --- Build accessory line items & movements ---
      const accItems: SaleItem[] = [];
      const accMovements: AccessoryMovement[] = [];
      let accTotal = 0;

      if (input.accessories && input.accessories.length > 0) {
        for (const ai of input.accessories) {
          const acc = prev.accessories.find((a) => a.id === ai.accessory_id);
          if (!acc) continue;
          const isGift = Boolean(ai.is_gift || ai.unit_price === 0);
          const unitPrice = isGift ? 0 : ai.unit_price;
          const subtotal = isGift ? 0 : ai.quantity * unitPrice;
          accTotal += subtotal;
          accItems.push({
            type: "accessory",
            id: ai.accessory_id,
            name: acc.name,
            quantity: ai.quantity,
            unit_price: unitPrice,
            cost_price: acc.purchase_price,
            subtotal,
            is_gift: isGift,
          });
          accMovements.push({
            id: uid("acm"),
            accessory_id: ai.accessory_id,
            type: isGift ? ("Campaign Gift" as const) : ("Sale" as const),
            quantity: ai.quantity,
            direction: "out",
            unit_price: unitPrice,
            date: now,
            reason: isGift
              ? `Free gift (${acc.name}) with ${phone.brand} ${phone.model} sale to ${input.customer_name}`
              : `Bundled with ${phone.brand} ${phone.model} sale to ${input.customer_name}`,
            reference_id: txId,
            created_at: now,
          });
        }
      }

      const totalAmount = input.amount + accTotal;
      const paidAmount =
        input.paid_amount !== undefined
          ? input.paid_amount
          : input.payment_status === "Paid"
          ? totalAmount
          : 0;
      const dueAmount =
        input.due_amount !== undefined
          ? input.due_amount
          : Math.max(0, totalAmount - paidAmount);
      const computedPaymentStatus: PaymentStatus =
        dueAmount === 0 ? "Paid" : paidAmount > 0 ? "Partial" : "Pending";

      const tx: Transaction = {
        id: txId,
        phone_id: phone.id,
        type: input.type,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_id: input.customer_id ?? null,
        amount: totalAmount,
        payment_status: computedPaymentStatus,
        payment_method: input.payment_method || "Cash",
        paid_amount: paidAmount,
        due_amount: dueAmount,
        campaign_id: input.campaign_id ?? null,
        items: [
          {
            type: "phone",
            id: phone.id,
            name: `${phone.brand} ${phone.model}`,
            quantity: 1,
            unit_price: input.amount,
            cost_price: phone.purchase_price,
            subtotal: input.amount,
          },
          ...accItems,
        ],
        date: now,
        notes: input.notes ?? "",
      };

      // Decrement accessory quantities
      const updatedAccessories = prev.accessories.map((a) => {
        const ai = (input.accessories ?? []).find((x) => x.accessory_id === a.id);
        if (ai) return { ...a, quantity: Math.max(0, a.quantity - ai.quantity), updated_at: now };
        return a;
      });

      // Phone is marked as Sold regardless of whether payment is fully paid or partial/pending
      const status: Phone["status"] = input.type === "Exchange" ? "Exchange" : "Sold";
      const label = `${phone.brand} ${phone.model} (IMEI: …${phone.imei.slice(-4)})${
        accItems.length > 0 ? ` + ${accItems.map((a) => `${a.quantity}x ${a.name}`).join(", ")}}` : ""
      }`;

      return {
        ...prev,
        phones: prev.phones.map((p) =>
          p.id === phone.id ? { ...p, status, sold_price: input.amount, campaign_id: input.campaign_id ?? p.campaign_id ?? null, updated_at: now } : p,
        ),
        accessories: updatedAccessories,
        accessory_movements: [...accMovements, ...(prev.accessory_movements ?? [])],
        transactions: [tx, ...prev.transactions],
        audit_log: [
          log(
            computedPaymentStatus === "Paid" ? "Sold" : "Payment Pending",
            "transaction",
            txId,
            label,
            totalAmount,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const recordSupplierPayment = useCallback<FmmContextValue["recordSupplierPayment"]>((input) => {
    setState((prev) => {
      const supplier = prev.suppliers.find((s) => s.id === input.supplier_id);
      if (!supplier) return prev;
      const now = new Date().toISOString();
      const payment: SupplierPayment = {
        id: uid("sp"),
        supplier_id: input.supplier_id,
        amount: input.amount,
        date: input.date || now,
        notes: input.notes ?? "",
        phone_id: input.phone_id ?? null,
        purchase_id: input.purchase_id ?? null,
        created_at: now,
      };

      let updatedPurchases = prev.purchases ?? [];
      if (input.purchase_id) {
        updatedPurchases = updatedPurchases.map((p) => {
          if (p.id === input.purchase_id) {
            const newPaid = p.paid_amount + input.amount;
            const newDue = Math.max(0, p.total_amount + (p.additional_cost || 0) - newPaid);
            return {
              ...p,
              paid_amount: newPaid,
              due_amount: newDue,
              payment_status: (newDue === 0 ? "Paid" : "Due") as "Paid" | "Due" | "Not Paid",
            };
          }
          return p;
        });
      }

      return {
        ...prev,
        purchases: updatedPurchases,
        supplier_payments: [payment, ...(prev.supplier_payments ?? [])],
        audit_log: [
          log(
            "Supplier Payment",
            "supplier",
            supplier.id,
            `Paid ${taka(input.amount)} BDT to ${supplier.name}${input.notes ? ` (${input.notes})` : ""}`,
            input.amount,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const collectPayment = useCallback<FmmContextValue["collectPayment"]>((transaction_id, amount) => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === transaction_id);
      if (!tx) return prev;
      const now = new Date().toISOString();
      const currentDue = tx.due_amount !== undefined ? tx.due_amount : (tx.payment_status === "Paid" ? 0 : tx.amount);
      const payAmt = amount !== undefined && amount > 0 ? Math.min(amount, currentDue) : currentDue;
      const currentPaid = tx.paid_amount ?? (tx.amount - currentDue);
      const newPaid = currentPaid + payAmt;
      const newDue = Math.max(0, currentDue - payAmt);
      const newStatus: PaymentStatus = newDue === 0 ? "Paid" : "Partial";

      const phone = prev.phones.find((p) => p.id === tx.phone_id);
      return {
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === transaction_id
            ? {
                ...t,
                payment_status: newStatus,
                paid_amount: newPaid,
                due_amount: newDue,
                notes: t.notes
                  ? `${t.notes} · Collected ${taka(payAmt)} on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                  : `Collected ${taka(payAmt)} on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`,
              }
            : t,
        ),
        phones: prev.phones.map((p) =>
          p.id === tx.phone_id ? { ...p, status: tx.type === "Exchange" ? "Exchange" : "Sold", updated_at: now } : p,
        ),
        audit_log: [
          log(
            "Payment Collected",
            "transaction",
            tx.id,
            `${tx.customer_name} — paid ${taka(payAmt)} (${phone ? `${phone.brand} ${phone.model}` : "device"})${newDue > 0 ? `, remaining due ${taka(newDue)}` : " (Cleared)"}`,
            payAmt,
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

      let updatedCustomers = prev.customers ?? [];
      const existing = updatedCustomers.find(
        (c) => (purchase.customer_phone && c.phone === purchase.customer_phone.trim()) || (purchase.customer_name && c.name.toLowerCase() === purchase.customer_name.trim().toLowerCase()),
      );
      if (!existing && purchase.customer_name?.trim()) {
        const newCus: Customer = {
          id: uid("cus"),
          name: purchase.customer_name.trim(),
          phone: purchase.customer_phone.trim(),
          address: purchase.customer_address.trim(),
          nid_number: purchase.nid_number.trim(),
          notes: "Registered from phone customer purchase",
          created_at: now,
          updated_at: now,
        };
        updatedCustomers = [newCus, ...updatedCustomers];
      }

      return {
        ...prev,
        customers: updatedCustomers,
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

  // -------------------------------------------------------------
  // Accessories Actions
  // -------------------------------------------------------------
  const addAccessory = useCallback<FmmContextValue["addAccessory"]>((acc, initialMovement = true) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const id = uid("acc");
      const item: Accessory = { ...acc, id, created_at: now, updated_at: now };
      const movements = [...(prev.accessory_movements ?? [])];

      let newPurchase: Purchase | null = null;
      if (initialMovement && acc.quantity > 0) {
        movements.unshift({
          id: uid("acm"),
          accessory_id: id,
          type: "Purchase",
          quantity: acc.quantity,
          direction: "in",
          unit_price: acc.purchase_price,
          date: now,
          reason: "Initial stock registration",
          created_at: now,
        });

        if (acc.supplier_id) {
          const totalCost = acc.quantity * acc.purchase_price;
          newPurchase = {
            id: uid("pur"),
            supplier_id: acc.supplier_id,
            date: now,
            type: "Accessory",
            items: [
              {
                type: "accessory",
                id: id,
                name: acc.name,
                quantity: acc.quantity,
                unit_price: acc.purchase_price,
                total: totalCost,
              },
            ],
            total_amount: totalCost,
            additional_cost: 0,
            paid_amount: 0,
            due_amount: totalCost,
            payment_status: "Not Paid",
            notes: `Initial stock: ${acc.quantity}x ${acc.name}`,
            created_at: now,
          };
        }
      }

      const auditEntries: AuditEntry[] = [
        log("Accessory Added", "accessory", id, `${item.name} (${item.quantity} ${item.unit})`, item.purchase_price * item.quantity),
      ];
      if (newPurchase) {
        const supplier = prev.suppliers.find((s) => s.id === acc.supplier_id);
        auditEntries.unshift(
          log("Purchase Created", "purchase", newPurchase.id, `Accessory batch from ${supplier?.name || "Supplier"} (${taka(newPurchase.total_amount)} BDT)`, newPurchase.total_amount),
        );
      }

      return {
        ...prev,
        accessories: [item, ...(prev.accessories ?? [])],
        accessory_movements: movements,
        purchases: newPurchase ? [newPurchase, ...(prev.purchases ?? [])] : prev.purchases,
        audit_log: [...auditEntries, ...prev.audit_log],
      };
    });
  }, []);

  const updateAccessory = useCallback<FmmContextValue["updateAccessory"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      accessories: (prev.accessories ?? []).map((a) => (a.id === id ? { ...a, ...patch, updated_at: new Date().toISOString() } : a)),
      audit_log: [
        log("Accessory Updated", "accessory", id, `Updated details for accessory`, null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  const adjustAccessoryStock = useCallback<FmmContextValue["adjustAccessoryStock"]>((input) => {
    setState((prev) => {
      const acc = (prev.accessories ?? []).find((a) => a.id === input.accessory_id);
      if (!acc) return prev;
      const now = new Date().toISOString();
      const newQty = input.direction === "in" ? acc.quantity + input.quantity : Math.max(0, acc.quantity - input.quantity);
      const unitPrice = input.unit_price || acc.purchase_price;

      const movement: AccessoryMovement = {
        id: uid("acm"),
        accessory_id: acc.id,
        type: input.type,
        quantity: input.quantity,
        direction: input.direction,
        unit_price: unitPrice,
        date: input.date || now,
        reason: input.reason,
        reference_id: input.reference_id ?? null,
        created_at: now,
      };

      let newPurchase: Purchase | null = null;
      if (input.type === "Purchase" && input.direction === "in" && acc.supplier_id) {
        const totalCost = input.quantity * unitPrice;
        newPurchase = {
          id: uid("pur"),
          supplier_id: acc.supplier_id,
          date: input.date || now,
          type: "Accessory",
          items: [
            {
              type: "accessory",
              id: acc.id,
              name: acc.name,
              quantity: input.quantity,
              unit_price: unitPrice,
              total: totalCost,
            },
          ],
          total_amount: totalCost,
          additional_cost: 0,
          paid_amount: 0,
          due_amount: totalCost,
          payment_status: "Not Paid",
          notes: input.reason || `Stock restock: ${input.quantity}x ${acc.name}`,
          created_at: now,
        };
      }

      const auditEntries: AuditEntry[] = [
        log("Stock Adjustment", "accessory", acc.id, `${input.direction === "in" ? "+" : "-"}${input.quantity} ${acc.name} (${input.type}: ${input.reason})`, null),
      ];
      if (newPurchase) {
        const supplier = prev.suppliers.find((s) => s.id === acc.supplier_id);
        auditEntries.unshift(
          log("Purchase Created", "purchase", newPurchase.id, `Accessory restock from ${supplier?.name || "Supplier"} (${taka(newPurchase.total_amount)} BDT)`, newPurchase.total_amount),
        );
      }

      return {
        ...prev,
        accessories: prev.accessories.map((a) => (a.id === acc.id ? { ...a, quantity: newQty, updated_at: now } : a)),
        accessory_movements: [movement, ...(prev.accessory_movements ?? [])],
        purchases: newPurchase ? [newPurchase, ...(prev.purchases ?? [])] : prev.purchases,
        audit_log: [...auditEntries, ...prev.audit_log],
      };
    });
  }, []);

  const recordAccessorySale = useCallback<FmmContextValue["recordAccessorySale"]>((input) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const saleId = uid("tx");
      let totalAmount = 0;
      const saleItems = input.items.map((it) => {
        const acc = prev.accessories.find((a) => a.id === it.accessory_id);
        const isGift = Boolean(it.is_gift || it.unit_price === 0);
        const unitPrice = isGift ? 0 : it.unit_price;
        const subtotal = isGift ? 0 : it.quantity * unitPrice;
        totalAmount += subtotal;
        return {
          type: "accessory" as const,
          id: it.accessory_id,
          name: acc?.name || "Accessory",
          quantity: it.quantity,
          unit_price: unitPrice,
          cost_price: acc?.purchase_price || 0,
          subtotal,
          is_gift: isGift,
        };
      });

      const tx: Transaction = {
        id: saleId,
        phone_id: input.items[0]?.accessory_id || "acc_multi",
        type: "Sale",
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_id: input.customer_id ?? null,
        amount: totalAmount,
        payment_status: input.payment_status,
        payment_method: input.payment_method || "Cash",
        paid_amount: input.payment_status === "Paid" ? totalAmount : 0,
        due_amount: input.payment_status === "Pending" ? totalAmount : 0,
        items: saleItems,
        campaign_id: input.campaign_id ?? null,
        date: now,
        notes: input.notes ?? "",
      };

      // Create stock movement out for each item
      const newMovements: AccessoryMovement[] = input.items.map((it) => {
        const isGift = Boolean(it.is_gift || it.unit_price === 0);
        const acc = prev.accessories.find((a) => a.id === it.accessory_id);
        return {
          id: uid("acm"),
          accessory_id: it.accessory_id,
          type: isGift ? ("Campaign Gift" as const) : ("Sale" as const),
          quantity: it.quantity,
          direction: "out" as const,
          unit_price: isGift ? 0 : it.unit_price,
          date: now,
          reason: isGift
            ? `Free gift (${acc?.name || "Accessory"}) to ${input.customer_name}`
            : `Sold to ${input.customer_name}`,
          reference_id: saleId,
          created_at: now,
        };
      });

      // Decrement quantities
      const updatedAccessories = prev.accessories.map((a) => {
        const item = input.items.find((it) => it.accessory_id === a.id);
        if (item) {
          return { ...a, quantity: Math.max(0, a.quantity - item.quantity), updated_at: now };
        }
        return a;
      });

      return {
        ...prev,
        accessories: updatedAccessories,
        accessory_movements: [...newMovements, ...(prev.accessory_movements ?? [])],
        transactions: [tx, ...prev.transactions],
        audit_log: [
          log("Accessory Sold", "transaction", saleId, `${saleItems.map((i) => `${i.quantity}x ${i.name}`).join(", ")} to ${input.customer_name}`, totalAmount),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  // -------------------------------------------------------------
  // Customer Actions
  // -------------------------------------------------------------
  const addCustomer = useCallback<FmmContextValue["addCustomer"]>((cus) => {
    const id = uid("cus");
    const now = new Date().toISOString();
    const newCustomer: Customer = { ...cus, id, created_at: now, updated_at: now };
    setState((prev) => ({
      ...prev,
      customers: [newCustomer, ...(prev.customers ?? [])],
      audit_log: [
        log("Customer Created", "customer", id, `Customer ${newCustomer.name} registered (${newCustomer.phone})`, null),
        ...prev.audit_log,
      ],
    }));
    return id;
  }, []);

  const updateCustomer = useCallback<FmmContextValue["updateCustomer"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      customers: (prev.customers ?? []).map((c) => (c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c)),
      audit_log: [
        log("Customer Updated", "customer", id, `Customer details updated`, null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  // -------------------------------------------------------------
  // Purchases Actions
  // -------------------------------------------------------------
  const recordPurchase = useCallback<FmmContextValue["recordPurchase"]>((pur) => {
    setState((prev) => {
      const id = uid("pur");
      const now = new Date().toISOString();
      const newPurchase: Purchase = { ...pur, id, created_at: now };
      const supplier = prev.suppliers.find((s) => s.id === pur.supplier_id);
      return {
        ...prev,
        purchases: [newPurchase, ...(prev.purchases ?? [])],
        audit_log: [
          log("Purchase Created", "purchase", id, `Purchase from ${supplier?.name || "Supplier"} (${taka(pur.total_amount)} BDT)`, pur.total_amount),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const recordPurchasePayment = useCallback<FmmContextValue["recordPurchasePayment"]>((purchase_id, amount, notes) => {
    setState((prev) => {
      const pur = (prev.purchases ?? []).find((p) => p.id === purchase_id);
      if (!pur) return prev;
      const now = new Date().toISOString();
      const newPaid = pur.paid_amount + amount;
      const newDue = Math.max(0, pur.total_amount + (pur.additional_cost || 0) - newPaid);
      const newStatus = (newDue === 0 ? "Paid" : "Due") as "Paid" | "Due" | "Not Paid";

      const payment: SupplierPayment = {
        id: uid("sp"),
        supplier_id: pur.supplier_id,
        amount: amount,
        date: now,
        notes: notes ? `Purchase Order #${pur.id.slice(-6)} — ${notes}` : `Purchase Order #${pur.id.slice(-6)} payment`,
        purchase_id: pur.id,
        phone_id: null,
        created_at: now,
      };

      return {
        ...prev,
        purchases: prev.purchases.map((p) =>
          p.id === purchase_id ? { ...p, paid_amount: newPaid, due_amount: newDue, payment_status: newStatus } : p,
        ),
        supplier_payments: [payment, ...(prev.supplier_payments ?? [])],
        audit_log: [
          log("Supplier Payment", "purchase", purchase_id, `Paid ${taka(amount)} BDT towards purchase ${notes ? `(${notes})` : ""}`, amount),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  // -------------------------------------------------------------
  // Expenses Actions
  // -------------------------------------------------------------
  const addExpense = useCallback<FmmContextValue["addExpense"]>((exp) => {
    setState((prev) => {
      const id = uid("exp");
      const now = new Date().toISOString();
      const item: Expense = { ...exp, id, created_at: now };
      return {
        ...prev,
        expenses: [item, ...(prev.expenses ?? [])],
        audit_log: [
          log("Expense Created", "expense", id, `${item.category}: ${item.description} (${taka(item.amount)} BDT)`, item.amount),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const updateExpense = useCallback<FmmContextValue["updateExpense"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      expenses: (prev.expenses ?? []).map((e) => (e.id === id ? { ...e, ...patch } : e)),
      audit_log: [
        log("Expense Updated", "expense", id, `Expense updated`, patch.amount ?? null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  const deleteExpense = useCallback<FmmContextValue["deleteExpense"]>((id) => {
    setState((prev) => ({
      ...prev,
      expenses: (prev.expenses ?? []).filter((e) => e.id !== id),
      audit_log: [
        log("Expense Deleted", "expense", id, `Expense removed`, null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  // -------------------------------------------------------------
  // Campaigns Actions
  // -------------------------------------------------------------
  const addCampaign = useCallback<FmmContextValue["addCampaign"]>((cmp) => {
    const id = uid("cmp");
    const now = new Date().toISOString();
    const item: Campaign = { ...cmp, id, created_at: now, updated_at: now };
    setState((prev) => ({
      ...prev,
      campaigns: [item, ...(prev.campaigns ?? [])],
      audit_log: [
        log("Campaign Created", "campaign", id, `Campaign "${item.name}" created (${item.status})`, item.budget),
        ...prev.audit_log,
      ],
    }));
    return id;
  }, []);

  const updateCampaign = useCallback<FmmContextValue["updateCampaign"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      campaigns: (prev.campaigns ?? []).map((c) => (c.id === id ? { ...c, ...patch, updated_at: new Date().toISOString() } : c)),
      audit_log: [
        log(patch.status === "Completed" ? "Campaign Completed" : "Campaign Updated", "campaign", id, `Campaign details updated`, null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  const deleteCampaign = useCallback<FmmContextValue["deleteCampaign"]>((id) => {
    setState((prev) => ({
      ...prev,
      campaigns: (prev.campaigns ?? []).filter((c) => c.id !== id),
      audit_log: [
        log("Campaign Updated", "campaign", id, `Campaign removed`, null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  // -------------------------------------------------------------
  // Warranty & Returns Actions
  // -------------------------------------------------------------
  const recordWarrantyClaim = useCallback<FmmContextValue["recordWarrantyClaim"]>((claim) => {
    setState((prev) => {
      const id = uid("war");
      const now = new Date().toISOString();
      const item: WarrantyClaim = { ...claim, id, created_at: now };
      return {
        ...prev,
        warranty_claims: [item, ...(prev.warranty_claims ?? [])],
        audit_log: [
          log("Warranty Claim", "warranty", id, `Warranty claim from ${item.customer_name}: ${item.issue_description}`, item.repair_cost),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const updateWarrantyClaim = useCallback<FmmContextValue["updateWarrantyClaim"]>((id, patch) => {
    setState((prev) => ({
      ...prev,
      warranty_claims: (prev.warranty_claims ?? []).map((w) => (w.id === id ? { ...w, ...patch } : w)),
      audit_log: [
        log("Warranty Updated", "warranty", id, `Warranty claim status updated: ${patch.status || "updated"}`, null),
        ...prev.audit_log,
      ],
    }));
  }, []);

  const recordReturn = useCallback<FmmContextValue["recordReturn"]>((ret) => {
    setState((prev) => {
      const id = uid("ret");
      const now = new Date().toISOString();
      const item: CustomerReturn = { ...ret, id, created_at: now };
      return {
        ...prev,
        returns: [item, ...(prev.returns ?? [])],
        audit_log: [
          log("Return", "return", id, `Return from ${item.customer_name} (${item.action}): ${item.reason}`, item.refund_amount),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  // -------------------------------------------------------------
  // Exchange Action
  // -------------------------------------------------------------
  const recordExchange = useCallback<FmmContextValue["recordExchange"]>((exchange, incomingPhone, outgoingPhoneId, evidenceInput) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const incomingId = uid("ph");
      const exchangeId = uid("exc");
      const txId = uid("tx");
      const cpId = uid("cp");

      // Trade-in incoming phone enters "In Inspection" status (NOT available immediately)
      const inPhone: Phone = {
        ...incomingPhone,
        id: incomingId,
        status: "In Inspection",
        source_type: "Buy from Customer",
        supplier_id: null,
        customer_purchase_id: cpId,
        created_at: now,
        updated_at: now,
      };

      const outPhone = prev.phones.find((p) => p.id === outgoingPhoneId);
      const diff = exchange.outgoing_value - exchange.incoming_valuation;
      const diffDirection: "customer_pays_shop" | "shop_pays_customer" =
        diff >= 0 ? "customer_pays_shop" : "shop_pays_customer";
      const settlementAmt = Math.abs(diff);

      const excRecord: ExchangeRecord = {
        ...exchange,
        id: exchangeId,
        incoming_phone_id: incomingId,
        outgoing_phone_id: outgoingPhoneId,
        difference_direction: diffDirection,
        settlement_amount: settlementAmt,
        additional_paid: diffDirection === "customer_pays_shop" ? settlementAmt : 0,
        inspection_status: "Pending Inspection",
        created_at: now,
      };

      const customerPurchase: CustomerPurchase = {
        id: cpId,
        customer_id: exchange.customer_id ?? null,
        customer_name: exchange.customer_name,
        customer_phone: exchange.customer_phone,
        customer_address: evidenceInput?.customer_address || "",
        nid_number: evidenceInput?.nid_number || "",
        nid_front_image: evidenceInput?.nid_front_image || null,
        nid_back_image: evidenceInput?.nid_back_image || null,
        additional_documents: evidenceInput?.additional_documents || [],
        phone_photos: evidenceInput?.phone_photos || [],
        phone_id: incomingId,
        purchase_price: exchange.incoming_valuation,
        created_at: now,
      };

      const tx: Transaction = {
        id: txId,
        phone_id: outgoingPhoneId,
        type: "Exchange",
        customer_name: exchange.customer_name,
        customer_phone: exchange.customer_phone,
        customer_id: exchange.customer_id ?? null,
        amount: exchange.outgoing_value,
        payment_status: "Paid",
        payment_method: "Cash",
        paid_amount: diffDirection === "customer_pays_shop" ? settlementAmt : 0,
        due_amount: 0,
        items: [
          {
            type: "phone",
            id: outgoingPhoneId,
            name: `${outPhone ? `${outPhone.brand} ${outPhone.model}` : "Outgoing Phone"}`,
            quantity: 1,
            unit_price: exchange.outgoing_value,
            cost_price: outPhone?.purchase_price ?? 0,
            subtotal: exchange.outgoing_value,
          },
        ],
        trade_in: {
          incoming_phone_id: incomingId,
          incoming_brand: incomingPhone.brand,
          incoming_model: incomingPhone.model,
          incoming_imei: incomingPhone.imei,
          incoming_valuation: exchange.incoming_valuation,
          difference_direction: diffDirection,
          settlement_amount: settlementAmt,
          inspection_status: "Pending Inspection",
        },
        date: now,
        notes:
          diffDirection === "customer_pays_shop"
            ? `Trade-in exchange: Outgoing ${outPhone?.brand} ${outPhone?.model} (${taka(exchange.outgoing_value)}) for ${incomingPhone.brand} ${incomingPhone.model} (Valued ${taka(exchange.incoming_valuation)}). Customer paid shop ${taka(settlementAmt)}.`
            : `Trade-in downgrade exchange: Outgoing ${outPhone?.brand} ${outPhone?.model} (${taka(exchange.outgoing_value)}) for ${incomingPhone.brand} ${incomingPhone.model} (Valued ${taka(exchange.incoming_valuation)}). Shop owes/paid customer ${taka(settlementAmt)}.`,
      };

      return {
        ...prev,
        phones: [inPhone, ...prev.phones.map((p) => (p.id === outgoingPhoneId ? { ...p, status: "Exchange" as const, sold_price: exchange.outgoing_value, updated_at: now } : p))],
        customer_purchases: [customerPurchase, ...(prev.customer_purchases ?? [])],
        exchanges: [excRecord, ...(prev.exchanges ?? [])],
        transactions: [tx, ...prev.transactions],
        audit_log: [
          log(
            "Exchange",
            "exchange",
            exchangeId,
            diffDirection === "customer_pays_shop"
              ? `Exchanged ${outPhone ? `${outPhone.brand} ${outPhone.model}` : "device"} for ${inPhone.brand} ${inPhone.model} (+${taka(settlementAmt)} BDT customer payment)`
              : `Exchanged ${outPhone ? `${outPhone.brand} ${outPhone.model}` : "device"} for ${inPhone.brand} ${inPhone.model} (-${taka(settlementAmt)} BDT shop payout)`,
            settlementAmt,
          ),
          log("Bought from Customer", "customer_purchase", cpId, `Trade-in ${inPhone.brand} ${inPhone.model} from ${exchange.customer_name}`, exchange.incoming_valuation),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const inspectTradeInDevice = useCallback<FmmContextValue["inspectTradeInDevice"]>((incomingPhoneId, decision) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const phone = prev.phones.find((p) => p.id === incomingPhoneId);
      if (!phone) return prev;

      const newStatus: PhoneStatus = decision.action === "Restock" ? "Available" : "Rejected / Do Not Stock";
      const newSellingPrice = decision.action === "Restock" ? (decision.new_selling_price ?? phone.selling_price) : phone.selling_price;
      const inspectionStatus: "Approved & Restocked" | "Rejected" = decision.action === "Restock" ? "Approved & Restocked" : "Rejected";

      const updatedPhones = prev.phones.map((p) =>
        p.id === incomingPhoneId
          ? {
              ...p,
              status: newStatus,
              selling_price: newSellingPrice,
              condition_notes: decision.condition_notes ? `${p.condition_notes} · ${decision.condition_notes}` : p.condition_notes,
              updated_at: now,
            }
          : p,
      );

      const updatedExchanges = prev.exchanges.map((e) =>
        e.incoming_phone_id === incomingPhoneId ? { ...e, inspection_status: inspectionStatus } : e,
      );

      const updatedTransactions = prev.transactions.map((t) =>
        t.trade_in && t.trade_in.incoming_phone_id === incomingPhoneId
          ? { ...t, trade_in: { ...t.trade_in, inspection_status: inspectionStatus } }
          : t,
      );

      return {
        ...prev,
        phones: updatedPhones,
        exchanges: updatedExchanges,
        transactions: updatedTransactions,
        audit_log: [
          log(
            "Trade-In Inspected",
            "phone",
            incomingPhoneId,
            `${phone.brand} ${phone.model} (${phone.imei}) — ${decision.action === "Restock" ? `Approved & Restocked at ${taka(newSellingPrice ?? 0)} BDT` : "Rejected / Do Not Stock"}`,
            decision.action === "Restock" ? newSellingPrice : null,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  const processCustomerReturn = useCallback<FmmContextValue["processCustomerReturn"]>((transactionId, input) => {
    setState((prev) => {
      const now = new Date().toISOString();
      const tx = prev.transactions.find((t) => t.id === transactionId);
      if (!tx) return prev;
      const phone = prev.phones.find((p) => p.id === tx.phone_id);
      const retId = uid("ret");

      const returnRecord: CustomerReturn = {
        id: retId,
        customer_name: tx.customer_name,
        customer_phone: tx.customer_phone,
        customer_id: tx.customer_id ?? null,
        transaction_id: tx.id,
        phone_id: tx.phone_id,
        accessory_id: null,
        return_date: input.return_date || now,
        reason: input.reason,
        action: "Refund",
        original_sale_price: tx.amount,
        deduction_percentage: input.deduction_percentage,
        deduction_amount: input.deduction_amount,
        refund_amount: input.refund_amount,
        disposition: input.disposition,
        supplier_id: input.supplier_id ?? null,
        new_resale_price: input.new_resale_price ?? null,
        notes: input.notes ?? "",
        created_at: now,
      };

      let newPhoneStatus: PhoneStatus = "Returned";
      let newSellingPrice = phone?.selling_price ?? null;

      if (input.disposition === "Restocked") {
        newPhoneStatus = "Available";
        if (input.new_resale_price && input.new_resale_price > 0) {
          newSellingPrice = input.new_resale_price;
        }
      } else if (input.disposition === "Returned to Supplier") {
        newPhoneStatus = "Returned to Supplier";
      } else {
        newPhoneStatus = "Returned";
      }

      const updatedPhones = prev.phones.map((p) => {
        if (p.id === tx.phone_id) {
          return {
            ...p,
            status: newPhoneStatus,
            selling_price: newSellingPrice,
            condition_notes:
              input.disposition === "Restocked"
                ? `${p.condition_notes} · Restocked from customer return on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })}`
                : p.condition_notes,
            updated_at: now,
          };
        }
        return p;
      });

      const returnInfo: TransactionReturnInfo = {
        return_id: retId,
        return_date: input.return_date || now,
        original_sold_price: tx.amount,
        deduction_percentage: input.deduction_percentage,
        deduction_amount: input.deduction_amount,
        refund_amount: input.refund_amount,
        reason: input.reason,
        disposition: input.disposition,
        supplier_id: input.supplier_id ?? null,
        new_resale_price: input.new_resale_price ?? null,
      };

      const updatedTransactions = prev.transactions.map((t) =>
        t.id === transactionId
          ? {
              ...t,
              return_info: returnInfo,
              notes: t.notes
                ? `${t.notes} · Returned on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} (Refund: ${taka(input.refund_amount)}, Deduction: ${input.deduction_percentage}%)`
                : `Returned on ${new Date().toLocaleDateString("en-US", { month: "short", day: "numeric" })} (Refund: ${taka(input.refund_amount)})`,
            }
          : t,
      );

      const auditEntries: AuditEntry[] = [
        log(
          "Return",
          "transaction",
          transactionId,
          `Customer return for ${phone ? `${phone.brand} ${phone.model}` : "device"} — Refund ${taka(input.refund_amount)} (${input.deduction_percentage}% deduction: ${taka(input.deduction_amount)}). Disposition: ${input.disposition}`,
          input.refund_amount,
        ),
      ];

      if (input.disposition === "Restocked" && phone) {
        auditEntries.push(
          log("Device Restocked", "phone", phone.id, `${phone.brand} ${phone.model} (${phone.imei}) restocked at ${taka(newSellingPrice ?? 0)} BDT`, newSellingPrice),
        );
      } else if (input.disposition === "Returned to Supplier" && phone && input.supplier_id) {
        const sup = prev.suppliers.find((s) => s.id === input.supplier_id);
        auditEntries.push(
          log("Returned to Supplier", "supplier", input.supplier_id, `${phone.brand} ${phone.model} (${phone.imei}) returned to ${sup?.name || "Supplier"}`, input.refund_amount),
        );
      }

      return {
        ...prev,
        phones: updatedPhones,
        transactions: updatedTransactions,
        returns: [returnRecord, ...(prev.returns ?? [])],
        audit_log: [...auditEntries, ...prev.audit_log],
      };
    });
  }, []);

  const updateTransaction = useCallback<FmmContextValue["updateTransaction"]>((transactionId, patch) => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === transactionId);
      if (!tx) return prev;
      const now = new Date().toISOString();

      const updatedTransactions = prev.transactions.map((t) =>
        t.id === transactionId ? { ...t, ...patch } : t,
      );

      let updatedPhones = prev.phones;
      if (patch.amount !== undefined && tx.phone_id) {
        updatedPhones = prev.phones.map((p) =>
          p.id === tx.phone_id ? { ...p, sold_price: patch.amount ?? null, updated_at: now } : p,
        );
      }

      return {
        ...prev,
        transactions: updatedTransactions,
        phones: updatedPhones,
        audit_log: [
          log(
            "Transaction Updated",
            "transaction",
            transactionId,
            `Transaction #${transactionId.slice(-6)} details updated`,
            patch.amount ?? tx.amount,
          ),
          ...prev.audit_log,
        ],
      };
    });
  }, []);

  // -------------------------------------------------------------
  // Settings & Backups
  // -------------------------------------------------------------
  const updateSettings = useCallback<FmmContextValue["updateSettings"]>((patch) => {
    setState((prev) => ({ ...prev, settings: { ...prev.settings, ...patch } }));
  }, []);

  const runBackup = useCallback<FmmContextValue["runBackup"]>(
    async (auto = false) => {
      let created: BackupRecord | null = null;
      let verifyErr: string | null = null;

      setState((prev) => {
        const now = new Date();
        const filename = `fmm-${now.toISOString().slice(0, 19).replace(/[:T]/g, "-")}.fmm`;

        // Strip previous backups from payload to avoid recursion / unbounded growth (Requirement 12)
        const cleanState: FmmState = {
          ...prev,
          backups: [],
        };

        const payloadObj = {
          format: "fmmbackup",
          version: FMM_BACKUP_VERSION,
          backup_version: FMM_BACKUP_VERSION,
          backupVersion: FMM_BACKUP_VERSION,
          app_version: FMM_APP_VERSION,
          appVersion: FMM_APP_VERSION,
          created_at: now.toISOString(),
          createdAt: now.toISOString(),
          data: cleanState,
        };

        const payload = JSON.stringify(payloadObj);

        // Verification check (Requirement 3)
        const verification = verifyBackupPayloadString(payload);
        const isVerified = verification.valid;

        if (!isVerified) {
          verifyErr = verification.error || "Corrupted or invalid payload structure.";
          created = {
            id: uid("bk"),
            timestamp: now.toISOString(),
            filename,
            size: payload.length,
            status: "Failed",
            app_version: FMM_APP_VERSION,
            backup_version: FMM_BACKUP_VERSION,
          };
          const backups = [created, ...prev.backups].slice(0, Math.max(1, prev.settings.keep_copies));
          return {
            ...prev,
            backups,
            audit_log: [
              log("Backup", "backup", created.id, `${auto ? "Automatic" : "Manual"} backup failed verification — ${verifyErr}`, null),
              ...prev.audit_log,
            ],
          };
        }

        created = {
          id: uid("bk"),
          timestamp: now.toISOString(),
          filename,
          size: payload.length,
          status: "Verified",
          app_version: FMM_APP_VERSION,
          backup_version: FMM_BACKUP_VERSION,
        };

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
            log("Backup", "backup", created.id, `${auto ? "Automatic" : "Manual"} backup verified — ${filename}`, null),
            ...prev.audit_log,
          ],
        };
      });

      if (verifyErr) {
        throw new Error(`Backup verification failed: ${verifyErr}`);
      }

      return created;
    },
    [],
  );

  const restoreBackup = useCallback<FmmContextValue["restoreBackup"]>(async (file) => {
    const text = await file.text();
    const verification = verifyBackupPayloadString(text);
    if (!verification.valid || !verification.payload?.data) {
      throw new Error(verification.error || "This file is not a valid or compatible .fmm backup.");
    }
    const d = verification.payload.data;
    setState((prev) => ({
      ...d,
      accessories: d.accessories ?? [],
      accessory_movements: d.accessory_movements ?? [],
      customers: d.customers ?? [],
      purchases: d.purchases ?? [],
      expenses: d.expenses ?? [],
      campaigns: d.campaigns ?? [],
      warranty_claims: d.warranty_claims ?? [],
      returns: d.returns ?? [],
      exchanges: d.exchanges ?? [],
      supplier_payments: d.supplier_payments ?? [],
      customer_purchases: d.customer_purchases ?? [],
      backups: prev.backups?.length ? prev.backups : (d.backups ?? []),
      settings: { ...prev.settings, ...(d.settings ?? {}) },
      audit_log: [
        log("Restore", "backup", "restore", `Restored backup from ${file.name} (${verification.isLegacy ? "Legacy format" : `v${verification.backupVersion || 2}`})`, null),
        ...(d.audit_log ?? prev.audit_log),
      ],
    }));
  }, []);

  const resetData = useCallback(() => {
    const fresh = emptyState();
    setState(fresh);
    void saveState(fresh);
  }, []);

  const loadDemoData = useCallback(() => {
    const seeded = seedState();
    setState(seeded);
    void saveState(seeded);
  }, []);

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
      addPhonesBatch,
      addSupplier,
      recordSale,
      recordSupplierPayment,
      collectPayment,
      saveCustomerPurchase,
      addAccessory,
      updateAccessory,
      adjustAccessoryStock,
      recordAccessorySale,
      addCustomer,
      updateCustomer,
      recordPurchase,
      recordPurchasePayment,
      addExpense,
      updateExpense,
      deleteExpense,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      recordWarrantyClaim,
      updateWarrantyClaim,
      recordReturn,
      processCustomerReturn,
      recordExchange,
      inspectTradeInDevice,
      updateTransaction,
      updateSettings,
      runBackup,
      restoreBackup,
      resetData,
      loadDemoData,
    }),
    [
      state,
      ready,
      addPhone,
      addPhonesBatch,
      addSupplier,
      recordSale,
      recordSupplierPayment,
      collectPayment,
      saveCustomerPurchase,
      addAccessory,
      updateAccessory,
      adjustAccessoryStock,
      recordAccessorySale,
      addCustomer,
      updateCustomer,
      recordPurchase,
      recordPurchasePayment,
      addExpense,
      updateExpense,
      deleteExpense,
      addCampaign,
      updateCampaign,
      deleteCampaign,
      recordWarrantyClaim,
      updateWarrantyClaim,
      recordReturn,
      processCustomerReturn,
      recordExchange,
      inspectTradeInDevice,
      updateTransaction,
      updateSettings,
      runBackup,
      restoreBackup,
      resetData,
      loadDemoData,
    ],
  );

  return (
    <FmmContext.Provider value={value}>
      {ready ? children : <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Loading local data…</div>}
    </FmmContext.Provider>
  );
}

export function useFmm() {
  const ctx = useContext(FmmContext);
  if (!ctx) throw new Error("useFmm must be used inside FmmProvider");
  return ctx;
}

export function taka(n: number): string {
  return `৳${Math.round(n || 0).toLocaleString("en-US")}`;
}

export function daysInStock(created_at: string): number {
  return Math.max(0, Math.floor((Date.now() - new Date(created_at).getTime()) / 86400000));
}

export function supplierName(state: FmmState, phone: Phone): string {
  if (phone.source_type === "Buy from Customer") return "Bought from Customer";
  if (phone.source_type === "Own Stock") return "Own Stock";
  return state.suppliers.find((s) => s.id === phone.supplier_id)?.name ?? "Own Stock";
}

// -------------------------------------------------------------
// Supplier Dues Accounting
// -------------------------------------------------------------
export function supplierTotalOwed(state: FmmState, supplierId: string): number {
  const phoneOwed = (state.phones ?? [])
    .filter((p) => p.supplier_id === supplierId && p.status === "Sold")
    .reduce((sum, p) => sum + p.purchase_price, 0);

  const accessoryPurchasesOwed = (state.purchases ?? [])
    .filter((p) => p.supplier_id === supplierId && p.type === "Accessory")
    .reduce((sum, p) => sum + p.total_amount + (p.additional_cost || 0), 0);

  return phoneOwed + accessoryPurchasesOwed;
}

export function supplierTotalPaid(state: FmmState, supplierId: string): number {
  return (state.supplier_payments ?? [])
    .filter((sp) => sp.supplier_id === supplierId)
    .reduce((sum, sp) => sum + sp.amount, 0);
}

export function supplierDueBalance(state: FmmState, supplierId: string): number {
  return Math.max(0, supplierTotalOwed(state, supplierId) - supplierTotalPaid(state, supplierId));
}

export function shopBalance(state: FmmState): number {
  return (state.phones ?? [])
    .filter((p) => p.status === "Sold" && p.sold_price !== null && p.sold_price !== undefined)
    .reduce((sum, p) => sum + (p.sold_price! - p.purchase_price), 0);
}

export function totalSuppliersDue(state: FmmState): number {
  return (state.suppliers ?? []).reduce((sum, s) => sum + supplierDueBalance(state, s.id), 0);
}

export interface PhonePaymentInfo {
  phoneId: string;
  cost: number;
  paid: number;
  due: number;
  status: "Paid" | "Due" | "Not Paid";
}

export function getSupplierPhonesPaymentMap(state: FmmState, supplierId: string): Map<string, PhonePaymentInfo> {
  const map = new Map<string, PhonePaymentInfo>();
  const supplierPhones = (state.phones ?? []).filter((p) => p.supplier_id === supplierId);
  const supplierPayments = (state.supplier_payments ?? []).filter((sp) => sp.supplier_id === supplierId);

  const directPaidMap = new Map<string, number>();
  let unallocatedPaid = 0;

  for (const sp of supplierPayments) {
    if (sp.phone_id) {
      directPaidMap.set(sp.phone_id, (directPaidMap.get(sp.phone_id) ?? 0) + sp.amount);
    } else {
      unallocatedPaid += sp.amount;
    }
  }

  for (const p of supplierPhones) {
    const directPaid = directPaidMap.get(p.id) ?? 0;
    map.set(p.id, {
      phoneId: p.id,
      cost: p.purchase_price,
      paid: directPaid,
      due: Math.max(0, p.purchase_price - directPaid),
      status: directPaid >= p.purchase_price ? "Paid" : directPaid > 0 ? "Due" : "Not Paid",
    });
  }

  if (unallocatedPaid > 0) {
    const sorted = [...supplierPhones].sort((a, b) => {
      if (a.status === "Sold" && b.status !== "Sold") return -1;
      if (a.status !== "Sold" && b.status === "Sold") return 1;
      return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
    });

    let rem = unallocatedPaid;
    for (const p of sorted) {
      if (rem <= 0) break;
      const current = map.get(p.id)!;
      const remainingDue = current.due;
      if (remainingDue <= 0) continue;

      const add = Math.min(rem, remainingDue);
      const newPaid = current.paid + add;
      const newDue = current.cost - newPaid;
      map.set(p.id, {
        phoneId: p.id,
        cost: current.cost,
        paid: newPaid,
        due: Math.max(0, newDue),
        status: newPaid >= current.cost ? "Paid" : newPaid > 0 ? "Due" : "Not Paid",
      });
      rem -= add;
    }
  }

  return map;
}

// -------------------------------------------------------------
// Multi-Domain Business Analytics & Calculations
// -------------------------------------------------------------
export function phoneBusinessMetrics(state: FmmState) {
  const availablePhones = (state.phones ?? []).filter((p) => p.status === "Available");
  const soldPhones = (state.phones ?? []).filter((p) => p.status === "Sold");
  const todayStr = new Date().toDateString();

  const phoneTxs = (state.transactions ?? []).filter(
    (t) => !t.items || t.items.some((it) => it.type === "phone"),
  );
  const todayTxs = phoneTxs.filter((t) => new Date(t.date).toDateString() === todayStr);

  let phoneRevenue = 0;
  let phoneCashInflow = 0;
  let phoneOutstanding = 0;

  phoneTxs.forEach((t) => {
    const pay = getTransactionPayment(t);
    // Derive the phone portion of the transaction
    if (t.items && t.items.length > 0) {
      const phonePortion = t.items
        .filter((it) => it.type === "phone")
        .reduce((sum, it) => sum + (it.subtotal ?? (it.unit_price * (it.quantity || 1))), 0);
      phoneRevenue += phonePortion;
      const ratio = pay.total > 0 ? Math.min(1, phonePortion / pay.total) : 1;
      phoneCashInflow += Math.round(pay.paid * ratio);
      phoneOutstanding += Math.round(pay.due * ratio);
    } else {
      phoneRevenue += pay.total;
      phoneCashInflow += pay.paid;
      phoneOutstanding += pay.due;
    }
  });

  const phoneCOGS = soldPhones.reduce((s, p) => s + p.purchase_price, 0);
  const phoneGrossProfit = phoneRevenue - phoneCOGS;

  const soldTodayRevenue = todayTxs.reduce((s, t) => s + getTransactionPayment(t).total, 0);

  return {
    totalStock: availablePhones.length,
    stockValue: availablePhones.reduce((s, p) => s + p.purchase_price, 0),
    soldTodayCount: todayTxs.length,
    soldTodayRevenue,
    totalRevenue: phoneRevenue,
    cashInflow: phoneCashInflow,
    totalCOGS: phoneCOGS,
    totalGrossProfit: phoneGrossProfit,
    totalOutstanding: phoneOutstanding,
  };
}

export function accessoryBusinessMetrics(state: FmmState) {
  const accessories = state.accessories ?? [];
  const totalQuantity = accessories.reduce((s, a) => s + a.quantity, 0);
  const totalValue = accessories.reduce((s, a) => s + a.quantity * a.purchase_price, 0);
  const lowStock = accessories.filter((a) => a.quantity <= a.min_threshold);

  const todayStr = new Date().toDateString();
  const accTxs = (state.transactions ?? []).filter((t) => t.items && t.items.some((it) => it.type === "accessory"));
  const todayAccTxs = accTxs.filter((t) => new Date(t.date).toDateString() === todayStr);

  let accRevenue = 0;
  let accCOGS = 0;
  let accOutstanding = 0;
  let accCashInflow = 0;

  accTxs.forEach((t) => {
    const pay = getTransactionPayment(t);
    let txAccPortion = 0;
    t.items?.forEach((it) => {
      if (it.type === "accessory") {
        if (it.is_gift) {
          // Free gifts have 0 revenue, but full acquisition COGS
          accCOGS += (it.cost_price || 0) * (it.quantity || 1);
        } else {
          const sub = it.subtotal ?? (it.unit_price * (it.quantity || 1));
          txAccPortion += sub;
          accRevenue += sub;
          accCOGS += (it.cost_price || 0) * (it.quantity || 1);
        }
      }
    });

    if (pay.total > 0 && txAccPortion > 0) {
      const ratio = Math.min(1, txAccPortion / pay.total);
      accCashInflow += Math.round(pay.paid * ratio);
      accOutstanding += Math.round(pay.due * ratio);
    }
  });

  const soldTodayRevenue = todayAccTxs.reduce((s, t) => {
    const accSub = t.items?.filter((it) => it.type === "accessory" && !it.is_gift)
      .reduce((sum, it) => sum + (it.subtotal ?? (it.unit_price * (it.quantity || 1))), 0) ?? 0;
    return s + accSub;
  }, 0);

  return {
    totalQuantity,
    totalValue,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock,
    soldTodayCount: todayAccTxs.length,
    soldTodayRevenue,
    totalRevenue: accRevenue,
    cashInflow: accCashInflow,
    totalCOGS: accCOGS,
    totalGrossProfit: accRevenue - accCOGS,
    totalOutstanding: accOutstanding,
  };
}

export function overallBusinessMetrics(state: FmmState) {
  const phone = phoneBusinessMetrics(state);
  const acc = accessoryBusinessMetrics(state);

  const allTxs = state.transactions ?? [];
  let totalRevenue = 0;
  let cashInflow = 0;
  let totalOutstanding = 0;

  for (const t of allTxs) {
    const pay = getTransactionPayment(t);
    totalRevenue += pay.total;
    cashInflow += pay.paid;
    totalOutstanding += pay.due;
  }

  const totalCOGS = phone.totalCOGS + acc.totalCOGS;
  const grossProfit = totalRevenue - totalCOGS;

  const operatingExpenses = (state.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - operatingExpenses;

  // Cash Outflow: Supplier payments + customer purchases + expenses
  const cashOutflow =
    (state.supplier_payments ?? []).reduce((s, p) => s + p.amount, 0) +
    (state.customer_purchases ?? []).reduce((s, cp) => s + cp.purchase_price, 0) +
    operatingExpenses;

  const netCashFlow = cashInflow - cashOutflow;

  return {
    totalRevenue,
    totalCOGS,
    grossProfit,
    operatingExpenses,
    netProfit,
    totalOutstanding,
    cashInflow,
    cashOutflow,
    netCashFlow,
  };
}

export function campaignBusinessMetrics(state: FmmState, campaignId: string) {
  const campaign = (state.campaigns ?? []).find((c) => c.id === campaignId);
  if (!campaign) return null;

  // Authoritative links
  const linkedPurchases = (state.purchases ?? []).filter((p) => p.campaign_id === campaignId);
  const linkedExpenses = (state.expenses ?? []).filter((e) => e.campaign_id === campaignId);
  const linkedTransactions = (state.transactions ?? []).filter((t) => t.campaign_id === campaignId);

  // Directly tagged phones (e.g. from procurement) or phones sold in campaign transactions
  const phonesFromTx = new Set<string>();
  linkedTransactions.forEach((t) => {
    if (t.items && t.items.length > 0) {
      t.items.forEach((it) => {
        if (it.type === "phone") phonesFromTx.add(it.id);
      });
    } else if (t.phone_id && t.phone_id !== "acc_multi") {
      phonesFromTx.add(t.phone_id);
    }
  });

  const linkedPhones = (state.phones ?? []).filter(
    (p) => p.campaign_id === campaignId || phonesFromTx.has(p.id),
  );

  // Derive products sold and gifts distributed
  const soldPhonesList: {
    phone?: Phone | undefined;
    sale: Transaction;
    phoneId: string;
    name: string;
    soldPrice: number;
    costPrice: number;
  }[] = [];

  const soldAccessoriesList: {
    id: string;
    name: string;
    quantity: number;
    unitPrice: number;
    costPrice: number;
    subtotal: number;
    sale: Transaction;
  }[] = [];

  const freeGiftsList: {
    id: string;
    name: string;
    quantity: number;
    costPrice: number;
    totalCost: number;
    sale: Transaction;
  }[] = [];

  let totalSalesRevenue = 0;
  let totalProductCOGS = 0;
  let freeGiftCost = 0;
  let accessoriesSold = 0;

  linkedTransactions.forEach((t) => {
    const pay = getTransactionPayment(t);
    totalSalesRevenue += pay.total;

    if (t.items && t.items.length > 0) {
      t.items.forEach((it) => {
        if (it.type === "phone") {
          const ph = state.phones.find((p) => p.id === it.id);
          soldPhonesList.push({
            phone: ph,
            sale: t,
            phoneId: it.id,
            name: it.name,
            soldPrice: it.unit_price,
            costPrice: it.cost_price,
          });
          totalProductCOGS += it.cost_price || 0;
        } else if (it.type === "accessory") {
          if (it.is_gift) {
            const giftTotal = it.quantity * (it.cost_price || 0);
            freeGiftCost += giftTotal;
            totalProductCOGS += giftTotal;
            freeGiftsList.push({
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              costPrice: it.cost_price || 0,
              totalCost: giftTotal,
              sale: t,
            });
          } else {
            accessoriesSold += it.quantity;
            soldAccessoriesList.push({
              id: it.id,
              name: it.name,
              quantity: it.quantity,
              unitPrice: it.unit_price,
              costPrice: it.cost_price || 0,
              subtotal: it.subtotal,
              sale: t,
            });
            totalProductCOGS += it.quantity * (it.cost_price || 0);
          }
        }
      });
    } else {
      // Single-phone transaction without items array
      const ph = state.phones.find((p) => p.id === t.phone_id);
      if (ph) {
        soldPhonesList.push({
          phone: ph,
          sale: t,
          phoneId: ph.id,
          name: `${ph.brand} ${ph.model}`,
          soldPrice: t.amount,
          costPrice: ph.purchase_price,
        });
        totalProductCOGS += ph.purchase_price || 0;
      }
    }
  });

  const totalPurchasesCost = linkedPurchases.reduce((s, p) => s + p.total_amount, 0);
  const totalCampaignExpenses = linkedExpenses.reduce((s, e) => s + e.amount, 0);

  const grossProfit = totalSalesRevenue - totalProductCOGS;
  const netContribution = grossProfit - totalCampaignExpenses;

  const phonesPurchased = linkedPhones.length;
  const phonesSold = soldPhonesList.length;

  let accessoriesPurchased = 0;
  linkedPurchases.forEach((p) => {
    p.items?.forEach((it) => {
      if (it.type === "accessory") accessoriesPurchased += it.quantity;
    });
  });

  return {
    campaign,
    linkedPhones,
    linkedPurchases,
    linkedExpenses,
    linkedTransactions,
    soldPhonesList,
    soldAccessoriesList,
    freeGiftsList,
    totalSalesRevenue,
    totalPurchasesCost,
    totalCampaignExpenses,
    freeGiftCost,
    totalProductCOGS,
    grossProfit,
    netContribution,
    phonesPurchased,
    phonesSold,
    accessoriesPurchased,
    accessoriesSold,
  };
}

export function stockAgingSummary(phones: Phone[]) {
  const available = phones.filter((p) => p.status === "Available");
  const buckets = {
    "0-7 days": [] as Phone[],
    "8-30 days": [] as Phone[],
    "31-60 days": [] as Phone[],
    "61-90 days": [] as Phone[],
    "90+ days": [] as Phone[],
  };

  available.forEach((p) => {
    const days = daysInStock(p.created_at);
    if (days <= 7) buckets["0-7 days"].push(p);
    else if (days <= 30) buckets["8-30 days"].push(p);
    else if (days <= 60) buckets["31-60 days"].push(p);
    else if (days <= 90) buckets["61-90 days"].push(p);
    else buckets["90+ days"].push(p);
  });

  return buckets;
}

export interface TransactionPaymentDetails {
  total: number;
  paid: number;
  due: number;
  hasDue: boolean;
  status: PaymentStatus;
  isPaidInFull: boolean;
}

export function getTransactionPayment(tx: {
  amount: number;
  paid_amount?: number | null | undefined;
  due_amount?: number | null | undefined;
  payment_status: PaymentStatus;
  items?: SaleItem[] | undefined;
}): TransactionPaymentDetails {
  const itemsTotal = (tx.items && tx.items.length > 0)
    ? tx.items.reduce((s, it) => s + (it.is_gift ? 0 : (it.subtotal ?? it.unit_price * (it.quantity || 1))), 0)
    : 0;

  const total = Math.max(tx.amount || 0, itemsTotal);

  let paid = tx.paid_amount;
  let due = tx.due_amount;

  if (tx.payment_status === "Paid") {
    due = 0;
    paid = total;
  } else {
    if (paid === undefined || paid === null) {
      if (due !== undefined && due !== null) {
        paid = Math.max(0, total - due);
      } else {
        paid = 0;
      }
    }
    if (due === undefined || due === null) {
      due = Math.max(0, total - paid);
    }
  }

  // Derive status strictly as Single Source of Truth
  let derivedStatus: PaymentStatus = tx.payment_status;
  if (due <= 0 || paid >= total) {
    derivedStatus = "Paid";
    due = 0;
    paid = total;
  } else if (paid > 0) {
    derivedStatus = "Partial";
  } else {
    derivedStatus = "Pending";
  }

  return {
    total,
    paid,
    due,
    hasDue: due > 0,
    status: derivedStatus,
    isPaidInFull: due === 0,
  };
}
