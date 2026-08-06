/**
 * database.js — Adapter Layer (PocketBase)
 * ─────────────────────────────────────────────────────────────────────────────
 * ALL database access goes through this file.
 * UI components never import from pocketbase directly.
 *
 * Collections:
 *   users       — tutor user profiles (PocketBase Auth collection)
 *   students    — student records
 *   groups      — group records
 *   programs    — program/curriculum records
 *   lessons     — individual lesson sessions
 *   payments    — payment records
 *   user_config — per-user configuration
 *
 * Pattern: each method returns a Promise that resolves to plain JS objects.
 * PocketBase record internals are never leaked to UI components.
 */

import pb from "../services/pocketbase.js";
import { getNextDistinctColor } from "../utils/colors.js";

// ── Helpers ───────────────────────────────────────────────────────────────

/** Get the currently authenticated user's ID */
function getCurrentUserId() {
  return pb.authStore.record?.id;
}

/**
 * Safely fetch a single record, returning null if not found.
 * PocketBase throws on 404, unlike Firestore's exists() check.
 */
export async function safeGetOne(collectionName, id) {
  if (!id) return null;
  try {
    return await pb.collection(collectionName).getOne(id);
  } catch (err) {
    if (err?.status === 404) return null;
    throw err;
  }
}

// ── In-Memory Cache ───────────────────────────────────────────────────────
const cache = {
  students: null,
  groups: null,
  programs: null,
  lessons: null,
  payments: null,
  config: null,
};

export function invalidateCache(collectionName) {
  if (collectionName) {
    cache[collectionName] = null;
  } else {
    for (let key in cache) cache[key] = null;
  }
}

// ── Balance Helpers ───────────────────────────────────────────────────────

/**
 * Builds a deterministic note tag that links a payment record to a lesson+student.
 * Used to find/update/delete lesson-linked payments later.
 */


/**
 * Find an existing payment record linked to a specific lesson+student via note tag.
 * Returns the record or null.
 */


/**
 * Ledger Helper: Syncs lesson inline payments as proper payment records.
 * Compares old vs new paymentAmount/studentPayments and creates/updates/deletes
 * payment records accordingly (which in turn update student balance).
 *
 * @param {object|null} oldData — previous lesson state (null for new lessons)
 * @param {object} newData — new/updated lesson state
 * @param {string} lessonId — the lesson record ID
 */


/**
 * Applies balance changes when a lesson is conducted or reverted.
 * isReverting = false -> subtract price from balance (student took lesson)
 * isReverting = true  -> add price back to balance (lesson was un-conducted)
 */
async function applyLessonBalanceChange(lessonData, isReverting = false) {
  try {
    const price = lessonData.price || 0;
    if (price === 0) return;

    const multiplier = isReverting ? 1 : -1;
    const amountToApply = price * multiplier;

    if (lessonData.type === "individual" && lessonData.studentId) {
      const student = await safeGetOne("students", lessonData.studentId);
      if (student) {
        await pb.collection("students").update(lessonData.studentId, {
          balance: (student.balance || 0) + amountToApply,
        });
      }
    } else if (lessonData.type === "group" && lessonData.groupId) {
      // Fix #5: Prefer the group membership snapshot captured at lesson creation time.
      let studentIds =
        Array.isArray(lessonData.groupStudentIds) &&
        lessonData.groupStudentIds.length > 0
          ? lessonData.groupStudentIds
          : null;

      if (!studentIds) {
        // Fallback: no snapshot stored — read current group membership
        const group = await safeGetOne("groups", lessonData.groupId);
        studentIds = group ? group.studentIds || [] : [];
      }

      for (const stId of studentIds) {
        const student = await safeGetOne("students", stId);
        if (student) {
          await pb.collection("students").update(stId, {
            balance: (student.balance || 0) + amountToApply,
          });
        }
      }
    }
  } catch (err) {
    console.error('[applyLessonBalanceChange]', err);
    throw err;
  }
}

/**
 * Retrieves all assigned OKLCH colors across students, groups, and programs.
 */
async function getAllUsedColors(uid) {
  const [st, gr, pr] = await Promise.all([
    getStudents(uid),
    getGroups(uid),
    getPrograms(uid),
  ]);
  const colors = [];
  st.forEach((s) => {
    if (s.colorOklch) colors.push(s.colorOklch);
  });
  gr.forEach((g) => {
    if (g.colorOklch) colors.push(g.colorOklch);
  });
  pr.forEach((p) => {
    if (p.colorOklch) colors.push(p.colorOklch);
  });
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
  return await safeGetOne("users", uid);
}

