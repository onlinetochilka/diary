import PocketBase from "pocketbase";
import { getNextDistinctColor } from "../src/utils/colors.js";
import { generateDemoData } from "../src/utils/demoData.js";

// Override the module-level pb with one pointing to production
// We need to patch the import used by demoData.js
// Instead, let's just call the API directly

const pb = new PocketBase("https://api.tochilka.app");
pb.autoCancellation(false);

async function test() {
  const demoId = Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  const demoEmail = `demo_${demoId}@tochilka.app`;
  const demoPassword = `Demo_${Math.random().toString(36).slice(-10)}!1`;
  
  await pb.collection("users").create({
    email: demoEmail,
    password: demoPassword,
    passwordConfirm: demoPassword,
  });

  await pb.collection("users").authWithPassword(demoEmail, demoPassword);
  const uid = pb.authStore.record.id;
  console.log("User:", uid);
  console.log("Calling generateDemoData...");

  const start = Date.now();
  try {
    await generateDemoData(uid);
    console.log(`✅ Demo data generated in ${Date.now() - start}ms`);
  } catch (err) {
    console.error(`❌ Failed after ${Date.now() - start}ms`);
    console.error("Error:", err?.message);
    console.error("Response:", JSON.stringify(err?.response));
    console.error("Stack:", err?.stack);
  }
}

test();
