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
 * Все 8 состояний интерактива реализованы через Tailwind-классы:
 *   Default, Hover, Focus-visible, Active, Disabled, Loading, Error, Success
 *
 * НЕ вызывает Firestore напрямую — делегирует через onProgramChange.
 *
 * Атомарные компоненты → InspectorPanelAtoms.jsx
 * Компонент задания    → TaskComposer.jsx
 */
import { useState, useCallback, useRef, useEffect, useId } from "react";
import {
  BookOpen,
  ListChecks,
  CheckCircle2,
  Circle,
  Plus,
  BarChart3,
  FileSpreadsheet,
  Check,
  X,
} from "lucide-react";
import { cn } from "../../utils/cn.js";
import { updateTheme, renameSection } from "../../services/database.js";
import { useToast } from "../ui/Toast.jsx";
import { SectionLabel, Divider, CountPill, getPlural } from "./InspectorPanelAtoms.jsx";
import { TaskComposer, TaskCard } from "./TaskComposer.jsx";

// ─── Режим: пустой (статистика программы) ──────────────────────────────────
function EmptyInspector({ program, stats, onProgramChange, onRequestExcel }) {
  const completedPct =
    stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const handleNameChange = (e) => {
    onProgramChange((prev) => ({ ...prev, name: e.target.value }));
  };

  const handleSubjectChange = (e) => {
    onProgramChange((prev) => ({ ...prev, subject: e.target.value }));
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      <SectionLabel>Программа</SectionLabel>

      {/* Название и предмет программы (редактируемые) */}
      <div className="px-4 pb-3 space-y-3">
        <div>
          <label className="text-xs font-medium text-stone-600 mb-1.5 block">
            Название программы <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={program.name || ""}
            onChange={handleNameChange}
            placeholder="Например: ОГЭ Математика"
            maxLength={150}
            className={cn(
              "w-full px-3 py-2 rounded-xl text-sm font-bold text-stone-900",
              "border border-stone-200 bg-white transition-all duration-150",
              "placeholder:text-stone-400 placeholder:font-normal",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]"
            )}
          />
        </div>
        <div>
          <label className="text-xs font-medium text-stone-600 mb-1.5 block">
            Предмет <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={program.subject || ""}
            onChange={handleSubjectChange}
            placeholder="Например: Математика"
            maxLength={100}
            className={cn(
              "w-full px-3 py-2 rounded-xl text-xs font-medium text-stone-600",
              "border border-stone-200 bg-white transition-all duration-150",
              "placeholder:text-stone-400 placeholder:font-normal",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]"
            )}
          />
        </div>
      </div>

      <Divider />

      {/* Статистика */}
      <SectionLabel>Статистика</SectionLabel>
      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={stats.sections} label={getPlural(stats.sections, "раздел", "раздела", "разделов")} />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={stats.total} label={getPlural(stats.total, "тема", "темы", "тем")} />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill
            count={`${completedPct}%`}
            label="пройдено"
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
            {stats.completed} из {stats.total} {getPlural(stats.total, "темы", "тем", "тем")} завершено
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
  const [title, setTitle]   = useState(section.title);
  const [status, setStatus] = useState("idle"); // idle | saving | success | error
  const savedTitle          = useRef(section.title);
  const inputId             = useId();

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
  const sectionTopics  = topics.filter((t) => t.sectionId === section.id);
  const completedCount = sectionTopics.filter((t) => t.isCompleted).length;
  const totalHw        = sectionTopics.reduce((n, t) => n + (t.homeworkBank?.length ?? 0), 0);

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
          {(status === "idle" && isDirty)  && "Нажмите Enter или уберите фокус для сохранения"}
          {(status === "idle" && !isDirty) && "Изменения сохраняются автоматически"}
        </p>
      </div>

      <Divider />
      <SectionLabel>Статистика раздела</SectionLabel>

      <div className="px-4 pb-4 grid grid-cols-3 gap-2">
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={sectionTopics.length} label={getPlural(sectionTopics.length, "тема", "темы", "тем")} />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={completedCount} label={getPlural(completedCount, "пройдена", "пройдено", "пройдено")} accent="text-emerald-600" />
        </div>
        <div className="bg-stone-50 rounded-xl p-2.5 text-center">
          <CountPill count={totalHw} label={getPlural(totalHw, "задание", "задания", "заданий")} accent="text-[#1B4F72]" />
        </div>
      </div>
    </div>
  );
}

