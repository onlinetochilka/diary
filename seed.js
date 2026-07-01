import { addProgram, addStudent, addGroup, getStudents, deleteStudent, getGroups, deleteGroup, getPrograms, deleteProgram, addLesson, getLessons, deleteLesson, addPayment, getPayments, deletePayment } from "./src/services/database.js";

const generateId = () => Math.random().toString(36).substring(2, 9);

async function clearDb() {
  console.log("Clearing DB...");
  const [students, groups, programs, lessons, payments] = await Promise.all([
    getStudents(),
    getGroups(),
    getPrograms(),
    getLessons(),
    getPayments()
  ]);
  
  await Promise.all([
    ...students.map(s => deleteStudent(s.id)),
    ...groups.map(g => deleteGroup(g.id)),
    ...programs.map(p => deleteProgram(p.id)),
    ...lessons.map(l => deleteLesson(l.id)),
    ...payments.map(p => deletePayment(p.id))
  ]);
  console.log("DB Cleared!");
}

async function seed() {
  await clearDb();

  console.log("Seeding programs...");
  
  const prog1 = {
    name: "ОГЭ Математика (Интенсив)",
    subject: "Математика",
    topics: [
      { id: generateId(), title: "Дроби и проценты" },
      { id: generateId(), title: "Алгебраические выражения" },
      { id: generateId(), title: "Уравнения и неравенства" },
      { id: generateId(), title: "Графики функций" },
      { id: generateId(), title: "Текстовые задачи" },
      { id: generateId(), title: "Планиметрия (база)" },
    ]
  };
  const prog1Id = await addProgram(prog1);

  const prog2 = {
    name: "Олимпиада по Физике",
    subject: "Физика",
    topics: [
      { id: generateId(), title: "Кинематика сложного движения" },
      { id: generateId(), title: "Законы сохранения" },
      { id: generateId(), title: "Термодинамика" },
      { id: generateId(), title: "Электростатика" },
    ]
  };
  const prog2Id = await addProgram(prog2);

  const prog3 = {
    name: "Разговорный клуб (B2)",
    subject: "Английский",
    topics: []
  };
  const prog3Id = await addProgram(prog3);

  const snapProgram = (globalProgId, progDef) => ({
    id: globalProgId,
    name: progDef.name,
    topics: progDef.topics.map(t => ({ ...t, isCompleted: false }))
  });

  console.log("Seeding students...");
  
  const createStudent = async (name, subjectName, progId, progDef) => {
    return await addStudent({
      name,
      grade: "9-11 класс",
      timezone: "UTC+3 (Москва)",
      balance: 0,
      contacts: { student: "@" + name.split(' ')[0].toLowerCase(), parentName: "", parent: "", billingTo: "student", autoRemind: false },
      subjects: [
        {
          id: generateId(),
          name: subjectName,
          programs: [snapProgram(progId, progDef)],
          price: 2000,
          duration: 60,
          paymentType: "per_lesson",
          subscriptionLessons: null,
        }
      ]
    });
  };

  const stud1Id = await createStudent("Антон Чехов", "Математика", prog1Id, prog1);
  const stud2Id = await createStudent("Александр Пушкин", "Математика", prog1Id, prog1);
  const stud3Id = await createStudent("Исаак Ньютон", "Физика", prog2Id, prog2);
  const stud4Id = await createStudent("Уинстон Черчилль", "Английский", prog3Id, prog3);
  
  // Extra students for large group
  const stud5Id = await createStudent("Лев Толстой", "Литература", prog3Id, prog3); // reuse prog for demo
  const stud6Id = await createStudent("Федор Достоевский", "Литература", prog3Id, prog3);
  const stud7Id = await createStudent("Николай Гоголь", "Литература", prog3Id, prog3);
  const stud8Id = await createStudent("Михаил Булгаков", "Литература", prog3Id, prog3);
  const stud9Id = await createStudent("Марина Цветаева", "Литература", prog3Id, prog3);
  const stud10Id = await createStudent("Анна Ахматова", "Литература", prog3Id, prog3);

  console.log("Seeding groups...");

  const group1Id = await addGroup({
    name: "Группа ОГЭ (Суббота)",
    subjectName: "Математика",
    studentIds: [stud1Id, stud2Id],
    programs: [snapProgram(prog1Id, prog1)],
    price: 1500,
    duration: 90,
    paymentType: "subscription",
    subscriptionLessons: 8,
  });

  const group2Id = await addGroup({
    name: "Большая Группа (Лит-ра)",
    subjectName: "Литература",
    studentIds: [stud5Id, stud6Id, stud7Id, stud8Id, stud9Id, stud10Id],
    programs: [],
    price: 1000,
    duration: 120,
    paymentType: "per_lesson",
    subscriptionLessons: null,
  });

  console.log("Seeding lessons...");

  const ymd = (d) => {
    const yy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yy}-${mm}-${dd}`;
  };

  // Generate for July 2026
  for (let day = 1; day <= 31; day++) {
    const date = new Date(2026, 6, day); // July is 6
    const dateStr = ymd(date);
    
    // We want >3 lessons on certain days (e.g., Mondays and Wednesdays)
    const dayOfWeek = date.getDay(); // 0 = Sunday
    
    let dailyLessonsCount = 0;
    
    if (dayOfWeek === 1 || dayOfWeek === 3) { // Mon, Wed
      dailyLessonsCount = 5; // To test >3 layout constraint
    } else if (dayOfWeek === 6 || dayOfWeek === 0) { // Weekend
      dailyLessonsCount = 2;
    } else { // Tue, Thu, Fri
      dailyLessonsCount = 1;
    }

    // Skip a couple of days completely for variety
    if (day === 4 || day === 15) dailyLessonsCount = 0;

    for (let i = 0; i < dailyLessonsCount; i++) {
      // Pick random student or group
      const types = ["individual", "group"];
      const type = types[Math.floor(Math.random() * types.length)];
      
      let studentId = "";
      let groupId = "";
      let subjectName = "";
      let topicTitle = "";
      
      let price = 0;
      if (type === "individual") {
        const studentsPool = [stud1Id, stud2Id, stud3Id, stud4Id];
        // Make some students have more lessons (e.g. stud1Id appears more often)
        const selectedId = Math.random() < 0.4 ? stud1Id : studentsPool[Math.floor(Math.random() * studentsPool.length)];
        studentId = selectedId;
        subjectName = selectedId === stud3Id ? "Физика" : "Математика";
        price = 2000;
      } else {
        groupId = Math.random() < 0.5 ? group1Id : group2Id;
        subjectName = groupId === group1Id ? "Математика" : "Литература";
        price = groupId === group1Id ? 1500 : 1000;
      }
      
      const startHour = 10 + i * 2; // e.g. 10:00, 12:00, 14:00...
      
      await addLesson({
        type,
        studentId,
        groupId,
        subjectName,
        price,
        date: dateStr,
        startTime: `${startHour}:00`,
        endTime: `${startHour + 1}:30`,
        status: date < new Date() ? "conducted" : "planned",
        homework: Math.random() > 0.5 ? "Сделать домашку" : "",
        hwDoneBy: type === "group" && Math.random() > 0.5 ? [stud5Id, stud6Id] : [], // Randomly mark hw for some
        notes: ""
      });
    }
  }

  console.log("Seeding payments...");
  const studentsToPay = [stud1Id, stud2Id, stud3Id, stud4Id, stud5Id, stud6Id, stud7Id, stud8Id];
  for (const stId of studentsToPay) {
    // 2-3 payments per student in the last few months
    const numPayments = Math.floor(Math.random() * 2) + 2;
    for (let k = 0; k < numPayments; k++) {
      const pDate = new Date(2026, 4 + k, Math.floor(Math.random() * 28) + 1); // May, June, July
      const amount = (Math.floor(Math.random() * 5) + 2) * 1000; // 2000 to 6000
      await addPayment({
        studentId: stId,
        amount: amount,
        currency: "RUB",
        paidAt: pDate.toISOString(),
        note: "Оплата занятий"
      });
    }
    
    // Add one big payment to create an advance for someone
    if (stId === stud1Id) {
      await addPayment({
        studentId: stId,
        amount: 25000,
        currency: "RUB",
        paidAt: new Date(2026, 6, 1).toISOString(),
        note: "Аванс"
      });
    }
  }

  console.log("Seeding finished successfully!");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
