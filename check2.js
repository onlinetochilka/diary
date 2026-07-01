import { getStudents, getPrograms } from "./src/services/database.js";

async function check() {
  const students = await getStudents();
  console.log("Students array:", JSON.stringify(students, null, 2));
  process.exit(0);
}

check();
