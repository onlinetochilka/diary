/**
 * financeCalculators.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Pure functions for financial and statistical calculations to avoid duplication 
 * between dashboard and finance hooks.
 */

/**
 * Calculates total debt, total advances, and related metrics across all students.
 * @param {Array} students - List of student objects.
 * @returns {Object} { totalDebt, totalAdvances, debtorsCount, unpaidLessonsCount }
 */
export function calculateStudentBalances(students) {
  let totalDebt = 0;
  let totalAdvances = 0;
  let debtorsCount = 0;
  let unpaidLessonsCount = 0;

  (students || []).forEach(s => {
    const balance = s.balance || 0;
    if (balance < 0) {
      totalDebt += Math.abs(balance);
      debtorsCount++;
      const price = s.subjects?.[0]?.price || 0;
      unpaidLessonsCount += price > 0 ? Math.ceil(Math.abs(balance) / price) : 1;
    } else if (balance > 0) {
      totalAdvances += balance;
    }
  });

  return { totalDebt, totalAdvances, debtorsCount, unpaidLessonsCount };
}

/**
 * Calculates total income from payments within a given date range.
 * @param {Array} payments - List of payment objects.
 * @param {Date} startDate - Start date (inclusive).
 * @param {Date} endDate - End date (exclusive).
 * @returns {number} Total income.
 */
export function calculateIncomeForPeriod(payments, startDate, endDate) {
  return (payments || [])
    .filter(p => {
      const d = new Date(p.paidAt);
      return d >= startDate && d < endDate;
    })
    .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
}

/**
 * Calculates the duration of a lesson in hours.
 * @param {Object} lesson - Lesson object.
 * @returns {number} Duration in hours.
 */
export function getLessonDuration(lesson) {
  if (!lesson.startTime || !lesson.endTime) return 0;
  const [h1, m1] = lesson.startTime.split(":").map(Number);
  const [h2, m2] = lesson.endTime.split(":").map(Number);
  const dur = (h2 + m2 / 60) - (h1 + m1 / 60);
  return dur > 0 ? dur : 0;
}

/**
 * Parses working hours config and returns total working hours per week.
 */
export function calculateTotalWeeklyWorkingHours(workingHoursConfig) {
  const wh = workingHoursConfig || {
    1: { active: true, start: "10:00", end: "19:00" },
    2: { active: true, start: "10:00", end: "19:00" },
    3: { active: true, start: "10:00", end: "19:00" },
    4: { active: true, start: "10:00", end: "19:00" },
    5: { active: true, start: "10:00", end: "19:00" },
    6: { active: false, start: "10:00", end: "14:00" },
    0: { active: false, start: "10:00", end: "14:00" }
  };
  
  let total = 0;
  Object.values(wh).forEach(day => {
    if (day.active) {
      const [sh, sm] = day.start.split(":").map(Number);
      const [eh, em] = day.end.split(":").map(Number);
      const dur = (eh + em/60) - (sh + sm/60);
      if (dur > 0) total += dur;
    }
  });
  return total;
}