/**
 * Update a user profile.
 * @param {string} uid
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function setUser(uid, data) {
  await pb.collection("users").update(uid, data);
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
  const uid = tutorId || getCurrentUserId();
  let res;
  if (uid) {
    res = await pb.collection("students").getFullList({
      filter: `tutorId = "${uid}"`,
      sort: "name",
    });
  } else {
    res = await pb.collection("students").getFullList({ sort: "name" });
  }

  // Migration: deduplicate colorOklch across students
  const usedColors = [];
  const updates = [];
  res.forEach((st) => {
    let oklch = st.colorOklch;
    let isConflict = !oklch || st.colorVersion !== 2;
    if (!isConflict) {
      isConflict = usedColors.some(
        (u) =>
          Math.abs(u.h - oklch.h) < 0.001 && Math.abs(u.l - oklch.l) < 0.001
      );
    }
    if (isConflict) {
      oklch = getNextDistinctColor(usedColors);
      st.colorOklch = oklch;
      st.colorVersion = 2;
      updates.push(
        pb
          .collection("students")
          .update(st.id, { colorOklch: oklch, colorVersion: 2 })
      );
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
  return await safeGetOne("students", id);
}

/**
 * Add a new student.
 * @param {object} data — { name, subject, tutorId, ... }
 * @returns {Promise<string>} new record ID
 */
export async function addStudent(data) {
  if (!data.colorOklch) {
    const tutorId = data.tutorId || pb.authStore.model?.id;
    const usedColors = await getAllUsedColors(tutorId);
    data.colorOklch = getNextDistinctColor(usedColors);
    delete data.colorHue;
  }
  
  if (!data.tutorId) {
    data.tutorId = pb.authStore.model?.id;
  }

  invalidateCache("students");
  const record = await pb.collection("students").create(data);
  return record.id;
}

