// Simulate the ActionItemModal and DashboardPage.jsx integration
const assert = require("assert");

// Simulate what happens in DashboardPage.jsx when onConfirm is called for payment
function simulatePayment(item, paymentAmountInput, note) {
  // from DashboardPage.jsx line 250
  const amountToSave = item.amount; // The bug! It ignores paymentAmountInput
  return { savedAmount: amountToSave };
}

function simulateHw(item, singleHwStatusInput) {
  // from DashboardPage.jsx line 238
  // ignores singleHwStatusInput
  return { statusSaved: "status is lost, only student id is saved" };
}

console.log("TEST 1: Partial payment of 1000 instead of 2500");
const payRes = simulatePayment({ amount: 2500 }, 1000, "");
console.log("Saved amount:", payRes.savedAmount);
if (payRes.savedAmount !== 1000) {
  console.log("FAILED: System ignored the partial payment!");
}

console.log("\nTEST 2: Late homework");
const hwRes = simulateHw({ count: 1 }, "late");
console.log("HW Result:", hwRes.statusSaved);
