import { getNextDistinctColor } from "./colors.js";

// ─── Утилиты ──────────────────────────────────────────────────────────────────

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

function genId(prefix = "") {
  return prefix + Math.random().toString(36).slice(2, 11);
}

function rnd(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

// ─── Основная функция генерации ───────────────────────────────────────────────

/**
 * Генерирует полную базу данных для деморежима в виде JSON-объекта.
 * @returns {Object} { programs, students, groups, lessons, payments, users, user_config }
 */
export function generateDemoData(tutorId = "demo_tutor") {
  const now = new Date();
  const todayStr = fmtDate(now);
  const monday = getMondayOf(now);
  const usedColors = [];

  const db = {
    programs: [],
    students: [],
    groups: [],
    lessons: [],
    payments: [],
    users: [
      {
        id: tutorId,
        email: "demo@tochilka.app",
        name: "Деморепетитор",
        avatar: "",
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    ],
    user_config: [
      {
        id: genId("cfg_"),
        user: tutorId,
        onboardingCompleted: true,
        defaultLessonDuration: 60,
        currency: "RUB",
        created: new Date().toISOString(),
        updated: new Date().toISOString()
      }
    ]
  };

  const getCol = () => {
    const c = getNextDistinctColor(usedColors);
    usedColors.push(c);
    return c;
  };

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. ПРОГРАММЫ (5 штук)
  // ═══════════════════════════════════════════════════════════════════════════

  const progDefs = [
    {
      name: "ЕГЭ Математика Профиль",
      subject: "Математика",
      topics: [
        { id: genId(), title: "Алгебраические выражения", homework: "Решить варианты 1-3 из сборника" },
        { id: genId(), title: "Уравнения и неравенства", homework: "Задачи с параметром, номера 15-25" },
        { id: genId(), title: "Планиметрия: треугольники", homework: "Доказать теорему синусов, 5 задач" },
        { id: genId(), title: "Стереометрия: сечения", homework: "Построить сечения призмы" },
        { id: genId(), title: "Тригонометрия", homework: "Выучить формулы приведения, решить тест" },
        { id: genId(), title: "Производная", homework: "Найти экстремумы функций из файла" },
        { id: genId(), title: "Финансовая математика", homework: "Задачи на аннуитетный платёж" },
        { id: genId(), title: "Теория вероятностей", homework: "Решить сложные вероятностные задачи" }
      ],
    },
    {
      name: "Физика: Классическая механика",
      subject: "Физика",
      topics: [
        { id: genId(), title: "Кинематика материальной точки", homework: "Иродов 1.1-1.10" },
        { id: genId(), title: "Динамика и законы Ньютона", homework: "Иродов 1.20-1.30" },
        { id: genId(), title: "Закон сохранения импульса", homework: "Решить задачи на абсолютно упругий удар" },
        { id: genId(), title: "Закон сохранения энергии", homework: "Подборка задач на потенциальную энергию" },
        { id: genId(), title: "Статика", homework: "Правило моментов, задачи 5-10" },
        { id: genId(), title: "Гидростатика", homework: "Закон Архимеда, варианты ОГЭ" },
        { id: genId(), title: "Кинематика твердого тела", homework: "Сложные задачи из методички" },
        { id: genId(), title: "Колебания и волны", homework: "Математический и пружинный маятники" }
      ],
    },
    {
      name: "Литература Золотого века",
      subject: "Литература",
      topics: [
        { id: genId(), title: "Творчество А.С. Пушкина", homework: "Выучить отрывок из 'Евгения Онегина'" },
        { id: genId(), title: "М.Ю. Лермонтов", homework: "Анализ стихотворения 'Смерть поэта'" },
        { id: genId(), title: "Н.В. Гоголь 'Мертвые души'", homework: "Характеристика помещиков" },
        { id: genId(), title: "И.С. Тургенев", homework: "Проблема отцов и детей" },
        { id: genId(), title: "Ф.М. Достоевский", homework: "Теория Раскольникова" },
        { id: genId(), title: "Л.Н. Толстой", homework: "Мысль семейная в романе" },
        { id: genId(), title: "А.П. Чехов", homework: "Анализ рассказов 'Ионыч', 'Крыжовник'" },
        { id: genId(), title: "Поэзия Тютчева и Фета", homework: "Сравнительный анализ пейзажной лирики" }
      ],
    },
    {
      name: "Информатика ОГЭ/ЕГЭ",
      subject: "Информатика",
      topics: [
        { id: genId(), title: "Системы счисления", homework: "Перевод из 2-й в 10-ю и 16-ю, 20 примеров" },
        { id: genId(), title: "Алгебра логики", homework: "Построение таблиц истинности" },
        { id: genId(), title: "Графы и пути", homework: "Задание 13 из ЕГЭ, 5 вариантов" },
        { id: genId(), title: "Электронные таблицы", homework: "ВПР, СУММЕСЛИ, работа со строками" },
        { id: genId(), title: "Основы Python", homework: "Циклы for/while, списки" },
        { id: genId(), title: "Строки в Python", homework: "Обработка символов, срезы" },
        { id: genId(), title: "Рекурсия", homework: "Вычисление факториала и чисел Фибоначчи" },
        { id: genId(), title: "Черепашка и алгоритмы", homework: "Задачи на исполнителей" }
      ],
    }
  ];

  for (const def of progDefs) {
    const p = {
      id: genId("p_"),
      tutorId,
      name: def.name,
      subject: def.subject,
      topics: def.topics,
      colorOklch: getCol(),
      colorVersion: 2,
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    db.programs.push(p);
  }

  const [pMath, pPhys, pLit, pInfo] = db.programs;

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. УЧЕНИКИ (Знаменитости)
  // ═══════════════════════════════════════════════════════════════════════════
  // Требования:
  // - 1-2 только долг по ДЗ (hw)
  // - 1-2 только долг по деньгам (fin)
  // - 1-2 долг и по ДЗ, и по деньгам (both)
  // - Остальные чистые (clean)
  
  const studentDefs = [
    // ── Чистые ──
    { name: "Альберт Эйнштейн",  subject: "Физика",      prog: pPhys, tops: 5, role: "clean" },
    { name: "Исаак Ньютон",      subject: "Физика",      prog: pPhys, tops: 4, role: "clean" },
    { name: "Никола Тесла",      subject: "Информатика", prog: pInfo, tops: 3, role: "clean" },
    { name: "Мария Кюри",        subject: "Физика",      prog: pPhys, tops: 7, role: "clean" },
    { name: "Леонард Эйлер",     subject: "Математика",  prog: pMath, tops: 6, role: "clean" },
    { name: "Рене Декарт",       subject: "Математика",  prog: pMath, tops: 2, role: "clean" },
    { name: "Карл Гаусс",        subject: "Математика",  prog: pMath, tops: 4, role: "clean" },
    { name: "Алан Тьюринг",      subject: "Информатика", prog: pInfo, tops: 5, role: "clean" },
    { name: "Ада Лавлейс",       subject: "Информатика", prog: pInfo, tops: 2, role: "clean" },
    { name: "Александр Пушкин",  subject: "Литература",  prog: pLit,  tops: 3, role: "clean" },
    { name: "Михаил Лермонтов",  subject: "Литература",  prog: pLit,  tops: 1, role: "clean" },
    { name: "Антон Чехов",       subject: "Литература",  prog: pLit,  tops: 4, role: "clean" },
    // ── Долги по ДЗ ──
    { name: "Михаил Булгаков",   subject: "Литература",  prog: pLit,  tops: 2, role: "hw" },
    { name: "Стивен Хокинг",     subject: "Физика",      prog: pPhys, tops: 3, role: "hw" },
    // ── Финансовые должники ──
    { name: "Федор Достоевский", subject: "Литература",  prog: pLit,  tops: 2, role: "fin" },
    { name: "Джон фон Нейман",   subject: "Математика",  prog: pMath, tops: 4, role: "fin" },
    // ── Долги по всему ──
    { name: "Галилео Галилей",   subject: "Физика",      prog: pPhys, tops: 1, role: "both" },
    { name: "Лев Толстой",       subject: "Литература",  prog: pLit,  tops: 3, role: "both" }
  ];

  for (const def of studentDefs) {
    const programSnap = {
      id: def.prog.id,
      name: def.prog.name,
      colorOklch: def.prog.colorOklch,
      topics: def.prog.topics.map((t, idx) => ({
        ...t,
        isCompleted: idx < def.tops,
      })),
    };

    const isFemale = def.name === "Мария Кюри" || def.name === "Ада Лавлейс";
    
    const s = {
      id: genId("s_"),
      tutorId,
      name: def.name,
      studentGender: isFemale ? "female" : "male",
      grade: Math.random() > 0.5 ? "11 класс" : "10 класс",
      subjects: [{
        id: genId(),
        name: def.subject,
        price: 2000,
        duration: 60,
        paymentType: "per_lesson",
        subscriptionLessons: null,
        programs: [programSnap]
      }],
      phone: `+7${String(9001000000 + Math.floor(Math.random() * 1000000)).slice(0, 10)}`,
      active: true,
      colorOklch: getCol(),
      colorVersion: 2,
      balance: 0, 
      notes: "Студент сгенерирован в деморежиме",
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      _role: def.role, 
      _price: 2000
    };
    db.students.push(s);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 3. ГРУППЫ (3 штуки)
  // ═══════════════════════════════════════════════════════════════════════════

  const getStudentsBySubj = (subj, limit) => db.students.filter(s => s.subjects[0].name === subj).slice(0, limit);
  
  const mathGroupStudents = getStudentsBySubj("Математика", 3);
  const physGroupStudents = getStudentsBySubj("Физика", 3);
  const infoGroupStudents = getStudentsBySubj("Информатика", 3);

  const groupDefs = [
    { name: "Высшая математика", subject: "Математика", students: mathGroupStudents, prog: pMath },
    { name: "Олимпиадная физика", subject: "Физика", students: physGroupStudents, prog: pPhys },
    { name: "Алгоритмы Python", subject: "Информатика", students: infoGroupStudents, prog: pInfo },
  ];

  for (const def of groupDefs) {
    const g = {
      id: genId("g_"),
      tutorId,
      name: def.name,
      subject: def.subject,
      studentIds: def.students.map(s => s.id),
      colorOklch: getCol(),
      colorVersion: 2,
      programs: [{ id: def.prog.id, name: def.prog.name, colorOklch: def.prog.colorOklch, topics: def.prog.topics }],
      active: true,
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      _price: 1500,
      _students: def.students
    };
    db.groups.push(g);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 4. РАСПИСАНИЕ (Прошлая, Текущая, Будущая недели)
  // ═══════════════════════════════════════════════════════════════════════════

  const balanceTracker = {};
  for (const s of db.students) balanceTracker[s.id] = { conducted: 0, payments: 0 };

  function makeLesson(entity, isGroup, dateStr, timeArr, status, homework, hwDoneBy) {
    const base = {
      id: genId("l_"),
      tutorId,
      date: dateStr,
      startTime: timeArr[0],
      endTime: timeArr[1],
      price: entity._price,
      status,
      homework,
      hwDoneBy,
      notes: status === 'conducted' ? "Отлично поработали!" : "",
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    };
    if (isGroup) {
      return {
        ...base,
        type: "group",
        groupId: entity.id,
        groupStudentIds: entity.studentIds,
        displayName: entity.name,
        subjectName: entity.subject,
      };
    }
    return {
      ...base,
      type: "individual",
      studentId: entity.id,
      displayName: entity.name,
      subjectName: entity.subjects[0].name,
    };
  }

  // Простая сетка уроков для распределения
  const schedulePattern = [
    // Пн
    [ { e: db.students[0], g: false, t: ["09:00","10:00"] }, { e: db.students[1], g: false, t: ["10:30","11:30"] }, { e: db.groups[0], g: true, t: ["17:00","18:30"] } ],
    // Вт
    [ { e: db.students[2], g: false, t: ["11:00","12:00"] }, { e: db.students[3], g: false, t: ["13:00","14:00"] }, { e: db.groups[1], g: true, t: ["16:00","17:30"] } ],
    // Ср
    [ { e: db.students[4], g: false, t: ["10:00","11:00"] }, { e: db.students[5], g: false, t: ["12:00","13:00"] }, { e: db.groups[2], g: true, t: ["18:00","19:30"] } ],
    // Чт
    [ { e: db.students[6], g: false, t: ["09:00","10:00"] }, { e: db.students[7], g: false, t: ["14:00","15:00"] }, { e: db.students[8], g: false, t: ["15:30","16:30"] } ],
    // Пт
    [ { e: db.students[9], g: false, t: ["11:00","12:00"] }, { e: db.students[10], g: false, t: ["13:00","14:00"] }, { e: db.students[11], g: false, t: ["16:00","17:00"] } ],
    // Сб
    [ { e: db.students[12], g: false, t: ["10:00","11:00"] }, { e: db.students[13], g: false, t: ["11:30","12:30"] }, { e: db.students[14], g: false, t: ["13:00","14:00"] } ],
    // Вс
    [ { e: db.students[15], g: false, t: ["12:00","13:00"] }, { e: db.students[16], g: false, t: ["14:00","15:00"] }, { e: db.students[17], g: false, t: ["16:00","17:00"] } ]
  ];

  // Генерируем 3 недели: прошлая, текущая, будущая (только ближайшие 3-4 дня)
  for (let weekOffset = -1; weekOffset <= 1; weekOffset++) {
    const weekStart = addDays(monday, weekOffset * 7);
    
    for (let dow = 0; dow < 7; dow++) {
      const lessonDate = addDays(weekStart, dow);
      const dateStr = fmtDate(lessonDate);
      
      // Для будущей недели берем только первые 4 дня
      if (weekOffset === 1 && dow > 3) continue;

      const isPast = dateStr < todayStr;
      const isToday = dateStr === todayStr;

      for (const slot of schedulePattern[dow]) {
        let status = "scheduled";
        if (isPast) status = "conducted";
        else if (isToday) {
          const lessonHour = parseInt(slot.t[0].split(":")[0]);
          if (lessonHour <= now.getHours()) status = "conducted";
        }

        // Логика домашек: если урок проведён, есть домашка.
        let hwText = "";
        let hwDoneBy = [];
        
        if (status === "conducted") {
          hwText = "Сделать задания в рабочей тетради, стр 12-15.";
          
          if (slot.g) {
            hwDoneBy = slot.e.studentIds.filter(sid => {
              const studentRole = db.students.find(s => s.id === sid)?._role;
              return studentRole !== "hw" && studentRole !== "both";
            });
          } else {
            if (slot.e._role !== "hw" && slot.e._role !== "both") {
              hwDoneBy = [slot.e.id];
            }
          }

          // Финансовый учёт
          const cost = slot.e._price;
          if (slot.g) {
            slot.e.studentIds.forEach(sid => balanceTracker[sid].conducted += cost);
          } else {
            balanceTracker[slot.e.id].conducted += cost;
          }
        }

        db.lessons.push(makeLesson(slot.e, slot.g, dateStr, slot.t, status, hwText, hwDoneBy));
      }
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 5. ПЛАТЕЖИ И БАЛАНСЫ
  // ═══════════════════════════════════════════════════════════════════════════

  function addPay(student, amount, dateStr) {
    if (amount <= 0) return;
    balanceTracker[student.id].payments += amount;
    db.payments.push({
      id: genId("pay_"),
      tutorId,
      studentId: student.id,
      studentName: student.name,
      amount,
      paidAt: new Date(`${dateStr}T12:00:00Z`).toISOString(),
      comment: "Оплата за занятия",
      currency: "RUB",
      created: new Date().toISOString(),
      updated: new Date().toISOString()
    });
  }

  const currentWeekPayDate = fmtDate(now); // Use current date for payments so they show in "Income for the month"

  for (const s of db.students) {
    const owes = balanceTracker[s.id].conducted;
    
    if (s._role === "fin" || s._role === "both") {
      // Должник: оплатил меньше, чем должен
      // Пусть должен за 2 урока (баланс отрицательный)
      addPay(s, Math.max(0, owes - 4000), currentWeekPayDate);
    } else {
      // Обычный ученик: баланс ноль или в плюсе (аванс)
      const prepay = Math.random() > 0.7 ? 4000 : 0; 
      addPay(s, owes + prepay, currentWeekPayDate);
    }
  }

  // Подсчет долгов по ДЗ и часов
  const hwDebtMap = {};
  const conductedHoursMap = {};
  
  for (const lesson of db.lessons) {
    if (lesson.status !== "conducted") continue;
    
    const durationHours = 1; // Simplify to 1 hour per lesson
    
    if (lesson.type === "individual") {
      conductedHoursMap[lesson.studentId] = (conductedHoursMap[lesson.studentId] || 0) + durationHours;
      if (lesson.homework && !(lesson.hwDoneBy || []).includes(lesson.studentId)) {
        hwDebtMap[lesson.studentId] = (hwDebtMap[lesson.studentId] || 0) + 1;
      }
    } else {
      for (const sid of (lesson.groupStudentIds || [])) {
        conductedHoursMap[sid] = (conductedHoursMap[sid] || 0) + durationHours;
        if (lesson.homework && !(lesson.hwDoneBy || []).includes(sid)) {
          hwDebtMap[sid] = (hwDebtMap[sid] || 0) + 1;
        }
      }
    }
  }

  // Корректировка балансов и статистики в профилях студентов
  for (const s of db.students) {
    const t = balanceTracker[s.id];
    s.balance = t.payments - t.conducted;
    s.ltv = t.payments;
    
    const hwDebt = hwDebtMap[s.id] || 0;
    s.hwDebtCount = hwDebt;
    
    const role = s._role;
    
    s.stats = {
      attendanceRate: (role === "fin" || role === "both") ? 85 : 100,
      cancellationsCount: (role === "fin" || role === "both") ? 1 : 0,
      homeworkRate: (role === "hw" || role === "both") ? 50 : 100,
      pendingHomeworks: hwDebt,
      conductedHours: conductedHoursMap[s.id] || 0
    };
    
    // Also inject stats into the subject for StudentTileStats
    if (s.subjects && s.subjects[0]) {
      s.subjects[0].stats = { ...s.stats };
    }
    
    delete s._role;
    delete s._price;
  }
  
  for (const g of db.groups) {
    delete g._price;
    delete g._students;
  }

  return db;
}

export function clearAllTutorData() {
  localStorage.removeItem("demo_db");
}
