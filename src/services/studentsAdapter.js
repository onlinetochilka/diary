/**
 * studentsAdapter.js — Students Domain Adapter
 * ─────────────────────────────────────────────────────────────────────────────
 * Паттерн: Адаптер. Весь доступ к данным студентов для нового UI идёт через
 * этот файл. UI-компоненты никогда не импортируют Firestore напрямую.
 *
 * Принцип изоляции:
 *   - Логика нормализации и валидации схемы — здесь.
 *   - Делегация к Firestore — через реэкспорт из database.js.
 *   - Mock-данные — для разработки и тестов без БД.
 *
 * ─────────────────────────────────────────────────────────────────────────────
 * СХЕМА ОБЪЕКТА СТУДЕНТА (StudentRecord)
 * ─────────────────────────────────────────────────────────────────────────────
 *
 * Плоские поля (скалярные, быстрый доступ):
 * ┌──────────────────────┬──────────────────────────────────────────────────┐
 * │ Поле                 │ Описание                                         │
 * ├──────────────────────┼──────────────────────────────────────────────────┤
 * │ id          string   │ Firestore Document ID                            │
 * │ tutorId     string   │ UID репетитора-владельца                         │
 * │ name        string   │ Полное имя (обязательно)                         │
 * │ gender      string   │ 'male' | 'female' | 'unknown'                    │
 * │ grade       string   │ Класс / возраст ('9 класс', '14 лет', …)         │
 * │ timezone    string   │ IANA или readable ('UTC+3 (Москва)')             │
 * │ balance     number   │ Текущий баланс в рублях (< 0 = должник)          │
 * │ ltv         number   │ Lifetime Value: сумма всех оплат за всё время    │
 * │ isArchived  boolean  │ true → скрыт из основной базы                    │
 * │ colorOklch  object   │ { l, c, h } — OKLCH-цвет для аватара/бейджа      │
 * │ createdAt   any      │ Firestore serverTimestamp                         │
 * │ updatedAt   any      │ Firestore serverTimestamp                         │
 * └──────────────────────┴──────────────────────────────────────────────────┘
 *
 * Вложенные поля (вариативные структуры):
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ contacts: {                                                              │
 * │   billingTo: 'student' | 'parent',   ← кто платит                       │
 * │   channel:   ContactChannel,         ← основной канал связи             │
 * │   parentName:   string,              ← имя родителя (если billingTo=…)  │
 * │   parentGender: 'male'|'female'|'unknown',                              │
 * │   autoRemind: boolean,               ← авто-напоминание об оплате       │
 * │ }                                                                        │
 * │                                                                          │
 * │ ContactChannel: {                                                        │
 * │   type:  'telegram'|'whatsapp'|'max'|'vk'|'email'|'phone'|'none',       │
 * │   value: string,                     ← @username / номер / email        │
 * │ }                                                                        │
 * │                                                                          │
 * │ subjects: SubjectRecord[]   ← массив предметов (≥ 1 у инд. учеников)   │
 * │                                                                          │
 * │ SubjectRecord: {                                                         │
 * │   id:                  string,       ← локальный nanoid                 │
 * │   name:                string,       ← 'Математика', 'Физика', …        │
 * │   format:              'online'|'offline',                               │
 * │   price:               number,       ← руб/урок                         │
 * │   duration:            number,       ← минут                            │
 * │   paymentType:         'per_lesson'|'subscription',                     │
 * │   subscriptionLessons: number|null,  ← кол-во уроков в абонементе       │
 * │   programs:            ProgramSnap[], ← снапшоты назначенных программ   │
 * │   completedTopics:     Record<programId, topicId[]>,                    │
 * │   stats: {                                                               │
 * │     attendanceRate: number,                                              │
 * │     cancellationsCount: number,                                          │
 * │     homeworkRate: number,                                                │
 * │   }                                                                      │
 * │ }                                                                        │
 * │                                                                          │
 * │ ProgramSnap: {                                                           │
 * │   id:        string,   ← ID глобальной программы                        │
 * │   name:      string,   ← снапшот имени                                  │
 * │   progress:  number,   ← 0-100 (вычисляется клиентом)                   │
 * │   colorOklch: object,  ← синхронизируется с мастер-программой           │
 * │ }                                                                        │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * Вычисляемые поля (добавляются нормализатором, НЕ хранятся в БД):
 *   _isDebtor    boolean   balance < 0
 *   _primarySubject  SubjectRecord | null   первый предмет в массиве
 *   _extraSubjectsCount  number   max(0, subjects.length - 1)
 *   _initials    string   первые буквы имени/фамилии
 */

