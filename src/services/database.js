/**
 * database.js — Adapter Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * ALL Firestore access goes through this file.
 * UI components never import from firebase/* directly.
 *
 * Collections:
 *   users     — tutor user profiles
 *   students  — student records
 *   lessons   — individual lesson sessions
 *   payments  — payment records
 *
 * Pattern: each method returns a Promise that resolves to plain JS objects.
 * Firestore DocumentSnapshot / QuerySnapshot internals are never leaked.
 */

import {
  collection,
  doc,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  setDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "./firebase.js";

// ── Collection References ─────────────────────────────────────────────────

const col = {
  users:    () => collection(db, "users"),
  students: () => collection(db, "students"),
  groups:   () => collection(db, "groups"),
  programs: () => collection(db, "programs"),
  lessons:  () => collection(db, "lessons"),
  payments: () => collection(db, "payments"),
};

// ── Helpers ───────────────────────────────────────────────────────────────

/** Convert a Firestore QuerySnapshot to an array of plain objects */
function snapshotToArray(snapshot) {
  return snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
}

/** Convert a single DocumentSnapshot to a plain object, or null if missing */
function docToObject(docSnap) {
  if (!docSnap.exists()) return null;
  return { id: docSnap.id, ...docSnap.data() };
}

/** 
 * Ledger Helper: Applies balance changes when a lesson is conducted or reverted.
 * isReverting = false -> subtract price from balance (student took lesson)
 * isReverting = true -> add price back to balance (lesson was un-conducted or deleted)
 */
async function applyLessonBalanceChange(lessonData, isReverting = false) {
  const price = lessonData.price || 0;
  if (price === 0) return;
  
  const multiplier = isReverting ? 1 : -1; 
  const amountToApply = price * multiplier;

  if (lessonData.type === "individual" && lessonData.studentId) {
    const stRef = doc(col.students(), lessonData.studentId);
    const stSnap = await getDoc(stRef);
    if (stSnap.exists()) {
      await updateDoc(stRef, { balance: (stSnap.data().balance || 0) + amountToApply });
    }
  } else if (lessonData.type === "group" && lessonData.groupId) {
    const grRef = doc(col.groups(), lessonData.groupId);
    const grSnap = await getDoc(grRef);
    if (grSnap.exists()) {
      const studentIds = grSnap.data().studentIds || [];
      for (const stId of studentIds) {
        const stRef = doc(col.students(), stId);
        const stSnap = await getDoc(stRef);
        if (stSnap.exists()) {
          await updateDoc(stRef, { balance: (stSnap.data().balance || 0) + amountToApply });
        }
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// USERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get a user profile by UID.
 * @param {string} uid
 * @returns {Promise<object|null>}
 */
export async function getUser(uid) {
  const snap = await getDoc(doc(col.users(), uid));
  return docToObject(snap);
}

/**
 * Create or overwrite a user profile.
 * @param {string} uid
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function setUser(uid, data) {
  await updateDoc(doc(col.users(), uid), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// STUDENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get all students (optionally filtered by tutorId).
 * @param {string} [tutorId]
 * @returns {Promise<object[]>}
 */
export async function getStudents(tutorId) {
  let q = col.students();
  if (tutorId) {
    q = query(col.students(), where("tutorId", "==", tutorId));
  }
  const snap = await getDocs(q);
  return snapshotToArray(snap);
}

/**
 * Get a single student by ID.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getStudent(id) {
  const snap = await getDoc(doc(col.students(), id));
  return docToObject(snap);
}

/**
 * Add a new student.
 * @param {object} data — { name, subject, tutorId, ... }
 * @returns {Promise<string>} new document ID
 */
export async function addStudent(data) {
  const ref = await addDoc(col.students(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Update a student record.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updateStudent(id, data) {
  await updateDoc(doc(col.students(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a student record.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteStudent(id) {
  await deleteDoc(doc(col.students(), id));
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════════════════

export async function getGroups(tutorId) {
  let q = col.groups();
  if (tutorId) {
    q = query(col.groups(), where("tutorId", "==", tutorId));
  }
  const snap = await getDocs(q);
  return snapshotToArray(snap);
}

export async function getGroup(id) {
  const snap = await getDoc(doc(col.groups(), id));
  return docToObject(snap);
}

export async function addGroup(data) {
  const ref = await addDoc(col.groups(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGroup(id, data) {
  await updateDoc(doc(col.groups(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGroup(id) {
  await deleteDoc(doc(col.groups(), id));
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════

export async function getPrograms(tutorId) {
  let q = col.programs();
  if (tutorId) {
    q = query(col.programs(), where("tutorId", "==", tutorId));
  }
  const snap = await getDocs(q);
  return snapshotToArray(snap);
}

export async function getProgram(id) {
  const snap = await getDoc(doc(col.programs(), id));
  return docToObject(snap);
}

export async function addProgram(data) {
  const ref = await addDoc(col.programs(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProgram(id, data) {
  await updateDoc(doc(col.programs(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProgram(id) {
  await deleteDoc(doc(col.programs(), id));
}

// ═══════════════════════════════════════════════════════════════════════════
// LESSONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get lessons, optionally filtered.
 * @param {{ tutorId?: string, studentId?: string, limitCount?: number }} [filters]
 * @returns {Promise<object[]>}
 */
export async function getLessons({ tutorId, studentId, groupId, limitCount } = {}) {
  const constraints = [orderBy("date", "asc")];
  if (tutorId)    constraints.unshift(where("tutorId", "==", tutorId));
  if (studentId)  constraints.unshift(where("studentId", "==", studentId));
  if (groupId)    constraints.unshift(where("groupId", "==", groupId));
  if (limitCount) constraints.push(limit(limitCount));

  const q    = query(col.lessons(), ...constraints);
  const snap = await getDocs(q);
  return snapshotToArray(snap);
}

/**
 * Get a single lesson.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getLesson(id) {
  const snap = await getDoc(doc(col.lessons(), id));
  return docToObject(snap);
}

/**
 * Add a new lesson.
 * @param {object} data — { tutorId, studentId, scheduledAt, durationMin, subject, ... }
 * @returns {Promise<string>} new document ID
 */
export async function addLesson(data) {
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

    while (currentDate <= endDate) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const lessonDataToSave = {
        ...baseData,
        date: dateStr,
        seriesId,
        status: baseData.status ?? "scheduled",
        hwDoneBy: baseData.hwDoneBy || [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      const ref = await addDoc(col.lessons(), lessonDataToSave);
      lastRefId = ref.id;
      
      if (lessonDataToSave.status === "conducted" || lessonDataToSave.status === "skipped_paid") {
        await applyLessonBalanceChange(lessonDataToSave, false);
      }
      
      // add 7 days
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return lastRefId;
  } else {
    const baseData = { ...data };
    delete baseData.isRecurring;
    delete baseData.repeatUntil;
    
    const lessonDataToSave = {
      ...baseData,
      status: baseData.status ?? "scheduled",
      hwDoneBy: baseData.hwDoneBy || [],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    const ref = await addDoc(col.lessons(), lessonDataToSave);
    
    if (lessonDataToSave.status === "conducted" || lessonDataToSave.status === "skipped_paid") {
      await applyLessonBalanceChange(lessonDataToSave, false);
    }
    
    return ref.id;
  }
}

/**
 * Update a lesson (e.g. mark as completed).
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updateLesson(id, data) {
  const oldSnap = await getDoc(doc(col.lessons(), id));
  const oldData = oldSnap.exists() ? oldSnap.data() : null;

  await updateDoc(doc(col.lessons(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });

  if (oldData && data.status !== undefined && data.status !== oldData.status) {
    const isOldPaid = oldData.status === "conducted" || oldData.status === "skipped_paid";
    const isNewPaid = data.status === "conducted" || data.status === "skipped_paid";
    
    if (isNewPaid && !isOldPaid) {
      await applyLessonBalanceChange({ ...oldData, ...data }, false);
    } else if (!isNewPaid && isOldPaid) {
      await applyLessonBalanceChange(oldData, true);
    }
  }
}

/**
 * Delete a lesson.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteLesson(id) {
  const oldSnap = await getDoc(doc(col.lessons(), id));
  if (oldSnap.exists()) {
    const oldData = oldSnap.data();
    if (oldData.status === "conducted" || oldData.status === "skipped_paid") {
      await applyLessonBalanceChange(oldData, true);
    }
  }
  await deleteDoc(doc(col.lessons(), id));
}

// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get payments, optionally filtered by tutorId or studentId.
 * @param {{ tutorId?: string, studentId?: string }} [filters]
 * @returns {Promise<object[]>}
 */
export async function getPayments({ tutorId, studentId } = {}) {
  const constraints = [orderBy("paidAt", "desc")];
  if (tutorId)   constraints.unshift(where("tutorId", "==", tutorId));
  if (studentId) constraints.unshift(where("studentId", "==", studentId));

  const q    = query(col.payments(), ...constraints);
  const snap = await getDocs(q);
  return snapshotToArray(snap);
}

/**
 * Add a payment record.
 * @param {object} data — { tutorId, studentId, amount, currency, paidAt, note, ... }
 * @returns {Promise<string>} new document ID
 */
export async function addPayment(data) {
  const ref = await addDoc(col.payments(), {
    ...data,
    currency:  data.currency ?? "RUB",
    createdAt: serverTimestamp(),
  });
  
  if (data.studentId && data.amount) {
    const stRef = doc(col.students(), data.studentId);
    const stSnap = await getDoc(stRef);
    if (stSnap.exists()) {
      await updateDoc(stRef, { balance: (stSnap.data().balance || 0) + Number(data.amount) });
    }
  }
  
  return ref.id;
}

/**
 * Update a payment record.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updatePayment(id, data) {
  await updateDoc(doc(col.payments(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a payment record.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePayment(id) {
  await deleteDoc(doc(col.payments(), id));
}

// ── Configuration ─────────────────────────────────────────────────────────

/**
 * Get user configuration
 * @param {string} uid
 * @returns {Promise<Object>}
 */
export async function getUserConfig(uid) {
  if (!uid) return null;
  const configDoc = await getDoc(doc(db, "users", uid, "config", "settings"));
  return docToObject(configDoc) || {
    theme: "light",
    timezone: "Europe/Moscow",
    currency: "RUB",
    workingDays: [1, 2, 3, 4, 5],
    scheduleColorBy: "subject",
    requisites: "",
  };
}

/**
 * Update user configuration
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateUserConfig(uid, data) {
  if (!uid) return;
  const ref = doc(db, "users", uid, "config", "settings");
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}
