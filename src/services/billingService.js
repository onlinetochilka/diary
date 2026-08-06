import pb from "./pocketbase.js";
import { safeGetOne, invalidateCache } from "../api/databaseApi.js";

// -- Billing Logic --
export function lessonPaymentNote(lessonId, studentId) {
  return `[урок:${lessonId}:${studentId || "ind"}]`;
}

export async function findLessonPayment(lessonId, studentId) {
  const tag = lessonPaymentNote(lessonId, studentId);
  try {
    const results = await pb.collection("payments").getFullList({
      filter: `note ~ "${tag}"`,
      limit: 1,
    });
    return results.length > 0 ? results[0] : null;
  } catch {
    return null;
  }
}

export async function applyLessonIncomeChange(oldData, newData, lessonId) {
  try {
    if (!newData) return;
    const isIndividual = newData.type === "individual";
    const isGroup = newData.type === "group";
    const tutorId = newData.tutorId || pb.authStore.model?.id;
    const lessonDate = newData.date || new Date().toISOString().split("T")[0];

    /**
     * Sync a single student's lesson payment.
     * If newAmt > 0 and no existing record → create.
     * If newAmt > 0 and existing record with different amount → delete old, create new.
     * If newAmt === 0 and existing record → delete.
     */
    const syncStudentPayment = async (stId, oldAmt, newAmt) => {
      if (oldAmt === newAmt) return;

      const existing = lessonId ? await findLessonPayment(lessonId, stId) : null;

      // Remove old payment if it exists and amount changed
      if (existing) {
        // Use raw delete + balance adjustment to avoid double lookup
        const existingAmount = Number(existing.amount) || 0;
        if (existingAmount !== 0 && existing.studentId) {
          const student = await safeGetOne("students", existing.studentId);
          if (student) {
            await pb.collection("students").update(existing.studentId, {
              balance: (student.balance || 0) - existingAmount,
              ltv: (student.ltv || 0) - existingAmount,
            });
          }
        }
        await pb.collection("payments").delete(existing.id);
        invalidateCache("payments");
        invalidateCache("students");
      }

      // Create new payment if amount > 0
      if (newAmt > 0 && stId) {
        const tag = lessonPaymentNote(lessonId, stId);
        invalidateCache("payments");
        invalidateCache("students");
        const record = await pb.collection("payments").create({
          tutorId,
          studentId: stId,
          amount: newAmt,
          currency: "RUB",
          paidAt: new Date().toISOString(),
          note: `${tag} Оплата с урока ${lessonDate}`,
        });

        // Update balance + ltv
        const student = await safeGetOne("students", stId);
        if (student) {
          await pb.collection("students").update(stId, {
            balance: (student.balance || 0) + newAmt,
            ltv: (student.ltv || 0) + newAmt,
          });
        }
      }
    };

    if (isIndividual && newData.studentId) {
      const oldAmt = Number(oldData?.paymentAmount) || 0;
      const newAmt = Number(newData.paymentAmount) || 0;
      await syncStudentPayment(newData.studentId, oldAmt, newAmt);
    } else if (isGroup) {
      const oldPayments = oldData?.studentPayments || {};
      const newPayments = newData?.studentPayments || {};
      const allStudents = new Set([
        ...Object.keys(oldPayments),
        ...Object.keys(newPayments),
      ]);
      for (const stId of allStudents) {
        const oldAmt = Number(oldPayments[stId]?.amount) || 0;
        const newAmt = Number(newPayments[stId]?.amount) || 0;
        await syncStudentPayment(stId, oldAmt, newAmt);
      }
    }
  } catch (err) {
    console.error('[applyLessonIncomeChange]', err);
    throw err;
  }
}

export async function recalculateStudentBalance(studentId) {
  const student = await safeGetOne("students", studentId);
  if (!student) return { stored: 0, calculated: 0, corrected: false };

  const stored = student.balance || 0;

  // Sum all payments for this student
  const payments = await pb.collection("payments").getFullList({
    filter: `studentId = "${studentId}"`,
  });
  let totalPayments = 0;
  payments.forEach((p) => {
    totalPayments += Number(p.amount) || 0;
  });

  // Sum all paid lesson costs for this student
  const uid = student.tutorId || getCurrentUserId();
  const lessons = await pb.collection("lessons").getFullList({
    filter: `tutorId = "${uid}"`,
  });

  let totalLessonCost = 0;
  lessons.forEach((l) => {
    const isPaid = l.status === "conducted" || l.status === "skipped_paid";
    if (!isPaid) return;
    const price = l.price || 0;
    if (l.type === "individual" && l.studentId === studentId) {
      totalLessonCost += price;
    } else if (l.type === "group") {
      const inGroup = (l.groupStudentIds || []).includes(studentId);
      if (inGroup) totalLessonCost += price;
    }
  });

  // NOTE: Inline payments from DayInspector are now stored as proper payment
  // records (via applyLessonIncomeChange → addPayment), so they are already
  // included in totalPayments above. No need to count them separately.

  const calculated = totalPayments - totalLessonCost;
  const drift = Math.abs(stored - calculated);

  if (drift > 0.01) {
    await pb.collection("students").update(studentId, {
      balance: calculated,
    });
    invalidateCache("students");
    console.warn(
      `[recalcBalance] Student ${studentId}: stored=${stored}, calculated=${calculated}, drift=${drift}. Corrected.`
    );
    return { stored, calculated, corrected: true };
  }

  return { stored, calculated, corrected: false };
}
