import { getStudents, getPrograms } from "./src/services/database.js";

async function check() {
  const students = await getStudents();
  console.log("Students in DB:", students.length);
  const programs = await getPrograms();
  console.log("Programs in DB:", programs.length);
  process.exit(0);
}

check();
