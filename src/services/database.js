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
async function applyLessonIncomeChange(oldData, newData) {
  if (!newData) return;
  const isIndividual = newData.type === 'individual';
  const isGroup = newData.type === 'group';

  const updateStudentBalance = async (stId, amtDelta) => {
    if (amtDelta === 0) return;
    const stRef = doc(col.students(), stId);
    const stSnap = await getDoc(stRef);
    if (stSnap.exists()) {
      await updateDoc(stRef, { balance: (stSnap.data().balance || 0) + amtDelta });
    }
  };

  if (isIndividual && newData.studentId) {
    const oldAmt = Number(oldData?.paymentAmount) || 0;
    const newAmt = Number(newData.paymentAmount) || 0;
    await updateStudentBalance(newData.studentId, newAmt - oldAmt);
  } else if (isGroup) {
    const oldPayments = oldData?.studentPayments || {};
    const newPayments = newData?.studentPayments || {};
    const allStudents = new Set([...Object.keys(oldPayments), ...Object.keys(newPayments)]);
    for (const stId of allStudents) {
      const oldAmt = Number(oldPayments[stId]?.amount) || 0;
      const newAmt = Number(newPayments[stId]?.amount) || 0;
      await updateStudentBalance(stId, newAmt - oldAmt);
    }
  }
}

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
    // Fix #5: Prefer the group membership snapshot captured at lesson creation time.
    // This ensures balance changes always affect the students who were actually in the
    // group when the lesson was created, not whoever happens to be in the group now.
    let studentIds = Array.isArray(lessonData.groupStudentIds) && lessonData.groupStudentIds.length > 0
      ? lessonData.groupStudentIds
      : null;

    if (!studentIds) {
      // Fallback: no snapshot stored — read current group membership
      const grRef = doc(col.groups(), lessonData.groupId);
      const grSnap = await getDoc(grRef);
      studentIds = grSnap.exists() ? (grSnap.data().studentIds || []) : [];
    }

    for (const stId of studentIds) {
      const stRef = doc(col.students(), stId);
      const stSnap = await getDoc(stRef);
      if (stSnap.exists()) {
        await updateDoc(stRef, { balance: (stSnap.data().balance || 0) + amountToApply });
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

  // Migration: cleanup accidentally injected demo programs for existing users
  if (!cache.demoProgramsCleanupDone) {
    cache.demoProgramsCleanupDone = true;
    const demoPrograms = res.filter(p => 
      p.name === "Английский (Грамматика B2)" || p.name === "Русский язык ЕГЭ 2026"
    );
    
    if (demoPrograms.length > 0) {
      const deletePromises = demoPrograms.map(p => deleteDoc(doc(col.programs(), p.id)));
      await Promise.all(deletePromises);
      invalidateCache('programs');
      return getPrograms(tutorId); // recursive call to return clean data
    }
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
// PROGRAMS v2 — двухуровневая структура (Разделы ➔ Темы)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * migrateToSections — ЧИСТАЯ клиентская функция (без Firestore).
 *
 * Принимает программу любого формата (старый плоский topics[] или новый с
 * sections[]) и всегда возвращает нормализованный объект с полями:
 *   sections: Section[]
 *   topics:   Topic[]           ← плоский индекс по-прежнему живёт здесь
 *   _migrated: boolean          ← true, если была произведена конвертация
 *
 * Структуры:
 *   Section  { id, title, order, topicIds: string[] }
 *   Topic    { id, title, order, sectionId, isCompleted, homeworkBank: HWItem[] }
 *   HWItem   { id, text, type }   type ∈ 'task' | 'question' | 'exercise'
 *
 * Тихая миграция: если sections отсутствует или пустой, все темы из topics[]
 * переезжают в один раздел «Основные темы». Существующие поля topics сохраняются,
 * добавляются sectionId и homeworkBank (если отсутствуют).
 */
export function migrateToSections(program) {
  // Уже мигрирован — нормализуем топики и возвращаем
  if (program.sections && program.sections.length > 0) {
    const topics = (program.topics || []).map((t, i) => ({
      homeworkBank: [],
      order: i,
      sectionId: program.sections[0]?.id ?? null,
      isCompleted: false,
      ...t,
    }));
    return { ...program, topics, _migrated: false };
  }

  // Нет разделов — конвертируем плоский массив
  const defaultSectionId = `sec_${Date.now()}`;
  const topics = (program.topics || []).map((t, i) => ({
    homeworkBank: [],
    isCompleted: false,
    order: i,
    ...t,
    sectionId: defaultSectionId,
  }));

  const sections = [
    {
      id: defaultSectionId,
      title: 'Основные темы',
      order: 0,
      topicIds: topics.map((t) => t.id),
    },
  ];

  return { ...program, sections, topics, _migrated: true };
}

/**
 * Генератор уникальных ID (без внешних зависимостей).
 * Используется во всех v2-методах для создания разделов и тем.
 */
function generateId() {
  return Math.random().toString(36).slice(2, 9);
}

// ─── Запись структуры ────────────────────────────────────────────────────────

/**
 * Атомарно сохраняет структуру программы (разделы + темы), а также основные поля (имя, предмет).
 * Вызывается после DnD-перетаскивания, переименования или изменения названия программы.
 *
 * @param {string} id    — Firestore doc ID программы
 * @param {object} data  — { sections, topics, name, subject }
 */
export async function updateProgramStructure(id, payload) {
  invalidateCache('programs');
  await updateDoc(doc(col.programs(), id), {
    ...payload,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Сохраняет только порядок разделов (например, после DnD на уровне секций).
 * Не трогает topics.
 */
export async function updateProgramSections(id, sections) {
  invalidateCache('programs');
  await updateDoc(doc(col.programs(), id), {
    sections,
    updatedAt: serverTimestamp(),
  });
}

// ─── CRUD тем ───────────────────────────────────────────────────────────────

/**
 * Добавляет новую тему в конец указанного раздела.
 *
 * @param {string} programId
 * @param {string} sectionId
 * @param {string} title
 * @returns {object} — полная программа с обновлёнными topics и sections
 */
export async function addThemeToSection(programId, sectionId, title) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const newTheme = {
    id: generateId(),
    title,
    sectionId,
    order: migrated.topics.length,
    isCompleted: false,
    homeworkBank: [],
  };

  const updatedTopics = [...migrated.topics, newTheme];
  const updatedSections = migrated.sections.map((s) =>
    s.id === sectionId
      ? { ...s, topicIds: [...s.topicIds, newTheme.id] }
      : s
  );

  await updateProgramStructure(programId, {
    sections: updatedSections,
    topics: updatedTopics,
  });

  return { ...migrated, sections: updatedSections, topics: updatedTopics };
}

/**
 * Обновляет поля темы. Поддерживает частичное обновление (patch).
 * Для обновления homeworkBank используй: { homeworkBank: newArray }.
 *
 * Добавление задания в банк ДЗ:
 *   item = { id: generateId(), text: '...', type: 'task' }
 *   updateTheme(progId, themeId, { homeworkBank: [...old, item] })
 *
 * @param {string} programId
 * @param {string} themeId
 * @param {object} patch     — частичные изменения темы
 */
export async function updateTheme(programId, themeId, patch) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const updatedTopics = migrated.topics.map((t) =>
    t.id === themeId ? { ...t, ...patch } : t
  );

  invalidateCache('programs');
  await updateDoc(doc(col.programs(), programId), {
    topics: updatedTopics,
    updatedAt: serverTimestamp(),
  });

  return { ...migrated, topics: updatedTopics };
}

/**
 * Удаляет тему из программы и из её раздела.
 *
 * @param {string} programId
 * @param {string} themeId
 */
export async function deleteTheme(programId, themeId) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const updatedTopics = migrated.topics.filter((t) => t.id !== themeId);
  const updatedSections = migrated.sections.map((s) => ({
    ...s,
    topicIds: s.topicIds.filter((id) => id !== themeId),
  }));

  await updateProgramStructure(programId, {
    sections: updatedSections,
    topics: updatedTopics,
  });
}

// ─── Разделы ────────────────────────────────────────────────────────────────

/**
 * Добавляет новый пустой раздел.
 *
 * @param {string} programId
 * @param {string} title
 */
export async function addSection(programId, title) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const newSection = {
    id: generateId(),
    title,
    order: migrated.sections.length,
    topicIds: [],
  };

  const updatedSections = [...migrated.sections, newSection];
  await updateProgramSections(programId, updatedSections);
  return { ...migrated, sections: updatedSections };
}

/**
 * Переименовывает раздел.
 */
export async function renameSection(programId, sectionId, newTitle) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const updatedSections = migrated.sections.map((s) =>
    s.id === sectionId ? { ...s, title: newTitle } : s
  );
  await updateProgramSections(programId, updatedSections);
  return { ...migrated, sections: updatedSections };
}

/**
 * Удаляет раздел и все его темы.
 */
export async function deleteSection(programId, sectionId) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const section = migrated.sections.find((s) => s.id === sectionId);
  if (!section) return migrated;

  const updatedTopics = migrated.topics.filter((t) => t.sectionId !== sectionId);
  const updatedSections = migrated.sections.filter((s) => s.id !== sectionId);

  await updateProgramStructure(programId, {
    sections: updatedSections,
    topics: updatedTopics,
  });
  return { ...migrated, sections: updatedSections, topics: updatedTopics };
}

