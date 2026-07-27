/**
 * InspectorPanel.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Правая колонка редактора программ (35%, фиксированная ширина).
 *
 * Три режима (Zero-Click — переключаются кликом в левой колонке):
 *
 *   'empty'   — ничего не выбрано → Статистика программы + кнопка Export
 *   'section' → Переименование раздела + статистика раздела
 *   'theme'   → Библиотека ДЗ: просмотр/добавление/удаление заданий
 *
 * Банк ДЗ: topic.homeworkBank: [{ id, text, type }]
 *   type ∈ 'task' | 'question' | 'exercise'
 *
 * Все 8 состояний интерактива реализованы через Tailwind-классы:
 *   Default, Hover, Focus-visible, Active, Disabled, Loading, Error, Success
 *
 * НЕ вызывает Firestore напрямую — делегирует через onProgramChange.
 */
import { useState, useCallback, useRef, useEffect, useId } from "react";
import {
  BookOpen,
  FolderOpen,
  ListChecks,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  ClipboardList,
  FileQuestion,
  Pencil,
  BarChart3,
  FileSpreadsheet,
  Check,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn.js";
import { updateTheme, renameSection } from "../../services/database.js";
import { useToast } from "../ui/Toast.jsx";

// ─── Токены типов заданий ──────────────────────────────────────────────────
const HW_TYPES = [
  {
    id: "task",
    label: "Задача",
    icon: ClipboardList,
    color: "bg-blue-50 text-blue-700 border-blue-200",
    dot: "bg-blue-400",
  },
  {
    id: "question",
    label: "Вопрос",
    icon: FileQuestion,
    color: "bg-violet-50 text-violet-700 border-violet-200",
    dot: "bg-violet-400",
  },
  {
    id: "exercise",
    label: "Упражнение",
    icon: Pencil,
    color: "bg-emerald-50 text-emerald-700 border-emerald-200",
    dot: "bg-emerald-400",
  },
];

const hwTypeMap = Object.fromEntries(HW_TYPES.map((t) => [t.id, t]));

// ─── Вспомогательные компоненты ────────────────────────────────────────────

/** Метка секции (ОСНОВНОЕ / БИБЛИОТЕКА ДЗ) */
function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase px-4 pt-4 pb-1 select-none">
      {children}
    </p>
  );
}

/** Горизонтальный разделитель */
function Divider() {
  return <hr className="border-stone-100 mx-4" />;
}

/** Бейдж типа задания */
function TypeBadge({ typeId }) {
  const t = hwTypeMap[typeId] ?? hwTypeMap.task;
  const Icon = t.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border",
        t.color,
      )}
    >
      <Icon size={10} strokeWidth={2} />
      {t.label}
    </span>
  );
}

/** Счётчик-пилюля */
function CountPill({ count, label, accent }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span
        className={cn(
          "text-xl font-bold tabular-nums",
          accent ?? "text-stone-800",
        )}
      >
        {count}
      </span>
      <span className="text-[11px] text-stone-400">{label}</span>
    </div>
  );
}

// ─── Режим: пустой (статистика программы) ──────────────────────────────────
function EmptyInspector({ program, stats, onRequestExcel }) {
  const completedPct =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <SectionLabel>Программа</SectionLabel>

      {/* Название программы */}
      <div className="px-4 pb-3">
        <p className="text-base font-bold text-stone-900 leading-snug">
          {program.name}
        </p>
        {program.subject && (
          <p className="text-xs text-stone-500 mt-0.5">{program.subject}</p>
        )}
      </div>

      <Divider />

      {/* Статистика */}
      <SectionLabel>Статистика</SectionLabel>
      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={stats.sections} label="разделов" />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={stats.total} label="тем" />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill
            count={`${completedPct}%`}
            label="готово"
            accent={completedPct === 100 ? "text-emerald-600" : "text-[#1B4F72]"}
          />
        </div>
      </div>

      {/* Прогресс-бар */}
      {stats.total > 0 && (
        <div className="px-4 pb-4">
          <div className="h-1.5 rounded-full bg-stone-100 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#1B4F72] transition-all duration-500"
              style={{ width: `${completedPct}%` }}
              role="progressbar"
              aria-valuenow={completedPct}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
          <p className="text-[11px] text-stone-400 mt-1">
            {stats.completed} из {stats.total} тем завершены
          </p>
        </div>
      )}

      <Divider />

      {/* Кнопка экспорта */}
      <div className="px-4 pt-3">
        <button
          type="button"
          onClick={onRequestExcel}
          className={cn(
            "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
            "text-sm font-medium text-[#1B4F72]",
            "border border-[#1B4F72]/25 hover:bg-[#1B4F72]/5 hover:border-[#1B4F72]/40",
            "transition-all duration-150",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            "active:scale-[0.98]",
          )}
        >
          <FileSpreadsheet size={15} strokeWidth={2} />
          Скачать в Excel
        </button>
      </div>

      {/* Подсказка */}
      <p className="px-4 pt-4 text-[11px] text-stone-400 leading-relaxed">
        Выберите тему слева, чтобы открыть библиотеку заданий, или раздел — для
        его переименования.
      </p>
    </div>
  );
}