/**
 * Update a student record.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updateStudent(id, data) {
  invalidateCache("students");
  await pb.collection("students").update(id, data);
}

/**
 * Delete a student record.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deleteStudent(id) {
  invalidateCache("students");
  
  // Каскадное удаление уроков
  try {
    const lessons = await pb.collection("lessons").getFullList({ filter: `studentId="${id}"` });
    for (const lesson of lessons) {
      await pb.collection("lessons").delete(lesson.id);
    }
  } catch (e) {
    console.error("Ошибка при каскадном удалении уроков ученика", e);
  }

  // Каскадное удаление оплат
  try {
    const payments = await pb.collection("payments").getFullList({ filter: `studentId="${id}"` });
    for (const payment of payments) {
      await pb.collection("payments").delete(payment.id);
    }
  } catch (e) {
    console.error("Ошибка при каскадном удалении оплат ученика", e);
  }

  await pb.collection("students").delete(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// GROUPS
// ═══════════════════════════════════════════════════════════════════════════

export async function getGroups(tutorId) {
  if (cache.groups) return cache.groups;
  const uid = tutorId || getCurrentUserId();
  let res;
  if (uid) {
    res = await pb.collection("groups").getFullList({
      filter: `tutorId = "${uid}"`,
      sort: "name",
    });
  } else {
    res = await pb.collection("groups").getFullList({ sort: "name" });
  }

  // Migration: deduplicate colorOklch across groups
  const usedColors = [];
  const updates = [];
  res.forEach((gr) => {
    let oklch = gr.colorOklch;
    let isConflict = !oklch || gr.colorVersion !== 2;
    if (!isConflict) {
      isConflict = usedColors.some(
        (u) =>
          Math.abs(u.h - oklch.h) < 0.001 && Math.abs(u.l - oklch.l) < 0.001
      );
    }
    if (isConflict) {
      oklch = getNextDistinctColor(usedColors);
      gr.colorOklch = oklch;
      gr.colorVersion = 2;
      updates.push(
        pb
          .collection("groups")
          .update(gr.id, { colorOklch: oklch, colorVersion: 2 })
      );
    }
    usedColors.push(oklch);
  });
  if (updates.length > 0) Promise.all(updates).catch(console.error);

  cache.groups = res;
  return res;
}

export async function getGroup(id) {
  return await safeGetOne("groups", id);
}

export async function addGroup(data) {
  const tutorId = data.tutorId || pb.authStore.model?.id;
  if (!data.colorOklch) {
    const usedColors = await getAllUsedColors(tutorId);
    data.colorOklch = getNextDistinctColor(usedColors);
    delete data.colorHue;
  }
  
  if (!data.tutorId) {
    data.tutorId = tutorId;
  }

  invalidateCache("groups");
  const record = await pb.collection("groups").create(data);
  return record.id;
}

export async function updateGroup(id, data) {
  invalidateCache("groups");
  await pb.collection("groups").update(id, data);
}

export async function deleteGroup(id) {
  invalidateCache("groups");
  
  // Каскадное удаление уроков группы
  try {
    const lessons = await pb.collection("lessons").getFullList({ filter: `groupId="${id}"` });
    for (const lesson of lessons) {
      await pb.collection("lessons").delete(lesson.id);
    }
  } catch (e) {
    console.error("Ошибка при каскадном удалении уроков группы", e);
  }

  await pb.collection("groups").delete(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS
// ═══════════════════════════════════════════════════════════════════════════

export async function getPrograms(tutorId) {
  const uid = tutorId || getCurrentUserId();
  if (cache.programs) return cache.programs;
  let res;
  if (uid) {
    res = await pb.collection("programs").getFullList({
      filter: `tutorId = "${uid}"`,
      sort: "name",
    });
  } else {
    res = await pb.collection("programs").getFullList({ sort: "name" });
  }

  // Migration: cleanup accidentally injected demo programs for existing users
  if (!cache.demoProgramsCleanupDone) {
    cache.demoProgramsCleanupDone = true;
    const demoPrograms = res.filter(
      (p) =>
        p.name === "Английский (Грамматика B2)" ||
        p.name === "Русский язык ЕГЭ 2026"
    );

    if (demoPrograms.length > 0) {
      const deletePromises = demoPrograms.map((p) =>
        pb.collection("programs").delete(p.id)
      );
      await Promise.all(deletePromises);
      invalidateCache("programs");
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
      isConflict = usedColors.some(
        (u) =>
          Math.abs(u.h - oklch.h) < 0.001 && Math.abs(u.l - oklch.l) < 0.001
      );
    }
    if (isConflict) {
      oklch = getNextDistinctColor(usedColors);
      pr.colorOklch = oklch;
      pr.colorVersion = 2;
      updates.push(
        pb
          .collection("programs")
          .update(pr.id, { colorOklch: oklch, colorVersion: 2 })
      );
    }
    usedColors.push(oklch);
  });
  if (updates.length > 0) Promise.all(updates).catch(console.error);

  cache.programs = res;
  return res;
}

export async function getProgram(id) {
  return await safeGetOne("programs", id);
}

export async function addProgram(data) {
  const tutorId = data.tutorId || pb.authStore.model?.id;
  if (!data.colorOklch) {
    const usedColors = await getAllUsedColors(tutorId);
    data.colorOklch = getNextDistinctColor(usedColors);
    delete data.colorHue;
  }

  if (!data.tutorId) {
    data.tutorId = tutorId;
  }

  invalidateCache("programs");
  const record = await pb.collection("programs").create(data);
  return record.id;
}

export async function updateProgram(id, data) {
  invalidateCache("programs");
  await pb.collection("programs").update(id, data);
}

export async function deleteProgram(id) {
  invalidateCache("programs");
  await pb.collection("programs").delete(id);
}

// ═══════════════════════════════════════════════════════════════════════════
// PROGRAMS v2 — двухуровневая структура (Разделы ➔ Темы)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * migrateToSections — ЧИСТАЯ клиентская функция (без БД).
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
      title: "Основные темы",
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
 * Атомарно сохраняет структуру программы (разделы + темы), а также основные поля.
 *
 * @param {string} id    — record ID программы
 * @param {object} data  — { sections, topics, name, subject }
 */
export async function updateProgramStructure(id, payload) {
  invalidateCache("programs");
  await pb.collection("programs").update(id, payload);
}

/**
 * Сохраняет только порядок разделов (например, после DnD на уровне секций).
 */
export async function updateProgramSections(id, sections) {
  invalidateCache("programs");
  await pb.collection("programs").update(id, { sections });
}

// ─── CRUD тем ───────────────────────────────────────────────────────────────

/**
 * Добавляет новую тему в конец указанного раздела.
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
 */
export async function updateTheme(programId, themeId, patch) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  const updatedTopics = migrated.topics.map((t) =>
    t.id === themeId ? { ...t, ...patch } : t
  );

  invalidateCache("programs");
  await pb.collection("programs").update(programId, {
    topics: updatedTopics,
  });

  return { ...migrated, topics: updatedTopics };
}