import {
  getStudents,
  getStudent,
  addStudent,
  updateStudent,
  deleteStudent,
} from "./database.js";

// ── Утилиты ──────────────────────────────────────────────────────────────────

/** Генерирует короткий локальный ID (не Firestore ID) */
const generateId = () => Math.random().toString(36).substring(2, 9);

/**
 * Вычисляет инициалы из полного имени.
 * «Александр Пушкин» → «АП», «Малала» → «МА»
 */
export function getStudentInitials(name = "") {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return "??";
}

/**
 * Форматирует баланс для отображения в бейдже.
 * @returns {{ label: string, isDebtor: boolean }}
 */
export function formatBalance(balance = 0) {
  const abs = Math.abs(balance).toLocaleString("ru-RU");
  if (balance > 0) return { label: `+${abs} ₽`, isDebtor: false };
  if (balance < 0) return { label: `−${abs} ₽`, isDebtor: true };
  return { label: "0 ₽", isDebtor: false };
}

/**
 * Вычисляет прогресс программы на основе completedTopics.
 * @param {ProgramSnap} programSnap
 * @param {Record<string, string[]>} completedTopics
 * @returns {number} 0–100
 */
export function calcProgramProgress(programSnap, completedTopics = {}) {
  const total = programSnap.topics?.length ?? 0;
  if (total === 0) return 0;
  const done = (completedTopics[programSnap.id] ?? []).length;
  return Math.round((done / total) * 100);
}

// ── Нормализатор ─────────────────────────────────────────────────────────────

/**
 * normalizeStudent — принимает «сырой» объект из Firestore (или mock)
 * и возвращает нормализованный StudentRecord с вычисляемыми полями.
 *
 * Гарантии:
 *   - Все поля присутствуют (с дефолтами, если отсутствуют).
 *   - Вычисляемые поля (_isDebtor, _primarySubject, …) добавлены.
 *   - Старый формат contacts (строка вместо объекта) — конвертирован.
 *
 * @param {object} raw — объект из Firestore
 * @returns {StudentRecord}
 */