// ─── Excel Round-Trip ────────────────────────────────────────────────────────

/**
 * batchImportProgram — атомарное обновление программы после Excel-импорта.
 *
 * Логика Round-Trip:
 *   - Если у темы есть ID (колонка была в экспорте) → updateTheme()
 *   - Если ID пустой (новая строка в Excel) → создаём тему через generateId()
 *
 * @param {string} programId
 * @param {{ sections: Section[], topics: Topic[] }} parsed — результат парсинга Excel
 * @returns {{ added: number, updated: number, unchanged: number }}
 */
export async function batchImportProgram(programId, { sections, topics }) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  // Индекс существующих тем для быстрого поиска
  const existingById = Object.fromEntries(migrated.topics.map((t) => [t.id, t]));

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  const mergedTopics = topics.map((incoming) => {
    if (incoming.id && existingById[incoming.id]) {
      // Тема существует — мерджим, сохраняя homeworkBank
      const existing = existingById[incoming.id];
      const isDifferent =
        existing.title !== incoming.title ||
        existing.sectionId !== incoming.sectionId;
      if (isDifferent) {
        updated++;
        return { ...existing, ...incoming };
      }
      unchanged++;
      return existing;
    }
    // Новая тема
    added++;
    return {
      id: generateId(),
      isCompleted: false,
      homeworkBank: [],
      order: 0,
      ...incoming,
    };
  });

  // Пересчитываем order внутри каждого раздела
  const orderMap = {};
  mergedTopics.forEach((t) => {
    orderMap[t.sectionId] = (orderMap[t.sectionId] ?? 0);
    t.order = orderMap[t.sectionId]++;
  });

  // Нормализуем topicIds в разделах по итоговому массиву тем
  const topicsBySection = {};
  mergedTopics.forEach((t) => {
    if (!topicsBySection[t.sectionId]) topicsBySection[t.sectionId] = [];
    topicsBySection[t.sectionId].push(t.id);
  });

  const mergedSections = sections.map((s, i) => ({
    ...s,
    order: i,
    topicIds: topicsBySection[s.id] ?? [],
  }));

  await updateProgramStructure(programId, {
    sections: mergedSections,
    topics: mergedTopics,
  });

  return { added, updated, unchanged };
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

    // Fix #5: Snapshot current group membership into the lesson so that future
    // balance changes always target the students who were in the group at creation.
    if (baseData.type === 'group' && baseData.groupId && !baseData.groupStudentIds) {
      const grSnap = await getDoc(doc(col.groups(), baseData.groupId));
      if (grSnap.exists()) {
        baseData.groupStudentIds = grSnap.data().studentIds || [];
      }
    }

    let iterations = 0;
    while (currentDate <= endDate && iterations < 52) {
      iterations++;
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
      
      await applyLessonIncomeChange(null, lessonDataToSave);
      
      // add 7 days
      currentDate.setDate(currentDate.getDate() + 7);
    }
    return lastRefId;
  } else {
    const baseData = { ...data };
    delete baseData.isRecurring;
    delete baseData.repeatUntil;

    // Fix #5: Snapshot current group membership into the lesson so that future
    // balance changes always target the students who were in the group at creation.
    if (baseData.type === 'group' && baseData.groupId && !baseData.groupStudentIds) {
      const grSnap = await getDoc(doc(col.groups(), baseData.groupId));
      if (grSnap.exists()) {
        baseData.groupStudentIds = grSnap.data().studentIds || [];
      }
    }
    
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
    
    await applyLessonIncomeChange(null, lessonDataToSave);
    
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

  if (oldData) {
    const isDateChanged = data.date !== undefined && data.date !== oldData.date;
    const isStartTimeChanged = data.startTime !== undefined && data.startTime !== oldData.startTime;
    const isEndTimeChanged = data.endTime !== undefined && data.endTime !== oldData.endTime;
    
    if (isDateChanged || isStartTimeChanged || isEndTimeChanged) {
      data.reschedules = [...(oldData.reschedules || []), new Date().toISOString()];
    }
  }

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

  // Recalculate hwDebtCount on affected students when hwDoneBy changes
  if (data.hwDoneBy !== undefined) {
    await recalcHwDebtCount(id, { ...oldData, ...data });
  }

  if (oldData) {
    await applyLessonIncomeChange(oldData, { ...oldData, ...data });
  }
}

