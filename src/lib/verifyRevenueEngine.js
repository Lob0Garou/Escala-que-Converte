import { calculateRevenueImpact } from './revenueEngine.js';

console.log("=== Starting Revenue Engine Verification ===");

// MOCK DATA
// 1. Base Schedule: 10 people at 18h
// 2. Optimized Schedule: 15 people at 18h
// 3. Flow: 20 people (to get Pressure around 2.0), 2 coupons (10% conversion)
//    NOTE: With rho0=1.3, we need pressure close to 1.3 to see sensitivity.
//    Base: 20 flow / 10 staff = 2.0 pressure. (High, > 1.3)
//    Curr: 20 flow / 15 staff = 1.33 pressure. (Closer to 1.3 -> better conversion)
// 4. Sales: R$ 200 total (Avg Ticket R$ 100)

const hour = 18;

const baseSchedule = [{ hour: 18, quantity: 10 }];
const currentSchedule = [{ hour: 18, quantity: 15 }]; // Improved coverage

const flowByHour = [{ hour: 18, flow: 20, coupons: 2 }];
const salesByHour = [{ hour: 18, sales: 200 }]; // Ticket = 100

// Config
const config = { mode: 'INTERNAL' };

console.log("\n--- Scenario 1: Optimization (Improved Staffing) ---");
const result = calculateRevenueImpact(
    baseSchedule,
    currentSchedule,
    flowByHour,
    salesByHour,
    config
);

console.log("Result:", JSON.stringify(result, null, 2));

// ASSERTIONS
let passed = true;

// 1. Should have recovered revenue
if (result.totalRevenueRecovered <= 0) {
    console.error("FAIL: Expected positive revenue recovery. Got: " + result.totalRevenueRecovered);
    passed = false;
} else {
    console.log("PASS: Revenue Recovered > 0 (" + result.totalRevenueRecovered.toFixed(2) + ")");
}

// 2. Should have additional coupons
if (result.totalAdditionalCoupons <= 0) {
    console.error("FAIL: Expected positive additional coupons. Got: " + result.totalAdditionalCoupons);
    passed = false;
} else {
    console.log("PASS: Additional Coupons > 0 (" + result.totalAdditionalCoupons.toFixed(2) + ")");
}

// 3. Check Details for Hour 18
const detail = result.details.find(d => d.hour === 18);
if (!detail) {
    console.error("FAIL: Verification detail for hour 18 missing.");
    passed = false;
} else {
    // Check 'isCritical' (property used in logic)
    if (detail.isCritical) {
        console.log("PASS: Hour 18 identified as Critical Base (Pressure=" + detail.pressureBase + ")");
    } else {
        console.error("FAIL: Hour 18 NOT identified as Critical Base (Pressure=" + detail.pressureBase + ")");
        passed = false;
    }
}


console.log("\n--- Scenario 2: No Sales Data (Ticket = 0/Default) ---");
const resultNoSales = calculateRevenueImpact(
    baseSchedule,
    currentSchedule,
    flowByHour,
    [], // No sales data
    config
);
console.log("Result (No Sales):", JSON.stringify(resultNoSales, null, 2));

if (resultNoSales.totalRevenueRecovered === 0 && resultNoSales.totalAdditionalCoupons > 0) {
    // Wait, if no sales, Ticket = 0? Or default?
    // In revenueEngine.js: dailyAverageTicket = 0 if not provided.
    // If ticket is 0, Revenue should be 0.
    console.log("PASS: No Revenue (Ticket=0), but Coupons still calculated.");
} else if (resultNoSales.totalRevenueRecovered > 0) {
    console.log("WARN: Revenue calculated even without sales data (Did it use a default?)");
}


console.log("\n=== CONCLUSAO ===");
if (passed) console.log("✅ VERIFICATION PASSED");
else console.error("❌ VERIFICATION FAILED");