export function normalizeStudent(raw) {
  const subjects = (raw.subjects || []).map((s) => ({
    id: s.id || generateId(),
    name: s.name || "",
    format: s.format || "online",
    price: Number(s.price) || 0,
    duration: Number(s.duration) || 60,
    paymentType: s.paymentType || "per_lesson",
    subscriptionLessons: s.subscriptionLessons ? Number(s.subscriptionLessons) : null,
    lockedLessonPrice: s.lockedLessonPrice ? Number(s.lockedLessonPrice) : null,
    programs: (s.programs || []).map((p) => ({
      id: p.id,
      name: p.name || "",
      topics: p.topics || [],
      colorOklch: p.colorOklch || null,
    })),
    completedTopics: s.completedTopics || {},
    stats: {
      attendanceRate: s.stats?.attendanceRate ?? (raw.stats?.attendanceRate ?? null),
      cancellationsCount: s.stats?.cancellationsCount ?? (raw.stats?.cancellationsCount ?? 0),
      homeworkRate: s.stats?.homeworkRate ?? (raw.stats?.homeworkRate ?? null),
      pendingHomeworks: s.stats?.pendingHomeworks ?? 0,
    },
  }));

  // Нормализуем contacts: поддерживаем и старый, и новый формат
  const rawContacts = raw.contacts || {};
  
  let parents = rawContacts.parents || [];
  // Migrate legacy flat parent fields if parents array is empty but legacy fields exist
  if (parents.length === 0 && (rawContacts.parentName || rawContacts.parent || rawContacts.parentContact)) {
    parents = [{
      name: rawContacts.parentName || "",
      gender: rawContacts.parentGender || "unknown",
      channel: {
        type: "telegram",
        value: rawContacts.parent || rawContacts.parentContact || ""
      }
    }];
  }

  const contacts = {
    billingTo: rawContacts.billingTo || "student",
    studentChannels: rawContacts.studentChannels && rawContacts.studentChannels.length > 0 
      ? rawContacts.studentChannels 
      : (rawContacts.channel || rawContacts.student 
          ? [{ type: rawContacts.channel?.type || "telegram", value: rawContacts.channel?.value || rawContacts.student || "" }]
          : [{ type: "telegram", value: "" }]),
    parents, // Array of { name, gender, channel }
    autoRemind: rawContacts.autoRemind || false,
  };

  const balance = Number(raw.balance) || 0;
  const primarySubject = subjects[0] || null;

  return {
    // ── Идентификатор ──
    id: raw.id || null,
    tutorId: raw.tutorId || null,

    // ── Плоские поля ──
    name: raw.name || "Без имени",
    gender: raw.gender || raw.studentGender || "unknown",
    grade: raw.grade || "",
    timezone: raw.timezone || "UTC+3 (Москва)",
    balance,
    ltv: Number(raw.ltv) || 0,
    isArchived: raw.isArchived || false,
    colorOklch: raw.colorOklch || null,
    colorVersion: raw.colorVersion || 0,
    globalColorVersion: raw.globalColorVersion || 0,
    createdAt: raw.createdAt || null,
    updatedAt: raw.updatedAt || null,

    // ── Вложенные поля ──
    contacts,
    subjects,
    stats: {
      attendanceRate: raw.stats?.attendanceRate ?? null, // Глобальный фоллбэк, если нужно
      cancellationsCount: raw.stats?.cancellationsCount ?? 0,
      homeworkRate: raw.stats?.homeworkRate ?? null,
      conductedHours: raw.stats?.conductedHours ?? 0,
      pendingHomeworks: 0,
    },

    // ── Вычисляемые поля (не хранятся в БД) ──
    _isDebtor: balance < 0,
    _primarySubject: primarySubject,
    _extraSubjectsCount: Math.max(0, subjects.length - 1),
    _initials: getStudentInitials(raw.name),
  };
}

/**
 * denormalizeStudent — убирает вычисляемые поля перед сохранением в Firestore.
 * @param {StudentRecord} normalized
 * @returns {object} чистый объект для Firestore
 */
export function denormalizeStudent(normalized) {
  const {
    // eslint-disable-next-line no-unused-vars
    _isDebtor, _primarySubject, _extraSubjectsCount, _initials,
    stats, globalColorVersion, createdAt, updatedAt,
    ...firestoreData
  } = normalized;
  return firestoreData;
}

// ── Публичный API адаптера ────────────────────────────────────────────────────

/**
 * Получить всех студентов репетитора, нормализованных.
 * @param {string} [tutorId]
 * @returns {Promise<StudentRecord[]>}
 */
export async function fetchStudents(tutorId) {
  const raw = await getStudents(tutorId);
  return raw.map(normalizeStudent);
}

/**
 * Получить одного студента по ID, нормализованного.
 * @param {string} id
 * @returns {Promise<StudentRecord|null>}
 */
export async function fetchStudent(id) {
  const raw = await getStudent(id);
  return raw ? normalizeStudent(raw) : null;
}

/**
 * Создать нового студента. Принимает частичный объект, нормализует и сохраняет.
 * @param {Partial<StudentRecord>} data
 * @returns {Promise<string>} новый Firestore ID
 */
export async function createStudent(data) {
  const normalized = normalizeStudent({ ...createEmptyStudent(), ...data });
  const firestoreData = denormalizeStudent(normalized);
  return addStudent(firestoreData);
}

/**
 * Обновить студента. Принимает частичный patch-объект.
 * @param {string} id
 * @param {Partial<StudentRecord>} patch
 * @returns {Promise<void>}
 */
export async function patchStudent(id, patch) {
  const clean = denormalizeStudent(patch);
  return updateStudent(id, clean);
}

