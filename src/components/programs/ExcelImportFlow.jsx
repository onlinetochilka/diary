/**
 * ExcelImportFlow.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Изолированный флоу импорта Excel-файла.
 *
 * Три экрана (state-машина):
 *
 *   'drop'     → Dropzone: перетащи или выбери файл
 *   'parsing'  → "Анализируем методичку..." (загрузка xlsx + парсинг)
 *   'preview'  → DiffPreview: таблица с бейджами + кнопка «Подтвердить импорт»
 *   'saving'   → Запись в Firestore
 *   'error'    → Понятное сообщение об ошибке (Graceful degradation)
 *
 * Всё монтируется поверх редактора как Modal Overlay.
 * xlsx загружается ТОЛЬКО при первом открытии (dynamic import внутри excelAdapter).
 *
 * Кнопка «Скачать шаблон» тоже живёт здесь — генерирует эталонный .xlsx
 * с текущей программой прямо в браузере.
 */
import { useState, useCallback, useRef, useEffect } from "react";
import {
  FileSpreadsheet,
  Upload,
  X,
  CheckCircle2,
  AlertCircle,
  Download,
  ArrowRight,
  RefreshCw,
  FileX,
} from "lucide-react";
import { cn } from "../../utils/cn.js";
import {
  parseExcelFile,
  computeDiff,
  exportProgramToExcel,
  ParseError,
} from "../../services/excelAdapter.js";
import { batchImportProgram } from "../../services/database.js";
import { useToast } from "../ui/Toast.jsx";
import Button from '../ui/Button.jsx';

// ─── Утилиты ──────────────────────────────────────────────────────────────────
function pluralRu(n, one, few, many) {
  const mod10  = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 19) return many;
  if (mod10 === 1)                   return one;
  if (mod10 >= 2 && mod10 <= 4)      return few;
  return many;
}

// ─── Экран 1: Dropzone ───────────────────────────────────────────────────────
function DropScreen({ onFilePicked, onExportTemplate, program }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const inputRef = useRef(null);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer?.files?.[0];
    if (file) onFilePicked(file);
  }, [onFilePicked]);

  const handleDragOver = (e) => { e.preventDefault(); setIsDragOver(true); };
  const handleDragLeave = () => setIsDragOver(false);

  const handleInputChange = (e) => {
    const file = e.target.files?.[0];
    if (file) onFilePicked(file);
    e.target.value = ""; // сбрасываем, чтобы можно было выбрать тот же файл
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportProgramToExcel(program);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* ── Кнопка «Скачать шаблон» ─────────────────────────────── */}
      <div className="flex items-center justify-between gap-3 p-4 rounded-2xl bg-[#1B4F72]/5 border border-[#1B4F72]/15">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-[#1B4F72]">Шаг 1: скачайте шаблон</p>
          <p className="text-xs text-stone-500 mt-0.5 leading-relaxed">
            Программа выгрузится в Excel с сохранёнными ID. Отредактируйте
            нужные темы и загрузите файл обратно.
          </p>
        </div>
        <Button
          variant="filled"
          type="button"
          onClick={handleExport}
          disabled={isExporting}
          className={cn(
            "w-auto h-auto border-none flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl",
            "text-sm font-medium text-white bg-[#1B4F72] hover:bg-[#154060]",
            "transition-all duration-150 active:scale-[0.97]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            "disabled:opacity-50 disabled:pointer-events-none",
          )}
        >
          {isExporting ? (
            <RefreshCw size={14} strokeWidth={2} className="animate-spin" />
          ) : (
            <Download size={14} strokeWidth={2} />
          )}
          {isExporting ? "Готовим..." : "Скачать"}
        </Button>
      </div>

      {/* ── Dropzone ─────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-semibold text-stone-500 mb-2 uppercase tracking-wider">
          Шаг 2: загрузите заполненный файл
        </p>
        <div
          role="button"
          tabIndex={0}
          aria-label="Зона загрузки файла Excel"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") inputRef.current?.click(); }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 px-6 py-10 rounded-2xl",
            "border-2 border-dashed cursor-pointer",
            "transition-all duration-200",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            isDragOver
              ? "border-[#1B4F72] bg-[#1B4F72]/8 scale-[1.01]"
              : "border-stone-200 hover:border-[#1B4F72]/40 hover:bg-stone-50/60",
          )}
        >
          <div className={cn(
            "w-14 h-14 rounded-2xl flex items-center justify-center transition-colors duration-200",
            isDragOver ? "bg-[#1B4F72]/15" : "bg-stone-100",
          )}>
            {isDragOver
              ? <FileSpreadsheet size={28} strokeWidth={1.5} className="text-[#1B4F72]" />
              : <Upload size={28} strokeWidth={1.5} className="text-stone-400" />
            }
          </div>

          <div className="text-center">
            <p className="text-sm font-semibold text-stone-700">
              {isDragOver ? "Отпустите для загрузки" : "Перетащите файл сюда"}
            </p>
            <p className="text-xs text-stone-400 mt-0.5">
              или{" "}
              <span className="text-[#1B4F72] font-medium underline underline-offset-2">
                выберите с компьютера
              </span>
            </p>
            <p className="text-[11px] text-stone-400 mt-2">
              Только .xlsx · Максимум 500 строк
            </p>
          </div>

          <input
            ref={inputRef}
            type="file"
            accept=".xlsx,.xls"
            className="sr-only"
            tabIndex={-1}
            onChange={handleInputChange}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Экран 2: Парсинг (loading) ────────────────────────────────────────────
function ParsingScreen({ fileName }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 px-6">
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-[#1B4F72]/10 flex items-center justify-center">
          <FileSpreadsheet size={32} strokeWidth={1.5} className="text-[#1B4F72]" />
        </div>
        {/* Спиннер поверх иконки */}
        <div className="absolute -inset-1">
          <div className="w-full h-full rounded-3xl border-2 border-transparent border-t-[#1B4F72] animate-spin" />
        </div>
      </div>

      <div className="text-center">
        <p className="text-sm font-semibold text-stone-800">
          Анализируем методичку...
        </p>
        <p className="text-xs text-stone-400 mt-1 max-w-xs">
          {fileName ? `«${fileName}»` : "Читаем файл"} — это займёт секунду
        </p>
      </div>
    </div>
  );
}

