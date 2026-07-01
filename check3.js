import { getGroups } from "./src/services/database.js";

async function check() {
  const groups = await getGroups();
  console.log("Groups array:", JSON.stringify(groups, null, 2));
  process.exit(0);
}

check();