/**
 * Удалить студента.
 * @param {string} id
 * @returns {Promise<void>}
 */
export async function removeStudent(id) {
  return deleteStudent(id);
}

// ── Фабрика пустого студента ─────────────────────────────────────────────────

/**
 * createEmptyStudent — возвращает объект с дефолтами для новой формы.
 * @returns {Partial<StudentRecord>}
 */
export function createEmptyStudent() {
  return {
    name: "",
    gender: "unknown",
    grade: "",
    timezone: "UTC+3 (Москва)",
    balance: 0,
    ltv: 0,
    isArchived: false,
    contacts: {
      billingTo: "student",
      studentChannels: [{ type: "telegram", value: "" }],
      parents: [],
      autoRemind: false,
    },
    stats: {
      attendanceRate: null,
      cancellationsCount: 0,
      homeworkRate: null,
      conductedHours: 0,
    },
    subjects: [createEmptySubject()],
  };
}

/**
 * createEmptySubject — дефолтный пустой предмет для добавления в форму.
 * @returns {SubjectRecord}
 */
export function createEmptySubject() {
  return {
    id: generateId(),
    name: "",
    format: "online",
    price: 0,
    duration: 60,
    paymentType: "per_lesson",
    subscriptionLessons: null,
    programs: [],
    completedTopics: {},
    stats: {
      attendanceRate: null,
      cancellationsCount: 0,
      homeworkRate: null,
    }
  };
}

// ── Mock-данные (для разработки и тестирования нового UI) ────────────────────

