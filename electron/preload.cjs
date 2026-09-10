const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("api", {
  isElectron: true,
  loadState: () => ipcRenderer.invoke("fmm:load-state"),
  saveState: (state) => ipcRenderer.invoke("fmm:save-state", state),
  saveDocument: (file) => ipcRenderer.invoke("fmm:save-document", file),
  getDataDir: () => ipcRenderer.invoke("fmm:get-data-dir"),
  openDataDir: () => ipcRenderer.invoke("fmm:open-data-dir"),
});
