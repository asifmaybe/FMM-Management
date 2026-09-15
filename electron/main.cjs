const { app, BrowserWindow, ipcMain, protocol, shell, net } = require("electron");
const path = require("path");
const fs = require("fs");
const url = require("url");

// Register custom protocol scheme privileges before app is ready
protocol.registerSchemesAsPrivileged([
  {
    scheme: "fmm-doc",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
      stream: true,
    },
  },
]);

// 1. User Data Directory Setup
// As required by Rule 1: app code and user data are kept completely separate.
// User data lives in a browsable folder: Documents\Faridpur Mobile Mart Data
const userDataDir = path.join(app.getPath("documents"), "Faridpur Mobile Mart Data");
const documentsDir = path.join(userDataDir, "documents");
const backupsDir = path.join(userDataDir, "backups");

fs.mkdirSync(userDataDir, { recursive: true });
fs.mkdirSync(documentsDir, { recursive: true });
fs.mkdirSync(backupsDir, { recursive: true });

// Setup persistent logging to app.log for diagnosing any issues
const logFile = path.join(userDataDir, "app.log");
const logStream = fs.createWriteStream(logFile, { flags: "a" });
const originalLog = console.log;
const originalError = console.error;
console.log = (...args) => {
  const line = `[${new Date().toISOString()}] [INFO] ${args.map(a => typeof a === "object" ? JSON.stringify(a) : a).join(" ")}\n`;
  logStream.write(line);
  originalLog(...args);
};
console.error = (...args) => {
  const line = `[${new Date().toISOString()}] [ERROR] ${args.map(a => typeof a === "object" ? (a?.stack || JSON.stringify(a)) : a).join(" ")}\n`;
  logStream.write(line);
  originalError(...args);
};

// 2. Initialize sql.js SQLite Database (fmm.db)
// sql.js is a pure WASM port of SQLite — no Python/node-gyp required.
const dbPath = path.join(userDataDir, "fmm.db");
let db = null;

function getSqlJsWasmPath(filename) {
  if (app.isPackaged) {
    // In packaged app, WASM is extracted via asarUnpack
    return path.join(process.resourcesPath, "app.asar.unpacked", "node_modules", "sql.js", "dist", filename);
  }
  return path.join(__dirname, "..", "node_modules", "sql.js", "dist", filename);
}

function saveToDisk() {
  if (!db) return;
  try {
    const data = db.export();
    fs.writeFileSync(dbPath, Buffer.from(data));
  } catch (err) {
    console.error("[FMM Main] Error saving database to disk:", err);
  }
}

async function initDatabase() {
  const initSqlJs = require("sql.js");
  const SQL = await initSqlJs({ locateFile: getSqlJsWasmPath });

  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
    console.log(`[FMM Main] Loaded existing database from ${dbPath}`);
  } else {
    db = new SQL.Database();
    console.log(`[FMM Main] Created new database at ${dbPath}`);
  }

  // Schema metadata table with schema version
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_meta (
      version INTEGER PRIMARY KEY
    );
  `);

  const versionResult = db.exec("SELECT version FROM schema_meta LIMIT 1");
  if (!versionResult.length || !versionResult[0].values.length) {
    db.run("INSERT INTO schema_meta (version) VALUES (1)");
  }

  // Key-Value Store table for Phase 1
  db.run(`
    CREATE TABLE IF NOT EXISTS kv_store (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
  `);

  saveToDisk();
  console.log(`[FMM Main] SQLite (sql.js) database initialized at ${dbPath}`);
}

// 3. Register IPC Handlers
ipcMain.handle("fmm:load-state", async () => {
  if (!db) return null;
  try {
    const results = db.exec("SELECT value FROM kv_store WHERE key = 'app-state'");
    if (!results.length || !results[0].values.length) return null;
    return JSON.parse(results[0].values[0][0]);
  } catch (err) {
    console.error("[FMM Main] Error loading state from SQLite:", err);
    return null;
  }
});

ipcMain.handle("fmm:save-state", async (_, state) => {
  if (!db) throw new Error("Database not initialized");
  try {
    const json = typeof state === "string" ? state : JSON.stringify(state);
    const now = new Date().toISOString();
    db.run(
      "INSERT OR REPLACE INTO kv_store (key, value, updated_at) VALUES (?, ?, ?)",
      ["app-state", json, now]
    );
    saveToDisk();
    return true;
  } catch (err) {
    console.error("[FMM Main] Error saving state to SQLite:", err);
    throw err;
  }
});

ipcMain.handle("fmm:save-document", async (_, file) => {
  try {
    if (!file || !file.data) return null;

    // Check if it's already an fmm-doc or relative path
    if (file.data.startsWith("fmm-doc://") || !file.data.startsWith("data:")) {
      return file.data;
    }

    // Parse base64 data URI
    const match = file.data.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) return file.data;

    const mimeType = match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, "base64");

    // Extension from mime type or original file name
    const extMatch = file.name ? path.extname(file.name) : "";
    const ext = extMatch || (mimeType.includes("png") ? ".png" : mimeType.includes("pdf") ? ".pdf" : ".jpg");

    const safeBaseName = (file.name || "doc")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(ext, "");
    const fileName = `${Date.now()}_${safeBaseName}${ext}`;
    const targetPath = path.join(documentsDir, fileName);

    fs.writeFileSync(targetPath, buffer);
    console.log(`[FMM Main] Saved document to ${targetPath}`);

    // Return the custom fmm-doc URL so renderer can directly display it
    return `fmm-doc://${fileName}`;
  } catch (err) {
    console.error("[FMM Main] Error saving document to disk:", err);
    return file?.data || null;
  }
});

