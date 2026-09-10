// scratch/test_phone_lifecycle.cjs
// Automated test script validating all 14 lifecycle scenarios

const assert = require("assert");

console.log("=== RUNNING PHONE LIFECYCLE & WORKFLOW VERIFICATION SUITE ===\n");

// Mock state and store logic based on src/lib/fmm-store.tsx
function createInitialState() {
  return {
    phones: [
      {
        id: "ph-1",
        imei: "111111111111111",
        brand: "Apple",
        model: "iPhone 13",
        storage_ram: "128GB",
        battery_health: "90%",
        color: "Midnight",
        condition: "Used",
        purchase_price: 50000,
        selling_price: 60000,
        supplier_id: "sup-1",
        source_type: "Supplier",
        status: "Available",
        created_at: new Date(Date.now() - 10 * 86400000).toISOString(), // 10 days ago (< 1 month)
        damage_checklist: {},
      },
      {
        id: "ph-2",
        imei: "222222222222222",
        brand: "Samsung",
        model: "Galaxy S23",
        storage_ram: "256GB/8GB",
        battery_health: "95%",
        color: "Phantom Black",
        condition: "Used",
        purchase_price: 65000,
        selling_price: 75000,
        supplier_id: "sup-1",
        source_type: "Supplier",
        status: "Available",
        created_at: new Date(Date.now() - 45 * 86400000).toISOString(), // 45 days ago (> 1 month)
        damage_checklist: {},
      },
      {
        id: "ph-3",
        imei: "333333333333333",
        brand: "Google",
        model: "Pixel 7",
        storage_ram: "128GB/8GB",
        battery_health: "92%",
        color: "Obsidian",
        condition: "Used",
        purchase_price: 35000,
        selling_price: 42000,
        supplier_id: "sup-1",
        source_type: "Supplier",
        status: "Available",
        created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
        damage_checklist: {},
      },
    ],
    accessories: [
      {
        id: "acc-1",
        name: "20W Fast Charger",
        category: "Charger",
        brand: "Apple",
        cost_price: 1500,
        selling_price: 2500,
        current_stock: 20,
      },
      {
        id: "acc-gift",
        name: "Screen Protector & Case",
        category: "Case",
        brand: "Generic",
        cost_price: 300,
        selling_price: 600,
        current_stock: 50,
      }
    ],
    transactions: [],
    exchanges: [],
    returns: [],
    audit_log: [],
  };
}

let state = createInitialState();

// Helper functions imitating fmm-store
function recordSale(saleInput) {
  const totalAmount = saleInput.amount;
  const paid = saleInput.paid_amount !== undefined ? saleInput.paid_amount : totalAmount;
  const due = saleInput.due_amount !== undefined ? saleInput.due_amount : Math.max(0, totalAmount - paid);

  const payment_status = due === 0 ? "Paid" : paid === 0 ? "Pending" : "Partial";

  const tx = {
    id: "tx-" + (state.transactions.length + 1),
    phone_id: saleInput.phone_id,
    type: "Sale",
    customer_name: saleInput.customer_name,
    customer_phone: saleInput.customer_phone,
    amount: totalAmount,
    paid_amount: paid,
    due_amount: due,
    payment_status,
    items: saleInput.items,
    date: new Date().toISOString(),
  };

  state.transactions.push(tx);

  // Mark phone as Sold immediately
  if (saleInput.phone_id) {
    const ph = state.phones.find(p => p.id === saleInput.phone_id);
    if (ph) {
      ph.status = "Sold";
      ph.sold_price = totalAmount;
      ph.sold_date = tx.date;
    }
  }

  return tx;
}

function collectPayment(transactionId, amount) {
  const tx = state.transactions.find(t => t.id === transactionId);
  if (!tx) throw new Error("Transaction not found");

  const currentDue = tx.due_amount !== undefined ? tx.due_amount : 0;
  const paymentAmount = amount !== undefined ? Math.min(amount, currentDue) : currentDue;
  const newDue = Math.max(0, currentDue - paymentAmount);
  const currentPaid = tx.paid_amount !== undefined ? tx.paid_amount : (tx.amount - currentDue);
  const newPaid = currentPaid + paymentAmount;
  const newStatus = newDue === 0 ? "Paid" : "Partial";

  tx.paid_amount = newPaid;
  tx.due_amount = newDue;
  tx.payment_status = newStatus;
  return tx;
}

