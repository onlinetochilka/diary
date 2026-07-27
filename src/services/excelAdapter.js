/**
 * excelAdapter.js — Excel Round-Trip Engineering
 * ─────────────────────────────────────────────────────────────────────────────
 * Вся логика работы с Excel строго изолирована здесь.
 * Библиотека xlsx загружается через динамический импорт —
 * она НЕ входит в стартовый бандл.
 *
 * Структура .xlsx-файла (шаблон и импорт):
 *   Лист «Программа»:
 *     Строка 1 — шапка (зафиксирована/заморожена)
 *     Колонки:
 *       A  — ID темы (скрытая, заблокированная; пустая = новая тема)
 *       B  — Раздел (название раздела)
 *       C  — Порядок в разделе (число)
 *       D  — Название темы
 *       E  — Завершена (ДА / пусто)
 *
 * ЛИМИТ: > 500 строк данных → немедленный отказ без подвисания браузера.
 */

const MAX_ROWS = 500;

// ─── Динамическая загрузка xlsx ──────────────────────────────────────────────
let _xlsxPromise = null;

async function loadXlsx() {
  if (!_xlsxPromise) {
    _xlsxPromise = import("xlsx").then((m) => m.default ?? m);
  }
  return _xlsxPromise;
}

// ─── Экспорт программы в .xlsx ───────────────────────────────────────────────

/**
 * Генерирует .xlsx файл из программы и скачивает его в браузере.
 *
 * @param {object} program — нормализованная программа (после migrateToSections)
 * @returns {Promise<void>}
 */
export async function exportProgramToExcel(program) {
  const XLSX = await loadXlsx();

  const { sections = [], topics = [], name = "Программа" } = program;

  // Строим плоский массив строк в правильном порядке
  const rows = [];

  sections.forEach((section) => {
    const sectionTopics = section.topicIds
      .map((id) => topics.find((t) => t.id === id))
      .filter(Boolean);

    sectionTopics.forEach((topic, i) => {
      rows.push({
        __id:     topic.id,          // скрытая колонка A
        section:  section.title,     // B
        order:    i + 1,             // C
        title:    topic.title,       // D
        done:     topic.isCompleted ? "ДА" : "", // E
      });
    });
  });

  // Шапка
  const header = [["ID (не менять)", "Раздел", "№ п/п", "Тема", "Завершена"]];
  const dataRows = rows.map((r) => [r.__id, r.section, r.order, r.title, r.done]);
  const wsData = [...header, ...dataRows];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Ширина колонок
  ws["!cols"] = [
    { wch: 12 },  // A — ID (узкая)
    { wch: 28 },  // B — Раздел
    { wch: 8  },  // C — №
    { wch: 60 },  // D — Тема
    { wch: 12 },  // E — Завершена
  ];

  // Заморозка шапки
  ws["!freeze"] = { xSplit: 0, ySplit: 1 };

  // Скрыть колонку A (ID) — через !cols hidden
  ws["!cols"][0] = { wch: 0, hidden: true };

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Программа");

  // Метаданные книги
  wb.Props = {
    Title:   name,
    Author:  "Точилка",
    Subject: "Учебная программа",
  };

  // Скачивание
  const safeFileName = name.replace(/[^а-яёА-ЯЁa-zA-Z0-9_\- ]/g, "").trim() || "program";
  XLSX.writeFile(wb, `${safeFileName}.xlsx`);
}

// ─── Парсинг .xlsx файла ─────────────────────────────────────────────────────

/**
 * Читает загруженный файл и возвращает структуру для DiffPreview.
 *
 * @param {File} file — объект File из <input type="file"> или Dropzone
 * @returns {Promise<ParseResult>}
 *
 * ParseResult:
 *   {
 *     sections: Section[],
 *     topics:   Topic[],
 *     rawRows:  number,      // кол-во строк данных (без шапки)
 *   }
 *
 * Throws ParseError (с полем .userMessage) при любой проблеме.
 */