ipcMain.handle("fmm:get-data-dir", async () => {
  return userDataDir;
});

ipcMain.handle("fmm:open-data-dir", async () => {
  return shell.openPath(userDataDir);
});

// 4. BrowserWindow & Local Server Lifecycle
let mainWindow = null;

function getAvailablePort() {
  return new Promise((resolve, reject) => {
    const srv = require("net").createServer();
    srv.listen(0, "127.0.0.1", () => {
      const port = srv.address().port;
      srv.close(() => resolve(port));
    });
    srv.on("error", reject);
  });
}

// Poll the server URL until it responds (or timeout).
async function waitForServer(serverUrl, maxAttempts = 30, intervalMs = 500) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await fetch(serverUrl);
      console.log(`[FMM Main] Server ready after ${i + 1} attempt(s).`);
      return true;
    } catch (_) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  console.warn("[FMM Main] Server did not become ready in time — loading anyway.");
  return false;
}

async function startLocalServer() {
  const port = await getAvailablePort();
  process.env.PORT = String(port);
  process.env.NITRO_PORT = String(port);
  process.env.HOST = "127.0.0.1";
  process.env.NITRO_HOST = "127.0.0.1";

  const serverEntry = path.join(app.getAppPath(), ".output", "server", "index.mjs");
  if (fs.existsSync(serverEntry)) {
    console.log(`[FMM Main] Starting local server on port ${port} from ${serverEntry}...`);
    await import(url.pathToFileURL(serverEntry).href);
    const serverUrl = `http://127.0.0.1:${port}`;
    // Wait until the HTTP server is actually accepting connections before loading the window.
    await waitForServer(serverUrl);
    return serverUrl;
  }
  return "http://localhost:8080";
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1360,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    title: "Faridpur Mobile Mart",
    icon: path.join(__dirname, "../public/favicon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  const isDev = !app.isPackaged && process.env.NODE_ENV === "development";
  let targetUrl = process.env.ELECTRON_DEV_URL || "http://localhost:8080";

  if (!isDev) {
    try {
      targetUrl = await startLocalServer();
    } catch (err) {
      console.error("[FMM Main] Failed to start local server, falling back to 8080:", err);
    }
  }

  mainWindow.webContents.on("before-input-event", (event, input) => {
    if (input.key === "F12" || (input.control && input.shift && input.key.toLowerCase() === "i")) {
      mainWindow.webContents.toggleDevTools();
      event.preventDefault();
    }
  });

  mainWindow.webContents.on("did-fail-load", (event, errorCode, errorDescription, validatedURL) => {
    console.error(`[FMM Main] WebContents failed to load ${validatedURL}: ${errorCode} (${errorDescription})`);
  });

  mainWindow.webContents.on("render-process-gone", (event, details) => {
    console.error(`[FMM Main] Renderer process gone: reason=${details.reason}, exitCode=${details.exitCode}`);
  });

  console.log(`[FMM Main] Loading window URL: ${targetUrl}`);
  mainWindow.loadURL(targetUrl);

  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  // Initialize database first, then open window
  await initDatabase();

  // Handle custom protocol 'fmm-doc://'
  protocol.handle("fmm-doc", (request) => {
    try {
      const parsedUrl = new URL(request.url);
      const relativeName = decodeURIComponent(
        parsedUrl.host
          ? `${parsedUrl.host}${parsedUrl.pathname}`
          : parsedUrl.pathname.replace(/^\/+/, "")
      );
      const filePath = path.normalize(path.join(documentsDir, relativeName));

      // Security check: ensure file stays inside documentsDir
      if (!filePath.startsWith(documentsDir)) {
        return new Response("Forbidden", { status: 403 });
      }

      if (!fs.existsSync(filePath)) {
        return new Response("Not Found", { status: 404 });
      }

      return net.fetch(url.pathToFileURL(filePath).toString());
    } catch (err) {
      console.error("[FMM Main] Error handling fmm-doc protocol:", err);
      return new Response("Error loading file", { status: 500 });
    }
  });

  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    if (db) {
      try {
        saveToDisk();
        db.close();
      } catch (_) {}
    }
    app.quit();
  }
});
