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

export async function loadState(): Promise<FmmState | null> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const req = db.transaction(STORE, "readonly").objectStore(STORE).get(KEY);
    req.onsuccess = () => resolve((req.result as FmmState) ?? null);
    req.onerror = () => reject(req.error);
  });
}

export async function saveState(state: FmmState): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(state, KEY);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export function uid(prefix: string): string {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function daysAgo(n: number): string {
  return new Date(Date.now() - n * 86400000).toISOString();
}

export function seedState(): FmmState {
  const s1 = uid("sup");
  const s2 = uid("sup");
  const s3 = uid("sup");
  const now = new Date().toISOString();

  const suppliers = [
    { id: s1, name: "Zakaria", status: "Active Partner" as const, contact: "01711-223344", notes: "Dhaka wholesale", created_at: daysAgo(200) },
    { id: s2, name: "Osama", status: "Active Partner" as const, contact: "01822-556677", notes: "", created_at: daysAgo(150) },
    { id: s3, name: "Ramzan", status: "Pending Review" as const, contact: "01933-889900", notes: "New source", created_at: daysAgo(40) },
  ];

  const mk = (
    imei: string,
    brand: string,
    model: string,
    storage_ram: string,
    condition: FmmState["phones"][number]["condition"],
    supplier_id: string | null,
    purchase_price: number,
    selling_price: number | null,
    status: FmmState["phones"][number]["status"],
    ageDays: number,
  ): FmmState["phones"][number] => ({
    id: uid("ph"),
    imei,
    imei_secondary: null,
    battery_health: null,
    brand,
    model,
    storage_ram,
    condition,
    source_type: supplier_id ? "Supplier Purchase" : "Buy from Customer",
    supplier_id,
    customer_purchase_id: null,
    purchase_price,
    selling_price,
    status,
    condition_notes: "",
    damage_checklist: { screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false },
    warranty_repair_notes: "",
    created_at: daysAgo(ageDays),
    updated_at: daysAgo(ageDays),
  });

  const phones = [
    mk("359012345678901", "Samsung", "Galaxy S23", "8GB / 256GB", "New", s1, 75000, 82000, "Available", 12),
    mk("358192837465012", "Apple", "iPhone 14 Pro", "6GB / 128GB", "Used - A", s2, 90000, 98000, "Payment Pending", 3),
    mk("352345678901234", "Xiaomi", "Redmi Note 12", "4GB / 128GB", "New", s1, 16500, 18500, "Sold", 0),
    mk("356789012345678", "Google", "Pixel 7", "8GB / 128GB", "Used - B", null, 45000, 52000, "Exchange", 5),
    mk("351122334455667", "Apple", "iPhone 13 Pro", "6GB / 256GB", "Used - A", s1, 78000, 85000, "Available", 9),
    mk("351122334455668", "Samsung", "Galaxy S22 Ultra", "12GB / 256GB", "Used - A", s2, 62000, 70000, "Available", 20),
    mk("351122334455669", "Google", "Pixel 6a", "6GB / 128GB", "Used - B", s3, 28000, 33000, "Available", 15),
    mk("351122334455670", "Samsung", "Galaxy A54", "8GB / 128GB", "New", s3, 24000, 27500, "Available", 4),
  ];

  const transactions: FmmState["transactions"] = [
    {
      id: uid("tx"), phone_id: phones[2]!.id, type: "Sale", customer_name: "Jalal Uddin",
      customer_phone: "01933-889900", amount: 18500, payment_status: "Paid", date: daysAgo(1), notes: "",
    },
    {
      id: uid("tx"), phone_id: phones[1]!.id, type: "Sale", customer_name: "Sabbir Rahman",
      customer_phone: "01711-223344", amount: 33500, payment_status: "Pending", date: daysAgo(0), notes: "Balance due",
    },
    {
      id: uid("tx"), phone_id: phones[3]!.id, type: "Exchange", customer_name: "Karim Hossain",
      customer_phone: "01822-556677", amount: 12000, payment_status: "Pending", date: daysAgo(0), notes: "",
    },
  ];

  const customerPurchaseId = uid("cp");
  phones[3]!.customer_purchase_id = customerPurchaseId;
  phones[3]!.damage_checklist = { screen_scratch: true, body_dent: false, battery_issue: true, camera_blurry: false };

  const customer_purchases: FmmState["customer_purchases"] = [
    {
      id: customerPurchaseId,
      customer_name: "Karim Hossain",
      customer_phone: "01822-556677",
      customer_address: "Goalchamot, Faridpur Sadar, Faridpur",
      nid_number: "1992561234567",
      nid_front_image: null,
      nid_back_image: null,
      additional_documents: [],
      phone_photos: [],
      phone_id: phones[3]!.id,
      purchase_price: 45000,
      created_at: daysAgo(5),
    },
  ];

  const audit_log: FmmState["audit_log"] = [
    { id: uid("au"), timestamp: daysAgo(5), action: "Bought from Customer", entity_type: "customer_purchase", entity_id: customerPurchaseId, details: "Google Pixel 7 from Karim Hossain", amount: 45000 },
    { id: uid("au"), timestamp: daysAgo(0), action: "Sold", entity_type: "phone", entity_id: phones[2]!.id, details: "Redmi Note 12 (IMEI: …1234)", amount: 18500 },
    { id: uid("au"), timestamp: daysAgo(0), action: "Payment Pending", entity_type: "transaction", entity_id: transactions[1]!.id, details: "iPhone 14 Pro (IMEI: …5012)", amount: 33500 },
    { id: uid("au"), timestamp: daysAgo(1), action: "Added", entity_type: "phone", entity_id: phones[7]!.id, details: "Samsung Galaxy A54 added to stock", amount: 24000 },
  ];

  return {
    suppliers,
    phones,
    transactions,
    customer_purchases,
    audit_log,
    backups: [],
    settings: { low_stock_threshold: 3, auto_backup: "daily", backup_location: "D:\\FMM Backups\\", keep_copies: 7 },
    ...{ _created: now } as object,
  } as FmmState;
}