// ─── Экран 3: DiffPreview ─────────────────────────────────────────────────
function DiffPreviewScreen({ diff, parsed, onConfirm, onBack, isSaving }) {
  const { added, updated, unchanged, newSections, updatedSections } = diff;

  const Badge = ({ count, label, color }) => (
    <div className={cn("flex items-center gap-1.5 px-3 py-2 rounded-xl", color)}>
      <span className="text-lg font-bold tabular-nums">{count}</span>
      <span className="text-xs leading-tight">{label}</span>
    </div>
  );

  return (
    <div className="flex flex-col gap-5 p-6">
      {/* ── Сводка ──────────────────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-3">
          Итоги анализа
        </p>
        <div className="grid grid-cols-3 gap-2">
          <Badge
            count={added}
            label={pluralRu(added, "новая тема", "новые темы", "новых тем")}
            color="bg-emerald-50 text-emerald-800"
          />
          <Badge
            count={updated}
            label={pluralRu(updated, "обновлена", "обновлены", "обновлено")}
            color="bg-blue-50 text-blue-800"
          />
          <Badge
            count={unchanged}
            label={pluralRu(unchanged, "без изменений", "без изменений", "без изменений")}
            color="bg-stone-50 text-stone-500"
          />
        </div>

        {/* Разделы */}
        {(newSections > 0 || updatedSections > 0) && (
          <div className="mt-2 flex gap-2 flex-wrap">
            {newSections > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-medium">
                +{newSections} {pluralRu(newSections, "новый раздел", "новых раздела", "новых разделов")}
              </span>
            )}
            {updatedSections > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 font-medium">
                {updatedSections} {pluralRu(updatedSections, "раздел", "раздела", "разделов")} сохранено
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Предпросмотр строк ───────────────────────────────────── */}
      <div>
        <p className="text-xs font-bold tracking-widest text-stone-400 uppercase mb-2">
          Распознано тем ({parsed.topics.length})
        </p>
        <div className="max-h-56 overflow-y-auto rounded-xl border border-stone-100 divide-y divide-stone-50">
          {parsed.topics.slice(0, 50).map((topic, i) => {
            const isNew = !topic.id;
            return (
              <div
                key={i}
                className={cn(
                  "flex items-center gap-2 px-3 py-2",
                  isNew ? "bg-emerald-50/40" : "bg-white",
                )}
              >
                {/* Статус-точка */}
                <span className={cn(
                  "w-1.5 h-1.5 rounded-full flex-shrink-0",
                  isNew ? "bg-emerald-400" : "bg-blue-400",
                )} />
                {/* Название темы */}
                <span className="flex-1 min-w-0 text-xs text-stone-700 truncate">
                  {topic.title}
                </span>
                {/* Раздел */}
                <span className="text-[10px] text-stone-400 flex-shrink-0 truncate max-w-[100px]">
                  {parsed.sections.find((s) => s.id === topic.sectionId)?.title}
                </span>
              </div>
            );
          })}
          {parsed.topics.length > 50 && (
            <div className="px-3 py-2 text-[11px] text-stone-400 text-center bg-stone-50">
              и ещё {parsed.topics.length - 50} тем...
            </div>
          )}
        </div>
      </div>

      {/* ── Предупреждение если нет изменений ───────────────────── */}
      {added === 0 && updated === 0 && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-amber-50 border border-amber-100">
          <AlertCircle size={14} strokeWidth={2} className="text-amber-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Файл совпадает с текущей программой — никаких изменений не будет.
          </p>
        </div>
      )}

      {/* ── Кнопки ──────────────────────────────────────────────── */}
      <div className="flex gap-2">
        <Button
          variant="secondary"
          type="button"
          onClick={onBack}
          disabled={isSaving}
          className={cn(
            "w-auto h-auto px-4 py-2.5 rounded-xl text-sm font-medium",
            "text-stone-600 bg-stone-100 hover:bg-stone-200 border-none",
            "transition-colors duration-150 active:scale-[0.98] flex-1",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
            "disabled:opacity-40 disabled:pointer-events-none",
          )}
        >
          ← Изменить файл
        </Button>
        <Button
          variant="filled"
          type="button"
          onClick={onConfirm}
          disabled={isSaving || (added === 0 && updated === 0)}
          className={cn(
            "w-auto h-auto flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border-none",
            "text-sm font-medium text-white bg-[#1B4F72] hover:bg-[#154060]",
            "transition-all duration-150 active:scale-[0.98]",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            "disabled:opacity-40 disabled:pointer-events-none",
          )}
        >
          {isSaving ? (
            <>
              <RefreshCw size={14} strokeWidth={2} className="animate-spin" />
              Сохраняем...
            </>
          ) : (
            <>
              <CheckCircle2 size={14} strokeWidth={2} />
              Подтвердить импорт
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ─── Экран: Ошибка ────────────────────────────────────────────────────────
function ErrorScreen({ message, onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-12 px-6 text-center">
      <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center">
        <FileX size={28} strokeWidth={1.5} className="text-red-400" />
      </div>
      <div>
        <p className="text-sm font-semibold text-stone-800 mb-1">
          Не получилось прочитать файл
        </p>
        <p className="text-sm text-stone-500 leading-relaxed max-w-xs">
          {message}
        </p>
      </div>
      <Button
        variant="outline"
        type="button"
        onClick={onRetry}
        className={cn(
          "w-auto h-auto flex items-center gap-2 px-4 py-2.5 rounded-xl",
          "text-sm font-medium text-[#1B4F72]",
          "border border-[#1B4F72]/25 hover:bg-[#1B4F72]/5 hover:border-[#1B4F72]/40",
          "transition-all duration-150 active:scale-[0.98]",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
        )}
      >
        <RefreshCw size={14} strokeWidth={2} />
        Попробовать другой файл
      </Button>
    </div>
  );
}

// ─── Главный экспорт ──────────────────────────────────────────────────────
/**
 * @param {object}   props.program          — нормализованная программа
 * @param {Function} props.onClose          — закрыть флоу без сохранения
 * @param {Function} props.onImportComplete — ({ program, added, updated }) => void
 */
export default function ExcelImportFlow({ program, onClose, onImportComplete }) {
  const { showToast } = useToast();

  // ── State-машина экранов ─────────────────────────────────────────
  const [screen, setScreen]   = useState("drop");   // drop | parsing | preview | error
  const [fileName, setFileName] = useState("");
  const [parsed, setParsed]   = useState(null);     // ParseResult
  const [diff, setDiff]       = useState(null);     // DiffResult
  const [errorMsg, setErrorMsg] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // ── Фокус-трап: при открытии фокусируем первый элемент ───────────
  const panelRef = useRef(null);
  useEffect(() => {
    const first = panelRef.current?.querySelector(
      "button, [href], input, select, textarea, [tabindex]:not([tabindex='-1'])"
    );
    first?.focus();
  }, []);

  // Закрытие по Escape
  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // ── Обработка выбранного файла ───────────────────────────────────
  const handleFilePicked = useCallback(async (file) => {
    setFileName(file.name);
    setScreen("parsing");
    setErrorMsg("");

    try {
      const result = await parseExcelFile(file);
      const diffResult = computeDiff(program, result);
      setParsed(result);
      setDiff(diffResult);
      setScreen("preview");
    } catch (err) {
      const msg = err instanceof ParseError
        ? err.userMessage
        : "Что-то пошло не так при чтении файла. Проверьте формат и попробуйте снова.";
      setErrorMsg(msg);
      setScreen("error");
    }
  }, [program]);

  // ── Подтверждение импорта ────────────────────────────────────────
  const handleConfirm = useCallback(async () => {
    if (!parsed) return;
    setIsSaving(true);

    try {
      const stats = await batchImportProgram(program.id, {
        sections: parsed.sections,
        topics:   parsed.topics,
      });

      // Строим обновлённую программу для Shell
      // (полную перезагрузку сделает ProgramEditorPage через onProgramChange)
      onImportComplete({
        added:   stats.added,
        updated: stats.updated,
        program: {
          ...program,
          sections: parsed.sections,
          topics:   parsed.topics,
        },
      });
    } catch {
      setIsSaving(false);
      showToast({
        message: "Не удалось сохранить импорт. Проверьте соединение и попробуйте снова.",
        type: "error",
      });
    }
  }, [parsed, program, onImportComplete, showToast]);

  // ── Render ────────────────────────────────────────────────────────
  return (
    /* Overlay */
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Импорт из Excel"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/35 backdrop-blur-sm"
        onClick={!isSaving ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Панель */}
      <div
        ref={panelRef}
        className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90dvh] overflow-y-auto animate-scale-in"
      >
        {/* ── Шапка панели ────────────────────────────────────── */}
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 px-6 py-4 bg-white border-b border-stone-100">
          <div className="flex items-center gap-2">
            <FileSpreadsheet size={18} strokeWidth={2} className="text-[#1B4F72]" />
            <h2 className="text-sm font-bold text-stone-900">
              {screen === "drop"     && "Импорт из Excel"}
              {screen === "parsing"  && "Читаем файл"}
              {screen === "preview"  && "Проверьте изменения"}
              {screen === "error"    && "Ошибка чтения"}
            </h2>
          </div>

          {/* Индикатор шага */}
          <div className="flex items-center gap-1.5 flex-1 justify-center">
            {["drop", "preview"].map((s, i) => (
              <div key={s} className="flex items-center gap-1.5">
                <div className={cn(
                  "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold transition-colors",
                  screen === s || (screen === "parsing" && s === "drop")
                    ? "bg-[#1B4F72] text-white"
                    : screen === "preview" && s === "drop"
                    ? "bg-emerald-500 text-white"
                    : "bg-stone-100 text-stone-400",
                )}>
                  {screen === "preview" && s === "drop"
                    ? <CheckCircle2 size={11} strokeWidth={2.5} />
                    : i + 1
                  }
                </div>
                {i < 1 && (
                  <ArrowRight size={12} strokeWidth={2} className="text-stone-300" />
                )}
              </div>
            ))}
          </div>

          {/* Кнопка закрытия */}
          <Button
            variant="ghost"
            size="icon"
            type="button"
            onClick={onClose}
            disabled={isSaving}
            aria-label="Закрыть"
            className={cn(
              "w-auto h-auto border-none p-1.5 rounded-xl text-stone-400 hover:text-stone-600 hover:bg-stone-100",
              "transition-all duration-150 active:scale-[0.90]",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            <X size={16} strokeWidth={2} />
          </Button>
        </div>

        {/* ── Тело (переключение экранов) ──────────────────────── */}
        {screen === "drop" && (
          <DropScreen
            program={program}
            onFilePicked={handleFilePicked}
            onExportTemplate={() => exportProgramToExcel(program)}
          />
        )}

        {screen === "parsing" && (
          <ParsingScreen fileName={fileName} />
        )}

        {screen === "preview" && parsed && diff && (
          <DiffPreviewScreen
            diff={diff}
            parsed={parsed}
            isSaving={isSaving}
            onConfirm={handleConfirm}
            onBack={() => { setParsed(null); setDiff(null); setScreen("drop"); }}
          />
        )}

        {screen === "error" && (
          <ErrorScreen
            message={errorMsg}
            onRetry={() => { setErrorMsg(""); setScreen("drop"); }}
          />
        )}
      </div>
    </div>
  );
}
