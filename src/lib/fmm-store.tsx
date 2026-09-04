import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { loadState, saveState, seedState, uid } from "./fmm-db";
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
  Purchase,
  SaleItem,
  Settings,
  StoredFile,
  Supplier,
  SupplierPayment,
  Transaction,
  TransactionType,
  WarrantyClaim,
} from "./fmm-types";


export interface FmmContextValue {
  state: FmmState;
  ready: boolean;
  addPhone: (p: Omit<Phone, "id" | "created_at" | "updated_at">) => void;
  addPhonesBatch: (
    phones: Omit<Phone, "id" | "created_at" | "updated_at">[],
    purchaseOptions?: { supplier_id: string; notes?: string; campaign_id?: string | null },
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
  collectPayment: (transaction_id: string) => void;
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

  // Exchange actions
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

  // System & Settings
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
        if (loaded) {
          const seed = seedState();
          // Backfill customers from transactions & purchases if empty
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
            customers = customerMap.size > 0 ? Array.from(customerMap.values()) : seed.customers;
          }

          const hydrated: FmmState = {
            ...loaded,
            suppliers: loaded.suppliers ?? seed.suppliers,
            phones: (loaded.phones ?? []).map((p) => ({
              ...p,
              sold_price: p.sold_price ?? (p.status === "Sold" ? (p.selling_price ?? p.purchase_price) : null),
              warranty_days: p.warranty_days ?? 30,
            })),
            accessories: loaded.accessories ?? seed.accessories,
            accessory_movements: loaded.accessory_movements ?? seed.accessory_movements,
            customers,
            purchases: loaded.purchases ?? seed.purchases,
            transactions: loaded.transactions ?? seed.transactions,
            supplier_payments: loaded.supplier_payments ?? [],
            customer_purchases: loaded.customer_purchases ?? seed.customer_purchases,
            expenses: loaded.expenses ?? seed.expenses,
            campaigns: loaded.campaigns ?? seed.campaigns,
            warranty_claims: loaded.warranty_claims ?? seed.warranty_claims,
            returns: loaded.returns ?? seed.returns,
            exchanges: loaded.exchanges ?? seed.exchanges,
            audit_log: loaded.audit_log ?? seed.audit_log,
            backups: loaded.backups ?? [],
            settings: loaded.settings ?? seed.settings,
          };
          setState(hydrated);
        } else {
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
        additional_cost: 0,
        paid_amount: 0,
        due_amount: totalAmount,
        payment_status: "Not Paid",
        campaign_id: purchaseOptions.campaign_id ?? null,
        notes: purchaseOptions.notes || `Bulk import of ${createdPhones.length} phone(s)`,
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
      if (newPurchase) {
        auditLogs.unshift(
          log("Purchase Created", "purchase", newPurchase.id, `Phone batch from ${supplier?.name || "Supplier"} (${taka(totalAmount)} BDT)`, totalAmount),
        );
      }
      return {
        ...prev,
        phones: [...createdPhones, ...prev.phones],
        purchases: newPurchase ? [newPurchase, ...(prev.purchases ?? [])] : prev.purchases,
        audit_log: [...auditLogs, ...prev.audit_log],
      };
    });

    return createdPhones;
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

      const tx: Transaction = {
        id: txId,
        phone_id: phone.id,
        type: input.type,
        customer_name: input.customer_name,
        customer_phone: input.customer_phone,
        customer_id: input.customer_id ?? null,
        amount: totalAmount,
        payment_status: input.payment_status,
        payment_method: input.payment_method || "Cash",
        paid_amount: input.payment_status === "Paid" ? totalAmount : 0,
        due_amount: input.payment_status === "Pending" ? totalAmount : 0,
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

      const status: Phone["status"] =
        input.payment_status === "Pending" ? "Payment Pending" : input.type === "Exchange" ? "Exchange" : "Sold";
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
            input.payment_status === "Pending" ? "Payment Pending" : input.type === "Exchange" ? "Exchange" : "Sold",
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

  const collectPayment = useCallback<FmmContextValue["collectPayment"]>((transaction_id) => {
    setState((prev) => {
      const tx = prev.transactions.find((t) => t.id === transaction_id);
      if (!tx) return prev;
      const now = new Date().toISOString();
      const phone = prev.phones.find((p) => p.id === tx.phone_id);
      return {
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === transaction_id ? { ...t, payment_status: "Paid" as PaymentStatus, paid_amount: t.amount, due_amount: 0 } : t,
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

      const inPhone: Phone = {
        ...incomingPhone,
        id: incomingId,
        status: "Available",
        source_type: "Buy from Customer",
        supplier_id: null,
        customer_purchase_id: cpId,
        created_at: now,
        updated_at: now,
      };

      const outPhone = prev.phones.find((p) => p.id === outgoingPhoneId);
      const excRecord: ExchangeRecord = {
        ...exchange,
        id: exchangeId,
        incoming_phone_id: incomingId,
        outgoing_phone_id: outgoingPhoneId,
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
        amount: exchange.additional_paid,
        payment_status: "Paid",
        payment_method: "Cash",
        paid_amount: exchange.additional_paid,
        due_amount: 0,
        date: now,
        notes: `Exchanged with incoming ${incomingPhone.brand} ${incomingPhone.model} (Valued at ${taka(exchange.incoming_valuation)})`,
      };

      return {
        ...prev,
        phones: [inPhone, ...prev.phones.map((p) => (p.id === outgoingPhoneId ? { ...p, status: "Exchange" as const, sold_price: exchange.outgoing_value, updated_at: now } : p))],
        customer_purchases: [customerPurchase, ...(prev.customer_purchases ?? [])],
        exchanges: [excRecord, ...(prev.exchanges ?? [])],
        transactions: [tx, ...prev.transactions],
        audit_log: [
          log("Exchange", "exchange", exchangeId, `Exchanged ${outPhone ? `${outPhone.brand} ${outPhone.model}` : "device"} for ${inPhone.brand} ${inPhone.model} (+${taka(exchange.additional_paid)} BDT)`, exchange.additional_paid),
          log("Bought from Customer", "customer_purchase", cpId, `Trade-in ${inPhone.brand} ${inPhone.model} from ${exchange.customer_name}`, exchange.incoming_valuation),
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
      setState((prev) => {
        const now = new Date();
        const payload = JSON.stringify({ format: "fmmbackup", version: 2, created_at: now.toISOString(), data: prev });
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
    const d = parsed.data;
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
      audit_log: [
        log("Restore", "backup", "restore", `Restored backup from ${file.name}`, null),
        ...(d.audit_log ?? prev.audit_log),
      ],
    }));
  }, []);

  const resetData = useCallback(() => setState(seedState()), []);

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
      recordExchange,
      updateSettings,
      runBackup,
      restoreBackup,
      resetData,
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
      recordExchange,
      updateSettings,
      runBackup,
      restoreBackup,
      resetData,
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

  const todayTxs = (state.transactions ?? []).filter(
    (t) => new Date(t.date).toDateString() === todayStr && (!t.items || t.items.some((it) => it.type === "phone")),
  );

  const phoneRevenue = (state.transactions ?? [])
    .filter((t) => t.payment_status === "Paid" && (!t.items || t.items.some((it) => it.type === "phone")))
    .reduce((s, t) => s + t.amount, 0);

  const phoneCOGS = soldPhones.reduce((s, p) => s + p.purchase_price, 0);
  const phoneGrossProfit = phoneRevenue - phoneCOGS;

  const phoneOutstanding = (state.transactions ?? [])
    .filter((t) => t.payment_status === "Pending" && (!t.items || t.items.some((it) => it.type === "phone")))
    .reduce((s, t) => s + t.amount, 0);

  return {
    totalStock: availablePhones.length,
    stockValue: availablePhones.reduce((s, p) => s + p.purchase_price, 0),
    soldTodayCount: todayTxs.length,
    soldTodayRevenue: todayTxs.filter((t) => t.payment_status === "Paid").reduce((s, t) => s + t.amount, 0),
    totalRevenue: phoneRevenue,
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

  accTxs.forEach((t) => {
    t.items?.forEach((it) => {
      if (it.type === "accessory") {
        if (t.payment_status === "Paid") {
          accRevenue += it.subtotal;
          accCOGS += it.quantity * it.cost_price;
        } else {
          accOutstanding += it.subtotal;
        }
      }
    });
  });

  return {
    totalQuantity,
    totalValue,
    lowStockCount: lowStock.length,
    lowStockItems: lowStock,
    soldTodayCount: todayAccTxs.length,
    soldTodayRevenue: todayAccTxs.filter((t) => t.payment_status === "Paid").reduce((s, t) => s + t.amount, 0),
    totalRevenue: accRevenue,
    totalCOGS: accCOGS,
    totalGrossProfit: accRevenue - accCOGS,
    totalOutstanding: accOutstanding,
  };
}

export function overallBusinessMetrics(state: FmmState) {
  const phone = phoneBusinessMetrics(state);
  const acc = accessoryBusinessMetrics(state);

  const totalRevenue = phone.totalRevenue + acc.totalRevenue;
  const totalCOGS = phone.totalCOGS + acc.totalCOGS;
  const grossProfit = totalRevenue - totalCOGS;

  const operatingExpenses = (state.expenses ?? []).reduce((s, e) => s + e.amount, 0);
  const netProfit = grossProfit - operatingExpenses;
  const totalOutstanding = phone.totalOutstanding + acc.totalOutstanding;

  // Cash Inflow: All customer payments received
  const cashInflow = (state.transactions ?? []).filter((t) => t.payment_status === "Paid").reduce((s, t) => s + t.amount, 0);

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
    const isPaid = t.payment_status === "Paid";
    if (isPaid) {
      totalSalesRevenue += t.amount;
    }

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
          if (isPaid) {
            totalProductCOGS += it.cost_price || 0;
          }
        } else if (it.type === "accessory") {
          if (it.is_gift) {
            const giftTotal = it.quantity * (it.cost_price || 0);
            freeGiftCost += giftTotal;
            if (isPaid) {
              totalProductCOGS += giftTotal;
            }
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
            if (isPaid) {
              totalProductCOGS += it.quantity * (it.cost_price || 0);
            }
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
        if (isPaid) {
          totalProductCOGS += ph.purchase_price || 0;
        }
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
