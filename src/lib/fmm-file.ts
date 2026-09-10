import type { StoredFile } from "./fmm-types";

/**
 * Checks whether a StoredFile represents an image (as opposed to PDF or generic document).
 */
export function isImageDocument(file: StoredFile | null | undefined): boolean {
  if (!file || !file.data) return false;
  if (file.data.startsWith("data:image")) return true;
  if (file.data.startsWith("data:application/pdf")) return false;
  const lower = (file.name || file.data).toLowerCase();
  if (lower.endsWith(".pdf")) return false;
  if (file.data.startsWith("fmm-doc:") || lower.endsWith(".png") || lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".webp")) {
    return true;
  }
  return true;
}

/**
 * Reads a user-selected File. If running inside Electron, streams the file to
 * %USERPROFILE%\Documents\Faridpur Mobile Mart Data\documents\ via window.api.saveDocument
 * and returns an `fmm-doc://<filename>` URL. If running in a browser, returns base64.
 */
export async function processStoredFile(file: File): Promise<StoredFile> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = String(reader.result);
      if (typeof window !== "undefined" && window.api?.saveDocument) {
        try {
          const docUrl = await window.api.saveDocument({ name: file.name, data: base64Data });
          return resolve({ name: file.name, data: docUrl });
        } catch (err) {
          console.error("[FMM File] Failed to save document to Electron documents folder:", err);
        }
      }
      resolve({ name: file.name, data: base64Data });
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