// ─── Режим: выбран раздел ──────────────────────────────────────────────────
function SectionInspector({ section, topics, programId, onProgramChange }) {
  const { showToast } = useToast();
  const [title, setTitle]       = useState(section.title);
  const [status, setStatus]     = useState("idle"); // idle | saving | success | error
  const savedTitle              = useRef(section.title);
  const inputId                 = useId();

  // При смене выбранного раздела — сбрасываем форму
  useEffect(() => {
    setTitle(section.title);
    savedTitle.current = section.title;
    setStatus("idle");
  }, [section.id, section.title]);

  const isDirty = title.trim() !== savedTitle.current;

  const handleSave = useCallback(async () => {
    const trimmed = title.trim();
    if (!trimmed || trimmed === savedTitle.current) return;

    setStatus("saving");
    try {
      const result = await renameSection(programId, section.id, trimmed);
      savedTitle.current = trimmed;
      setStatus("success");
      onProgramChange((prev) => ({ ...prev, sections: result.sections }));
      setTimeout(() => setStatus("idle"), 1500);
    } catch {
      setStatus("error");
      showToast({ message: "Не удалось переименовать раздел.", type: "error" });
      setTimeout(() => setStatus("idle"), 2000);
    }
  }, [title, section.id, programId, onProgramChange, showToast]);

  const handleKeyDown = (e) => {
    if (e.key === "Enter") { e.preventDefault(); handleSave(); }
    if (e.key === "Escape") { setTitle(savedTitle.current); }
  };

  // Статистика раздела
  const sectionTopics   = topics.filter((t) => t.sectionId === section.id);
  const completedCount  = sectionTopics.filter((t) => t.isCompleted).length;
  const totalHw         = sectionTopics.reduce((n, t) => n + (t.homeworkBank?.length ?? 0), 0);

  return (
    <div className="flex flex-col animate-fade-in">
      <SectionLabel>Раздел</SectionLabel>

      {/* Поле переименования */}
      <div className="px-4 pb-3">
        <label
          htmlFor={inputId}
          className="text-xs font-medium text-stone-600 mb-1.5 block"
        >
          Название раздела
        </label>
        <div className="relative flex gap-2">
          <input
            id={inputId}
            type="text"
            value={title}
            onChange={(e) => { setTitle(e.target.value); setStatus("idle"); }}
            onKeyDown={handleKeyDown}
            onBlur={handleSave}
            maxLength={100}
            disabled={status === "saving"}
            aria-describedby={`${inputId}-hint`}
            className={cn(
              "flex-1 min-w-0 px-3 py-2 rounded-xl text-sm text-stone-800",
              "border bg-white transition-all duration-150",
              "placeholder:text-stone-400",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              status === "error"   && "border-red-300 bg-red-50",
              status === "success" && "border-emerald-300 bg-emerald-50",
              status === "idle" || status === "saving"
                ? "border-stone-200"
                : "",
            )}
          />
          {/* Иконка состояния */}
          <div className="flex-shrink-0 flex items-center">
            {status === "saving" && (
              <div className="w-4 h-4 rounded-full border-2 border-[#1B4F72] border-t-transparent animate-spin" />
            )}
            {status === "success" && (
              <Check size={16} strokeWidth={2.5} className="text-emerald-500" />
            )}
            {status === "error" && (
              <X size={16} strokeWidth={2.5} className="text-red-500" />
            )}
          </div>
        </div>
        <p id={`${inputId}-hint`} className="text-[11px] text-stone-400 mt-1">
          {status === "saving"  && "Сохраняем..."}
          {status === "success" && "Название сохранено"}
          {status === "error"   && "Не удалось сохранить. Попробуйте ещё раз."}
          {(status === "idle" && isDirty) && "Нажмите Enter или уберите фокус для сохранения"}
          {(status === "idle" && !isDirty) && "Изменения сохраняются автоматически"}
        </p>
      </div>

      <Divider />
      <SectionLabel>Статистика раздела</SectionLabel>

      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={sectionTopics.length} label="тем" />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={completedCount} label="готово" accent="text-emerald-600" />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={totalHw} label="заданий" accent="text-[#1B4F72]" />
        </div>
      </div>
    </div>
  );
}

