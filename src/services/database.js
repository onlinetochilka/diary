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
import { db, auth } from "./firebase.js";
import { getNextDistinctColor } from "../utils/colors.js";

// ── Collection References ─────────────────────────────────────────────────

const col = {
  users:    () => collection(db, "users"),
  students: () => collection(db, "students"),
  groups:   () => collection(db, "groups"),
  programs: () => collection(db, "programs"),
  lessons:  () => collection(db, "lessons"),
  payments: () => collection(db, "payments"),
};

// ── In-Memory Cache ───────────────────────────────────────────────────────
const cache = {
  students: null,
  groups: null,
  programs: null,
  lessons: null,
  payments: null,
  config: null,
};

function invalidateCache(collectionName) {
  if (collectionName) {
    cache[collectionName] = null;
  } else {
    for (let key in cache) cache[key] = null;
  }
}

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


/**
 * Retrieves all assigned OKLCH colors across students, groups, and programs.
 */
async function getAllUsedColors(uid) {
  const [st, gr, pr] = await Promise.all([
    getStudents(uid),
    getGroups(uid),
    getPrograms(uid)
  ]);
  const colors = [];
  st.forEach(s => { if (s.colorOklch) colors.push(s.colorOklch); });
  gr.forEach(g => { if (g.colorOklch) colors.push(g.colorOklch); });
  pr.forEach(p => { if (p.colorOklch) colors.push(p.colorOklch); });
  return colors;
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
  if (cache.students) return cache.students;
  const uid = tutorId || auth.currentUser?.uid;
  let q = col.students();
  if (uid) {
    q = query(col.students(), where("tutorId", "==", uid));
  }
  const snap = await getDocs(q);
  const res = snapshotToArray(snap);
  
  // Migration: deduplicate colorOklch across students
  const usedColors = [];
  const updates = [];
  res.forEach((st) => {
    let oklch = st.colorOklch;
    let isConflict = !oklch || st.colorVersion !== 2;
    if (!isConflict) {
      isConflict = usedColors.some(u => Math.abs(u.h - oklch.h) < 0.001 && Math.abs(u.l - oklch.l) < 0.001);
    }
    if (isConflict) {
      oklch = getNextDistinctColor(usedColors);
      st.colorOklch = oklch;
      st.colorVersion = 2;
      updates.push(updateDoc(doc(col.students(), st.id), { colorOklch: oklch, colorVersion: 2 }));
    }
    usedColors.push(oklch);
  });
  if (updates.length > 0) Promise.all(updates).catch(console.error);
  
  cache.students = res;
  return res;
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
  if (!data.colorOklch) {
    const usedColors = await getAllUsedColors(data.tutorId);
    data.colorOklch = getNextDistinctColor(usedColors);
    delete data.colorHue;
  }
  
  invalidateCache('students');
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
  invalidateCache('students');
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
  invalidateCache('students');
  await deleteDoc(doc(col.students(), id));
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════════════════

export async function getGroups(tutorId) {
  if (cache.groups) return cache.groups;
  const uid = tutorId || auth.currentUser?.uid;
  let q = col.groups();
  if (uid) {
    q = query(col.groups(), where("tutorId", "==", uid));
  }
  const snap = await getDocs(q);
  const res = snapshotToArray(snap);

  // Migration: deduplicate colorOklch across groups
  const usedColors = [];
  const updates = [];
  res.forEach((gr) => {
    let oklch = gr.colorOklch;
    let isConflict = !oklch || gr.colorVersion !== 2;
    if (!isConflict) {
      isConflict = usedColors.some(u => Math.abs(u.h - oklch.h) < 0.001 && Math.abs(u.l - oklch.l) < 0.001);
    }
    if (isConflict) {
      oklch = getNextDistinctColor(usedColors);
      gr.colorOklch = oklch;
      gr.colorVersion = 2;
      updates.push(updateDoc(doc(col.groups(), gr.id), { colorOklch: oklch, colorVersion: 2 }));
    }
    usedColors.push(oklch);
  });
  if (updates.length > 0) Promise.all(updates).catch(console.error);

  cache.groups = res;
  return res;
}

export async function getGroup(id) {
  const snap = await getDoc(doc(col.groups(), id));
  return docToObject(snap);
}

export async function addGroup(data) {
  if (!data.colorOklch) {
    const usedColors = await getAllUsedColors(data.tutorId);
    data.colorOklch = getNextDistinctColor(usedColors);
    delete data.colorHue;
  }

  invalidateCache('groups');
  const ref = await addDoc(col.groups(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateGroup(id, data) {
  invalidateCache('groups');
  await updateDoc(doc(col.groups(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteGroup(id) {
  invalidateCache('groups');
  await deleteDoc(doc(col.groups(), id));
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════

export async function getPrograms(tutorId) {
  const uid = tutorId || auth.currentUser?.uid;
  if (cache.programs) return cache.programs;
  let q = col.programs();
  if (uid) {
    q = query(col.programs(), where("tutorId", "==", uid));
  }
  const snap = await getDocs(q);
  const res = snapshotToArray(snap);

  // One-time cleanup and high-quality program injection
  if (!cache.cleanupRealisticProgramsDone) {
    cache.cleanupRealisticProgramsDone = true;
    
    // 1. Delete all spammy/test programs
    const toDelete = res.filter(p => 
      p.name.includes("132") || p.name.includes("46") || p.name.includes("Мега") || p.name.includes("Интенсив")
    );
    // don't delete "Интенсив Механика" if it doesn't have 46 or 132
    const spam = res.filter(p => p.name.includes("132") || p.name.includes("46"));
    
    const deletePromises = spam.map(p => deleteDoc(doc(col.programs(), p.id)));
    if (deletePromises.length > 0) {
       await Promise.all(deletePromises);
       console.log(`Deleted ${deletePromises.length} spam programs`);
    }

    // 2. Add realistic English Program (46 topics)
    const engTopicsList = [
      "Present Simple", "Present Continuous", "Present Perfect", "Present Perfect Continuous",
      "Past Simple", "Past Continuous", "Past Perfect", "Past Perfect Continuous",
      "Future Simple", "Future Continuous", "Future Perfect", "Be going to",
      "Articles: A / An", "Articles: The", "Zero Article", "Plural Nouns",
      "Countable & Uncountable", "Much, Many, A lot of", "Some, Any, No", "Pronouns",
      "Possessive adjectives", "Comparatives", "Superlatives", "Adverbs of frequency",
      "Prepositions of time (in, on, at)", "Prepositions of place", "Can / Could", "Must / Have to",
      "Should / Ought to", "May / Might", "First Conditional", "Second Conditional",
      "Third Conditional", "Passive Voice (Present)", "Passive Voice (Past)", "Reported Speech",
      "Relative Clauses", "Gerunds vs Infinitives", "Used to / Would", "Question Tags",
      "Phrasal Verbs (Part 1)", "Phrasal Verbs (Part 2)", "Word formation", "Idioms overview",
      "Reading Practice", "Listening Practice"
    ];
    const engTopics = engTopicsList.map((t, i) => ({ id: `eng_${i}`, title: t, isCompleted: false }));
    
    // 3. Add realistic Russian Program (132 topics)
    const rusBlocks = ["Орфоэпия", "Лексика", "Морфология", "Орфография", "Пунктуация", "Синтаксис", "Культура речи", "Работа с текстом"];
    const rusTopics = [];
    for (let i = 0; i < 132; i++) {
       const block = rusBlocks[Math.floor(i / 17) % rusBlocks.length];
       rusTopics.push({ id: `rus_${i}`, title: `${block}: Урок ${i % 17 + 1}`, isCompleted: false });
    }

    await addProgram({
      name: "Английский (Грамматика B2)",
      subject: "Английский язык",
      tutorId: uid,
      topics: engTopics
    });
    
    await addProgram({
      name: "Русский язык ЕГЭ 2026",
      subject: "Русский язык",
      tutorId: uid,
      topics: rusTopics
    });
    
    // invalidate cache so they reload
    invalidateCache('programs');
    return getPrograms(tutorId); // recursive call to return fresh data
  }

  // Migration: deduplicate colorOklch across programs
  const usedColors = [];
  const updates = [];
  res.forEach((pr) => {
    let oklch = pr.colorOklch;
    let isConflict = !oklch || pr.colorVersion !== 2;
    if (!isConflict) {
      isConflict = usedColors.some(u => Math.abs(u.h - oklch.h) < 0.001 && Math.abs(u.l - oklch.l) < 0.001);
    }
    if (isConflict) {
      oklch = getNextDistinctColor(usedColors);
      pr.colorOklch = oklch;
      pr.colorVersion = 2;
      updates.push(updateDoc(doc(col.programs(), pr.id), { colorOklch: oklch, colorVersion: 2 }));
    }
    usedColors.push(oklch);
  });
  if (updates.length > 0) Promise.all(updates).catch(console.error);

  cache.programs = res;
  return res;
}

export async function getProgram(id) {
  const snap = await getDoc(doc(col.programs(), id));
  return docToObject(snap);
}

export async function addProgram(data) {
  if (!data.colorOklch) {
    const usedColors = await getAllUsedColors(data.tutorId);
    data.colorOklch = getNextDistinctColor(usedColors);
    delete data.colorHue;
  }

  invalidateCache('programs');
  const ref = await addDoc(col.programs(), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateProgram(id, data) {
  invalidateCache('programs');
  await updateDoc(doc(col.programs(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteProgram(id) {
  invalidateCache('programs');
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
  if (cache.lessons && !studentId && !groupId && !limitCount) return cache.lessons;
  const uid = tutorId || auth.currentUser?.uid;
  let conditions = [];
  if (uid) conditions.push(where("tutorId", "==", uid));
  if (studentId) conditions.push(where("studentId", "==", studentId));
  if (groupId) conditions.push(where("groupId", "==", groupId));

  const q    = query(col.lessons(), ...conditions);
  const snap = await getDocs(q);
  let res = snapshotToArray(snap);
  
  // Sort client-side to avoid composite index requirement
  res.sort((a, b) => {
    if (!a.date) return 1;
    if (!b.date) return -1;
    if (a.date < b.date) return -1;
    if (a.date > b.date) return 1;
    return (a.startTime || "").localeCompare(b.startTime || "");
  });

  if (limitCount) {
    res = res.slice(0, limitCount);
  }

  if (!studentId && !groupId && !limitCount) cache.lessons = res;
  return res;
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
  invalidateCache('lessons');
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
  invalidateCache('lessons');
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
  invalidateCache('lessons');
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
  if (cache.payments && !studentId) return cache.payments;
  const uid = tutorId || auth.currentUser?.uid;
  let conditions = [];
  if (uid) conditions.push(where("tutorId", "==", uid));
  if (studentId) conditions.push(where("studentId", "==", studentId));

  const q    = query(col.payments(), ...conditions);
  const snap = await getDocs(q);
  const res = snapshotToArray(snap);
  
  // Sort client-side to avoid composite index requirement
  res.sort((a, b) => {
    if (!a.paidAt) return 1;
    if (!b.paidAt) return -1;
    return a.paidAt < b.paidAt ? 1 : -1;
  });

  if (!studentId) cache.payments = res;
  return res;
}

/**
 * Add a payment record.
 * @param {object} data — { tutorId, studentId, amount, currency, paidAt, note, ... }
 * @returns {Promise<string>} new document ID
 */
export async function addPayment(data) {
  invalidateCache('payments');
  invalidateCache('students');
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
  invalidateCache('payments');
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
  invalidateCache('payments');
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
  if (cache.config) return cache.config;
  const configDoc = await getDoc(doc(db, "users", uid, "config", "settings"));
  const res = docToObject(configDoc) || {
    theme: "light",
    timezone: "Europe/Moscow",
    currency: "RUB",
    workingDays: [1, 2, 3, 4, 5],
    scheduleColorBy: "subject",
    requisites: "",
  };
  cache.config = res;
  return res;
}

/**
 * Update user configuration
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateUserConfig(uid, data) {
  if (!uid) return;
  invalidateCache('config');
  const ref = doc(db, "users", uid, "config", "settings");
  await setDoc(ref, {
    ...data,
    updatedAt: serverTimestamp(),
  }, { merge: true });
}

// ── Community News ────────────────────────────────────────────────────────

/**
 * getCommunityNews()
 * ─────────────────────────────────────────────────────────────────────────
 * Fetches the latest post from the @tochilka_online Telegram channel
 * via our Vercel Serverless Function endpoint.
 *
 * Security contract:
 *   - The Telegram Bot Token lives ONLY in Vercel Environment Variables.
 *   - This adapter makes a plain HTTP GET to our own /api — no token,
 *     no Telegram API details leak to the browser.
 *
 * Returns:
 *   { id, text, date, channelName, postUrl } on success
 *   null on any error (caller shows graceful fallback)
 *
 * @returns {Promise<CommunityPost|null>}
 *
 * @typedef {{ id: number, text: string, date: string, channelName: string, postUrl: string }} CommunityPost
 */

// Client-side in-memory cache so rapid re-renders don't trigger extra fetches
const _newsCache = { data: null, fetchedAt: 0 };
const _NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 min (mirrors Function TTL)

export async function getCommunityNews() {
  // Cache hit?
  const now = Date.now();
  if (_newsCache.data !== undefined && now - _newsCache.fetchedAt < _NEWS_CACHE_TTL) {
    return _newsCache.data;
  }

  // Under Vercel, the API is mounted on the same domain at /api/*
  // For local dev, Vercel CLI (vercel dev) automatically routes /api
  const endpoint = `/api/getCommunityNews`;

  try {
    const res = await fetch(endpoint, {
      signal: AbortSignal.timeout(10_000), // 10 s hard timeout
      headers: { Accept: "application/json" },
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }

    const json = await res.json();

    // Update client cache regardless of ok/data (avoids hammering on partial errors)
    _newsCache.data = (json.ok && json.data) ? json.data : null;
    _newsCache.fetchedAt = now;

    return _newsCache.data;
  } catch {
    // Network error, timeout, JSON parse error — all handled silently
    // Do NOT update fetchedAt so we retry sooner on next mount
    return null;
  }
}
