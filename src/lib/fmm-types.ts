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
export type SourceType = "Supplier Purchase" | "Buy from Customer";

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
  created_at: string;
  updated_at: string;
}

export type TransactionType = "Sale" | "Exchange";
export type PaymentStatus = "Paid" | "Pending";

export interface Transaction {
  id: string;
  phone_id: string;
  type: TransactionType;
  customer_name: string;
  customer_phone: string;
  amount: number;
  payment_status: PaymentStatus;
  date: string;
  notes: string;
}

export interface StoredFile {
  name: string;
  data: string; // base64 data URL, local only
}

export interface CustomerPurchase {
  id: string;
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
  created_at: string;
}

export type AuditAction =
  | "Added"
  | "Sold"
  | "Exchange"
  | "Payment Pending"
  | "Payment Collected"
  | "Bought from Customer"
  | "Supplier Payment"
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
  transactions: Transaction[];
  supplier_payments: SupplierPayment[];
  customer_purchases: CustomerPurchase[];
  audit_log: AuditEntry[];
  backups: BackupRecord[];
  settings: Settings;
}
