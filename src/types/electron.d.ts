import type { FmmState } from "@/lib/fmm-types";

export interface ElectronApi {
  isElectron: boolean;
  loadState: () => Promise<FmmState | null>;
  saveState: (state: FmmState) => Promise<void>;
  saveDocument: (file: { name: string; data: string }) => Promise<string>;
  getDataDir: () => Promise<string>;
  openDataDir: () => Promise<void>;
}

declare global {
  interface Window {
    api?: ElectronApi;
  }
}