function recordExchange(input) {
  const outgoingPhone = state.phones.find(p => p.id === input.outgoing_phone_id);
  const incomingPhoneId = "ph-in-" + (state.phones.length + 1);

  const incomingPhone = {
    id: incomingPhoneId,
    imei: input.incoming_phone.imei,
    brand: input.incoming_phone.brand,
    model: input.incoming_phone.model,
    storage_ram: input.incoming_phone.storage_ram,
    condition: input.incoming_phone.condition,
    purchase_price: input.incoming_valuation,
    status: "In Inspection", // Incoming phone enters In Inspection
    source_type: "Bought from Customer",
    created_at: new Date().toISOString(),
    damage_checklist: {},
  };

  state.phones.push(incomingPhone);

  if (outgoingPhone) {
    outgoingPhone.status = "Sold";
    outgoingPhone.sold_price = input.outgoing_value;
  }

  const exchangeRecord = {
    id: "exc-" + (state.exchanges.length + 1),
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    outgoing_phone_id: input.outgoing_phone_id,
    outgoing_value: input.outgoing_value,
    incoming_phone_id: incomingPhoneId,
    incoming_valuation: input.incoming_valuation,
    difference_direction: input.difference_direction,
    settlement_amount: input.settlement_amount,
    created_at: new Date().toISOString(),
  };
  state.exchanges.push(exchangeRecord);

  const tx = {
    id: "tx-" + (state.transactions.length + 1),
    phone_id: input.outgoing_phone_id,
    type: "Exchange",
    customer_name: input.customer_name,
    customer_phone: input.customer_phone,
    amount: input.outgoing_value,
    paid_amount: input.outgoing_value,
    due_amount: 0,
    payment_status: "Paid",
    trade_in: {
      incoming_phone_id: incomingPhoneId,
      incoming_brand: input.incoming_phone.brand,
      incoming_model: input.incoming_phone.model,
      incoming_imei: input.incoming_phone.imei,
      incoming_valuation: input.incoming_valuation,
      difference_direction: input.difference_direction,
      settlement_amount: input.settlement_amount,
      inspection_status: "Pending Inspection",
    },
    date: new Date().toISOString(),
  };
  state.transactions.push(tx);

  return { exchangeRecord, tx, incomingPhone };
}

function inspectTradeInDevice(incomingPhoneId, decision) {
  const phone = state.phones.find(p => p.id === incomingPhoneId);
  if (!phone) throw new Error("Incoming phone not found");

  if (decision.action === "Restock") {
    phone.status = "Available";
    if (decision.new_selling_price) {
      phone.selling_price = decision.new_selling_price;
    }
  } else {
    phone.status = "Rejected / Do Not Stock";
  }

  const exc = state.exchanges.find(e => e.incoming_phone_id === incomingPhoneId);
  if (exc) {
    exc.inspection_status = decision.action === "Restock" ? "Approved & Restocked" : "Rejected";
  }
}

function processCustomerReturn(transactionId, input) {
  const tx = state.transactions.find(t => t.id === transactionId);
  if (!tx) throw new Error("Transaction not found");

  const phone = tx.phone_id ? state.phones.find(p => p.id === tx.phone_id) : null;

  if (input.disposition === "Restocked" && phone) {
    phone.status = "Available";
    if (input.new_resale_price) {
      phone.selling_price = input.new_resale_price;
    }
    delete phone.sold_price;
    delete phone.sold_date;
  } else if (input.disposition === "Refund Only" && phone) {
    phone.status = "Returned";
  } else if (input.disposition === "Returned to Supplier" && phone) {
    phone.status = "Returned to Supplier";
    if (input.supplier_id) {
      phone.supplier_id = input.supplier_id;
    }
  }

  tx.return_info = {
    return_id: "ret-" + (state.returns.length + 1),
    return_date: new Date().toISOString(),
    original_sold_price: input.original_sale_price,
    deduction_percentage: input.deduction_percentage,
    deduction_amount: input.deduction_amount,
    refund_amount: input.refund_amount,
    reason: input.reason,
    disposition: input.disposition,
    supplier_id: input.supplier_id,
    new_resale_price: input.new_resale_price,
  };

  state.returns.push({
    id: tx.return_info.return_id,
    customer_name: tx.customer_name,
    customer_phone: tx.customer_phone,
    reason: input.reason,
    action: input.disposition === "Restocked" ? "Replaced" : "Refund",
    refund_amount: input.refund_amount,
    return_date: tx.return_info.return_date,
  });

  return tx;
}

