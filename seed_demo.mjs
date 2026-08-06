/**
 * seed_demo.mjs — Расширенный сид-скрипт для демо-базы Точилки
 * ─────────────────────────────────────────────────────────────────────────────
 * Запуск:
 *   node seed_demo.mjs [email] [password]
 *
 * По умолчанию: email=demo@tochilka.app, password=Demo12345!
 *
 * Что делает:
 *   1. Авторизуется под указанным аккаунтом (или создаёт новый)
 *   2. Удаляет все существующие данные этого репетитора
 *   3. Создаёт 4 программы обучения
 *   4. Создаёт 20 реалистичных учеников с разными характеристиками
 *   5. Создаёт 5 групп
 *   6. Генерирует плотное расписание: неделя назад + текущая + следующая
 *   7. Добавляет заметки к урокам, разные статусы ДЗ
 *   8. Генерирует историю платежей с разными статусами балансов
 *   9. Корректирует балансы учеников
 */

import PocketBase from "pocketbase";

const PB_URL = process.env.POCKETBASE_URL || "https://api.tochilka.app";
const DEFAULT_EMAIL = process.argv[2] || process.env.DEMO_EMAIL || "demo@tochilka.app";
const DEFAULT_PASS  = process.argv[3] || process.env.DEMO_PASSWORD;

if (!DEFAULT_PASS) {
  console.error("Error: DEMO_PASSWORD is not set. Pass it as an argument or set the environment variable.");
  process.exit(1);
}

const pb = new PocketBase(PB_URL);
pb.autoCancellation(false);

// ─── Утилиты ──────────────────────────────────────────────────────────────────

const rnd = (arr) => arr[Math.floor(Math.random() * arr.length)];
const rndInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

function fmtDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getMondayOf(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function genId() {
  return Math.random().toString(36).slice(2, 9);
}

// OKLCH цвета: набор 20 ярких различных цветов
const COLORS_POOL = [
  { l: 0.62, c: 0.19, h: 30  },   // оранжевый
  { l: 0.58, c: 0.22, h: 145 },   // зелёный
  { l: 0.55, c: 0.24, h: 265 },   // фиолетовый
  { l: 0.60, c: 0.21, h: 200 },   // голубой
  { l: 0.65, c: 0.20, h: 340 },   // розовый
  { l: 0.56, c: 0.23, h: 15  },   // красно-оранжевый
  { l: 0.61, c: 0.20, h: 170 },   // бирюзовый
  { l: 0.57, c: 0.22, h: 290 },   // сиреневый
  { l: 0.63, c: 0.18, h: 80  },   // жёлто-зелёный
  { l: 0.54, c: 0.24, h: 230 },   // синий
  { l: 0.66, c: 0.19, h: 55  },   // жёлтый
  { l: 0.59, c: 0.21, h: 310 },   // пурпурный
  { l: 0.62, c: 0.20, h: 185 },   // циановый
  { l: 0.60, c: 0.22, h: 0   },   // красный
  { l: 0.64, c: 0.19, h: 120 },   // светло-зелёный
  { l: 0.53, c: 0.25, h: 250 },   // индиго
  { l: 0.67, c: 0.18, h: 40  },   // янтарный
  { l: 0.58, c: 0.23, h: 160 },   // изумрудный
  { l: 0.55, c: 0.24, h: 280 },   // ультрафиолет
  { l: 0.63, c: 0.20, h: 330 },   // малиновый
  { l: 0.61, c: 0.21, h: 100 },   // лимонный
  { l: 0.56, c: 0.22, h: 215 },   // стальной синий
  { l: 0.65, c: 0.20, h: 25  },   // персиковый
  { l: 0.59, c: 0.23, h: 135 },   // хвойный
  { l: 0.52, c: 0.25, h: 270 },   // сапфировый
];

let colorIdx = 0;
function nextColor() {
  return COLORS_POOL[colorIdx++ % COLORS_POOL.length];
}

// ─── Очистка данных ───────────────────────────────────────────────────────────

async function clearAll(tutorId) {
  console.log("  Очистка старых данных...");
  const collections = ["lessons", "payments", "students", "groups", "programs"];
  for (const col of collections) {
    try {
      const records = await pb.collection(col).getFullList({
        filter: `tutorId = "${tutorId}"`,
        fields: "id",
      });
      const chunks = [];
      for (let i = 0; i < records.length; i += 20) {
        chunks.push(records.slice(i, i + 20));
      }
      for (const chunk of chunks) {
        await Promise.all(chunk.map((r) => pb.collection(col).delete(r.id)));
      }
      if (records.length > 0) {
        console.log(`    Удалено из ${col}: ${records.length}`);
      }
    } catch (e) {
      // pass
    }
  }
}

// ─── Seed ─────────────────────────────────────────────────────────────────────

async function seed(tutorId) {
  const now = new Date();
  const todayStr = fmtDate(now);
  const monday = getMondayOf(now);

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ПРОГРАММЫ
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📚 Создаём программы...");

  const programDefs = [
    {
      name: "Подготовка к ЕГЭ — Математика",
      subject: "Математика",
      topics: [
        { id: genId(), title: "Тригонометрия", isCompleted: false },
        { id: genId(), title: "Производные и интегралы", isCompleted: false },
        { id: genId(), title: "Стереометрия", isCompleted: false },
        { id: genId(), title: "Теория вероятностей", isCompleted: false },
        { id: genId(), title: "Параметры и ОДЗ", isCompleted: false },
        { id: genId(), title: "Теория чисел", isCompleted: false },
        { id: genId(), title: "Планиметрия", isCompleted: false },
        { id: genId(), title: "Уравнения и системы", isCompleted: false },
      ],
    },
    {
      name: "Физика: Механика и Термодинамика",
      subject: "Физика",
      topics: [
        { id: genId(), title: "Кинематика", isCompleted: false },
        { id: genId(), title: "Динамика (2-й закон Ньютона)", isCompleted: false },
        { id: genId(), title: "Законы сохранения", isCompleted: false },
        { id: genId(), title: "Статика и равновесие", isCompleted: false },
        { id: genId(), title: "Термодинамика", isCompleted: false },
        { id: genId(), title: "Молекулярная физика", isCompleted: false },
      ],
    },
    {
      name: "Разговорный английский B2",
      subject: "Английский язык",
      topics: [
        { id: genId(), title: "Времена глаголов", isCompleted: false },
        { id: genId(), title: "Артикли и предлоги", isCompleted: false },
        { id: genId(), title: "Условные предложения", isCompleted: false },
        { id: genId(), title: "Косвенная речь", isCompleted: false },
        { id: genId(), title: "Фразовые глаголы", isCompleted: false },
        { id: genId(), title: "Деловая переписка", isCompleted: false },
        { id: genId(), title: "Академическое письмо", isCompleted: false },
      ],
    },
    {
      name: "Русский язык ЕГЭ",
      subject: "Русский язык",
      topics: [
        { id: genId(), title: "Орфография: приставки и корни", isCompleted: false },
        { id: genId(), title: "Пунктуация: сложные случаи", isCompleted: false },
        { id: genId(), title: "Сочинение-рассуждение", isCompleted: false },
        { id: genId(), title: "Лексические нормы", isCompleted: false },
        { id: genId(), title: "Синтаксический разбор", isCompleted: false },
        { id: genId(), title: "Работа с текстом", isCompleted: false },
      ],
    },
    {
      name: "Химия: Базовый курс 10–11 кл.",
      subject: "Химия",
      topics: [
        { id: genId(), title: "Строение атома", isCompleted: false },
        { id: genId(), title: "Химическая связь", isCompleted: false },
        { id: genId(), title: "Окислительно-восстановительные реакции", isCompleted: false },
        { id: genId(), title: "Электролиз", isCompleted: false },
        { id: genId(), title: "Органическая химия: введение", isCompleted: false },
        { id: genId(), title: "Углеводороды", isCompleted: false },
      ],
    },
  ];

  const programs = [];
  for (const def of programDefs) {
    const colorOklch = nextColor();
    const rec = await pb.collection("programs").create({
      name: def.name,
      subject: def.subject,
      topics: def.topics,
      colorOklch,
      colorVersion: 2,
      tutorId,
    });
    programs.push({ id: rec.id, name: def.name, subject: def.subject, colorOklch, topics: def.topics });
    console.log(`  ✓ ${def.name}`);
  }

  const [pMath, pPhysics, pEnglish, pRussian, pChem] = programs;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. УЧЕНИКИ (20 штук — разные персонажи)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n👩‍🎓 Создаём учеников...");

  // Заметки: разные реалистичные ситуации
  const studentDefs = [
    // === Математика (ЕГЭ) ===
    {
      name: "Анна Соколова",          gender: "female", grade: "11 класс",
      subject: "Математика",          price: 1800,  program: pMath,
      completedTopics: 3,
      notes: "Готовится к ЕГЭ. Стабильно не сдаёт домашние задания. Нужно проработать тему производных.",
      role: "hw_debtor", // долг по ДЗ
    },
    {
      name: "Даниил Петров",          gender: "male",   grade: "11 класс",
      subject: "Математика",          price: 1800,  program: pMath,
      completedTopics: 1,
      notes: "Платит нерегулярно. Последние 2 урока не оплачены. Западает стереометрия.",
      role: "fin_debtor", // финансовый должник
    },
    {
      name: "Кирилл Морозов",         gender: "male",   grade: "10 класс",
      subject: "Математика",          price: 2000,  program: pMath,
      completedTopics: 2,
      notes: "Перспективный ученик. Хочет участвовать в олимпиадах. Быстро схватывает материал.",
      role: "good",
    },
    {
      name: "Диана Левина",           gender: "female", grade: "9 класс",
      subject: "Математика",          price: 1600,  program: pMath,
      completedTopics: 0,
      notes: "Новая ученица с сентября. Большой пробел по алгебре за 8 класс.",
      role: "new",
    },
    {
      name: "Тимур Ахметов",          gender: "male",   grade: "11 класс",
      subject: "Математика",          price: 1800,  program: pMath,
      completedTopics: 5,
      notes: "Планирует ВМК МГУ. Профиль сдаёт на 85+. Нужно добрать ещё 10 баллов.",
      role: "good",
    },

    // === Физика ===
    {
      name: "Максим Орлов",           gender: "male",   grade: "11 класс",
      subject: "Физика",              price: 2000,  program: pPhysics,
      completedTopics: 3,
      notes: "Готовится к олимпиаде по физике. Хорошо понимает механику, нужно подтянуть термодинамику.",
      role: "good",
    },
    {
      name: "Полина Ершова",          gender: "female", grade: "11 класс",
      subject: "Физика",              price: 2000,  program: pPhysics,
      completedTopics: 5,
      notes: "Самый сильный ученик в потоке. Планирует МФТИ. Всегда делает ДЗ досрочно.",
      role: "best",
    },
    {
      name: "Артём Зуев",             gender: "male",   grade: "10 класс",
      subject: "Физика",              price: 1700,  program: pPhysics,
      completedTopics: 0,
      notes: "Перешёл от другого репетитора. Базы почти нет. Начинаем с кинематики.",
      role: "weak",
    },
    {
      name: "Ольга Власова",          gender: "female", grade: "11 класс",
      subject: "Физика",              price: 1900,  program: pPhysics,
      completedTopics: 2,
      notes: "Регулярно пропускает занятия из-за болезни. Делаем более лёгкий темп.",
      role: "irregular",
    },

    // === Английский ===
    {
      name: "Виктория Лис",           gender: "female", grade: "Взрослый",
      subject: "Английский язык",     price: 2200,  program: pEnglish,
      completedTopics: 4,
      notes: "Готовится к переезду в Канаду. Нужен разговорный и деловой английский. Прогресс отличный.",
      role: "good",
    },
    {
      name: "Никита Волков",          gender: "male",   grade: "10 класс",
      subject: "Английский язык",     price: 1700,  program: pEnglish,
      completedTopics: 1,
      notes: "Готовится к ЕГЭ по английскому. Письмо слабовато, говорение на уровне.",
      role: "good",
    },
    {
      name: "Сабина Каримова",        gender: "female", grade: "9 класс",
      subject: "Английский язык",     price: 1600,  program: pEnglish,
      completedTopics: 2,
      notes: "Хочет сдать IELTS 6.5. Уровень B1+. Активная, задаёт много вопросов.",
      role: "good",
    },
    {
      name: "Алексей Громов",         gender: "male",   grade: "8 класс",
      subject: "Английский язык",     price: 1500,  program: pEnglish,
      completedTopics: 0,
      notes: "Новый ученик. Западают артикли и предлоги. Нужна системная работа с грамматикой.",
      role: "new",
    },

    // === Русский язык ===
    {
      name: "Мария Попова",           gender: "female", grade: "11 класс",
      subject: "Русский язык",        price: 1600,  program: pRussian,
      completedTopics: 3,
      notes: "ЕГЭ русский язык. Сочинение пишет на 22–23 из 25. Доводим до максимума.",
      role: "good",
    },
    {
      name: "Иван Беляев",            gender: "male",   grade: "11 класс",
      subject: "Русский язык",        price: 1600,  program: pRussian,
      completedTopics: 1,
      notes: "Много орфографических ошибок. Не читает, словарный запас бедный. Работаем с текстами.",
      role: "weak",
    },
    {
      name: "Алиса Краснова",         gender: "female", grade: "9 класс",
      subject: "Русский язык",        price: 1500,  program: pRussian,
      completedTopics: 2,
      notes: "Готовится к ОГЭ. Хорошо пишет, проблемы с заданиями на пунктуацию.",
      role: "good",
    },

    // === Химия ===
    {
      name: "Дмитрий Фролов",         gender: "male",   grade: "11 класс",
      subject: "Химия",               price: 2100,  program: pChem,
      completedTopics: 4,
      notes: "Планирует химфак. Очень сильный, задаёт нестандартные вопросы. Олимпиадный уровень.",
      role: "best",
    },
    {
      name: "Наташа Кузнецова",       gender: "female", grade: "10 класс",
      subject: "Химия",               price: 1700,  program: pChem,
      completedTopics: 1,
      notes: "Хочет пойти в медицину. Интересуется органической химией. Пропустила раздел про ОВР.",
      role: "good",
    },
    {
      name: "Роман Сидоров",          gender: "male",   grade: "11 класс",
      subject: "Химия",               price: 1800,  program: pChem,
      completedTopics: 2,
      notes: "Платит за полный месяц вперёд. Занимается дисциплинированно, но алгоритмическое мышление слабоватое.",
      role: "prepaid",
    },
    {
      name: "Елена Смирнова",         gender: "female", grade: "Взрослый",
      subject: "Химия",               price: 2000,  program: pChem,
      completedTopics: 0,
      notes: "Поступает в ординатуру. Нужно вспомнить неорганическую химию. Пришла по рекомендации.",
      role: "adult",
    },
  ];

  const students = [];
  for (const def of studentDefs) {
    const colorOklch = nextColor();

    const programSnap = {
      id: def.program.id,
      name: def.program.name,
      colorOklch: def.program.colorOklch,
      topics: def.program.topics.map((t, idx) => ({
        ...t,
        isCompleted: idx < def.completedTopics,
      })),
    };

    const subjectEntry = {
      id: genId(),
      name: def.subject,
      price: def.price,
      duration: rnd([45, 60, 90]),
      paymentType: rnd(["per_lesson", "per_lesson", "subscription"]),
      subscriptionLessons: null,
      programs: [programSnap],
    };

    const phone = `+7${rndInt(900, 999)}${String(rndInt(1000000, 9999999))}`;
    const rec = await pb.collection("students").create({
      name: def.name,
      studentGender: def.gender,
      grade: def.grade,
      subjects: [subjectEntry],
      phone,
      active: true,
      colorOklch,
      colorVersion: 2,
      balance: 0,
      notes: def.notes,
      tutorId,
    });

    students.push({
      id: rec.id,
      name: def.name,
      subject: def.subject,
      price: def.price,
      role: def.role,
    });
    console.log(`  ✓ ${def.name} (${def.subject}, ${def.price}₽)`);
  }

  const [
    stAnna, stDaniil, stKirill, stDiana, stTimur,  // Math
    stMaxim, stPolina, stArtem, stOlga,             // Physics
    stVika, stNikita, stSabina, stAlexey,           // English
    stMasha, stIvan, stAlisa,                        // Russian
    stDima, stNatasha, stRoman, stElena             // Chemistry
  ] = students;

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ГРУППЫ (5 штук)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n👥 Создаём группы...");

  const groupDefs = [
    {
      name: "ЕГЭ Математика — Поток А",
      subject: "Математика",
      price: 1200,
      studentIds: [stAnna.id, stDaniil.id, stKirill.id],
      program: pMath,
    },
    {
      name: "ЕГЭ Математика — Поток Б",
      subject: "Математика",
      price: 1300,
      studentIds: [stTimur.id, stDiana.id],
      program: pMath,
    },
    {
      name: "Олимпиадная физика",
      subject: "Физика",
      price: 1100,
      studentIds: [stMaxim.id, stPolina.id, stArtem.id],
      program: pPhysics,
    },
    {
      name: "Английский — Разговорный клуб",
      subject: "Английский язык",
      price: 1400,
      studentIds: [stVika.id, stNikita.id, stSabina.id],
      program: pEnglish,
    },
    {
      name: "Химия: ЕГЭ и Олимпиады",
      subject: "Химия",
      price: 1200,
      studentIds: [stDima.id, stNatasha.id, stRoman.id],
      program: pChem,
    },
  ];

  const groups = [];
  for (const def of groupDefs) {
    const colorOklch = nextColor();
    const rec = await pb.collection("groups").create({
      name: def.name,
      subject: def.subject,
      studentIds: def.studentIds,
      colorOklch,
      colorVersion: 2,
      programs: [{
        id: def.program.id,
        name: def.program.name,
        colorOklch: def.program.colorOklch,
        topics: def.program.topics,
      }],
      active: true,
      tutorId,
    });
    groups.push({
      id: rec.id,
      name: def.name,
      subject: def.subject,
      price: def.price,
      studentIds: def.studentIds,
    });
    console.log(`  ✓ ${def.name} (${def.studentIds.length} уч.)`);
  }

  const [grMathA, grMathB, grPhysics, grEnglish, grChem] = groups;

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. РАСПИСАНИЕ — 3 недели (назад + текущая + вперёд)
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📅 Генерируем расписание...");

  // Слоты времени
  const T = {
    A: ["09:00", "10:00"],
    B: ["10:00", "11:00"],
    C: ["11:30", "12:30"],
    D: ["13:00", "14:00"],
    E: ["14:00", "15:30"],   // 90 мин
    F: ["15:30", "16:30"],
    G: ["16:00", "17:00"],
    H: ["17:00", "18:00"],
    I: ["18:00", "19:00"],
    J: ["18:30", "20:00"],   // 90 мин
    K: ["19:00", "20:00"],
    L: ["10:30", "12:00"],   // 90 мин
  };

  // Шаблон недели: [dow 0=пн..6=вс]
  // Каждый слот: { entity, isGroup, price, time }
  const weekTemplate = [
    // Понедельник — насыщенный день
    [
      { entity: stMaxim,   isGroup: false, price: stMaxim.price,   time: T.A },
      { entity: stPolina,  isGroup: false, price: stPolina.price,  time: T.B },
      { entity: stAnna,    isGroup: false, price: stAnna.price,    time: T.C },
      { entity: grMathA,   isGroup: true,  price: grMathA.price,   time: T.G },
      { entity: stVika,    isGroup: false, price: stVika.price,    time: T.H },
      { entity: stDima,    isGroup: false, price: stDima.price,    time: T.K },
    ],
    // Вторник
    [
      { entity: stTimur,   isGroup: false, price: stTimur.price,   time: T.B },
      { entity: stNikita,  isGroup: false, price: stNikita.price,  time: T.D },
      { entity: stDaniil,  isGroup: false, price: stDaniil.price,  time: T.F },
      { entity: grPhysics, isGroup: true,  price: grPhysics.price, time: T.J },
      { entity: stRoman,   isGroup: false, price: stRoman.price,   time: T.K },
    ],
    // Среда
    [
      { entity: stKirill,  isGroup: false, price: stKirill.price,  time: T.A },
      { entity: stMasha,   isGroup: false, price: stMasha.price,   time: T.C },
      { entity: grMathB,   isGroup: true,  price: grMathB.price,   time: T.E },
      { entity: stAlexey,  isGroup: false, price: stAlexey.price,  time: T.H },
      { entity: grEnglish, isGroup: true,  price: grEnglish.price, time: T.I },
      { entity: stElena,   isGroup: false, price: stElena.price,   time: T.K },
    ],
    // Четверг
    [
      { entity: stPolina,  isGroup: false, price: stPolina.price,  time: T.A },
      { entity: stArtem,   isGroup: false, price: stArtem.price,   time: T.C },
      { entity: stSabina,  isGroup: false, price: stSabina.price,  time: T.D },
      { entity: stIvan,    isGroup: false, price: stIvan.price,    time: T.F },
      { entity: grChem,    isGroup: true,  price: grChem.price,    time: T.I },
      { entity: stNatasha, isGroup: false, price: stNatasha.price, time: T.K },
    ],
    // Пятница
    [
      { entity: stMaxim,   isGroup: false, price: stMaxim.price,   time: T.B },
      { entity: stAlisa,   isGroup: false, price: stAlisa.price,   time: T.D },
      { entity: stDiana,   isGroup: false, price: stDiana.price,   time: T.F },
      { entity: stOlga,    isGroup: false, price: stOlga.price,    time: T.G },
      { entity: stTimur,   isGroup: false, price: stTimur.price,   time: T.H },
    ],
    // Суббота
    [
      { entity: grMathA,   isGroup: true,  price: grMathA.price,   time: T.L },
      { entity: stDima,    isGroup: false, price: stDima.price,    time: T.D },
      { entity: stKirill,  isGroup: false, price: stKirill.price,  time: T.G },
    ],
    // Воскресенье — выходной (можно добавить пару занятий)
    [
      { entity: stVika,    isGroup: false, price: stVika.price,    time: T.C },
    ],
  ];

  // Разные домашние задания по предметам
  const homeworksBySubject = {
    "Математика": [
      "Решить задачи №1–5 из сборника Сканави (раздел 3.2)",
      "Разобрать пробный вариант ЕГЭ — задания 18–19",
      "Доделать упражнения по тригонометрии — стр. 47–49",
      "Прорешать 10 задач на производные (условие в чате)",
      "Написать разбор ошибок по прошлому тесту",
      "Повторить теоремы по планиметрии — §§ 5–7",
      "Решить 5 задач на параметры — подборка в телеграм",
      "Формулы двойного угла — выучить и сдать в начале урока",
    ],
    "Физика": [
      "Решить задачи по кинематике — задачник Иродова №1.1–1.15",
      "Составить шпаргалку по законам сохранения импульса",
      "Разобрать пробный вариант ЕГЭ по физике — часть 2",
      "Выучить формулы термодинамики (список в чате)",
      "Порешать задачи на второй закон Ньютона — подборка",
      "Написать конспект по молекулярно-кинетической теории",
    ],
    "Английский язык": [
      "Написать эссе «The impact of social media on teenagers» (250 слов)",
      "Выучить 20 фразовых глаголов из списка + составить предложения",
      "Прослушать TED talk и написать краткое summary",
      "Выполнить упражнения 4–7 из Grammar in Use (Unit 15)",
      "Прочитать статью и подготовить мнение для дискуссии",
      "Записать голосовое сообщение на 2 мин на тему прошлого урока",
    ],
    "Русский язык": [
      "Написать сочинение-рассуждение на тему «Честь и совесть» (240–260 слов)",
      "Выполнить задания 9–12 из сборника Цыбулько",
      "Переписать 5 предложений, расставив знаки препинания",
      "Выучить правила написания -н- и -нн- в разных частях речи",
      "Прочитать текст и выделить все причастные обороты",
      "Подготовить устный пересказ параграфа о синтаксисе",
    ],
    "Химия": [
      "Расставить коэффициенты в 8 уравнениях ОВР методом электронного баланса",
      "Составить схему цепочки превращений из задачника (стр. 78)",
      "Выучить ряд активности металлов и сдать наизусть",
      "Решить задачи на вычисление выхода реакции (подборка)",
      "Написать механизм реакции хлорирования метана",
    ],
  };

  // Заметки к урокам
  const lessonNotes = [
    "Разобрали 3 сложные задачи — ученик справился самостоятельно. Прогресс очевиден.",
    "Урок прошёл продуктивно. Новая тема усвоена, нужно закрепить на следующей неделе.",
    "Пришёл уставший после школы, первые 20 мин были неэффективны. Нужно перенести на более ранее время.",
    "Отличный урок! Всё решил сам, задавал умные вопросы. Можно переходить к следующей теме.",
    "ДЗ не сделал — сослался на контрольные в школе. Разобрали прямо на уроке.",
    "Хорошо поработали над ошибками пробника. +5 баллов по прогнозу.",
    "Введение новой темы прошло гладко. Попросил дополнительные материалы — молодец.",
    "Урок сорвался — ученик опоздал на 25 минут. Обсудили и договорились о регламенте.",
    "Сдал ДЗ блестяще — ни одной ошибки. Усложняем задания.",
    "Работаем с ошибками ЕГЭ. Упала скорость решения, нужно тренировать.",
  ];

  // Билдер объекта урока
  function makeLesson(slot, dateStr, status, hw, hwDoneBy, note) {
    const base = {
      tutorId,
      date: dateStr,
      startTime: slot.time[0],
      endTime: slot.time[1],
      price: slot.price,
      status,
      homework: hw || "",
      hwDoneBy: hwDoneBy || [],
      notes: note || "",
    };
    if (slot.isGroup) {
      return {
        ...base,
        type: "group",
        groupId: slot.entity.id,
        groupStudentIds: slot.entity.studentIds,
        displayName: slot.entity.name,
        subjectName: slot.entity.subject,
      };
    }
    return {
      ...base,
      type: "individual",
      studentId: slot.entity.id,
      displayName: slot.entity.name,
      subjectName: slot.entity.subject,
    };
  }

  // hwDoneBy: Анна и Иван никогда не сдают ДЗ, Даниил иногда
  function calcHwDoneBy(slot, isPast) {
    if (!isPast) return [];
    const neverDoHw = [stAnna.id, stIvan.id];
    const rarelyDoHw = [stDaniil.id, stArtem.id];

    if (slot.isGroup) {
      return slot.entity.studentIds.filter((id) => {
        if (neverDoHw.includes(id)) return false;
        if (rarelyDoHw.includes(id)) return Math.random() > 0.6;
        return Math.random() > 0.15; // большинство сдают
      });
    }
    const id = slot.entity.id;
    if (neverDoHw.includes(id)) return [];
    if (rarelyDoHw.includes(id)) return Math.random() > 0.5 ? [id] : [];
    return Math.random() > 0.1 ? [id] : []; // 90% сдают
  }

  function getHw(slot) {
    const subject = slot.isGroup ? slot.entity.subject : slot.entity.subject;
    const pool = homeworksBySubject[subject] || homeworksBySubject["Математика"];
    return Math.random() > 0.15 ? rnd(pool) : ""; // 85% уроков с ДЗ
  }

  function getNote(isPast) {
    if (!isPast) return "";
    return Math.random() > 0.55 ? rnd(lessonNotes) : "";
  }

  const balanceTracker = {};
  for (const s of students) {
    balanceTracker[s.id] = { conducted: 0, payments: 0 };
  }

  const lessonDataList = [];

  // ── Неделя назад (все прошедшие = conducted) ──────────────────────────────
  const lastMonday = addDays(monday, -7);
  for (let dow = 0; dow < 7; dow++) {
    const date = addDays(lastMonday, dow);
    const dateStr = fmtDate(date);
    for (const slot of weekTemplate[dow]) {
      const hw = getHw(slot);
      const hwDoneBy = hw ? calcHwDoneBy(slot, true) : [];
      const note = getNote(true);
      lessonDataList.push(makeLesson(slot, dateStr, "conducted", hw, hwDoneBy, note));

      // трекер балансов
      const cost = slot.price;
      if (slot.isGroup) {
        for (const sid of slot.entity.studentIds) {
          if (balanceTracker[sid]) balanceTracker[sid].conducted += cost;
        }
      } else {
        if (balanceTracker[slot.entity.id]) balanceTracker[slot.entity.id].conducted += cost;
      }
    }
  }

  // ── Текущая неделя: прошедшие = conducted, сегодня = conducted/scheduled, будущие = scheduled ──
  for (let dow = 0; dow < 7; dow++) {
    const date = addDays(monday, dow);
    const dateStr = fmtDate(date);
    const isPast = dateStr < todayStr;
    const isToday = dateStr === todayStr;

    for (const slot of weekTemplate[dow]) {
      if (isPast) {
        const hw = getHw(slot);
        const hwDoneBy = hw ? calcHwDoneBy(slot, true) : [];
        const note = getNote(true);
        lessonDataList.push(makeLesson(slot, dateStr, "conducted", hw, hwDoneBy, note));

        const cost = slot.price;
        if (slot.isGroup) {
          for (const sid of slot.entity.studentIds) {
            if (balanceTracker[sid]) balanceTracker[sid].conducted += cost;
          }
        } else {
          if (balanceTracker[slot.entity.id]) balanceTracker[slot.entity.id].conducted += cost;
        }
      } else if (isToday) {
        // Часть сегодняшних уроков уже проведена (утренние), часть запланирована
        const hour = now.getHours();
        const lessonHour = parseInt(slot.time[0]);
        if (lessonHour < hour) {
          // Прошедший сегодня урок
          lessonDataList.push(makeLesson(slot, dateStr, "conducted", getHw(slot), [], ""));
          const cost = slot.price;
          if (slot.isGroup) {
            for (const sid of slot.entity.studentIds) {
              if (balanceTracker[sid]) balanceTracker[sid].conducted += cost;
            }
          } else {
            if (balanceTracker[slot.entity.id]) balanceTracker[slot.entity.id].conducted += cost;
          }
        } else {
          lessonDataList.push(makeLesson(slot, dateStr, "scheduled", "", [], ""));
        }
      } else {
        lessonDataList.push(makeLesson(slot, dateStr, "scheduled", "", [], ""));
      }
    }
  }

  // ── Следующая неделя — вся запланирована ────────────────────────────────
  const nextMonday = addDays(monday, 7);
  for (let dow = 0; dow < 7; dow++) {
    const date = addDays(nextMonday, dow);
    const dateStr = fmtDate(date);
    for (const slot of weekTemplate[dow]) {
      lessonDataList.push(makeLesson(slot, dateStr, "scheduled", "", [], ""));
    }
  }

  // Добавляем несколько пропущенных уроков для реализма
  // Ольга пропустила 2 урока на прошлой неделе
  const skipDate1 = fmtDate(addDays(lastMonday, 4)); // пятница прошлой недели
  lessonDataList.push({
    tutorId,
    date: skipDate1,
    startTime: "16:00",
    endTime: "17:00",
    type: "individual",
    studentId: stOlga.id,
    displayName: stOlga.name,
    subjectName: stOlga.subject,
    price: stOlga.price,
    status: "student_cancelled",
    homework: "",
    hwDoneBy: [],
    notes: "Ольга заболела, предупредила за час. Перенос на следующую неделю.",
  });

  // Один урок с Даниилом — пропущен без предупреждения
  const skipDate2 = fmtDate(addDays(lastMonday, 1)); // вторник прошлой недели
  lessonDataList.push({
    tutorId,
    date: skipDate2,
    startTime: "17:30",
    endTime: "18:30",
    type: "individual",
    studentId: stDaniil.id,
    displayName: stDaniil.name,
    subjectName: stDaniil.subject,
    price: stDaniil.price,
    status: "student_cancelled",
    homework: "",
    hwDoneBy: [],
    notes: "Пропустил без объяснений. Урок считается проведённым.",
  });

  // Записываем уроки пачками по 10
  console.log(`  Записываем ${lessonDataList.length} уроков...`);
  for (let i = 0; i < lessonDataList.length; i += 10) {
    await Promise.all(
      lessonDataList.slice(i, i + 10).map((d) => pb.collection("lessons").create(d))
    );
    process.stdout.write(`  ${Math.min(i + 10, lessonDataList.length)}/${lessonDataList.length}\r`);
  }
  console.log(`  ✓ ${lessonDataList.length} уроков создано`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ПЛАТЕЖИ
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n💳 Генерируем платежи...");

  const paymentDataList = [];

  function addPay(student, amount, weeksAgo, dayOffset, comment) {
    const payDate = addDays(monday, -(weeksAgo * 7) + (dayOffset || 0));
    balanceTracker[student.id].payments += amount;
    paymentDataList.push({
      tutorId,
      studentId: student.id,
      studentName: student.name,
      amount,
      paidAt: payDate.toISOString(),
      comment: comment || "Оплата за занятия",
      currency: "RUB",
    });
  }

  // Максим — платит чётко каждые 2 недели по 8 000 (аванс)
  addPay(stMaxim, 8000, 8, 1); addPay(stMaxim, 8000, 6, 2); addPay(stMaxim, 8000, 4, 1);
  addPay(stMaxim, 8000, 2, 3); addPay(stMaxim, 8000, 0, 1, "Оплата + аванс на следующий месяц");

  // Анна — исправно платит, только долг по ДЗ
  addPay(stAnna, 7200, 8, 2); addPay(stAnna, 7200, 6, 1); addPay(stAnna, 7200, 4, 3);
  addPay(stAnna, 7200, 2, 2); addPay(stAnna, 7200, 0, 1);

  // Даниил — финансовый должник (платит мало и редко)
  addPay(stDaniil, 7200, 8, 4); addPay(stDaniil, 5400, 5, 2); addPay(stDaniil, 3600, 2, 1);
  // Последние 2 недели не платил — намеренно

  // Кирилл — молодой, платит мама вперёд
  addPay(stKirill, 10000, 8, 0, "Мама оплатила 5 уроков"); addPay(stKirill, 10000, 4, 1, "Оплата следующего месяца");
  addPay(stKirill, 8000, 0, 0, "Частичная оплата марта");

  // Диана — новая, заплатила за первый месяц
  addPay(stDiana, 6400, 3, 2, "Первая оплата — пробный период");

  // Тимур — платит раз в месяц крупной суммой
  addPay(stTimur, 14400, 8, 1); addPay(stTimur, 14400, 4, 2); addPay(stTimur, 7200, 1, 0);

  // Полина — аванс
  addPay(stPolina, 10000, 8, 0); addPay(stPolina, 10000, 6, 2); addPay(stPolina, 10000, 4, 1);
  addPay(stPolina, 10000, 2, 3); addPay(stPolina, 10000, 0, 1, "Оплата за март — досрочно");

  // Артём — нерегулярно
  addPay(stArtem, 5100, 8, 3); addPay(stArtem, 5100, 4, 2); addPay(stArtem, 3400, 1, 1);

  // Ольга — уменьшенная оплата (из-за пропусков)
  addPay(stOlga, 5700, 7, 1); addPay(stOlga, 5700, 3, 2); addPay(stOlga, 3800, 0, 1);

  // Виктория — платит чётко
  addPay(stVika, 8800, 8, 1); addPay(stVika, 8800, 5, 2); addPay(stVika, 8800, 2, 3);
  addPay(stVika, 8800, 0, 0, "Оплата следующего цикла");

  // Никита — через родителей
  addPay(stNikita, 6800, 8, 0, "Карта мамы"); addPay(stNikita, 6800, 4, 1, "Карта мамы");
  addPay(stNikita, 6800, 0, 2, "Карта мамы");

  // Сабина — регулярно
  addPay(stSabina, 6400, 7, 2); addPay(stSabina, 6400, 3, 1); addPay(stSabina, 4800, 0, 0);

  // Алексей — новый, аванс
  addPay(stAlexey, 6000, 3, 1, "Аванс за первые 4 занятия"); addPay(stAlexey, 4500, 0, 2);

  // Маша — исправно
  addPay(stMasha, 6400, 8, 1); addPay(stMasha, 6400, 5, 2); addPay(stMasha, 6400, 2, 1);
  addPay(stMasha, 6400, 0, 0);

  // Иван — платит родители с задержкой
  addPay(stIvan, 6400, 9, 2); addPay(stIvan, 4800, 5, 3); addPay(stIvan, 3200, 1, 1);

  // Алиса — регулярно, OGE
  addPay(stAlisa, 6000, 8, 1); addPay(stAlisa, 6000, 4, 2); addPay(stAlisa, 3000, 1, 0);

  // Дима — сильный, платит сразу за месяц
  addPay(stDima, 16800, 8, 1, "Оплата за месяц (8 уроков)"); addPay(stDima, 16800, 4, 1, "Оплата за месяц");
  addPay(stDima, 12600, 0, 0, "Оплата за 6 уроков");

  // Наташа — через родителей
  addPay(stNatasha, 6800, 7, 2); addPay(stNatasha, 6800, 3, 1); addPay(stNatasha, 3400, 0, 1);

  // Роман — предоплата, дисциплинированный
  addPay(stRoman, 7200, 8, 0, "Оплата за месяц вперёд"); addPay(stRoman, 7200, 4, 0, "Оплата за апрель");
  addPay(stRoman, 7200, 0, 0, "Оплата за май");

  // Елена — взрослая, платит сама, строго
  addPay(stElena, 8000, 6, 1); addPay(stElena, 8000, 2, 2); addPay(stElena, 4000, 0, 1);

  // Пишем платежи пачками
  console.log(`  Записываем ${paymentDataList.length} платежей...`);
  for (let i = 0; i < paymentDataList.length; i += 10) {
    await Promise.all(
      paymentDataList.slice(i, i + 10).map((d) => pb.collection("payments").create(d))
    );
  }
  console.log(`  ✓ ${paymentDataList.length} платежей создано`);

  // ═══════════════════════════════════════════════════════════════════════════
  // 6. КОРРЕКТИРОВКА БАЛАНСОВ
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n⚖️  Корректируем балансы...");

  await Promise.all(
    students.map((s) => {
      const t = balanceTracker[s.id];
      const balance = t.payments - t.conducted;
      return pb.collection("students").update(s.id, { balance });
    })
  );

  // Выводим сводку
  console.log("\n  Баланс учеников:");
  for (const s of students) {
    const t = balanceTracker[s.id];
    const balance = t.payments - t.conducted;
    const sign = balance >= 0 ? "+" : "";
    console.log(`    ${s.name.padEnd(22)} payments=${t.payments.toLocaleString()}₽  conducted=${t.conducted.toLocaleString()}₽  balance=${sign}${balance.toLocaleString()}₽`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 7. ПЕРЕСЧЁТ hwDebtCount
  // ═══════════════════════════════════════════════════════════════════════════
  console.log("\n📝 Пересчитываем долги по ДЗ...");

  const hwDebtMap = {};
  for (const lesson of lessonDataList) {
    if (lesson.status !== "conducted" || !lesson.homework) continue;
    if (lesson.type === "individual") {
      const sid = lesson.studentId;
      if (!(lesson.hwDoneBy || []).includes(sid)) {
        hwDebtMap[sid] = (hwDebtMap[sid] || 0) + 1;
      }
    } else if (lesson.type === "group") {
      for (const sid of lesson.groupStudentIds || []) {
        if (!(lesson.hwDoneBy || []).includes(sid)) {
          hwDebtMap[sid] = (hwDebtMap[sid] || 0) + 1;
        }
      }
    }
  }

  const debtUpdates = students
    .filter((s) => hwDebtMap[s.id] > 0)
    .map((s) => {
      console.log(`    ${s.name}: ${hwDebtMap[s.id]} долг(ов) по ДЗ`);
      return pb.collection("students").update(s.id, { hwDebtCount: hwDebtMap[s.id] });
    });
  await Promise.all(debtUpdates);

  console.log(`\n✅ Seed завершён!`);
  console.log(`   Программы: ${programs.length}`);
  console.log(`   Ученики:   ${students.length}`);
  console.log(`   Группы:    ${groups.length}`);
  console.log(`   Уроки:     ${lessonDataList.length}`);
  console.log(`   Платежи:   ${paymentDataList.length}`);
}

// ─── Точка входа ──────────────────────────────────────────────────────────────

async function main() {
  console.log(`🚀 Seed-скрипт Точилки`);
  console.log(`   PocketBase: ${PB_URL}`);
  console.log(`   Аккаунт:   ${DEFAULT_EMAIL}`);

  // Пробуем войти
  let tutorId;
  try {
    await pb.collection("users").authWithPassword(DEFAULT_EMAIL, DEFAULT_PASS);
    tutorId = pb.authStore.record?.id;
    console.log(`✓ Авторизован как: ${tutorId}`);
  } catch (e) {
    // Если аккаунт не существует — создаём
    if (e?.status === 400) {
      console.log("  Аккаунт не найден, создаём...");
      try {
        await pb.collection("users").create({
          email: DEFAULT_EMAIL,
          password: DEFAULT_PASS,
          passwordConfirm: DEFAULT_PASS,
          name: "Демо-репетитор",
        });
        await pb.collection("users").authWithPassword(DEFAULT_EMAIL, DEFAULT_PASS);
        tutorId = pb.authStore.record?.id;
        console.log(`✓ Создан и авторизован: ${tutorId}`);
      } catch (e2) {
        console.error("❌ Не удалось создать аккаунт:", e2?.message || e2);
        process.exit(1);
      }
    } else {
      console.error("❌ Ошибка авторизации:", e?.message || e);
      process.exit(1);
    }
  }

  if (!tutorId) {
    console.error("❌ tutorId не получен после авторизации");
    process.exit(1);
  }

  await clearAll(tutorId);
  await seed(tutorId);
}

main().catch((e) => {
  console.error("❌ Необработанная ошибка:", e?.message || e, e?.data || "");
  process.exit(1);
});
