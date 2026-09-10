import type { FmmState } from "./fmm-types";

export const FMM_APP_VERSION = "1.0.0";
export const FMM_BACKUP_VERSION = 2;

export interface BackupCounts {
  phones: number;
  accessories: number;
  customers: number;
  suppliers: number;
  transactions: number;
  purchases: number;
  expenses: number;
  campaigns: number;
  warranty_claims: number;
  returns: number;
  exchanges: number;
}

export interface BackupFilePayload {
  format: "fmmbackup" | "fmm" | string;
  version: number;
  backup_version?: number;
  backupVersion?: number;
  app_version?: string;
  appVersion?: string;
  created_at: string;
  createdAt?: string;
  data: FmmState;
}

export interface BackupValidationResult {
  valid: boolean;
  error?: string;
  isLegacy?: boolean;
  appVersion?: string;
  backupVersion?: number;
  createdAt?: string;
  counts?: BackupCounts;
  payload?: BackupFilePayload;
}

export interface BackupPreviewInfo {
  filename: string;
  fileSize: number;
  formattedSize: string;
  createdAt: string;
  appVersion: string;
  backupVersion: number;
  isCompatible: boolean;
  isLegacy: boolean;
  compatibilityError?: string;
  counts: BackupCounts;
  payload: BackupFilePayload;
}

export function formatBytes(bytes: number): string {
  if (isNaN(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(val >= 10 || i === 0 ? 0 : 1)} ${units[i] || "B"}`;
}

/**
 * Validates a backup JSON string thoroughly without applying any destructive mutations.
 */
export function verifyBackupPayloadString(payloadStr: string): BackupValidationResult {
  if (!payloadStr || typeof payloadStr !== "string" || payloadStr.trim().length === 0) {
    return { valid: false, error: "Backup file is empty or missing content." };
  }

  let parsed: any;
  try {
    parsed = JSON.parse(payloadStr);
  } catch {
    return { valid: false, error: "Backup file is corrupted or contains invalid JSON." };
  }

  if (typeof parsed !== "object" || parsed === null) {
    return { valid: false, error: "Invalid backup file structure: expected a JSON object." };
  }

  const format = parsed.format;
  const hasDataObj = parsed.data && typeof parsed.data === "object";

  // Check format: accept "fmmbackup", "fmm", or legacy payload with data.phones
  if (format !== "fmmbackup" && format !== "fmm" && (!hasDataObj || !Array.isArray(parsed.data?.phones))) {
    return {
      valid: false,
      error: "Unrecognized backup format. Please select an authoritative .fmm or .fmmbackup file.",
    };
  }

  const rawVersion = parsed.backup_version ?? parsed.backupVersion ?? parsed.version;
  const backupVersion = typeof rawVersion === "number" ? rawVersion : 1;
  const isLegacy = !parsed.backup_version && !parsed.backupVersion && (parsed.version === 1 || !parsed.version);

  // Check version compatibility
  if (backupVersion > FMM_BACKUP_VERSION) {
    return {
      valid: false,
      backupVersion,
      error: `This backup was created with a newer backup format (v${backupVersion}) and cannot be safely restored by this version of FMM (supports up to v${FMM_BACKUP_VERSION}).`,
    };
  }

  if (!hasDataObj) {
    return { valid: false, error: "Backup is missing the application data payload." };
  }

  const d = parsed.data;

  // Check core collections existence
  if (!Array.isArray(d.phones)) {
    return { valid: false, error: "Backup is missing the phone inventory records." };
  }
  if (!Array.isArray(d.customers)) {
    return { valid: false, error: "Backup is missing customer records." };
  }
  if (!Array.isArray(d.transactions)) {
    return { valid: false, error: "Backup is missing transaction records." };
  }

  const counts: BackupCounts = {
    phones: Array.isArray(d.phones) ? d.phones.length : 0,
    accessories: Array.isArray(d.accessories) ? d.accessories.length : 0,
    customers: Array.isArray(d.customers) ? d.customers.length : 0,
    suppliers: Array.isArray(d.suppliers) ? d.suppliers.length : 0,
    transactions: Array.isArray(d.transactions) ? d.transactions.length : 0,
    purchases: Array.isArray(d.purchases) ? d.purchases.length : 0,
    expenses: Array.isArray(d.expenses) ? d.expenses.length : 0,
    campaigns: Array.isArray(d.campaigns) ? d.campaigns.length : 0,
    warranty_claims: Array.isArray(d.warranty_claims) ? d.warranty_claims.length : 0,
    returns: Array.isArray(d.returns) ? d.returns.length : 0,
    exchanges: Array.isArray(d.exchanges) ? d.exchanges.length : 0,
  };

  const appVersion = parsed.app_version || parsed.appVersion || (isLegacy ? "Legacy (pre-v1.0)" : FMM_APP_VERSION);
  const createdAt = parsed.created_at || parsed.createdAt || new Date().toISOString();

  return {
    valid: true,
    isLegacy,
    appVersion,
    backupVersion,
    createdAt,
    counts,
    payload: parsed as BackupFilePayload,
  };
}

/**
 * Parses and verifies an uploaded backup file for safe, non-destructive previewing.
 */
export async function parseBackupFileForPreview(file: File): Promise<BackupPreviewInfo> {
  const text = await file.text();
  const validation = verifyBackupPayloadString(text);

  if (!validation.valid || !validation.counts || !validation.payload) {
    throw new Error(validation.error || "Backup verification failed: Invalid or incompatible file structure.");
  }

  return {
    filename: file.name,
    fileSize: file.size,
    formattedSize: formatBytes(file.size),
    createdAt: validation.createdAt || new Date().toISOString(),
    appVersion: validation.appVersion || FMM_APP_VERSION,
    backupVersion: validation.backupVersion ?? FMM_BACKUP_VERSION,
    isCompatible: true,
    isLegacy: !!validation.isLegacy,
    counts: validation.counts,
    payload: validation.payload,
  };
}