/**
 * Удаляет тему из программы и из её раздела.
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

  const updatedTopics = migrated.topics.filter(
    (t) => t.sectionId !== sectionId
  );
  const updatedSections = migrated.sections.filter(
    (s) => s.id !== sectionId
  );

  await updateProgramStructure(programId, {
    sections: updatedSections,
    topics: updatedTopics,
  });
  return { ...migrated, sections: updatedSections, topics: updatedTopics };
}

// ─── Excel Round-Trip ────────────────────────────────────────────────────────

/**
 * batchImportProgram — атомарное обновление программы после Excel-импорта.
 */
export async function batchImportProgram(programId, { sections, topics }) {
  const program = await getProgram(programId);
  const migrated = migrateToSections(program);

  // Индекс существующих тем для быстрого поиска
  const existingById = Object.fromEntries(
    migrated.topics.map((t) => [t.id, t])
  );

  let added = 0;
  let updated = 0;
  let unchanged = 0;

  const mergedTopics = topics.map((incoming) => {
    if (incoming.id && existingById[incoming.id]) {
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
    orderMap[t.sectionId] = orderMap[t.sectionId] ?? 0;
    t.order = orderMap[t.sectionId]++;
  });

  // Нормализуем topicIds в разделах
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
export async function getLessonsPaginated({
  page = 1,
  limit = 50,
  tutorId,
  studentId,
  groupId,
} = {}) {
  const uid = tutorId || getCurrentUserId();
  let filterParts = [];
  if (uid) filterParts.push(`tutorId = "${uid}"`);
  if (studentId) filterParts.push(`studentId = "${studentId}"`);
  if (groupId) filterParts.push(`groupId = "${groupId}"`);

  const filter = filterParts.length > 0 ? filterParts.join(" && ") : "";

  return await pb.collection("lessons").getList(page, limit, {
    filter,
    sort: "-date,-startTime",
  });
}

export async function getLessons({
  tutorId,
  studentId,
  groupId,
  limitCount,
  dateFrom,
  dateTo,
} = {}) {
  const uid = tutorId || getCurrentUserId();

  let filterParts = [];
  if (uid) filterParts.push(`tutorId = "${uid}"`);
  if (studentId) filterParts.push(`studentId = "${studentId}"`);
  if (groupId) filterParts.push(`groupId = "${groupId}"`);
  if (dateFrom) filterParts.push(`date >= "${dateFrom}"`);
  if (dateTo) filterParts.push(`date <= "${dateTo}"`);

  const filter = filterParts.length > 0 ? filterParts.join(" && ") : "";

  let res = await pb.collection("lessons").getFullList({
    filter,
    sort: "date,startTime",
  });

  if (limitCount) {
    res = res.slice(0, limitCount);
  }

  return res;
}

/**
 * Get a single lesson.
 * @param {string} id
 * @returns {Promise<object|null>}
 */
export async function getLesson(id) {
  return await safeGetOne("lessons", id);
}

/**
 * Add a new lesson.
 * @param {object} data — { tutorId, studentId, scheduledAt, durationMin, subject, ... }
 * @returns {Promise<string>} new record ID
 */


/**
 * Update a lesson (e.g. mark as completed).
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */


/**
 * Patch a lesson with partial data (for optimistic Inspector updates).
 * Unlike updateLesson, does NOT re-read the old doc for reschedule tracking.
 */


/**
 * Пересчитывает hwDebtCount на студентах, затронутых изменением урока.
 */
async function recalcHwDebtCount(lessonId, updatedLesson) {
  const studentIds = [];
  if (updatedLesson.type === "individual" && updatedLesson.studentId) {
    studentIds.push(updatedLesson.studentId);
  } else if (updatedLesson.type === "group" && updatedLesson.groupId) {
    const group = await safeGetOne("groups", updatedLesson.groupId);
    if (group) {
      (group.studentIds || []).forEach((id) => studentIds.push(id));
    }
  }

  if (studentIds.length === 0) return;

  // Fetch all lessons for affected students to count HW debts
  const uid = updatedLesson.tutorId || getCurrentUserId();
  const allLessons = await pb.collection("lessons").getFullList({
    filter: `tutorId = "${uid}"`,
  });

  // Merge in the updated lesson so count is based on fresh data
  const merged = allLessons.map((l) =>
    l.id === lessonId ? { ...l, ...updatedLesson } : l
  );

  const today = new Date().toISOString().split("T")[0];
  const pastLessons = merged.filter((l) => l.date < today);

  const updates = studentIds.map(async (sid) => {
    const debtCount = pastLessons.filter((l) => {
      const hw =
        typeof l.homework === "string"
          ? l.homework
          : l.homework?.text || "";
      if (!hw.trim()) return false;
      if (l.type === "individual")
        return (
          l.studentId === sid && !(l.hwDoneBy || []).includes(sid)
        );
      if (l.type === "group") {
        const inGroup = l.groupId === updatedLesson.groupId;
        return inGroup && !(l.hwDoneBy || []).includes(sid);
      }
      return false;
    }).length;

    await pb.collection("students").update(sid, { hwDebtCount: debtCount });
  });

  await Promise.all(updates);
  invalidateCache("students");
}

/**
 * Delete a lesson.
 * @param {string} id
 * @returns {Promise<void>}
 */


// ═══════════════════════════════════════════════════════════════════════════
// PAYMENTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get payments, optionally filtered by tutorId or studentId.
 * @param {{ tutorId?: string, studentId?: string }} [filters]
 * @returns {Promise<object[]>}
 */
export async function getPaymentsPaginated({ page = 1, limit = 50, tutorId, studentId } = {}) {
  const uid = tutorId || getCurrentUserId();
  let filterParts = [];
  if (uid) filterParts.push(`tutorId = "${uid}"`);
  if (studentId) filterParts.push(`studentId = "${studentId}"`);
  
  const filter = filterParts.length > 0 ? filterParts.join(" && ") : "";

  // getList returns { page, perPage, totalItems, totalPages, items: [...] }
  const res = await pb.collection("payments").getList(page, limit, {
    filter,
    sort: "-paidAt",
  });
  return res;
}

export async function getPayments({ tutorId, studentId, dateFrom, dateTo } = {}) {
  const uid = tutorId || getCurrentUserId();
  let filterParts = [];
  if (uid) filterParts.push(`tutorId = "${uid}"`);
  if (studentId) filterParts.push(`studentId = "${studentId}"`);
  if (dateFrom) filterParts.push(`paidAt >= "${dateFrom}"`);
  if (dateTo) filterParts.push(`paidAt <= "${dateTo}"`);
  
  const filter = filterParts.length > 0 ? filterParts.join(" && ") : "";

  return await pb.collection("payments").getFullList({
    filter,
    sort: "-paidAt",
  });
}

/**
 * Add a payment record.
 * @param {object} data — { tutorId, studentId, amount, currency, paidAt, note, ... }
 * @returns {Promise<string>} new record ID
 */
export async function addPayment(data) {
  try {
    if (!data.tutorId) {
      data.tutorId = pb.authStore.model?.id;
    }

    invalidateCache("payments");
    invalidateCache("students");
    const record = await pb.collection("payments").create({
      ...data,
      currency: data.currency ?? "RUB",
    });

    if (data.studentId && data.amount) {
      const amount = Number(data.amount);
      const student = await safeGetOne("students", data.studentId);
      if (student) {
        await pb.collection("students").update(data.studentId, {
          balance: (student.balance || 0) + amount,
          ltv: (student.ltv || 0) + amount,
        });
      }
    }

    return record.id;
  } catch (err) {
    console.error('[addPayment]', err);
    throw err;
  }
}

/**
 * Update a payment record.
 * @param {string} id
 * @param {object} data
 * @returns {Promise<void>}
 */
export async function updatePayment(id, data) {
  try {
    invalidateCache("payments");
    invalidateCache("students");

    // Fix #2: When the payment amount changes, compute the delta and apply it
    if (data.amount !== undefined) {
      const oldData = await safeGetOne("payments", id);
      if (oldData) {
        const oldAmount = Number(oldData.amount) || 0;
        const newAmount = Number(data.amount) || 0;
        const delta = newAmount - oldAmount;
        if (delta !== 0 && oldData.studentId) {
          const student = await safeGetOne("students", oldData.studentId);
          if (student) {
            await pb.collection("students").update(oldData.studentId, {
              balance: (student.balance || 0) + delta,
              ltv: (student.ltv || 0) + delta,
            });
          }
        }
      }
    }

    await pb.collection("payments").update(id, data);
  } catch (err) {
    console.error('[updatePayment]', err);
    throw err;
  }
}

/**
 * Delete a payment record.
 * Reverts the student's balance by the payment amount.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function deletePayment(id) {
  try {
    invalidateCache("payments");
    invalidateCache("students");

    // Fix #1: Read the payment before deleting to roll back the student's balance.
    const payData = await safeGetOne("payments", id);
    
    await pb.collection("payments").delete(id);

    if (payData) {
      const amount = Number(payData.amount) || 0;
      if (amount !== 0 && payData.studentId) {
        const student = await safeGetOne("students", payData.studentId);
        if (student) {
          await pb.collection("students").update(payData.studentId, {
            balance: (student.balance || 0) - amount,
            ltv: (student.ltv || 0) - amount,
          });
        }
      }
    }
  } catch (err) {
    console.error('[deletePayment]', err);
    throw err;
  }
}

/**
 * Recalculate a student's balance from scratch using payments and conducted lessons.
 * If the stored balance differs from the calculated one, silently correct it.
 *
 * @param {string} studentId
 * @returns {Promise<{ stored: number, calculated: number, corrected: boolean }>}
 */


// ── Configuration ─────────────────────────────────────────────────────────

export async function getUserConfig(uid) {
  const currentUid = uid || getCurrentUserId();
  if (!currentUid) return null;
  if (cache.config) return cache.config;

  try {
    const records = await pb.collection("user_config").getFullList({
      filter: `userId = "${currentUid}"`,
    });

    if (records.length > 0) {
      const res = records[0];
      if (!res.dashboardMetrics) {
        res.dashboardMetrics = [
          "todayCount",
          "activeStudentsCount",
          "hoursWorkedThisMonth",
          "incomeMonth",
        ];
      }
      cache.config = res;
      return res;
    }
  } catch {
    // Fall through to defaults
  }

  const defaults = {
    theme: "light",
    timezone: "Europe/Moscow",
    currency: "RUB",
    workingDays: [1, 2, 3, 4, 5],
    scheduleColorBy: "subject",
    requisites: "",
    dashboardMetrics: [
      "todayCount",
      "activeStudentsCount",
      "hoursWorkedThisMonth",
      "incomeMonth",
    ],
  };
  cache.config = defaults;
  return defaults;
}

/**
 * Update user configuration
 * @param {string} uid
 * @param {Object} data
 * @returns {Promise<void>}
 */
export async function updateUserConfig(uid, data) {
  const currentUid = uid || getCurrentUserId();
  if (!currentUid) return;
  invalidateCache("config");

  try {
    // Try to find existing config
    const records = await pb.collection("user_config").getFullList({
      filter: `userId = "${currentUid}"`,
    });

    if (records.length > 0) {
      // Update existing
      await pb.collection("user_config").update(records[0].id, data);
    } else {
      // Create new
      await pb.collection("user_config").create({
        ...data,
        userId: currentUid,
      });
    }
  } catch (err) {
    console.error("[updateUserConfig] Error:", err);
    throw err;
  }
}

// ── Community News ────────────────────────────────────────────────────────

/**
 * getCommunityNews()
 * ─────────────────────────────────────────────────────────────────────────
 * Fetches the latest post from the community_news collection in PocketBase.
 * The Telegram bot writes news to this collection.
 *
 * Returns:
 *   { id, text, date, channelName, postUrl } on success
 *   null on any error (caller shows graceful fallback)
 *
 * @returns {Promise<CommunityPost|null>}
 */

// Client-side in-memory cache so rapid re-renders don't trigger extra fetches
const _newsCache = { data: null, fetchedAt: 0 };
const _NEWS_CACHE_TTL = 5 * 60 * 1000; // 5 min

export async function getCommunityNews() {
  // Cache hit?
  const now = Date.now();
  if (
    _newsCache.data !== undefined &&
    now - _newsCache.fetchedAt < _NEWS_CACHE_TTL
  ) {
    return _newsCache.data;
  }

  try {
    const records = await pb.collection("community_news").getList(1, 1, {
      sort: "-id",
    });

    if (records.items.length > 0) {
      const post = records.items[0];
      const postData = {
        id: post.messageId || post.id,
        text: post.text || "",
        date: post.created,
        channelName: post.channelName || "tochilka_online",
        postUrl: post.postUrl || "",
        imageData: post.imageData || null,
        isVideo: post.isVideo || false,
      };
      _newsCache.data = postData;
      _newsCache.fetchedAt = now;
      return postData;
    }

    _newsCache.data = null;
    _newsCache.fetchedAt = now;
    return null;
  } catch {
    // Network error, timeout — handled silently
    return null;
  }
}