// ─── Режим: выбрана тема — Библиотека ДЗ ─────────────────────────────────
function ThemeInspector({ theme, programId, onProgramChange }) {
  const { showToast } = useToast();

  // Локальная копия банка — оптимистичные обновления
  const [bank, setBank]         = useState(theme.homeworkBank ?? []);
  const [addText, setAddText]   = useState("");
  const [addType, setAddType]   = useState("task");
  const [isAdding, setIsAdding] = useState(false);
  const [savingId, setSavingId] = useState(null); // id задания, которое сейчас удаляем
  const [sessionDone, setSessionDone] = useState({}); // id → bool (чекбокс сессии)
  const textareaRef = useRef(null);
  const addFormRef  = useRef(null);

  // При смене темы — сбрасываем форму и локальный банк
  useEffect(() => {
    setBank(theme.homeworkBank ?? []);
    setAddText("");
    setIsAdding(false);
    setSessionDone({});
    setSavingId(null);
  }, [theme.id]);

  // Синхронизируем bank с приходящими снаружи данными (после onProgramChange)
  useEffect(() => {
    setBank(theme.homeworkBank ?? []);
  }, [theme.homeworkBank]);

  /** Сохранение банка в Firestore + обновление Shell */
  const persistBank = useCallback(
    async (newBank, snapshotBank) => {
      try {
        await updateTheme(programId, theme.id, { homeworkBank: newBank });
        onProgramChange((prev) => ({
          ...prev,
          topics: prev.topics.map((t) =>
            t.id === theme.id ? { ...t, homeworkBank: newBank } : t
          ),
        }));
      } catch {
        setBank(snapshotBank);
        showToast({ message: "Не удалось сохранить задание.", type: "error" });
      }
    },
    [programId, theme.id, onProgramChange, showToast],
  );

  /** Добавить задание в банк */
  const handleAddItem = useCallback(async () => {
    const text = addText.trim();
    if (!text) return;

    const newItem = {
      id:   `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      type: addType,
    };
    const snapshot = bank;
    const newBank  = [...bank, newItem];

    setBank(newBank);
    setAddText("");
    setIsAdding(false);
    await persistBank(newBank, snapshot);
  }, [addText, addType, bank, persistBank]);

  /** Удалить задание */
  const handleDeleteItem = useCallback(async (itemId) => {
    const snapshot = bank;
    const newBank  = bank.filter((item) => item.id !== itemId);
    setSavingId(itemId);
    setBank(newBank);
    await persistBank(newBank, snapshot);
    setSavingId(null);
  }, [bank, persistBank]);

  /** Чекбокс «использовано сегодня» (только в памяти) */
  const toggleSessionDone = (id) =>
    setSessionDone((prev) => ({ ...prev, [id]: !prev[id] }));

  const doneCount = Object.values(sessionDone).filter(Boolean).length;

  return (
    <div className="flex flex-col animate-fade-in">
      {/* ── Шапка темы ──────────────────────────────────────────── */}
      <SectionLabel>Тема</SectionLabel>
      <div className="px-4 pb-3">
        {/* Статус завершения */}
        <div className="flex items-start gap-2">
          {theme.isCompleted
            ? <CheckCircle2 size={15} strokeWidth={2} className="text-emerald-500 mt-0.5 flex-shrink-0" />
            : <Circle size={15} strokeWidth={2} className="text-stone-300 mt-0.5 flex-shrink-0" />
          }
          <p className={cn(
            "text-sm font-semibold leading-snug",
            theme.isCompleted ? "text-stone-400 line-through" : "text-stone-900",
          )}>
            {theme.title}
          </p>
        </div>
        {theme.isCompleted && (
          <p className="text-[11px] text-emerald-600 mt-1 ml-5">Тема завершена</p>
        )}
      </div>

      <Divider />

      {/* ── Банк заданий ─────────────────────────────────────────── */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListChecks size={14} strokeWidth={2} className="text-[#1B4F72]" />
          <span className="text-xs font-semibold text-stone-700">
            Библиотека заданий
          </span>
          {bank.length > 0 && (
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#1B4F72]/10 text-[#1B4F72]">
              {bank.length}
            </span>
          )}
        </div>
        {doneCount > 0 && (
          <span className="text-[10px] text-emerald-600 font-medium">
            ✓ {doneCount} исп.
          </span>
        )}
      </div>

      {/* Список заданий */}
      <div className="px-4 pb-2 space-y-1.5 max-h-[380px] overflow-y-auto">
        {bank.length === 0 && !isAdding && (
          <div className="py-6 text-center">
            <BookOpen size={28} strokeWidth={1} className="mx-auto text-stone-200 mb-2" />
            <p className="text-xs text-stone-400">
              Банк заданий пуст.
              <br />
              Добавьте первое задание ↓
            </p>
          </div>
        )}

        {bank.map((item) => {
          const isDone = sessionDone[item.id] ?? false;
          const isDeleting = savingId === item.id;

          return (
            <div
              key={item.id}
              className={cn(
                "group/hw flex items-start gap-2 p-2.5 rounded-xl border",
                "transition-all duration-150",
                isDone
                  ? "bg-emerald-50/60 border-emerald-100"
                  : "bg-stone-50 border-stone-100 hover:border-stone-200",
                isDeleting && "opacity-40 pointer-events-none",
              )}
            >
              {/* Чекбокс сессии */}
              <button
                type="button"
                aria-label={isDone ? "Убрать отметку" : "Отметить как использованное"}
                onClick={() => toggleSessionDone(item.id)}
                className={cn(
                  "mt-0.5 flex-shrink-0 transition-all duration-150",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
                  "active:scale-[0.85]",
                )}
              >
                {isDone
                  ? <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-500" />
                  : <Circle size={14} strokeWidth={2} className="text-stone-300 hover:text-stone-500" />
                }
              </button>

              {/* Текст задания */}
              <div className="flex-1 min-w-0 space-y-1">
                <p className={cn(
                  "text-xs leading-relaxed text-stone-700",
                  isDone && "line-through text-stone-400",
                )}>
                  {item.text}
                </p>
                <TypeBadge typeId={item.type} />
              </div>

              {/* Удаление */}
              <button
                type="button"
                aria-label="Удалить задание"
                onClick={() => handleDeleteItem(item.id)}
                disabled={isDeleting}
                className={cn(
                  "p-0.5 rounded text-stone-300 flex-shrink-0",
                  "opacity-0 group-hover/hw:opacity-100",
                  "hover:text-red-400 hover:bg-red-50",
                  "transition-all duration-150 active:scale-[0.85]",
                  "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
                )}
              >
                {isDeleting
                  ? <div className="w-3 h-3 rounded-full border-2 border-stone-300 border-t-transparent animate-spin" />
                  : <Trash2 size={13} strokeWidth={2} />
                }
              </button>
            </div>
          );
        })}
      </div>

      {/* ── Форма добавления задания ─────────────────────────────── */}
      <div className="px-4 pb-4 pt-1" ref={addFormRef}>
        {isAdding ? (
          <div className="border border-[#1B4F72]/20 rounded-xl bg-white overflow-hidden">
            {/* Выбор типа */}
            <div className="flex border-b border-stone-100">
              {HW_TYPES.map((t) => {
                const Icon = t.icon;
                const active = addType === t.id;
                return (
                  <button
                    key={t.id}
                    type="button"
                    onClick={() => setAddType(t.id)}
                    aria-pressed={active}
                    className={cn(
                      "flex-1 flex flex-col items-center gap-0.5 py-2 text-[10px] font-semibold",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#1B4F72]",
                      active
                        ? "bg-[#1B4F72]/8 text-[#1B4F72]"
                        : "text-stone-400 hover:text-stone-600 hover:bg-stone-50",
                    )}
                  >
                    <Icon size={13} strokeWidth={2} />
                    {t.label}
                  </button>
                );
              })}
            </div>

            {/* Textarea */}
            <textarea
              ref={textareaRef}
              autoFocus
              value={addText}
              onChange={(e) => setAddText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleAddItem();
                if (e.key === "Escape") { setIsAdding(false); setAddText(""); }
              }}
              placeholder="Опишите задание для ученика..."
              maxLength={500}
              rows={3}
              className={cn(
                "w-full px-3 py-2.5 text-sm text-stone-800 resize-none",
                "placeholder:text-stone-400",
                "focus:outline-none",
                "border-0 bg-transparent",
              )}
            />

            {/* Кнопки */}
            <div className="flex items-center justify-between px-3 py-2 bg-stone-50/60 border-t border-stone-100">
              <span className="text-[10px] text-stone-400">
                {addText.length}/500 · Ctrl+Enter для сохранения
              </span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => { setIsAdding(false); setAddText(""); }}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium",
                    "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
                    "transition-colors duration-150",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-400",
                    "active:scale-[0.97]",
                  )}
                >
                  Отмена
                </button>
                <button
                  type="button"
                  onClick={handleAddItem}
                  disabled={!addText.trim()}
                  className={cn(
                    "px-2.5 py-1.5 rounded-lg text-xs font-medium",
                    "bg-[#1B4F72] text-white hover:bg-[#154060]",
                    "transition-all duration-150 active:scale-[0.97]",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
                    "disabled:opacity-40 disabled:pointer-events-none",
                  )}
                >
                  Добавить
                </button>
              </div>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => { setIsAdding(true); setTimeout(() => textareaRef.current?.focus(), 50); }}
            className={cn(
              "w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl",
              "text-sm font-medium text-[#1B4F72]",
              "border border-dashed border-[#1B4F72]/25 hover:border-[#1B4F72]/50 hover:bg-[#1B4F72]/5",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
              "active:scale-[0.98]",
            )}
          >
            <Plus size={14} strokeWidth={2} />
            Добавить задание
          </button>
        )}
      </div>

      {/* ── Подсказка по типам ───────────────────────────────────── */}
      {bank.length === 0 && (
        <div className="px-4 pb-4">
          <p className="text-[11px] text-stone-400 leading-relaxed">
            Сохраняйте задания в банке и выдавайте их ученику при необходимости.
            Чекбокс напротив — для отметки «использовано на этом уроке» (не
            сохраняется между сессиями).
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Главный экспорт ───────────────────────────────────────────────────────
/**
 * @param {object}   props.program         — нормализованная программа
 * @param {object}   props.selectedItem    — { type: 'theme'|'section'|null, id: string|null }
 * @param {object}   props.stats           — { sections, total, completed }
 * @param {Function} props.onProgramChange — (updater) => void
 * @param {Function} [props.onRequestExcel] — открыть Excel-флоу (из ShellPage)
 */
export default function InspectorPanel({
  program,
  selectedItem,
  stats,
  onProgramChange,
  onRequestExcel,
}) {
  if (!program) return null;

  const { type, id } = selectedItem ?? {};

  // ── Режим: тема ─────────────────────────────────────────────────
  if (type === "theme" && id) {
    const theme = program.topics?.find((t) => t.id === id);
    if (theme) {
      return (
        <ThemeInspector
          key={id} // key сбрасывает стейт при смене темы
          theme={theme}
          programId={program.id}
          onProgramChange={onProgramChange}
        />
      );
    }
  }

  // ── Режим: раздел ────────────────────────────────────────────────
  if (type === "section" && id) {
    const section = program.sections?.find((s) => s.id === id);
    if (section) {
      return (
        <SectionInspector
          key={id}
          section={section}
          topics={program.topics ?? []}
          programId={program.id}
          onProgramChange={onProgramChange}
        />
      );
    }
  }

  // ── Режим: пустой (дефолт) ───────────────────────────────────────
  return (
    <EmptyInspector
      program={program}
      stats={stats ?? { sections: 0, total: 0, completed: 0 }}
      onRequestExcel={onRequestExcel ?? (() => {})}
    />
  );
}
