import { getDocs, collection, addDoc } from "firebase/firestore";
import { db } from "./src/services/firebase.js";

async function run() {
  const studentsSnap = await getDocs(collection(db, "students"));
  const students = studentsSnap.docs.map(d => d.id);
  
  if (students.length === 0) {
    console.log("No students found");
    process.exit(1);
  }

  const today = new Date().toISOString().split('T')[0];
  const h = new Date().getHours();
  
  await addDoc(collection(db, "lessons"), {
    date: today,
    startTime: `${String(h+1).padStart(2, '0')}:00`,
    endTime: `${String(h+2).padStart(2, '0')}:00`,
    status: "upcoming",
    type: "individual",
    subjectName: "Математика (тест)",
    price: 1500,
    studentId: students[0]
  });
  
  await addDoc(collection(db, "lessons"), {
    date: today,
    startTime: `${String(h+3).padStart(2, '0')}:00`,
    endTime: `${String(h+4).padStart(2, '0')}:00`,
    status: "upcoming",
    type: "individual",
    subjectName: "Физика (тест)",
    price: 1500,
    studentId: students[1] || students[0]
  });

  console.log("Added 2 lessons for today.");
  process.exit(0);
}

run().catch(console.error);