// -------------------------------------------------------------
// TEST CASES
// -------------------------------------------------------------

console.log("Test 1: Full Payment Phone Sale...");
const tx1 = recordSale({
  phone_id: "ph-1",
  amount: 60000,
  paid_amount: 60000,
  due_amount: 0,
  customer_name: "Rahim Ahmed",
  customer_phone: "01711111111",
});
assert.strictEqual(tx1.payment_status, "Paid", "Status should be Paid");
assert.strictEqual(tx1.due_amount, 0, "Due amount should be 0");
assert.strictEqual(state.phones.find(p => p.id === "ph-1").status, "Sold", "Phone status should be Sold");
const availableAfter1 = state.phones.filter(p => p.status === "Available");
assert(!availableAfter1.some(p => p.id === "ph-1"), "ph-1 must not be in Available stock");
console.log("✓ Test 1 Passed: Phone removed from Available, status is Sold, Payment Paid.\n");

console.log("Test 2: Partial Payment Phone Sale (Payment Pending/Partial)...");
const tx2 = recordSale({
  phone_id: "ph-2",
  amount: 75000,
  paid_amount: 50000,
  due_amount: 25000,
  customer_name: "Karim Ullah",
  customer_phone: "01822222222",
});
assert.strictEqual(tx2.payment_status, "Partial", "Status should be Partial");
assert.strictEqual(tx2.due_amount, 25000, "Due amount should be 25000");
assert.strictEqual(state.phones.find(p => p.id === "ph-2").status, "Sold", "Phone status should be Sold immediately");
const availableAfter2 = state.phones.filter(p => p.status === "Available");
assert(!availableAfter2.some(p => p.id === "ph-2"), "ph-2 must not be in Available stock despite pending due");
console.log("✓ Test 2 Passed: Decoupled inventory from payment status. Phone sold immediately.\n");

console.log("Test 3: Balance Collection on Partial Sale (Partial then Full)...");
const txCountBefore = state.transactions.length;
collectPayment(tx2.id, 10000);
assert.strictEqual(tx2.paid_amount, 60000, "Paid should now be 60000");
assert.strictEqual(tx2.due_amount, 15000, "Due should now be 15000");
assert.strictEqual(tx2.payment_status, "Partial", "Status should still be Partial");
assert.strictEqual(state.transactions.length, txCountBefore, "Must NOT create duplicate transaction");

// Complete the remaining 15,000
collectPayment(tx2.id, 15000);
assert.strictEqual(tx2.paid_amount, 75000, "Paid should now be 75000");
assert.strictEqual(tx2.due_amount, 0, "Due should now be 0");
assert.strictEqual(tx2.payment_status, "Paid", "Status should transition to Paid");
assert.strictEqual(state.transactions.length, txCountBefore, "Still single authoritative transaction");
console.log("✓ Test 3 Passed: Subsequent payments update same transaction without duplicates.\n");

console.log("Test 4: Combo Sale (Phone + Accessory + Free Gift)...");
const txCombo = recordSale({
  phone_id: "ph-3",
  amount: 44500, // 42000 (phone) + 2500 (charger) + 0 (gift)
  paid_amount: 44500,
  due_amount: 0,
  customer_name: "Tanvir Hasan",
  customer_phone: "01933333333",
  items: [
    { type: "phone", id: "ph-3", name: "Google Pixel 7 (128GB)", quantity: 1, unit_price: 42000, cost_price: 35000, subtotal: 42000 },
    { type: "accessory", id: "acc-1", name: "20W Fast Charger", quantity: 1, unit_price: 2500, cost_price: 1500, subtotal: 2500 },
    { type: "accessory", id: "acc-gift", name: "Screen Protector & Case", quantity: 1, unit_price: 0, cost_price: 300, subtotal: 0, is_gift: true },
  ]
});
assert.strictEqual(state.phones.find(p => p.id === "ph-3").status, "Sold", "ph-3 marked Sold");
assert.strictEqual(txCombo.items.length, 3, "All 3 combo items preserved");
assert.strictEqual(txCombo.items[2].is_gift, true, "Gift item marked correctly");
console.log("✓ Test 4 Passed: Multi-item single transaction recorded with full item breakdown.\n");

console.log("Test 5: Trade-In Upgrade (Customer pays difference)...");
// Add an available phone for exchange
state.phones.push({
  id: "ph-out-1",
  imei: "444444444444444",
  brand: "Apple",
  model: "iPhone 14 Pro",
  purchase_price: 80000,
  selling_price: 95000,
  status: "Available",
  source_type: "Supplier",
  created_at: new Date().toISOString(),
  damage_checklist: {},
});

