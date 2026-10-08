/**
 * One-time migration: Change "Ramij Sheikh CH" supplier_type from "Phone" → "Accessory"
 * and remove any dangling phone purchase records for that supplier that have no linked phones.
 *
 * Run: node scripts/migrate-ramij-supplier-type.mjs
 */

import { createRequire } from "module";
import { join } from "path";
import { readFileSync, writeFileSync, existsSync, copyFileSync } from "fs";
import { homedir } from "os";

const require = createRequire(import.meta.url);

const DB_PATH = join(homedir(), "Documents", "Faridpur Mobile Mart Data", "fmm.db");

if (!existsSync(DB_PATH)) {
  console.error("❌ Database not found at:", DB_PATH);
  process.exit(1);
}

// Backup before modifying
const BACKUP_PATH = DB_PATH.replace(".db", `_pre_supplier_migrate_${Date.now()}.db`);
copyFileSync(DB_PATH, BACKUP_PATH);
console.log("✅ Backup created:", BACKUP_PATH);

// Load sql.js
const initSqlJs = require("sql.js");
const SQL = await initSqlJs({
  locateFile: (f) => join(process.cwd(), "node_modules", "sql.js", "dist", f),
});

const fileBuffer = readFileSync(DB_PATH);
const db = new SQL.Database(fileBuffer);

// Read app state JSON
const results = db.exec("SELECT value FROM kv_store WHERE key = 'app-state'");
if (!results.length || !results[0].values.length) {
  console.error("❌ No app-state found in database.");
  process.exit(1);
}

const state = JSON.parse(results[0].values[0][0]);

// --- 1. Find and update the supplier ---
const supplierIdx = state.suppliers.findIndex(
  (s) => s.name === "Ramij Sheikh CH"
);

if (supplierIdx === -1) {
  console.error("❌ Supplier 'Ramij Sheikh CH' not found in state.");
  process.exit(1);
}

const supplier = state.suppliers[supplierIdx];
const supplierId = supplier.id;
const oldType = supplier.supplier_type;
console.log(`\nFound supplier: ${supplier.name} (id: ${supplierId})`);
console.log(`  Current type: ${oldType}`);

if (oldType === "Accessory") {
  console.log("ℹ️  Supplier is already an Accessory supplier. Nothing to do.");
  process.exit(0);
}

state.suppliers[supplierIdx] = {
  ...supplier,
  supplier_type: "Accessory",
};
console.log(`  ✅ Changed type: "Phone" → "Accessory"`);

// --- 2. Clean up dangling Phone purchase records for this supplier ---
// These are purchases with type="Phone" that reference 0 existing phones
const existingPhoneIds = new Set((state.phones ?? []).map((p) => p.id));

const phonePurchases = (state.purchases ?? []).filter(
  (p) => p.supplier_id === supplierId && p.type === "Phone"
);

let removedPurchases = 0;
let keptPurchases = 0;

for (const pur of phonePurchases) {
  const referencedIds = [];
  if (pur.phone_ids) referencedIds.push(...pur.phone_ids);
  if (pur.items) {
    pur.items.forEach((it) => {
      if (it.type === "phone" && it.id && !referencedIds.includes(it.id)) {
        referencedIds.push(it.id);
      }
    });
  }
  const existingLinked = referencedIds.filter((id) => existingPhoneIds.has(id));
  if (existingLinked.length === 0) {
    removedPurchases++;
    console.log(`  🗑️  Removing dangling Phone purchase (id: ${pur.id}, amount: ${pur.total_amount})`);
  } else {
    keptPurchases++;
  }
}

state.purchases = (state.purchases ?? []).filter((p) => {
  if (p.supplier_id !== supplierId || p.type !== "Phone") return true;
  const referencedIds = [];
  if (p.phone_ids) referencedIds.push(...p.phone_ids);
  if (p.items) {
    p.items.forEach((it) => {
      if (it.type === "phone" && it.id && !referencedIds.includes(it.id)) {
        referencedIds.push(it.id);
      }
    });
  }
  return referencedIds.some((id) => existingPhoneIds.has(id));
});

// Also remove supplier_payments linked to the removed phone purchases
// (they should be removed too since those purchases are gone and will create phantom credits)
const removedPurchaseIds = new Set(
  phonePurchases
    .filter((pur) => {
      const referencedIds = [];
      if (pur.phone_ids) referencedIds.push(...pur.phone_ids);
      if (pur.items) {
        pur.items.forEach((it) => {
          if (it.type === "phone" && it.id && !referencedIds.includes(it.id)) referencedIds.push(it.id);
        });
      }
      return !referencedIds.some((id) => existingPhoneIds.has(id));
    })
    .map((p) => p.id)
);

const removedPayments = (state.supplier_payments ?? []).filter(
  (sp) => sp.supplier_id === supplierId && sp.purchase_id && removedPurchaseIds.has(sp.purchase_id)
);

state.supplier_payments = (state.supplier_payments ?? []).filter(
  (sp) => !(sp.supplier_id === supplierId && sp.purchase_id && removedPurchaseIds.has(sp.purchase_id))
);

console.log(`\nSummary:`);
console.log(`  Phone purchases removed (no linked phones): ${removedPurchases}`);
console.log(`  Phone purchases kept (have linked phones):  ${keptPurchases}`);
console.log(`  Orphaned supplier payments removed:         ${removedPayments.length}`);

// --- 3. Check existing accessories linked to this supplier ---
const linkedAccessories = (state.accessories ?? []).filter(
  (a) => a.supplier_id === supplierId
);
console.log(`\n  Accessories already linked to this supplier: ${linkedAccessories.length}`);
linkedAccessories.forEach((a) => {
  console.log(`    - ${a.name} (${a.category}, qty: ${a.quantity}, buy: ${a.purchase_price}, sell: ${a.selling_price})`);
});

// --- 4. Save updated state ---
const updatedJson = JSON.stringify(state);
db.run("UPDATE kv_store SET value = ?, updated_at = ? WHERE key = 'app-state'", [
  updatedJson,
  new Date().toISOString(),
]);

const data = db.export();
writeFileSync(DB_PATH, Buffer.from(data));
console.log("\n✅ Database updated and saved successfully!");
console.log("   Restart the app to see the changes.");
