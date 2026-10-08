import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Returns a display-safe specs string for a phone.
 * For Apple devices, RAM is not publicly specified — only storage is shown.
 * For all other brands, the full "ROM / RAM" string is returned.
 */
export function formatStorageRam(brand: string, storage_ram: string | null | undefined): string {
  if (!storage_ram) return "—";
  if (brand?.toLowerCase() === "apple") {
    // Return only the first part before " / " (the ROM/storage)
    return storage_ram.split("/")[0]?.trim() || storage_ram;
  }
  return storage_ram;
}