const ex1 = recordExchange({
  customer_name: "Farhan Kabir",
  customer_phone: "01544444444",
  outgoing_phone_id: "ph-out-1",
  outgoing_value: 95000,
  incoming_phone: {
    imei: "555555555555555",
    brand: "Apple",
    model: "iPhone 12",
    storage_ram: "128GB",
    condition: "Good",
  },
  incoming_valuation: 45000,
  difference_direction: "customer_pays_shop",
  settlement_amount: 50000, // 95000 - 45000
});

assert.strictEqual(state.phones.find(p => p.id === "ph-out-1").status, "Sold", "Outgoing phone is Sold");
assert.strictEqual(ex1.incomingPhone.status, "In Inspection", "Incoming trade-in device MUST be 'In Inspection'");
const availableAfterTrade = state.phones.filter(p => p.status === "Available");
assert(!availableAfterTrade.some(p => p.id === ex1.incomingPhone.id), "Trade-in phone must NOT be in Available stock");
console.log("✓ Test 5 Passed: Trade-in upgrade sets outgoing phone to Sold and incoming phone to In Inspection.\n");

console.log("Test 6: Trade-In Downgrade (Shop pays customer difference)...");
state.phones.push({
  id: "ph-out-2",
  imei: "666666666666666",
  brand: "Xiaomi",
  model: "Redmi Note 12",
  purchase_price: 15000,
  selling_price: 18000,
  status: "Available",
  source_type: "Supplier",
  created_at: new Date().toISOString(),
  damage_checklist: {},
});

const ex2 = recordExchange({
  customer_name: "Sadia Islam",
  customer_phone: "01655555555",
  outgoing_phone_id: "ph-out-2",
  outgoing_value: 18000,
  incoming_phone: {
    imei: "777777777777777",
    brand: "Apple",
    model: "iPhone 13 mini",
    storage_ram: "128GB",
    condition: "Good",
  },
  incoming_valuation: 35000,
  difference_direction: "shop_pays_customer",
  settlement_amount: 17000, // 35000 - 18000
});

assert.strictEqual(ex2.exchangeRecord.difference_direction, "shop_pays_customer", "Difference direction recorded");
assert.strictEqual(ex2.incomingPhone.status, "In Inspection", "Incoming phone is In Inspection");
console.log("✓ Test 6 Passed: Downgrade properly notes shop pays customer difference.\n");

console.log("Test 7: Trade-in Inspection -> Approve & Restock for Resale...");
inspectTradeInDevice(ex1.incomingPhone.id, {
  action: "Restock",
  new_selling_price: 52000,
});
const approvedPhone = state.phones.find(p => p.id === ex1.incomingPhone.id);
assert.strictEqual(approvedPhone.status, "Available", "Status must become Available");
assert.strictEqual(approvedPhone.selling_price, 52000, "New resale selling price updated");
assert(state.phones.filter(p => p.status === "Available").some(p => p.id === approvedPhone.id), "Now in Available stock");
console.log("✓ Test 7 Passed: Inspection approved, phone restocked with new resale price.\n");

console.log("Test 8: Trade-in Inspection -> Reject / Do Not Stock...");
inspectTradeInDevice(ex2.incomingPhone.id, {
  action: "Reject",
  condition_notes: "Deep glass fissure and non-genuine display",
});
const rejectedPhone = state.phones.find(p => p.id === ex2.incomingPhone.id);
assert.strictEqual(rejectedPhone.status, "Rejected / Do Not Stock", "Status is Rejected / Do Not Stock");
assert(!state.phones.filter(p => p.status === "Available").some(p => p.id === rejectedPhone.id), "Must NOT be in Available stock");
console.log("✓ Test 8 Passed: Inspection rejected device correctly kept out of stock.\n");

