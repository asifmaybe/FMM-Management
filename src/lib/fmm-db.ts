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

  const c1 = uid("cus");
  const c2 = uid("cus");
  const c3 = uid("cus");
  const c4 = uid("cus");

  const cmp1 = uid("cmp");

  const suppliers: FmmState["suppliers"] = [
    { id: s1, name: "Zakaria", status: "Active Partner", contact: "01711-223344", notes: "Dhaka wholesale & accessories distributor", created_at: daysAgo(200) },
    { id: s2, name: "Osama", status: "Active Partner", contact: "01822-556677", notes: "Premium Apple & Samsung importer", created_at: daysAgo(150) },
    { id: s3, name: "Ramzan", status: "Pending Review", contact: "01933-889900", notes: "Accessories and mid-range devices", created_at: daysAgo(40) },
  ];

  const customers: FmmState["customers"] = [
    { id: c1, name: "Jalal Uddin", phone: "01933-889900", address: "Jhiltuly, Faridpur Sadar", nid_number: "1988261947261", notes: "Frequent buyer", created_at: daysAgo(60), updated_at: daysAgo(1) },
    { id: c2, name: "Sabbir Rahman", phone: "01711-223344", address: "Goalchamot, Faridpur Sadar", nid_number: "1994269184712", notes: "VIP customer", created_at: daysAgo(45), updated_at: daysAgo(0) },
    { id: c3, name: "Karim Hossain", phone: "01822-556677", address: "Goalchamot, Faridpur Sadar", nid_number: "1992561234567", notes: "Exchanged Pixel 7", created_at: daysAgo(20), updated_at: daysAgo(5) },
    { id: c4, name: "Tariqul Islam", phone: "01611-998877", address: "Mujib Sarak, Faridpur", nid_number: "1997381928374", notes: "Accessories buyer", created_at: daysAgo(10), updated_at: daysAgo(2) },
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
    sold_price: number | null = status === "Sold" ? (selling_price ?? purchase_price) : null,
    campaign_id: string | null = null,
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
    sold_price,
    status,
    condition_notes: "",
    damage_checklist: { screen_scratch: false, body_dent: false, battery_issue: false, camera_blurry: false },
    warranty_repair_notes: "",
    campaign_id,
    warranty_days: 30,
    created_at: daysAgo(ageDays),
    updated_at: daysAgo(ageDays),
  });

  const phones = [
    mk("359012345678901", "Samsung", "Galaxy S23", "8GB / 256GB", "New", s1, 75000, 82000, "Available", 12, null, cmp1),
    mk("358192837465012", "Apple", "iPhone 14 Pro", "6GB / 128GB", "Used - A", s2, 90000, 98000, "Payment Pending", 3, null, cmp1),
    mk("352345678901234", "Xiaomi", "Redmi Note 12", "4GB / 128GB", "New", s1, 16500, 18500, "Sold", 0, 18500, cmp1),
    mk("356789012345678", "Google", "Pixel 7", "8GB / 128GB", "Used - B", null, 45000, 52000, "Exchange", 5, null),
    mk("351122334455667", "Apple", "iPhone 13 Pro", "6GB / 256GB", "Used - A", s1, 78000, 85000, "Available", 9, null, cmp1),
    mk("351122334455668", "Samsung", "Galaxy S22 Ultra", "12GB / 256GB", "Used - A", s2, 62000, 70000, "Available", 20, null),
    mk("351122334455669", "Google", "Pixel 6a", "6GB / 128GB", "Used - B", s3, 28000, 33000, "Available", 15, null),
    mk("351122334455670", "Samsung", "Galaxy A54", "8GB / 128GB", "New", s3, 24000, 27500, "Available", 4, null),
  ];

  const a1 = uid("acc");
  const a2 = uid("acc");
  const a3 = uid("acc");
  const a4 = uid("acc");
  const a5 = uid("acc");
  const a6 = uid("acc");
  const a7 = uid("acc");

  const accessories: FmmState["accessories"] = [
    {
      id: a1,
      name: "Baseus Cafule USB-C Fast Cable 1m",
      category: "Charging Cable",
      brand: "Baseus",
      model_sku: "CATKLF-GG1",
      variant: "1m / 66W Grey",
      unit: "pcs",
      purchase_price: 250,
      selling_price: 400,
      quantity: 42,
      min_threshold: 10,
      supplier_id: s1,
      notes: "High durability braided nylon",
      status: "Active",
      created_at: daysAgo(30),
      updated_at: daysAgo(1),
    },
    {
      id: a2,
      name: "Anker 20W PowerPort III Nano PD Charger",
      category: "Charger",
      brand: "Anker",
      model_sku: "A2633",
      variant: "20W White",
      unit: "pcs",
      purchase_price: 1100,
      selling_price: 1600,
      quantity: 18,
      min_threshold: 5,
      supplier_id: s2,
      notes: "Original authentic batch for iPhone",
      status: "Active",
      created_at: daysAgo(25),
      updated_at: daysAgo(2),
    },
    {
      id: a3,
      name: "Remax 10000mAh Power Bank RPP-96",
      category: "Power Bank",
      brand: "Remax",
      model_sku: "RPP-96",
      variant: "10,000mAh Black",
      unit: "pcs",
      purchase_price: 950,
      selling_price: 1450,
      quantity: 11,
      min_threshold: 4,
      supplier_id: s1,
      notes: "Dual USB Output",
      status: "Active",
      created_at: daysAgo(20),
      updated_at: daysAgo(3),
    },
    {
      id: a4,
      name: "Apple EarPods Lightning Connector",
      category: "Earbuds",
      brand: "Apple",
      model_sku: "MMTN2ZM/A",
      variant: "Lightning White",
      unit: "pcs",
      purchase_price: 1600,
      selling_price: 2200,
      quantity: 6,
      min_threshold: 3,
      supplier_id: s2,
      notes: "Original Box Packed",
      status: "Active",
      created_at: daysAgo(18),
      updated_at: daysAgo(4),
    },
    {
      id: a5,
      name: "Samsung 25W Super Fast Type-C Adapter",
      category: "Adapter",
      brand: "Samsung",
      model_sku: "EP-TA800",
      variant: "25W Black",
      unit: "pcs",
      purchase_price: 1200,
      selling_price: 1750,
      quantity: 14,
      min_threshold: 5,
      supplier_id: s1,
      notes: "VN Factory Authentic",
      status: "Active",
      created_at: daysAgo(15),
      updated_at: daysAgo(2),
    },
    {
      id: a6,
      name: "Premium Liquid Silicone Case iPhone 14 Pro",
      category: "Phone Cover",
      brand: "OEM",
      model_sku: "SC-IP14P",
      variant: "Midnight Navy",
      unit: "pcs",
      purchase_price: 180,
      selling_price: 350,
      quantity: 26,
      min_threshold: 8,
      supplier_id: s3,
      notes: "Soft microfiber inside",
      status: "Active",
      created_at: daysAgo(10),
      updated_at: daysAgo(1),
    },
    {
      id: a7,
      name: "9D Full Glue Tempered Glass for S23",
      category: "Screen Protector",
      brand: "9D",
      model_sku: "TG-S23",
      variant: "Full Screen Black Edge",
      unit: "pcs",
      purchase_price: 60,
      selling_price: 150,
      quantity: 48,
      min_threshold: 15,
      supplier_id: s3,
      notes: "High touch sensitivity",
      status: "Active",
      created_at: daysAgo(8),
      updated_at: daysAgo(0),
    },
  ];

  const accessory_movements: FmmState["accessory_movements"] = [
    { id: uid("acm"), accessory_id: a1, type: "Purchase", quantity: 50, direction: "in", unit_price: 250, date: daysAgo(30), reason: "Initial supplier batch", created_at: daysAgo(30) },
    { id: uid("acm"), accessory_id: a1, type: "Sale", quantity: 8, direction: "out", unit_price: 400, date: daysAgo(5), reason: "Customer retail sale", created_at: daysAgo(5) },
    { id: uid("acm"), accessory_id: a2, type: "Purchase", quantity: 20, direction: "in", unit_price: 1100, date: daysAgo(25), reason: "Supplier stock purchase", created_at: daysAgo(25) },
    { id: uid("acm"), accessory_id: a2, type: "Sale", quantity: 2, direction: "out", unit_price: 1600, date: daysAgo(2), reason: "Sold with iPhone 14 Pro", created_at: daysAgo(2) },
    { id: uid("acm"), accessory_id: a3, type: "Purchase", quantity: 12, direction: "in", unit_price: 950, date: daysAgo(20), reason: "Stock replenishment", created_at: daysAgo(20) },
    { id: uid("acm"), accessory_id: a3, type: "Damage/Loss", quantity: 1, direction: "out", unit_price: 950, date: daysAgo(7), reason: "Packaging crushed in shipping", created_at: daysAgo(7) },
    { id: uid("acm"), accessory_id: a4, type: "Purchase", quantity: 8, direction: "in", unit_price: 1600, date: daysAgo(18), reason: "Apple accessories order", created_at: daysAgo(18) },
    { id: uid("acm"), accessory_id: a4, type: "Sale", quantity: 2, direction: "out", unit_price: 2200, date: daysAgo(4), reason: "Customer purchase", created_at: daysAgo(4) },
    { id: uid("acm"), accessory_id: a5, type: "Purchase", quantity: 15, direction: "in", unit_price: 1200, date: daysAgo(15), reason: "Samsung charger batch", created_at: daysAgo(15) },
    { id: uid("acm"), accessory_id: a5, type: "Sale", quantity: 1, direction: "out", unit_price: 1750, date: daysAgo(2), reason: "Customer purchase", created_at: daysAgo(2) },
    { id: uid("acm"), accessory_id: a6, type: "Purchase", quantity: 30, direction: "in", unit_price: 180, date: daysAgo(10), reason: "Case collection", created_at: daysAgo(10) },
    { id: uid("acm"), accessory_id: a6, type: "Sale", quantity: 4, direction: "out", unit_price: 350, date: daysAgo(1), reason: "Store walk-in sales", created_at: daysAgo(1) },
    { id: uid("acm"), accessory_id: a7, type: "Purchase", quantity: 50, direction: "in", unit_price: 60, date: daysAgo(8), reason: "Screen protector carton", created_at: daysAgo(8) },
    { id: uid("acm"), accessory_id: a7, type: "Sale", quantity: 2, direction: "out", unit_price: 150, date: daysAgo(0), reason: "Fitted on S23", created_at: daysAgo(0) },
  ];

  const campaigns: FmmState["campaigns"] = [
    {
      id: cmp1,
      name: "Eid-ul-Adha Special Campaign",
      description: "Festive stock boost, combo offers on fast chargers and special trade-in discounts on flagship phones.",
      start_date: daysAgo(10).slice(0, 10),
      end_date: daysAgo(-7).slice(0, 10),
      status: "Active",
      budget: 25000,
      notes: "Target: 25 phone units, 150 accessory units",
      created_at: daysAgo(12),
      updated_at: daysAgo(2),
    },
  ];

  const expenses: FmmState["expenses"] = [
    { id: uid("exp"), category: "Shop Rent", amount: 15000, date: daysAgo(25), payment_method: "Cash", description: "Shop rent for current month", created_at: daysAgo(25) },
    { id: uid("exp"), category: "Electricity", amount: 3200, date: daysAgo(18), payment_method: "bKash", description: "PDB Commercial electric bill", created_at: daysAgo(18) },
    { id: uid("exp"), category: "Internet", amount: 1200, date: daysAgo(12), payment_method: "bKash", description: "Broadband fiber optic connection", created_at: daysAgo(12) },
    { id: uid("exp"), category: "Marketing", amount: 3500, date: daysAgo(8), payment_method: "bKash", description: "Eid campaign social media boost & banner prints", campaign_id: cmp1, created_at: daysAgo(8) },
    { id: uid("exp"), category: "Packaging", amount: 1800, date: daysAgo(6), payment_method: "Cash", description: "Custom FMM shopping bags and box packaging", campaign_id: cmp1, created_at: daysAgo(6) },
    { id: uid("exp"), category: "Transport", amount: 1500, date: daysAgo(4), payment_method: "Cash", description: "Dhaka wholesale parcel courier & van delivery", campaign_id: cmp1, created_at: daysAgo(4) },
  ];

  const purchases: FmmState["purchases"] = [
    {
      id: uid("pur"),
      supplier_id: s1,
      date: daysAgo(12),
      type: "Phone",
      phone_ids: [phones[0]!.id, phones[2]!.id, phones[4]!.id],
      total_amount: 169500,
      additional_cost: 500,
      paid_amount: 155000,
      due_amount: 15000,
      payment_status: "Due",
      campaign_id: cmp1,
      notes: "Stock delivery batch #948",
      created_at: daysAgo(12),
    },
    {
      id: uid("pur"),
      supplier_id: s2,
      date: daysAgo(25),
      type: "Accessory",
      items: [
        { type: "accessory", id: a2, name: "Anker 20W PD Charger", quantity: 20, unit_price: 1100, total: 22000 },
        { type: "accessory", id: a4, name: "Apple EarPods Lightning", quantity: 8, unit_price: 1600, total: 12800 },
      ],
      total_amount: 34800,
      additional_cost: 0,
      paid_amount: 34800,
      due_amount: 0,
      payment_status: "Paid",
      campaign_id: null,
      notes: "Paid in full via Bank Transfer",
      created_at: daysAgo(25),
    },
  ];

  const transactions: FmmState["transactions"] = [
    {
      id: uid("tx"),
      phone_id: phones[2]!.id,
      customer_id: c1,
      type: "Sale",
      customer_name: "Jalal Uddin",
      customer_phone: "01933-889900",
      amount: 18500,
      payment_status: "Paid",
      payment_method: "Cash",
      paid_amount: 18500,
      due_amount: 0,
      campaign_id: cmp1,
      items: [
        { type: "phone", id: phones[2]!.id, name: "Xiaomi Redmi Note 12", quantity: 1, unit_price: 18500, cost_price: 16500, subtotal: 18500 },
      ],
      date: daysAgo(1),
      notes: "Full payment received in cash",
    },
    {
      id: uid("tx"),
      phone_id: phones[1]!.id,
      customer_id: c2,
      type: "Sale",
      customer_name: "Sabbir Rahman",
      customer_phone: "01711-223344",
      amount: 33500,
      payment_status: "Pending",
      payment_method: "bKash",
      paid_amount: 64500,
      due_amount: 33500,
      campaign_id: cmp1,
      items: [
        { type: "phone", id: phones[1]!.id, name: "Apple iPhone 14 Pro", quantity: 1, unit_price: 98000, cost_price: 90000, subtotal: 98000 },
      ],
      date: daysAgo(0),
      notes: "Advance 64,500 ৳ paid, 33,500 ৳ balance due tomorrow",
    },
    {
      id: uid("tx"),
      phone_id: phones[3]!.id,
      customer_id: c3,
      type: "Exchange",
      customer_name: "Karim Hossain",
      customer_phone: "01822-556677",
      amount: 12000,
      payment_status: "Pending",
      payment_method: "Cash",
      paid_amount: 0,
      due_amount: 12000,
      items: [
        { type: "phone", id: phones[3]!.id, name: "Google Pixel 7 (Incoming)", quantity: 1, unit_price: 52000, cost_price: 45000, subtotal: 12000 },
      ],
      date: daysAgo(0),
      notes: "Old phone valued at 45,000 ৳, remaining 12,000 ৳ due",
    },
  ];

  const customerPurchaseId = uid("cp");
  phones[3]!.customer_purchase_id = customerPurchaseId;
  phones[3]!.damage_checklist = { screen_scratch: true, body_dent: false, battery_issue: true, camera_blurry: false };

  const customer_purchases: FmmState["customer_purchases"] = [
    {
      id: customerPurchaseId,
      customer_id: c3,
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

  const exchanges: FmmState["exchanges"] = [
    {
      id: uid("exc"),
      outgoing_phone_id: phones[0]!.id,
      incoming_phone_id: phones[3]!.id,
      customer_id: c3,
      customer_name: "Karim Hossain",
      customer_phone: "01822-556677",
      outgoing_value: 57000,
      incoming_valuation: 45000,
      additional_paid: 12000,
      date: daysAgo(0),
      notes: "Traded Pixel 7 towards Galaxy S23",
      created_at: daysAgo(0),
    },
  ];

  const warranty_claims: FmmState["warranty_claims"] = [
    {
      id: uid("war"),
      customer_name: "Jalal Uddin",
      customer_phone: "01933-889900",
      customer_id: c1,
      phone_id: phones[2]!.id,
      transaction_id: transactions[0]!.id,
      claim_date: daysAgo(0),
      issue_description: "Charging port slightly loose after 1 day of use",
      status: "In Repair",
      repair_cost: 300,
      customer_charge: 0,
      notes: "Complimentary shop warranty repair in progress",
      created_at: daysAgo(0),
    },
  ];

  const returns: FmmState["returns"] = [];

  const audit_log: FmmState["audit_log"] = [
    { id: uid("au"), timestamp: daysAgo(12), action: "Campaign Created", entity_type: "campaign", entity_id: cmp1, details: "Eid-ul-Adha Special Campaign initialized with budget 25,000 ৳", amount: 25000 },
    { id: uid("au"), timestamp: daysAgo(8), action: "Expense Created", entity_type: "expense", entity_id: expenses[3]!.id, details: "Marketing boost for Eid campaign", amount: 3500 },
    { id: uid("au"), timestamp: daysAgo(5), action: "Bought from Customer", entity_type: "customer_purchase", entity_id: customerPurchaseId, details: "Google Pixel 7 from Karim Hossain", amount: 45000 },
    { id: uid("au"), timestamp: daysAgo(1), action: "Sold", entity_type: "phone", entity_id: phones[2]!.id, details: "Redmi Note 12 (IMEI: …1234)", amount: 18500 },
    { id: uid("au"), timestamp: daysAgo(0), action: "Payment Pending", entity_type: "transaction", entity_id: transactions[1]!.id, details: "iPhone 14 Pro (IMEI: …5012)", amount: 33500 },
  ];

  return {
    suppliers,
    phones,
    accessories,
    accessory_movements,
    customers,
    purchases,
    transactions,
    supplier_payments: [],
    customer_purchases,
    expenses,
    campaigns,
    warranty_claims,
    returns,
    exchanges,
    audit_log,
    backups: [],
    settings: { low_stock_threshold: 3, auto_backup: "daily", backup_location: "D:\\FMM Backups\\", keep_copies: 7 },
  };
}