// ─── Режим: выбрана тема — Библиотека ДЗ ─────────────────────────────────
function ThemeInspector({ theme, programId, onProgramChange }) {
  const { showToast } = useToast();

  // Локальная копия банка — оптимистичные обновления
  const [bank, setBank]               = useState(theme.homeworkBank ?? []);
  const [isAdding, setIsAdding]       = useState(false);
  const [savingId, setSavingId]       = useState(null);
  const [sessionDone, setSessionDone] = useState({});
  const addFormRef                    = useRef(null);

  // При смене темы — сбрасываем форму и локальный банк
  useEffect(() => {
    setBank(theme.homeworkBank ?? []);
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
  const handleAddItem = useCallback(async (text, type) => {
    if (!text.trim()) return;
    const newItem = {
      id:   `hw_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      text,
      type,
    };
    const snapshot = bank;
    const newBank  = [...bank, newItem];
    setBank(newBank);
    setIsAdding(false);
    await persistBank(newBank, snapshot);
  }, [bank, persistBank]);

  /** Редактировать задание */
  const handleEditItem = useCallback(async (itemId, newText, newType) => {
    const snapshot = bank;
    const newBank = bank.map(item =>
      item.id === itemId ? { ...item, text: newText, type: newType } : item
    );
    setBank(newBank);
    await persistBank(newBank, snapshot);
  }, [bank, persistBank]);

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

  /** Переключение статуса завершения темы */
  const handleToggleComplete = useCallback(async () => {
    const nextState = !theme.isCompleted;
    try {
      await updateTheme(programId, theme.id, { isCompleted: nextState });
      onProgramChange((prev) => ({
        ...prev,
        topics: prev.topics.map((t) =>
          t.id === theme.id ? { ...t, isCompleted: nextState } : t
        ),
      }));
    } catch {
      showToast({ message: "Не удалось изменить статус темы.", type: "error" });
    }
  }, [programId, theme.id, theme.isCompleted, onProgramChange, showToast]);

  const doneCount = Object.values(sessionDone).filter(Boolean).length;

  return (
    <div className="flex flex-col animate-fade-in">
      {/* ── Шапка темы ──────────────────────────────────────────── */}
      <SectionLabel>Тема</SectionLabel>
      <div className="px-4 pb-3">
        {/* Статус завершения */}
        <div
          onClick={handleToggleComplete}
          className="flex items-start gap-2 cursor-pointer hover:opacity-80 transition-opacity duration-150 group/theme-header"
        >
          {theme.isCompleted ? (
            <CheckCircle2 size={15} strokeWidth={2} className="text-emerald-500 mt-0.5 flex-shrink-0" />
          ) : (
            <Circle size={15} strokeWidth={2} className="text-stone-300 mt-0.5 flex-shrink-0 group-hover/theme-header:text-stone-400" />
          )}
          <p className={cn(
            "text-sm font-semibold leading-snug",
            theme.isCompleted ? "text-stone-400 line-through" : "text-stone-900",
          )}>
            {theme.title}
          </p>
        </div>

        {/* Плашка «Тема завершена» — интерактивный тумблер */}
        <div className="mt-2 ml-5">
          <button
            type="button"
            onClick={handleToggleComplete}
            className={cn(
              "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium cursor-pointer hover:opacity-80 transition-opacity duration-150 select-none",
              theme.isCompleted
                ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                : "bg-stone-100 text-stone-600 border border-stone-200/60 hover:bg-stone-200/70"
            )}
          >
            <CheckCircle2
              size={13}
              strokeWidth={2}
              className={theme.isCompleted ? "text-emerald-500" : "text-stone-400"}
            />
            <span>{theme.isCompleted ? "Тема завершена" : "Отметить как завершённую"}</span>
          </button>
        </div>
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
              Здесь пока пусто.
              <br />
              Добавьте первое задание ↓
            </p>
          </div>
        )}

        {bank.map((item) => (
          <TaskCard
            key={item.id}
            item={item}
            isDone={sessionDone[item.id] ?? false}
            isDeleting={savingId === item.id}
            onToggleDone={toggleSessionDone}
            onDelete={handleDeleteItem}
            onEdit={handleEditItem}
          />
        ))}
      </div>

      {/* ── Форма добавления задания ─────────────────────────────── */}
      <div className="px-4 pb-4 pt-1" ref={addFormRef}>
        {isAdding ? (
          <TaskComposer
            autoFocus
            initialText=""
            initialType=""
            onSave={(text, type) => handleAddItem(text, type)}
            onCancel={() => setIsAdding(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAdding(true)}
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
            Добавленные задания сохраняются в библиотеке.
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
      onProgramChange={onProgramChange}
      onRequestExcel={onRequestExcel ?? (() => {})}
    />
  );
}
