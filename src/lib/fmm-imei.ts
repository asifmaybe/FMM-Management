import type { FmmState, Phone } from "./fmm-types";

/**
 * Normalizes an IMEI string:
 * - Converts Bengali numerals (০-৯) to ASCII digits (0-9)
 * - Strips all spaces, dashes, slashes, and non-digit characters
 */
export function normalizeImei(v: string | null | undefined): string {
  if (!v) return "";
  const bengaliToAscii: Record<string, string> = {
    "০": "0",
    "১": "1",
    "২": "2",
    "৩": "3",
    "৪": "4",
    "৫": "5",
    "৬": "6",
    "৭": "7",
    "৮": "8",
    "৯": "9",
  };
  const converted = v.replace(/[০-৯]/g, (ch) => bengaliToAscii[ch] ?? ch);
  return converted.replace(/\D/g, "");
}

/**
 * Validates IMEI format according to GSM/3GPP specification:
 * - Must be exactly 15 digits
 * - Check digit (15th) must satisfy the Luhn algorithm (mod 10)
 *
 * Returns `{ valid: boolean, reason?: string }`
 */
export function isValidImei(v: string | null | undefined): { valid: boolean; reason?: string } {
  const normalized = normalizeImei(v);
  if (!normalized) {
    return { valid: false, reason: "IMEI is empty." };
  }
  if (normalized.length !== 15) {
    return {
      valid: false,
      reason: `IMEI must be exactly 15 digits (current length: ${normalized.length}).`,
    };
  }

  // Luhn algorithm check
  let sum = 0;
  for (let i = 0; i < 15; i++) {
    let digit = parseInt(normalized.charAt(i), 10);
    // Double every second digit from the left (odd indexes: 1, 3, 5, 7, 9, 11, 13)
    if (i % 2 === 1) {
      digit *= 2;
      if (digit > 9) {
        digit -= 9;
      }
    }
    sum += digit;
  }

  if (sum % 10 !== 0) {
    return {
      valid: false,
      reason: "IMEI checksum failed Luhn algorithm verification.",
    };
  }

  return { valid: true };
}

/**
 * Finds a phone record in the state by matching either primary or secondary IMEI.
 * Comparison is normalized (digits only).
 */
export function findPhoneByImei(state: FmmState, imei: string | null | undefined): Phone | null {
  const norm = normalizeImei(imei);
  if (!norm) return null;
  const phones = state.phones ?? [];
  for (const p of phones) {
    if (normalizeImei(p.imei) === norm) return p;
    if (p.imei_secondary && normalizeImei(p.imei_secondary) === norm) return p;
  }
  return null;
}

export interface ImeiCollisionResult {
  hasCollision: boolean;
  /** True if colliding phone is currently in stock (Available or In Inspection) and cannot be added */
  inStockConflict: boolean;
  /** True if phone was previously in the shop (Sold, Exchange, Returned, etc.) and can be re-entered */
  canReenter: boolean;
  collidingPhone: Phone | null;
  reason?: string;

  // ---- Derived convenience properties (for dialog rendering) ----
  /** Collision type discriminator used by dialogs */
  type?: "reenter" | "conflict" | "self_conflict";
  /** Alias for collidingPhone */
  phone?: Phone | null;
  /** Human-readable message (alias for reason) */
  message?: string;
  /** Which IMEI field triggered the collision ("primary" | "secondary") */
  field?: "primary" | "secondary";
}

/**
 * Checks if an IMEI collides with existing inventory.
 * Differentiates between:
 * 1. Currently in stock (Available / In Inspection) → hard block
 * 2. Past shop device (Sold, Exchange, Returned to Supplier, etc.) → eligible for Re-entry
 */
export function checkImeiCollision(
  state: FmmState,
  primaryImei: string,
  secondaryImei?: string | null,
  excludePhoneId?: string,
): ImeiCollisionResult {
  const normPrimary = normalizeImei(primaryImei);
  const normSecondary = secondaryImei ? normalizeImei(secondaryImei) : null;

  if (!normPrimary && !normSecondary) {
    return { hasCollision: false, inStockConflict: false, canReenter: false, collidingPhone: null };
  }

  // Check self-collision between primary and secondary
  if (normPrimary && normSecondary && normPrimary === normSecondary) {
    const msg = "Secondary IMEI cannot be identical to Primary IMEI.";
    return {
      hasCollision: true,
      inStockConflict: true,
      canReenter: false,
      collidingPhone: null,
      reason: msg,
      // Convenience aliases
      type: "self_conflict",
      phone: null,
      message: msg,
      field: "secondary",
    };
  }

  const phones = (state.phones ?? []).filter((p) => (excludePhoneId ? p.id !== excludePhoneId : true));

  for (const p of phones) {
    const pPrimary = normalizeImei(p.imei);
    const pSecondary = p.imei_secondary ? normalizeImei(p.imei_secondary) : null;

    const matchesPrimary = normPrimary && (pPrimary === normPrimary || (pSecondary && pSecondary === normPrimary));
    const matchesSecondary =
      normSecondary && (pPrimary === normSecondary || (pSecondary && pSecondary === normSecondary));

    if (matchesPrimary || matchesSecondary) {
      const isInStock = p.status === "Available" || p.status === "In Inspection";
      const hitField: "primary" | "secondary" = matchesPrimary ? "primary" : "secondary";
      const collisionType = isInStock ? "conflict" : "reenter";
      const msg = isInStock
        ? `Device with IMEI ${p.imei} is already currently in inventory (${p.status} — ${p.brand} ${p.model}).`
        : `Device with IMEI ${p.imei} was previously handled by the shop (${p.status} — ${p.brand} ${p.model}). You can re-enter this device.`;

      return {
        hasCollision: true,
        inStockConflict: isInStock,
        canReenter: !isInStock,
        collidingPhone: p,
        reason: msg,
        // Convenience aliases for dialogs
        type: collisionType,
        phone: p,
        message: msg,
        field: hitField,
      };
    }
  }

  return { hasCollision: false, inStockConflict: false, canReenter: false, collidingPhone: null };
}