export async function parseExcelFile(file) {
  // ── Проверка формата ────────────────────────────────────────────
  if (!file) throw new ParseError("Файл не выбран.");

  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "xls") {
    throw new ParseError(
      `Кажется, это не Excel. Нам нужен формат .xlsx — попробуйте сохранить файл в Excel как «Книга Excel (.xlsx)».`
    );
  }

  if (file.type && !file.type.includes("spreadsheet") && !file.type.includes("excel") && file.type !== "application/octet-stream") {
    throw new ParseError(
      `Кажется, это не Excel. Нам нужен формат .xlsx — попробуйте сохранить файл как «Книга Excel (.xlsx)».`
    );
  }

  // ── Чтение файла ────────────────────────────────────────────────
  const XLSX = await loadXlsx();
  const buffer = await file.arrayBuffer();

  let wb;
  try {
    wb = XLSX.read(buffer, { type: "array" });
  } catch {
    throw new ParseError(
      "Не удалось прочитать файл. Возможно, он повреждён или защищён паролем."
    );
  }

  // Берём первый лист
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    throw new ParseError("Файл пуст — в нём нет ни одного листа.");
  }

  const ws  = wb.Sheets[sheetName];
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

  // ── Лимит строк ─────────────────────────────────────────────────
  const dataRows = raw.slice(1).filter((row) => row.some((cell) => cell !== ""));
  if (dataRows.length > MAX_ROWS) {
    throw new ParseError(
      `Слишком большой файл: ${dataRows.length} строк. Максимум — ${MAX_ROWS}. Разбейте методичку на несколько файлов.`
    );
  }

  if (dataRows.length === 0) {
    throw new ParseError("Файл не содержит строк с данными. Добавьте хотя бы одну тему.");
  }

  // ── Определяем формат ───────────────────────────────────────────
  // Шапка строка 1:  ["ID (не менять)", "Раздел", "№ п/п", "Тема", "Завершена"]
  // Также пробуем «свободный» формат без скрытого ID (3 колонки: Раздел, №, Тема)
  const headerRow = raw[0] ?? [];
  const hasIdColumn = String(headerRow[0]).toLowerCase().includes("id") ||
                      String(headerRow[0]).toLowerCase().includes("не менять");

  // ── Парсинг строк ───────────────────────────────────────────────
  const sectionsMap = new Map(); // title → Section
  const topics = [];

  for (const row of dataRows) {
    let id, sectionTitle, orderRaw, title, done;

    if (hasIdColumn) {
      [id, sectionTitle, orderRaw, title, done] = row;
    } else {
      // Свободный формат: Раздел | № | Тема
      [sectionTitle, orderRaw, title] = row;
      id = "";
      done = "";
    }

    const titleStr = String(title ?? "").trim();
    if (!titleStr) continue; // пропускаем пустые строки

    const sectionStr = String(sectionTitle ?? "").trim() || "Основные темы";
    const idStr      = String(id ?? "").trim();
    const isDone     = String(done ?? "").toLowerCase() === "да";

    // Создаём раздел если не встречали
    if (!sectionsMap.has(sectionStr)) {
      sectionsMap.set(sectionStr, {
        id:       `imported_sec_${sectionsMap.size}_${Date.now()}`,
        title:    sectionStr,
        order:    sectionsMap.size,
        topicIds: [],
      });
    }

    const section = sectionsMap.get(sectionStr);
    const topicId = idStr || null; // null = новая тема (нет ID)

    const topic = {
      id:          topicId, // null пока — batchImportProgram назначит новый ID
      title:       titleStr,
      sectionId:   section.id,
      order:       section.topicIds.length,
      isCompleted: isDone,
      homeworkBank: [], // при импорте не трогаем — batchImportProgram сохранит существующий
    };

    section.topicIds.push(topicId ?? `__pending_${topics.length}`);
    topics.push(topic);
  }

  const sections = Array.from(sectionsMap.values());

  return { sections, topics, rawRows: dataRows.length };
}

// ─── Вычисление Diff ─────────────────────────────────────────────────────────

/**
 * Сравнивает существующую программу с распарсенными данными.
 * Возвращает статистику для DiffPreview.
 *
 * @param {object} existing — нормализованная программа
 * @param {object} parsed   — результат parseExcelFile
 * @returns {DiffResult}
 *
 * DiffResult: { added, updated, unchanged, newSections, updatedSections }
 */
export function computeDiff(existing, parsed) {
  const existingById = Object.fromEntries(
    (existing.topics ?? []).map((t) => [t.id, t])
  );

  let added     = 0;
  let updated   = 0;
  let unchanged = 0;

  for (const topic of parsed.topics) {
    if (topic.id && existingById[topic.id]) {
      const ex = existingById[topic.id];
      if (ex.title !== topic.title || ex.sectionId !== topic.sectionId) {
        updated++;
      } else {
        unchanged++;
      }
    } else {
      added++;
    }
  }

  // Разделы
  const existingSectionTitles = new Set((existing.sections ?? []).map((s) => s.title));
  const newSections     = parsed.sections.filter((s) => !existingSectionTitles.has(s.title)).length;
  const updatedSections = parsed.sections.filter((s) =>  existingSectionTitles.has(s.title)).length;

  return { added, updated, unchanged, newSections, updatedSections };
}

// ─── Вспомогательный класс ошибки ────────────────────────────────────────────

export class ParseError extends Error {
  constructor(userMessage) {
    super(userMessage);
    this.name        = "ParseError";
    this.userMessage = userMessage;
  }
}