/**
 * Patch a lesson with partial data (for optimistic Inspector updates).
 * Unlike updateLesson, does NOT re-read the old doc for reschedule tracking —
 * use this only for non-scheduling field changes (status, homework, notes).
 *
 * @param {string} id       — lesson Firestore doc ID
 * @param {object} partial  — only the fields to update
 * @returns {Promise<void>}
 */
export async function patchLesson(id, partial) {
  invalidateCache('lessons');

  // Read old data only if we need balance or hwDebtCount side-effects
  const needsOldData = partial.status !== undefined || partial.hwDoneBy !== undefined || partial.paymentAmount !== undefined || partial.studentPayments !== undefined;
  let oldData = null;
  if (needsOldData) {
    const oldSnap = await getDoc(doc(col.lessons(), id));
    oldData = oldSnap.exists() ? oldSnap.data() : null;
  }

  await updateDoc(doc(col.lessons(), id), {
    ...partial,
    updatedAt: serverTimestamp(),
  });

  // Balance side-effect when status changes
  if (oldData && partial.status !== undefined && partial.status !== oldData.status) {
    const isOldPaid = oldData.status === "conducted" || oldData.status === "skipped_paid";
    const isNewPaid = partial.status === "conducted" || partial.status === "skipped_paid";
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
  if (oldData && (partial.paymentAmount !== undefined || partial.studentPayments !== undefined)) {
    await applyLessonIncomeChange(oldData, { ...oldData, ...partial });
  }
}

/**
 * Пересчитывает hwDebtCount на студентах, затронутых изменением урока.
 *
 * Логика:
 *   - Для индивидуального урока: hwDebtCount — кол-во прошедших уроков
 *     у этого студента, где homework задан и студент не в hwDoneBy.
 *   - Вызывается при каждом сохранении урока с изменённым hwDoneBy.
 *
 * @param {string} lessonId     — ID изменённого урока (для исключения из старого подсчёта)
 * @param {object} updatedLesson — данные урока после изменений
 */
async function recalcHwDebtCount(lessonId, updatedLesson) {
  const studentIds = [];
  if (updatedLesson.type === "individual" && updatedLesson.studentId) {
    studentIds.push(updatedLesson.studentId);
  } else if (updatedLesson.type === "group" && updatedLesson.groupId) {
    const grSnap = await getDoc(doc(col.groups(), updatedLesson.groupId));
    if (grSnap.exists()) {
      (grSnap.data().studentIds || []).forEach(id => studentIds.push(id));
    }
  }

  if (studentIds.length === 0) return;

  // Fetch all lessons for affected students to count HW debts
  const uid = updatedLesson.tutorId || auth.currentUser?.uid;
  const allLessonsSnap = await getDocs(
    query(col.lessons(), where("tutorId", "==", uid))
  );
  const allLessons = allLessonsSnap.docs.map(d => ({ id: d.id, ...d.data() }));
  // Merge in the updated lesson so count is based on fresh data
  const merged = allLessons.map(l => l.id === lessonId ? { ...l, ...updatedLesson } : l);

  const today = new Date().toISOString().split('T')[0];
  const pastLessons = merged.filter(l => l.date < today);

  const updates = studentIds.map(async (sid) => {
    const debtCount = pastLessons.filter(l => {
      const hw = typeof l.homework === 'string' ? l.homework : (l.homework?.text || "");
      if (!hw.trim()) return false;
      if (l.type === "individual") return l.studentId === sid && !(l.hwDoneBy || []).includes(sid);
      if (l.type === "group") {
        const inGroup = (l.groupId === updatedLesson.groupId);
        return inGroup && !(l.hwDoneBy || []).includes(sid);
      }
      return false;
    }).length;

    await updateDoc(doc(col.students(), sid), { hwDebtCount: debtCount });
  });

  await Promise.all(updates);
  invalidateCache('students');
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
    const amount = Number(data.amount);
    const stRef = doc(col.students(), data.studentId);
    const stSnap = await getDoc(stRef);
    if (stSnap.exists()) {
      const stData = stSnap.data();
      await updateDoc(stRef, {
        balance: (stData.balance || 0) + amount,
        // Fix #4: Keep LTV (Lifetime Value) in sync — increment by every confirmed payment.
        ltv: (stData.ltv || 0) + amount,
      });
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
  invalidateCache('students');

  // Fix #2: When the payment amount changes, compute the delta and apply it to the
  // student's balance so the ledger stays consistent.
  if (data.amount !== undefined) {
    const oldSnap = await getDoc(doc(col.payments(), id));
    if (oldSnap.exists()) {
      const oldData = oldSnap.data();
      const oldAmount = Number(oldData.amount) || 0;
      const newAmount = Number(data.amount) || 0;
      const delta = newAmount - oldAmount;
      if (delta !== 0 && oldData.studentId) {
        const stRef = doc(col.students(), oldData.studentId);
        const stSnap = await getDoc(stRef);
        if (stSnap.exists()) {
          const stData = stSnap.data();
          await updateDoc(stRef, {
            balance: (stData.balance || 0) + delta,
            // Keep LTV consistent with balance edits.
            ltv: Math.max(0, (stData.ltv || 0) + delta),
          });
        }
      }
    }
  }

  await updateDoc(doc(col.payments(), id), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Delete a payment record.
 * Reverts the student's balance by the payment amount so the ledger stays correct.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePayment(id) {
  invalidateCache('payments');
  invalidateCache('students');

  // Fix #1: Read the payment before deleting so we can roll back the student's balance.
  const paySnap = await getDoc(doc(col.payments(), id));
  if (paySnap.exists()) {
    const payData = paySnap.data();
    const amount = Number(payData.amount) || 0;
    if (amount !== 0 && payData.studentId) {
      const stRef = doc(col.students(), payData.studentId);
      const stSnap = await getDoc(stRef);
      if (stSnap.exists()) {
        const stData = stSnap.data();
        await updateDoc(stRef, {
          balance: (stData.balance || 0) - amount,
          // Roll back LTV as well — the payment is being erased from history.
          ltv: Math.max(0, (stData.ltv || 0) - amount),
        });
      }
    }
  }

  await deleteDoc(doc(col.payments(), id));
}

// ── Configuration ─────────────────────────────────────────────────────────

export async function getUserConfig(uid) {
  const currentUid = uid || auth.currentUser?.uid;
  if (!currentUid) return null;
  if (cache.config) return cache.config;
  const configDoc = await getDoc(doc(db, "users", currentUid, "config", "settings"));
  const res = docToObject(configDoc) || {
    theme: "light",
    timezone: "Europe/Moscow",
    currency: "RUB",
    workingDays: [1, 2, 3, 4, 5],
    scheduleColorBy: "subject",
    requisites: "",
    dashboardMetrics: ["todayCount", "activeStudentsCount", "hoursWorkedThisMonth", "incomeMonth"]
  };
  if (!res.dashboardMetrics) {
    res.dashboardMetrics = ["todayCount", "activeStudentsCount", "hoursWorkedThisMonth", "incomeMonth"];
  }
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
  const currentUid = uid || auth.currentUser?.uid;
  if (!currentUid) return;
  invalidateCache('config');
  const ref = doc(db, "users", currentUid, "config", "settings");
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