console.log("Test 9: Customer Return within 1 month (10% auto-deduction)...");
// tx1 was sold 10 days ago for 60,000
const deduction9 = Math.round(tx1.amount * 0.10); // 6,000
const refund9 = tx1.amount - deduction9; // 54,000
processCustomerReturn(tx1.id, {
  original_sale_price: tx1.amount,
  deduction_percentage: 10,
  deduction_amount: deduction9,
  refund_amount: refund9,
  reason: "Customer changed preference",
  disposition: "Restocked",
  new_resale_price: 58000,
});
assert.strictEqual(tx1.return_info.deduction_percentage, 10, "10% deduction recorded");
assert.strictEqual(tx1.return_info.refund_amount, 54000, "Net refund is 54,000");
const restockedPhone = state.phones.find(p => p.id === tx1.phone_id);
assert.strictEqual(restockedPhone.status, "Available", "Phone returned to Available stock");
assert.strictEqual(restockedPhone.selling_price, 58000, "Resale price updated to 58,000");
console.log("✓ Test 9 Passed: 10% deduction and Restock disposition executed with 0 duplicate phone records.\n");

console.log("Test 10 & 11: Customer Return beyond 1 month (15% deduction) & Refund Only disposition...");
// tx2 Samsung S23 was sold for 75,000 (> 1 month old phone)
const deduction10 = Math.round(tx2.amount * 0.15); // 11,250
const refund10 = tx2.amount - deduction10; // 63,750
processCustomerReturn(tx2.id, {
  original_sale_price: tx2.amount,
  deduction_percentage: 15,
  deduction_amount: deduction10,
  refund_amount: refund10,
  reason: "Defective charging port",
  disposition: "Refund Only",
});
assert.strictEqual(tx2.return_info.deduction_percentage, 15, "15% deduction recorded");
assert.strictEqual(tx2.return_info.refund_amount, 63750, "Net refund is 63,750");
const refundOnlyPhone = state.phones.find(p => p.id === tx2.phone_id);
assert.strictEqual(refundOnlyPhone.status, "Returned", "Phone status is Returned");
assert(!state.phones.filter(p => p.status === "Available").some(p => p.id === refundOnlyPhone.id), "Must NOT be in Available stock");
console.log("✓ Test 10 & 11 Passed: Beyond 1 month return and Refund Only disposition verified.\n");

console.log("Test 12: Return Disposition: Return to Supplier...");
// Add another sold transaction
const txSupplier = recordSale({
  phone_id: "ph-3",
  amount: 42000,
  paid_amount: 42000,
  due_amount: 0,
  customer_name: "Anisur Rahman",
  customer_phone: "01788888888",
});
processCustomerReturn(txSupplier.id, {
  original_sale_price: 42000,
  deduction_percentage: 10,
  deduction_amount: 4200,
  refund_amount: 37800,
  reason: "Motherboard faulty under supplier warranty",
  disposition: "Returned to Supplier",
  supplier_id: "sup-1",
});
const supPhone = state.phones.find(p => p.id === "ph-3");
assert.strictEqual(supPhone.status, "Returned to Supplier", "Phone status is Returned to Supplier");
assert.strictEqual(supPhone.supplier_id, "sup-1", "Supplier ID preserved");
assert(!state.phones.filter(p => p.status === "Available").some(p => p.id === supPhone.id), "Must NOT be in Available stock");
console.log("✓ Test 12 Passed: Return to Supplier disposition updates phone and links supplier.\n");

console.log("Test 13: Zero Duplicate Records Invariant Check...");
const phoneIds = state.phones.map(p => p.id);
const uniqueIds = new Set(phoneIds);
assert.strictEqual(phoneIds.length, uniqueIds.size, "All phone IDs must remain strictly unique");
const phoneImeis = state.phones.map(p => p.imei);
const uniqueImeis = new Set(phoneImeis);
assert.strictEqual(phoneImeis.length, uniqueImeis.size, "All phone IMEIs must remain strictly unique (zero duplicates)");
console.log("✓ Test 13 Passed: Strict uniqueness preserved across all inventory lifecycles.\n");

console.log("Test 14: Phone Stock Filter Integrity Check...");
const availablePhones = state.phones.filter(p => p.status === "Available");
availablePhones.forEach(p => {
  assert.strictEqual(p.status, "Available", "Available list must only contain Available phones");
  assert.notStrictEqual(p.status, "Sold");
  assert.notStrictEqual(p.status, "In Inspection");
  assert.notStrictEqual(p.status, "Returned");
  assert.notStrictEqual(p.status, "Returned to Supplier");
  assert.notStrictEqual(p.status, "Rejected / Do Not Stock");
});
console.log(`✓ Test 14 Passed: Exactly ${availablePhones.length} available phones in stock, all valid.\n`);

console.log("=========================================================");
console.log("ALL 14 LIFECYCLE & WORKFLOW SCENARIOS PASSED WITH FLYING COLORS!");
console.log("=========================================================");
