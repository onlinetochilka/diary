import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// ── MOCK BROWSER ENVIRONMENT ──
global.window = global;
global.sessionStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

global.localStorage = {
  store: {},
  getItem(k) { return this.store[k] || null; },
  setItem(k, v) { this.store[k] = String(v); },
  removeItem(k) { delete this.store[k]; },
  clear() { this.store = {}; }
};

// Mock import.meta.env for Vite
if (!global.process) global.process = {};
if (!global.process.env) global.process.env = {};
global.import = { meta: { env: { VITE_POCKETBASE_URL: "http://localhost:8090" } } };

// Import the modules
import proxyPb from '../src/services/pocketbase.js';
import * as dbService from '../src/services/database.js';
import { generateDemoData, clearAllTutorData } from '../src/utils/demoData.js';
import { getMockDatabase, getMockCollection } from '../src/services/mockDatabase.js';

async function runTests() {
  console.log("=== STARTING DEMO MODE QA ===");

  // --- Stage 1: Login / Logout Logic ---
  console.log("\\n--- Stage 1: Login/Logout Logic ---");
  
  // 1. Initial state
  console.log("1. Initial state (isDemoMode = false)");
  if (proxyPb.authStore.isValid) {
    console.error("FAIL: authStore should be invalid initially");
  }

  // 2. Enable demo mode
  console.log("2. Enabling demo mode...");
  localStorage.setItem("isDemoMode", "true");
  
  // Need to force mockDatabase to re-evaluate isDemoMode (it checks it on init)
  // Actually, proxyPb checks getIsDemoMode dynamically when proxying.
  // We can just call a database method and see if it uses mock DB.
  
  try {
    const students = await dbService.getStudents();
    console.log(`Success: Fetched ${students.length} students in demo mode.`);
    if (students.length === 0) {
      console.error("FAIL: Students array is empty, demo data generation might have failed.");
    }
  } catch (e) {
    console.error("FAIL: Error fetching students:", e);
  }

  // Check demo_db in localStorage
  const demoDbStr = localStorage.getItem("demo_db");
  if (!demoDbStr) {
    console.error("FAIL: demo_db not found in localStorage");
  } else {
    console.log("Success: demo_db is present in localStorage");
  }

  // Disable demo mode
  console.log("3. Disabling demo mode...");
  localStorage.removeItem("isDemoMode");
  clearAllTutorData();
  
  if (localStorage.getItem("demo_db")) {
    console.error("FAIL: demo_db was not cleared");
  } else {
    console.log("Success: demo_db was cleared");
  }
  
  // Verify real pb is used (it should throw since backend is missing/not authenticated)
  try {
    await dbService.getStudents();
    console.error("FAIL: Should have thrown an error (unauthenticated real DB call)");
  } catch (e) {
    console.log("Success: Proper error thrown when querying real DB without auth");
  }


  // --- Stage 2: Data Generation Integrity ---
  console.log("\\n--- Stage 2: Data Generation Integrity ---");
  localStorage.setItem("isDemoMode", "true");
  
  // Force a clean generation
  localStorage.removeItem("demo_db");
  
  const generatedData = generateDemoData();
  const db = getMockDatabase(); // this will generate new data if missing in localstorage
  
  let passedStage2 = true;

  // 1. Check Students
  const students = await dbService.getStudents();
  console.log(`Total students: ${students.length}`);
  
  const debtors = students.filter(s => s.balance < 0);
  console.log(`Financial debtors: ${debtors.length}`);
  if (debtors.length < 2) {
    console.error("FAIL: Not enough financial debtors generated.");
    passedStage2 = false;
  }

  const hwDebtors = students.filter(s => s.hwDebtCount > 0);
  console.log(`HW debtors: ${hwDebtors.length}`);
  if (hwDebtors.length < 2) {
    console.error("FAIL: Not enough homework debtors generated.");
    passedStage2 = false;
  }

  // 2. Check Programs & Groups
  const programs = await dbService.getPrograms();
  console.log(`Total programs: ${programs.length}`);
  if (programs.length !== 4) {
    console.error("FAIL: Expected exactly 4 programs.");
    passedStage2 = false;
  }

  const groups = await dbService.getGroups();
  console.log(`Total groups: ${groups.length}`);
  if (groups.length !== 3) {
    console.error("FAIL: Expected exactly 3 groups.");
    passedStage2 = false;
  }

  // 3. Check Lessons & Timeline
  const lessons = await dbService.getLessons({ startDate: new Date(Date.now() - 30*24*60*60*1000).toISOString(), endDate: new Date(Date.now() + 30*24*60*60*1000).toISOString() });
  console.log(`Total lessons generated: ${lessons.length}`);
  
  const conducted = lessons.filter(l => l.status === "conducted");
  const scheduled = lessons.filter(l => l.status === "scheduled");
  console.log(`Conducted: ${conducted.length}, Scheduled: ${scheduled.length}`);
  if (conducted.length === 0 || scheduled.length === 0) {
    console.error("FAIL: Missing conducted or scheduled lessons.");
    passedStage2 = false;
  }

  if (passedStage2) {
    console.log("Success: Stage 2 data integrity checks passed.");
  }


  // --- Stage 3: CRUD Operations in Demo Mode ---
  console.log("\\n--- Stage 3: CRUD Operations in Demo Mode ---");
  let passedStage3 = true;

  // 1. Create a new student
  console.log("1. Creating student...");
  const newStudentData = {
    name: "Тестовый Ученик",
    active: true,
    subjects: [{ name: "Физика", price: 1500, duration: 60, programs: [] }],
    phone: "+79000000000",
    colorOklch: "oklch(0.7 0.1 150)",
    colorVersion: 2
  };
  
  const createdStudentId = await dbService.addStudent(newStudentData);
  if (!createdStudentId) {
    console.error("FAIL: Student creation failed.");
    passedStage3 = false;
  } else {
    console.log("Success: Created student ID " + createdStudentId);
  }

  // 2. Edit student
  console.log("2. Editing student...");
  const studentData = await dbService.getStudent(createdStudentId);
  const updatedStudent = await dbService.updateStudent(createdStudentId, { ...studentData, name: "Измененный Ученик" });
  
  const fetchedUpdatedStudent = await dbService.getStudent(createdStudentId);
  if (fetchedUpdatedStudent.name !== "Измененный Ученик") {
    console.error("FAIL: Student edit failed.");
    passedStage3 = false;
  } else {
    console.log("Success: Edited student.");
  }

  // 3. Create a lesson
  console.log("3. Creating a lesson...");
  const newLessonData = {
    date: new Date().toISOString().split("T")[0],
    startTime: "12:00",
    endTime: "13:00",
    status: "scheduled",
    type: "individual",
    studentId: createdStudentId,
    subjectName: "Физика",
    price: 1500
  };
  
  const createdLessonId = await dbService.addLesson(newLessonData);
  if (!createdLessonId) {
    console.error("FAIL: Lesson creation failed.");
    passedStage3 = false;
  } else {
    console.log("Success: Created lesson ID " + createdLessonId);
  }

  // 4. Update Lesson Status to Conducted (should alter balance)
  console.log("4. Updating lesson status to conducted...");
  const lessonDataForConduct = await dbService.getLesson(createdLessonId);
  const lessonToConduct = { ...lessonDataForConduct, status: "conducted" };
  await dbService.updateLesson(createdLessonId, lessonToConduct);
  
  const studentAfterLesson = await dbService.getStudent(createdStudentId);
  if (studentAfterLesson.balance !== -1500) {
    console.error("FAIL: Student balance was not updated properly after conducting lesson. Expected -1500, got " + studentAfterLesson.balance);
    passedStage3 = false;
  } else {
    console.log("Success: Balance updated to -1500.");
  }

  // 5. Add a payment
  console.log("5. Adding a payment...");
  const paymentData = {
    studentId: createdStudentId,
    studentName: studentAfterLesson.name,
    amount: 1500,
    paidAt: new Date().toISOString(),
    currency: "RUB"
  };
  const createdPaymentId = await dbService.addPayment(paymentData);
  
  const studentAfterPayment = await dbService.getStudent(createdStudentId);
  if (studentAfterPayment.balance !== 0) {
    console.error("FAIL: Student balance was not updated properly after payment. Expected 0, got " + studentAfterPayment.balance);
    passedStage3 = false;
  } else {
    console.log("Success: Balance updated to 0.");
  }
  
  // 6. Delete lesson and verify balance reverts
  console.log("6. Deleting lesson (reverting balance)...");
  await dbService.deleteLesson(createdLessonId);
  const studentAfterDelete = await dbService.getStudent(createdStudentId);
  if (studentAfterDelete.balance !== 1500) {
    console.error("FAIL: Balance was not reverted after deleting conducted lesson. Expected 1500, got " + studentAfterDelete.balance);
    passedStage3 = false;
  } else {
    console.log("Success: Balance reverted to 1500.");
  }

  if (passedStage3) {
    console.log("Success: Stage 3 CRUD operations passed.");
  }

  console.log("\\n=== DEMO MODE QA COMPLETED ===");
}

runTests();
