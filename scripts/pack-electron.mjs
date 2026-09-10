import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import asar from "@electron/asar";

const rootDir = "D:\\Web Apps\\FMM Management App";
const stageDir = "D:\\FMM-stage";
const outDir = "D:\\FMM-dist\\win-unpacked";
const resourcesDir = path.join(outDir, "resources");
const asarPath = path.join(resourcesDir, "app.asar");

console.log("1. Preparing stage directory...");
if (fs.existsSync(stageDir)) fs.rmSync(stageDir, { recursive: true, force: true });
fs.mkdirSync(stageDir, { recursive: true });

fs.cpSync(path.join(rootDir, "electron"), path.join(stageDir, "electron"), { recursive: true });
fs.cpSync(path.join(rootDir, ".output"), path.join(stageDir, ".output"), { recursive: true });
fs.copyFileSync(path.join(rootDir, "package.json"), path.join(stageDir, "package.json"));
fs.cpSync(path.join(rootDir, "public"), path.join(stageDir, "public"), { recursive: true });

fs.mkdirSync(path.join(stageDir, "node_modules"), { recursive: true });
fs.cpSync(path.join(rootDir, "node_modules", "sql.js"), path.join(stageDir, "node_modules", "sql.js"), { recursive: true });

console.log("2. Packing app.asar with unpacked sql-wasm.wasm...");
fs.mkdirSync(resourcesDir, { recursive: true });
await asar.createPackageWithOptions(stageDir, asarPath, {
  unpack: "**/sql-wasm.wasm"
});

console.log("3. Cleaning stage...");
fs.rmSync(stageDir, { recursive: true, force: true });

console.log("4. Setting executable name and icon...");
const exeTarget = path.join(outDir, "Faridpur Mobile Mart.exe");
const electronExe = path.join(outDir, "electron.exe");
if (fs.existsSync(electronExe)) {
  if (fs.existsSync(exeTarget)) fs.rmSync(exeTarget, { force: true });
  fs.renameSync(electronExe, exeTarget);
}

const rceditPath = path.join(rootDir, "node_modules", "electron-winstaller", "vendor", "rcedit.exe");
const iconPath = path.join(rootDir, "public", "favicon.ico");

if (fs.existsSync(rceditPath) && fs.existsSync(exeTarget) && fs.existsSync(iconPath)) {
  try {
    execFileSync(rceditPath, [exeTarget, "--set-icon", iconPath]);
    console.log("Icon applied to", exeTarget);
  } catch (err) {
    console.warn("Could not set icon with rcedit:", err.message);
  }
}

console.log("5. Checking output...");
console.log("App asar size:", (fs.statSync(asarPath).size / 1024 / 1024).toFixed(2), "MB");
console.log("Packaging successfully completed!");