export const MOCK_STUDENTS = [
  // ── 1. Стандартный ученик, должник, один предмет с программой ───────────
  normalizeStudent({
    id: "mock_001",
    tutorId: "tutor_demo",
    name: "Александр Пушкин",
    gender: "male",
    grade: "11 класс",
    timezone: "UTC+3 (Москва)",
    balance: -3200,
    ltv: 48000,
    isArchived: false,
    colorOklch: { l: 0.7, c: 0.15, h: 270 },
    contacts: {
      billingTo: "parent",
      channel: { type: "telegram", value: "@pushkin_parent" },
      parentName: "Надежда Пушкина",
      parentGender: "female",
      parentContact: "+7 999 123-45-67",
      autoRemind: true,
    },
    stats: { conductedHours: 32 },
    subjects: [
      {
        id: "sub_001a",
        name: "Литература",
        format: "online",
        price: 1800,
        duration: 90,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [
          {
            id: "prog_lit_01",
            name: "ЕГЭ Литература 2026",
            topics: Array.from({ length: 24 }, (_, i) => ({ id: `t${i}`, title: `Тема ${i + 1}` })),
            colorOklch: { l: 0.65, c: 0.2, h: 30 },
          },
        ],
        completedTopics: { prog_lit_01: ["t0", "t1", "t2", "t3", "t4", "t5"] },
        stats: { attendanceRate: 92, cancellationsCount: 1, homeworkRate: 85 },
      },
    ],
  }),

  // ── 2. Ученица с положительным балансом, два предмета ────────────────────
  normalizeStudent({
    id: "mock_002",
    tutorId: "tutor_demo",
    name: "Анна Ахматова",
    gender: "female",
    grade: "10 класс",
    timezone: "UTC+3 (Москва)",
    balance: 6500,
    ltv: 92000,
    isArchived: false,
    colorOklch: { l: 0.72, c: 0.18, h: 180 },
    contacts: {
      billingTo: "student",
      channel: { type: "whatsapp", value: "+7 916 234-56-78" },
      parentName: "",
      parentGender: "unknown",
      parentContact: "",
      autoRemind: false,
    },
    stats: { conductedHours: 40 },
    subjects: [
      {
        id: "sub_002a",
        name: "Русский язык",
        format: "online",
        price: 1500,
        duration: 60,
        paymentType: "subscription",
        subscriptionLessons: 8,
        programs: [
          {
            id: "prog_rus_01",
            name: "Русский язык ЕГЭ 2026",
            topics: Array.from({ length: 30 }, (_, i) => ({ id: `r${i}`, title: `Урок ${i + 1}` })),
            colorOklch: { l: 0.68, c: 0.16, h: 220 },
          },
        ],
        completedTopics: { prog_rus_01: Array.from({ length: 18 }, (_, i) => `r${i}`) },
        stats: { attendanceRate: 100, cancellationsCount: 0, homeworkRate: 100 },
      },
      {
        id: "sub_002b",
        name: "Литература",
        format: "offline",
        price: 2000,
        duration: 90,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 85, cancellationsCount: 2, homeworkRate: 70 },
      },
    ],
  }),

  // ── 3. Ученик с нулевым балансом, без программы ──────────────────────────
  normalizeStudent({
    id: "mock_003",
    tutorId: "tutor_demo",
    name: "Михаил Булгаков",
    gender: "male",
    grade: "Взрослый",
    timezone: "UTC+5 (Екатеринбург)",
    balance: 0,
    ltv: 24000,
    isArchived: false,
    colorOklch: { l: 0.75, c: 0.12, h: 60 },
    contacts: {
      billingTo: "student",
      channel: { type: "telegram", value: "@bulgakov_m" },
      parentName: "",
      parentGender: "unknown",
      parentContact: "",
      autoRemind: false,
    },
    stats: { conductedHours: 15 },
    subjects: [
      {
        id: "sub_003a",
        name: "История",
        format: "online",
        price: 1200,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 85, cancellationsCount: 3, homeworkRate: 50 },
      },
    ],
  }),

  // ── 4. Ученица с большим положительным балансом, три предмета ────────────
  normalizeStudent({
    id: "mock_004",
    tutorId: "tutor_demo",
    name: "Ада Лавлейс",
    gender: "female",
    grade: "9 класс",
    timezone: "UTC+3 (Москва)",
    balance: 12800,
    ltv: 156000,
    isArchived: false,
    colorOklch: { l: 0.66, c: 0.22, h: 310 },
    contacts: {
      billingTo: "parent",
      channel: { type: "email", value: "lovelace.parent@gmail.com" },
      parentName: "Байрон Лавлейс",
      parentGender: "male",
      parentContact: "lovelace.parent@gmail.com",
      autoRemind: true,
    },
    stats: { conductedHours: 110 },
    subjects: [
      {
        id: "sub_004a",
        name: "Информатика",
        format: "offline",
        price: 2500,
        duration: 90,
        paymentType: "subscription",
        subscriptionLessons: 4,
        programs: [
          {
            id: "prog_cs_01",
            name: "Алгоритмы и структуры данных",
            topics: Array.from({ length: 20 }, (_, i) => ({ id: `cs${i}`, title: `Тема ${i + 1}` })),
            colorOklch: { l: 0.7, c: 0.18, h: 140 },
          },
        ],
        completedTopics: { prog_cs_01: Array.from({ length: 15 }, (_, i) => `cs${i}`) },
        stats: { attendanceRate: 100, cancellationsCount: 0, homeworkRate: 100, pendingHomeworks: 2 },
      },
      {
        id: "sub_004b",
        name: "Математика",
        format: "online",
        price: 2000,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 95, cancellationsCount: 1, homeworkRate: 80 },
      },
      {
        id: "sub_004c",
        name: "Физика",
        format: "online",
        price: 1800,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 70, cancellationsCount: 4, homeworkRate: 30 },
      },
    ],
  }),

  // ── 5. Должник с длинным именем (тест .truncate в тайле) ─────────────────
  normalizeStudent({
    id: "mock_005",
    tutorId: "tutor_demo",
    name: "Уильям Шекспир Старший Эсквайр",
    gender: "male",
    grade: "8 класс",
    timezone: "UTC+3 (Москва)",
    balance: -750,
    ltv: 18000,
    isArchived: false,
    colorOklch: { l: 0.73, c: 0.14, h: 30 },
    contacts: {
      billingTo: "parent",
      channel: { type: "vk", value: "vk.com/shakespeare_dad" },
      parentName: "Джон Шекспир",
      parentGender: "male",
      parentContact: "vk.com/shakespeare_dad",
      autoRemind: true,
    },
    stats: { conductedHours: 18 },
    subjects: [
      {
        id: "sub_005a",
        name: "Английский язык",
        format: "online",
        price: 1000,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 90, cancellationsCount: 1, homeworkRate: 100 },
      },
    ],
  }),

  // ── 6. Ученица, активная программа с прогрессом ───────────────────────────
  normalizeStudent({
    id: "mock_006",
    tutorId: "tutor_demo",
    name: "Исаак Ньютон",
    gender: "male",
    grade: "11 класс",
    timezone: "UTC+3 (Москва)",
    balance: 8540,
    ltv: 85000,
    isArchived: false,
    colorOklch: { l: 0.69, c: 0.16, h: 200 },
    contacts: {
      billingTo: "student",
      channel: { type: "telegram", value: "@newton_ис" },
      parentName: "",
      parentGender: "unknown",
      parentContact: "",
      autoRemind: false,
    },
    stats: { conductedHours: 56 },
    subjects: [
      {
        id: "sub_006a",
        name: "Физика",
        format: "online",
        price: 1500,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [
          {
            id: "prog_phys_01",
            name: "Интенсив Механика",
            topics: Array.from({ length: 8 }, (_, i) => ({ id: `ph${i}`, title: `Урок ${i + 1}` })),
            colorOklch: { l: 0.67, c: 0.19, h: 260 },
          },
        ],
        completedTopics: { prog_phys_01: ["ph0", "ph1"] },
        stats: { attendanceRate: 100, cancellationsCount: 0, homeworkRate: 100 },
      },
    ],
  }),

  // ── 7. Архивированный студент (должен попадать в таб «Архив») ─────────────
  normalizeStudent({
    id: "mock_007",
    tutorId: "tutor_demo",
    name: "Николай Гоголь",
    gender: "male",
    grade: "Выпускник",
    timezone: "UTC+3 (Москва)",
    balance: 0,
    ltv: 34000,
    isArchived: true,
    colorOklch: { l: 0.6, c: 0.08, h: 0 },
    contacts: {
      billingTo: "student",
      channel: { type: "none", value: "" },
      parentName: "",
      parentGender: "unknown",
      parentContact: "",
      autoRemind: false,
    },
    stats: { conductedHours: 28 },
    subjects: [
      {
        id: "sub_007a",
        name: "Русский язык",
        format: "online",
        price: 1200,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 80, cancellationsCount: 5, homeworkRate: 60 },
      },
    ],
  }),

  // ── 8. Ученица, VK-канал, абонемент, должник ─────────────────────────────
  normalizeStudent({
    id: "mock_008",
    tutorId: "tutor_demo",
    name: "Марина Цветаева",
    gender: "female",
    grade: "10 класс",
    timezone: "UTC+3 (Москва)",
    balance: -524,
    ltv: 28400,
    isArchived: false,
    colorOklch: { l: 0.71, c: 0.17, h: 350 },
    contacts: {
      billingTo: "student",
      channel: { type: "vk", value: "vk.com/tsvetaeva_m" },
      parentName: "",
      parentGender: "unknown",
      parentContact: "",
      autoRemind: false,
    },
    stats: { conductedHours: 20 },
    subjects: [
      {
        id: "sub_008a",
        name: "Литература",
        format: "offline",
        price: 1400,
        duration: 60,
        paymentType: "subscription",
        subscriptionLessons: 4,
        programs: [],
        completedTopics: {},
        stats: { attendanceRate: 95, cancellationsCount: 1, homeworkRate: 90 },
      },
    ],
  }),
].map(normalizeStudent); // двойная нормализация — идемпотентна, для надёжности

export const MOCK_PROGRAMS = [
  { id: 'p1', name: 'ЕГЭ Профиль 2026', topics: 40, colorOklch: { l: 0.6, c: 0.15, h: 250 } },
  { id: 'p2', name: 'ОГЭ База', topics: 25, colorOklch: { l: 0.6, c: 0.15, h: 200 } },
  { id: 'p3', name: 'Олимпиада Физтех', topics: 15, colorOklch: { l: 0.5, c: 0.2, h: 300 } }
];
