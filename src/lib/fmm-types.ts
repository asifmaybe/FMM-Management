export type SupplierStatus = "Active Partner" | "Pending Review";

export interface Supplier {
  id: string;
  name: string;
  status: SupplierStatus;
  contact: string;
  notes: string;
  created_at: string;
}

export type PhoneCondition = "New" | "Used - A" | "Used - B" | "Used - Good" | "Refurbished";
export type PhoneStatus = "Available" | "Sold" | "Exchange" | "Payment Pending";
export type SourceType = "Supplier Purchase" | "Buy from Customer" | "Own Stock";

export interface DamageChecklist {
  screen_scratch: boolean;
  body_dent: boolean;
  battery_issue: boolean;
  camera_blurry: boolean;
}

export interface Phone {
  id: string;
  imei: string;
  imei_secondary: string | null;
  battery_health: string | null;
  brand: string;
  model: string;
  storage_ram: string;
  condition: PhoneCondition;
  source_type: SourceType;
  supplier_id: string | null;
  customer_purchase_id: string | null;
  purchase_price: number;
  selling_price: number | null;
  sold_price?: number | null;
  status: PhoneStatus;
  condition_notes: string;
  damage_checklist: DamageChecklist;
  warranty_repair_notes: string;
  campaign_id?: string | null;
  warranty_days?: number | null;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Accessories Domain
// -------------------------------------------------------------
export type AccessoryCategory =
  | "Charger"
  | "Charging Cable"
  | "Headphone"
  | "Earbuds"
  | "Power Bank"
  | "Phone Cover"
  | "Screen Protector"
  | "Adapter"
  | "Data Cable"
  | "Other";

export interface Accessory {
  id: string;
  name: string;
  category: AccessoryCategory | string;
  brand: string;
  model_sku: string;
  variant: string;
  unit: string; // e.g. "pcs", "box"
  purchase_price: number; // default unit cost
  selling_price: number;
  quantity: number;
  min_threshold: number;
  supplier_id: string | null;
  notes: string;
  status: "Active" | "Discontinued";
  created_at: string;
  updated_at: string;
}

export type AccessoryMovementType =
  | "Purchase"
  | "Sale"
  | "Campaign Gift"
  | "Customer Return"
  | "Supplier Return"
  | "Damage/Loss"
  | "Manual Adjustment"
  | "Stock Correction";

export interface AccessoryMovement {
  id: string;
  accessory_id: string;
  type: AccessoryMovementType;
  quantity: number;
  direction: "in" | "out";
  unit_price: number;
  date: string;
  reason: string;
  reference_id?: string | null;
  created_at: string;
}

// -------------------------------------------------------------
// Customer Domain
// -------------------------------------------------------------
export interface Customer {
  id: string;
  name: string;
  phone: string;
  address: string;
  nid_number: string;
  notes: string;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Transactions & Sales Domain
// -------------------------------------------------------------
export type TransactionType = "Sale" | "Exchange";
export type PaymentStatus = "Paid" | "Pending";

export interface SaleItem {
  type: "phone" | "accessory";
  id: string; // phone_id or accessory_id
  name: string;
  quantity: number;
  unit_price: number;
  cost_price: number;
  subtotal: number;
  is_gift?: boolean | undefined;
}

export interface Transaction {
  id: string;
  phone_id: string; // primary phone ID if phone sale, or first item / 'multi'
  type: TransactionType;
  customer_name: string;
  customer_phone: string;
  customer_id?: string | null;
  amount: number;
  payment_status: PaymentStatus;
  payment_method?: string; // Cash, bKash, Nagad, Bank
  paid_amount?: number;
  due_amount?: number;
  items?: SaleItem[];
  campaign_id?: string | null;
  date: string;
  notes: string;
}

export interface StoredFile {
  name: string;
  data: string; // base64 data URL, local only
}

export interface CustomerPurchase {
  id: string;
  customer_id?: string | null;
  customer_name: string;
  customer_phone: string;
  customer_address: string;
  nid_number: string;
  nid_front_image: StoredFile | null;
  nid_back_image: StoredFile | null;
  additional_documents: StoredFile[];
  phone_photos: StoredFile[];
  phone_id: string | null;
  purchase_price: number;
  created_at: string;
}

export interface SupplierPayment {
  id: string;
  supplier_id: string;
  amount: number;
  date: string;
  notes: string;
  phone_id?: string | null;
  purchase_id?: string | null;
  created_at: string;
}

// -------------------------------------------------------------
// Purchases / Procurement Domain
// -------------------------------------------------------------
export interface PurchaseItem {
  type: "phone" | "accessory";
  id?: string; // phone_id or accessory_id
  name: string;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Purchase {
  id: string;
  supplier_id: string;
  date: string;
  type: "Phone" | "Accessory" | "Mixed";
  phone_ids?: string[];
  items?: PurchaseItem[];
  total_amount: number;
  additional_cost: number;
  paid_amount: number;
  due_amount: number;
  payment_status: "Paid" | "Due" | "Not Paid";
  campaign_id?: string | null;
  notes: string;
  created_at: string;
}

// -------------------------------------------------------------
// Expenses Domain
// -------------------------------------------------------------
export type ExpenseCategory =
  | "Shop Rent"
  | "Electricity"
  | "Internet"
  | "Salary"
  | "Transport"
  | "Repair"
  | "Packaging"
  | "Marketing"
  | "Miscellaneous"
  | string;

export interface Expense {
  id: string;
  category: ExpenseCategory;
  amount: number;
  date: string;
  payment_method: "Cash" | "bKash" | "Nagad" | "Bank" | "Other" | string;
  description: string;
  campaign_id?: string | null;
  created_at: string;
}

// -------------------------------------------------------------
// Campaigns Domain
// -------------------------------------------------------------
export type CampaignStatus = "Planned" | "Active" | "Completed" | "Cancelled";

export interface Campaign {
  id: string;
  name: string;
  description: string;
  start_date: string;
  end_date: string;
  status: CampaignStatus;
  budget: number | null;
  notes: string;
  created_at: string;
  updated_at: string;
}

// -------------------------------------------------------------
// Warranty & Returns Domain
// -------------------------------------------------------------
export type WarrantyStatus = "Pending Inspection" | "In Repair" | "Repaired" | "Replaced" | "Rejected" | "Resolved";

export interface WarrantyClaim {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string | null;
  phone_id?: string | null;
  accessory_id?: string | null;
  transaction_id?: string | null;
  claim_date: string;
  issue_description: string;
  status: WarrantyStatus;
  repair_cost: number;
  customer_charge: number;
  notes: string;
  created_at: string;
}

export type ReturnAction = "Refund" | "Exchange" | "Repair" | "Rejected";

export interface CustomerReturn {
  id: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string | null;
  transaction_id?: string | null;
  phone_id?: string | null;
  accessory_id?: string | null;
  return_date: string;
  reason: string;
  action: ReturnAction;
  refund_amount: number;
  notes: string;
  created_at: string;
}

// -------------------------------------------------------------
// Exchange Records
// -------------------------------------------------------------
export interface ExchangeRecord {
  id: string;
  outgoing_phone_id: string;
  incoming_phone_id: string;
  customer_name: string;
  customer_phone: string;
  customer_id?: string | null;
  outgoing_value: number;
  incoming_valuation: number;
  additional_paid: number;
  date: string;
  notes: string;
  created_at: string;
}

// -------------------------------------------------------------
// Audit & System State
// -------------------------------------------------------------
export type AuditAction =
  | "Added"
  | "Sold"
  | "Exchange"
  | "Payment Pending"
  | "Payment Collected"
  | "Bought from Customer"
  | "Supplier Payment"
  | "Accessory Added"
  | "Accessory Updated"
  | "Accessory Sold"
  | "Stock Adjustment"
  | "Purchase Created"
  | "Customer Created"
  | "Customer Updated"
  | "Expense Created"
  | "Expense Updated"
  | "Expense Deleted"
  | "Campaign Created"
  | "Campaign Updated"
  | "Campaign Completed"
  | "Warranty Claim"
  | "Warranty Updated"
  | "Return"
  | "Backup"
  | "Restore";

export interface AuditEntry {
  id: string;
  timestamp: string;
  action: AuditAction;
  entity_type: string;
  entity_id: string;
  details: string;
  amount: number | null;
}

export interface BackupRecord {
  id: string;
  timestamp: string;
  filename: string;
  size: number;
}

export interface Settings {
  low_stock_threshold: number;
  auto_backup: "off" | "daily" | "weekly";
  backup_location: string;
  keep_copies: number;
}

export interface FmmState {
  suppliers: Supplier[];
  phones: Phone[];
  accessories: Accessory[];
  accessory_movements: AccessoryMovement[];
  customers: Customer[];
  purchases: Purchase[];
  transactions: Transaction[];
  supplier_payments: SupplierPayment[];
  customer_purchases: CustomerPurchase[];
  expenses: Expense[];
  campaigns: Campaign[];
  warranty_claims: WarrantyClaim[];
  returns: CustomerReturn[];
  exchanges: ExchangeRecord[];
  audit_log: AuditEntry[];
  backups: BackupRecord[];
  settings: Settings;
}
