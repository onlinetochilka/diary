import { writeBatch, doc, collection, getDocs, deleteDoc, query, where } from "firebase/firestore";
import { db } from "../services/firebase.js";
// Triggering HMR
import { getNextDistinctColor } from "./colors.js";

// Simple seeded PRNG for deterministic demo data
function mulberry32(a) {
  return function() {
    let t = a += 0x6D2B79F5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  }
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export async function generateDemoData(tutorId) {
  const batch = writeBatch(db);
  const now = new Date();
  
  // Initialize seeded PRNG so data is exactly the same every time
  const rng = mulberry32(12345);

  const refs = {
    students: collection(db, "students"),
    groups: collection(db, "groups"),
    lessons: collection(db, "lessons"),
    payments: collection(db, "payments"),
    programs: collection(db, "programs")
  };

  // --- Students ---
  const studentNames = [
    "Исаак Ньютон", "Александр Пушкин", "Мария Кюри", "Лев Толстой", "Альберт Эйнштейн", 
    "Анна Ахматова", "Галилео Галилей", "Уильям Шекспир", "Леонардо да Винчи", "Федор Достоевский", 
    "Ада Лавлейс", "Сергей Есенин", "Ричард Фейнман", "Михаил Булгаков", "Пифагор"
  ];
  
  const studentGenders = [
    "male", "male", "female", "male", "male",
    "female", "male", "male", "male", "male",
    "female", "male", "male", "male", "male"
  ];
  
  const subjects = ["Физика", "Литература", "Химия", "Русский язык", "Физика", "Литература", "Астрономия", "Английский язык", "Математика", "Литература", "Информатика", "Русский язык", "Физика", "Литература", "Геометрия"];

  const allUsedColors = [];
  
  // --- Programs ---
  const p1Oklch = getNextDistinctColor(allUsedColors);
  allUsedColors.push(p1Oklch);
  const p1Ref = doc(refs.programs);
  const p1Data = {
    name: "Интенсив Механика", colorOklch: p1Oklch, tutorId, createdAt: new Date(),
    topics: [
      { id: "1", title: "Кинематика", isCompleted: false },
      { id: "2", title: "Динамика", isCompleted: false },
      { id: "3", title: "Законы сохранения", isCompleted: false },
      { id: "4", title: "Статика", isCompleted: false }
    ]
  };
  batch.set(p1Ref, p1Data);
  const p1Snapshot = { id: p1Ref.id, name: p1Data.name, topics: p1Data.topics };

  const p2Oklch = getNextDistinctColor(allUsedColors);
  allUsedColors.push(p2Oklch);
  const p2Ref = doc(refs.programs);
  const p2Data = {
    name: "Подготовка к ЕГЭ (профиль)", colorOklch: p2Oklch, tutorId, createdAt: new Date(),
    topics: [
      { id: "1", title: "Тригонометрия", isCompleted: false },
      { id: "2", title: "Производная", isCompleted: false },
      { id: "3", title: "Стереометрия", isCompleted: false },
      { id: "4", title: "Параметры", isCompleted: false },
      { id: "5", title: "Теория чисел", isCompleted: false }
    ]
  };
  batch.set(p2Ref, p2Data);
  const p2Snapshot = { id: p2Ref.id, name: p2Data.name, topics: p2Data.topics };

  // --- Students ---
  const students = [];
  for (let i = 0; i < studentNames.length; i++) {
    const hue = getNextDistinctColor(allUsedColors);
    allUsedColors.push(hue);
    const r = doc(refs.students);
        // Hardcode debts for demo clarity:
    // i=0: Both Fin and HW debt
    // i=1: Only HW debt
    // i=2: Only Fin debt
    // i=3+: No debts
    const balance = (i === 1 || i === 2) ? -2500 : 5000;
    
    let assignedPrograms = [];
    if (subjects[i] === "Физика" || subjects[i] === "Математика") {
      const isMath = subjects[i] === "Математика";
      const baseProg = isMath ? p2Data : p1Data;
      
      // Give them a program with a 70% chance
      if (rng() > 0.3) {
        // Randomize progress
        const completedCount = Math.floor(rng() * baseProg.topics.length);
        const customTopics = baseProg.topics.map((t, idx) => ({
          ...t,
          isCompleted: idx < completedCount
        }));
        
        assignedPrograms.push({
          id: isMath ? p2Ref.id : p1Ref.id,
          name: baseProg.name,
          colorOklch: baseProg.colorOklch,
          topics: customTopics
        });
      }
    }

    batch.set(r, { 
      name: studentNames[i], 
      studentGender: studentGenders[i],
      subjects: [{ name: subjects[i], price: 1000, programs: assignedPrograms }], 
      phone: `+790012345${String(i).padStart(2, '0')}`, 
      active: true, 
      colorOklch: hue, 
      balance, 
      tutorId,
      createdAt: new Date() 
    });
    students.push({ id: r.id, name: studentNames[i], subject: subjects[i] });
  }

  // --- Groups ---
  const groupNames = ["Олимпиадная Физика", "Подготовка к ЕГЭ", "Разговорный клуб"];
  const groupSubjects = ["Физика", "Математика", "Английский язык"];
  const groups = [];
  
  for (let i = 0; i < groupNames.length; i++) {
    const hue = getNextDistinctColor(allUsedColors);
    allUsedColors.push(hue);
    const r = doc(refs.groups);
    // Assign 3-4 random students to each group
    // Ensure students 0, 1, 2 (our debtors) are not in groups to keep debts sparse
    const grStudents = [
      students[i + 5].id,
      students[i + 8].id,
      students[i + 11].id
    ];
    let assignedPrograms = [];
    if (groupSubjects[i] === "Физика" || groupSubjects[i] === "Математика") {
      const isMath = groupSubjects[i] === "Математика";
      const baseProg = isMath ? p2Data : p1Data;
      
      const completedCount = Math.floor(rng() * baseProg.topics.length);
      const customTopics = baseProg.topics.map((t, idx) => ({
        ...t,
        isCompleted: idx < completedCount
      }));
      
      assignedPrograms.push({
        id: isMath ? p2Ref.id : p1Ref.id,
        name: baseProg.name,
        colorOklch: baseProg.colorOklch,
        topics: customTopics
      });
    }

    batch.set(r, {
      name: groupNames[i],
      subject: groupSubjects[i],
      studentIds: grStudents,
      colorOklch: hue,
      programs: assignedPrograms,
      active: true,
      tutorId,
      createdAt: new Date()
    });
    groups.push({ id: r.id, name: groupNames[i], subject: groupSubjects[i], studentIds: grStudents });
  }

  // --- Lessons (Scattered across 45 days) ---
  const lessonTimes = [
    ["10:00", "11:00"], ["11:30", "12:30"], ["14:00", "15:30"], 
    ["16:00", "17:00"], ["17:30", "18:30"], ["19:00", "20:30"]
  ];

  // We loop from -30 days to +14 days
  for (let offset = -30; offset <= 14; offset++) {
    const d = new Date(now);
    d.setDate(d.getDate() + offset);
    const dateStr = formatDate(d);
    
    // Skip 1 day a week deterministically (every 7th day relative to offset)
    // We use Math.abs(offset) % 7 === 3 to spread it out.
    if (Math.abs(offset) % 7 === 3) continue;

    // Generate 3-5 lessons per day
    const lessonsCount = Math.floor(rng() * 3) + 3; 
    for (let i = 0; i < lessonsCount; i++) {
      const isGroup = rng() > 0.8;
      const timePair = lessonTimes[i];
      const isPast = offset < 0;
      const isToday = offset === 0;

      const lRef = doc(refs.lessons);
      
      let status = "scheduled";
      let homework = "";
      let hwDoneBy = [];

      let gr = null;
      let st = null;
      if (isGroup) {
        gr = groups[i % groups.length];
      } else {
        st = students[Math.floor(rng() * students.length)];
      }

      if (isPast) {
        status = rng() > 0.1 ? "conducted" : "cancelled";
        if (status === "conducted" && rng() > 0.3) {
           homework = "Выполнить тест";
           // 80% chance they did the homework
                      // Students 0 and 2 never do homework, others always do.
           const st0 = students[0].id;
           const st2 = students[2].id;
           if (isGroup) {
             hwDoneBy = [...gr.studentIds];
             if (hwDoneBy.includes(st0)) hwDoneBy = hwDoneBy.filter(id => id !== st0);
             if (hwDoneBy.includes(st2)) hwDoneBy = hwDoneBy.filter(id => id !== st2);
           } else {
             hwDoneBy = (st.id === st0 || st.id === st2) ? [] : [st.id];
           }
        }
      }

      if (isGroup) {
        batch.set(lRef, {
          tutorId, date: dateStr, startTime: timePair[0], endTime: timePair[1],
          type: "group", groupId: gr.id, displayName: gr.name, subjectName: gr.subject,
          price: 2500, status, homework, hwDoneBy
        });
      } else {
        const st = students[Math.floor(rng() * students.length)];
        batch.set(lRef, {
          tutorId, date: dateStr, startTime: timePair[0], endTime: timePair[1],
          type: "individual", studentId: st.id, displayName: st.name, subjectName: st.subject,
          price: 1500, status, homework, hwDoneBy
        });
      }
    }
  }

  // --- Payments (Scattered across last 6 months to build chart) ---
  for (let mOffset = 0; mOffset <= 5; mOffset++) {
    // 5-8 payments per month
    const payCount = Math.floor(rng() * 4) + 5;
    for (let i = 0; i < payCount; i++) {
      const pRef = doc(refs.payments);
      const st = students[Math.floor(rng() * students.length)];
      const amount = (Math.floor(rng() * 4) + 1) * 5000; // 5000, 10000, 15000, 20000
      
      // Random day in that month
      const payDate = new Date(now.getFullYear(), now.getMonth() - mOffset, Math.floor(rng() * 28) + 1);
      
      batch.set(pRef, {
        tutorId,
        studentId: st.id,
        studentName: st.name,
        amount,
        paidAt: payDate.toISOString(),
        comment: "Оплата за занятия"
      });
    }
  }

  await batch.commit();
}

export async function clearAllTutorData(tutorId) {
  if (!tutorId) return;

  const refs = {
    students: collection(db, "students"),
    groups: collection(db, "groups"),
    lessons: collection(db, "lessons"),
    payments: collection(db, "payments"),
    programs: collection(db, "programs")
  };

  let b = writeBatch(db);
  let count = 0;
  const batches = [];

  for (const collectionName of Object.keys(refs)) {
    const q = query(refs[collectionName], where("tutorId", "==", tutorId));
    const snap = await getDocs(q);
    snap.forEach((docSnap) => {
      b.delete(docSnap.ref);
      count++;
      if (count === 400) {
        batches.push(b.commit());
        b = writeBatch(db);
        count = 0;
      }
    });
  }

  if (count > 0) {
    batches.push(b.commit());
  }

  await Promise.all(batches);
}
