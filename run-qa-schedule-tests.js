import { addLesson } from './src/services/database.js';

async function runTests() {
  console.log("Running QA Schedule Stress Tests...");

  // We can just simulate the logic from database.js to demonstrate the issue
  // Test 1: Empty Series (repeatUntil < date)
  const date = "2026-07-31";
  const repeatUntil = "2026-07-01";
  
  let currentDate = new Date(date);
  const endDate = new Date(repeatUntil);
  endDate.setHours(23, 59, 59, 999);
  
  let count = 0;
  while (currentDate <= endDate) {
    count++;
    currentDate.setDate(currentDate.getDate() + 7);
  }
  console.log(`Test 1 (repeatUntil in past): Lessons created = ${count}. Expected: At least 1 or validation error.`);

  // Test 2: Huge Series (repeatUntil in 2050)
  const hugeRepeatUntil = "2050-07-31";
  let cur2 = new Date(date);
  const end2 = new Date(hugeRepeatUntil);
  end2.setHours(23, 59, 59, 999);
  let count2 = 0;
  while (cur2 <= end2) {
    count2++;
    cur2.setDate(cur2.getDate() + 7);
  }
  console.log(`Test 2 (repeatUntil 2050): Lessons to create in single sync loop = ${count2}. This will cause massive UI lag and DB quota issues.`);

  // Test 3: Overlap check only checks first date
  // (Simulated based on LessonDrawer.jsx code)
  const lessons = [{ date: "2026-08-07", startTime: "10:00", endTime: "11:00" }]; // Existing lesson next week
  const formData = { date: "2026-07-31", startTime: "10:00", endTime: "11:00" }; // New recurring lesson starting this week
  
  const startObj = new Date(`1970-01-01T${formData.startTime}:00Z`);
  const endObj = new Date(`1970-01-01T${formData.endTime}:00Z`);
  
  const isOverlapping = lessons.some(l => {
    if (l.date !== formData.date) return false; // SKIPS CHECK FOR NEXT WEEK!
    const lStart = new Date(`1970-01-01T${l.startTime}:00Z`);
    const lEnd = new Date(`1970-01-01T${l.endTime}:00Z`);
    return startObj < lEnd && endObj > lStart;
  });

  console.log(`Test 3 (Overlap on subsequent recurring days): Overlap detected = ${isOverlapping}. Expected: true (since it overlaps on 2026-08-07).`);
}

runTests();
