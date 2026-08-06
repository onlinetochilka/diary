import pb from "./pocketbase.js";
import { invalidateCache } from "../api/databaseApi.js";
import { applyLessonIncomeChange } from "./billingService.js";

// -- Lesson Facade --
export async function addLesson(data) {
  if (!data.tutorId) {
    data.tutorId = pb.authStore.model?.id;
  }
  
  invalidateCache("lessons");
  if (data.isRecurring && data.repeatUntil) {
    const seriesId = `series_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let currentDate = new Date(data.date);
    const endDate = new Date(data.repeatUntil);
    let lastRefId = null;

    // Add 23 hours to endDate to cover the whole last day
    endDate.setHours(23, 59, 59, 999);

    const baseData = { ...data };
    delete baseData.isRecurring;
    delete baseData.repeatUntil;

    // Fix #5: Snapshot current group membership
    if (baseData.type === "group" && baseData.groupId && !baseData.groupStudentIds) {
      const group = await safeGetOne("groups", baseData.groupId);
      if (group) {
        baseData.groupStudentIds = group.studentIds || [];
      }
    }

    let iterations = 0;
    while (currentDate <= endDate && iterations < 52) {
      iterations++;
      const dateStr = currentDate.toISOString().split("T")[0];
      const lessonDataToSave = {
        ...baseData,
        date: dateStr,
        seriesId,
        status: baseData.status ?? "scheduled",
        hwDoneBy: baseData.hwDoneBy || [],
        tutorId: pb.authStore.model?.id || baseData.tutorId,
      };
      const record = await pb.collection("lessons").create(lessonDataToSave);
      lastRefId = record.id;

      if (
        lessonDataToSave.status === "conducted" ||
        lessonDataToSave.status === "skipped_paid"
      ) {
        await applyLessonBalanceChange(lessonDataToSave, false);
      }

      await applyLessonIncomeChange(null, lessonDataToSave, record.id);

      // add 7 days
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return lastRefId;
  } else {
    const baseData = { ...data };
    delete baseData.isRecurring;
    delete baseData.repeatUntil;

    // Fix #5: Snapshot current group membership
    if (baseData.type === "group" && baseData.groupId && !baseData.groupStudentIds) {
      const group = await safeGetOne("groups", baseData.groupId);
      if (group) {
        baseData.groupStudentIds = group.studentIds || [];
      }
    }

    const lessonDataToSave = {
      ...baseData,
      status: baseData.status ?? "scheduled",
      hwDoneBy: baseData.hwDoneBy || [],
      tutorId: pb.authStore.model?.id || baseData.tutorId,
    };
    const record = await pb.collection("lessons").create(lessonDataToSave);

    if (
      lessonDataToSave.status === "conducted" ||
      lessonDataToSave.status === "skipped_paid"
    ) {
      await applyLessonBalanceChange(lessonDataToSave, false);
    }

    await applyLessonIncomeChange(null, lessonDataToSave, record.id);

    return record.id;
  }
}

export async function updateLesson(id, data) {
  invalidateCache("lessons");
  const oldData = await safeGetOne("lessons", id);

  if (oldData) {
    const isDateChanged =
      data.date !== undefined && data.date !== oldData.date;
    const isStartTimeChanged =
      data.startTime !== undefined && data.startTime !== oldData.startTime;
    const isEndTimeChanged =
      data.endTime !== undefined && data.endTime !== oldData.endTime;

    if (isDateChanged || isStartTimeChanged || isEndTimeChanged) {
      data.reschedules = [
        ...(oldData.reschedules || []),
        new Date().toISOString(),
      ];
    }
  }

  await pb.collection("lessons").update(id, data);

  if (oldData && data.status !== undefined && data.status !== oldData.status) {
    const isOldPaid =
      oldData.status === "conducted" || oldData.status === "skipped_paid";
    const isNewPaid =
      data.status === "conducted" || data.status === "skipped_paid";

    if (isNewPaid && !isOldPaid) {
      await applyLessonBalanceChange({ ...oldData, ...data }, false);
    } else if (!isNewPaid && isOldPaid) {
      await applyLessonBalanceChange(oldData, true);
    }
  }

  // Price change on an already-paid lesson: apply balance delta
  if (
    oldData &&
    data.price !== undefined &&
    data.price !== oldData.price
  ) {
    const effectiveStatus = data.status || oldData.status;
    const isPaid =
      effectiveStatus === "conducted" || effectiveStatus === "skipped_paid";
    if (isPaid && (data.status === undefined || data.status === oldData.status)) {
      const priceDelta = (oldData.price || 0) - (data.price || 0);
      if (priceDelta !== 0) {
        await applyLessonBalanceChange(
          { ...oldData, ...data, price: Math.abs(priceDelta) },
          priceDelta > 0
        );
      }
    }
  }

  // Recalculate hwDebtCount on affected students when hwDoneBy changes
  if (data.hwDoneBy !== undefined) {
    await recalcHwDebtCount(id, { ...oldData, ...data });
  }

  if (oldData) {
    await applyLessonIncomeChange(oldData, { ...oldData, ...data }, id);
  }
}

export async function patchLesson(id, partial) {
  invalidateCache("lessons");

  // Read old data only if we need balance or hwDebtCount side-effects
  const needsOldData =
    partial.status !== undefined ||
    partial.hwDoneBy !== undefined ||
    partial.paymentAmount !== undefined ||
    partial.studentPayments !== undefined;
  let oldData = null;
  if (needsOldData) {
    oldData = await safeGetOne("lessons", id);
  }

  await pb.collection("lessons").update(id, partial);

  // Balance side-effect when status changes
  if (
    oldData &&
    partial.status !== undefined &&
    partial.status !== oldData.status
  ) {
    const isOldPaid =
      oldData.status === "conducted" || oldData.status === "skipped_paid";
    const isNewPaid =
      partial.status === "conducted" || partial.status === "skipped_paid";
    if (isNewPaid && !isOldPaid) {
      await applyLessonBalanceChange({ ...oldData, ...partial }, false);
    } else if (!isNewPaid && isOldPaid) {
      await applyLessonBalanceChange(oldData, true);
    }
  }

  // hwDebtCount recalc when hwDoneBy changes
  if (partial.hwDoneBy !== undefined && oldData) {
    await recalcHwDebtCount(id, { ...oldData, ...partial });
  }

  // Income side-effect when paymentAmount or studentPayments change
  if (
    oldData &&
    (partial.paymentAmount !== undefined ||
      partial.studentPayments !== undefined)
  ) {
    await applyLessonIncomeChange(oldData, { ...oldData, ...partial }, id);
  }
}

export async function deleteLesson(id) {
  invalidateCache("lessons");
  const oldData = await safeGetOne("lessons", id);
  if (oldData) {
    if (
      oldData.status === "conducted" ||
      oldData.status === "skipped_paid"
    ) {
      await applyLessonBalanceChange(oldData, true);
    }
    
    // Финансовый аудит: откатываем встроенные оплаты, если они были привязаны к удаляемому уроку
    if (oldData.paymentAmount || (oldData.studentPayments && Object.keys(oldData.studentPayments).length > 0)) {
       await applyLessonIncomeChange(oldData, { 
         type: oldData.type, 
         studentId: oldData.studentId, // for individual
         groupId: oldData.groupId,     // for group
         paymentAmount: 0, 
         studentPayments: {} 
       }, id);
    }
  }
  await pb.collection("lessons").delete(id);
}
