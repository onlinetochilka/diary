/**
 * ProgramEditorPage.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Полноэкранный редактор учебной программы.
 *
 * App Shell (Шаг 2) — отвечает за:
 *   • Структуру разметки: .pe-shell → .pe-header → .pe-body → [.pe-structure | .pe-inspector]
 *   • Независимый скролл колонок (левая 65%, правая 35% фиксированная)
 *   • Guard-защиту: при попытке уйти с несохранёнными изменениями → Modal подтверждения
 *   • State-машину выбранного элемента для Zero-Click Inspector
 *
 * Дочерние компоненты (реализуются в Шагах 3–5):
 *   ProgramStructure  — левая колонка (DnD-список)
 *   InspectorPanel    — правая колонка (инспектор)
 *   ExcelImportFlow   — изолированный флоу импорта
 *
 * НЕ содержит бизнес-логики DnD и Инспектора — только Shell.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import {
  ArrowLeft,
  BookOpen,
  FileSpreadsheet,
} from "lucide-react";
import { cn } from "../../utils/cn.js";
import {
  migrateToSections,
  getProgram,
  updateProgramStructure,
} from "../../services/database.js";
import { useToast } from "../ui/Toast.jsx";
import { Tooltip } from "../ui/index.js";

// ─── Skeleton пока программа загружается ─────────────────────────────────────
function EditorSkeleton() {
  return (
    <div className="flex gap-4 lg:gap-6 w-full h-full max-w-[1400px] mx-auto overflow-hidden animate-pulse">
      {/* Левая колонка */}
      <div className="pe-structure w-[55%] space-y-3 bg-white rounded-2xl shadow-sm border border-stone-200/80 p-6 lg:p-8">
        <div className="h-5 w-40 rounded-md bg-stone-200/80" />
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-xl bg-stone-100"
            style={{ width: `${75 + (i % 3) * 8}%` }}
          />
        ))}
        <div className="h-5 w-32 rounded-md bg-stone-200/80 mt-4" />
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="h-9 rounded-xl bg-stone-100"
            style={{ width: `${70 + (i % 4) * 6}%` }}
          />
        ))}
      </div>
      {/* Правая колонка */}
      <div className="w-[45%] flex-shrink-0 p-6 space-y-3 bg-white rounded-3xl shadow-sm border border-stone-200/80">
        <div className="h-4 w-24 rounded bg-stone-200/80" />
        <div className="h-20 rounded-xl bg-stone-100" />
        <div className="h-4 w-32 rounded bg-stone-200/80 mt-2" />
        <div className="h-10 rounded-xl bg-stone-100" />
        <div className="h-10 rounded-xl bg-stone-100" />
      </div>
    </div>
  );
}

// ─── Guard Modal ──────────────────────────────────────────────────────────────
function UnsavedGuardModal({ isOpen, onConfirm, onCancel }) {
  const confirmRef = useRef(null);

  useEffect(() => {
    if (isOpen) confirmRef.current?.focus();
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="guard-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-stone-900/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />
      {/* Panel */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-sm w-full p-6 animate-scale-in">
        <h2
          id="guard-title"
          className="text-base font-semibold text-stone-900 mb-1"
        >
          Есть несохранённые изменения
        </h2>
        <p className="text-sm text-stone-500 leading-relaxed mb-5">
          Если уйти сейчас, последние правки в программе не сохранятся.
          Продолжить?
        </p>
        <div className="flex gap-2 justify-end">
          <button
            type="button"
            onClick={onCancel}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl",
              "text-stone-600 bg-stone-100 hover:bg-stone-200",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            )}
          >
            Остаться
          </button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 text-sm font-medium rounded-xl",
              "text-white bg-red-500 hover:bg-red-600 active:scale-[0.98]",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
            )}
          >
            Выйти без сохранения
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Кнопка в шапке ──────────────────────────────────────────────────────────
function HeaderButton({ icon: Icon, label, onClick, variant = "ghost", disabled }) {
  const base = cn(
    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-medium",
    "transition-all duration-150",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
    "active:scale-[0.98]",
    disabled && "opacity-40 pointer-events-none",
  );
  const variants = {
    ghost:   "text-stone-600 hover:bg-stone-100 hover:text-stone-800",
    primary: "text-white bg-[#1B4F72] hover:bg-[#154060]",
    outline: "text-[#1B4F72] border border-[#1B4F72]/30 hover:bg-[#1B4F72]/5",
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(base, variants[variant])}
    >
      <Icon size={16} strokeWidth={2} />
      {label && <span>{label}</span>}
    </button>
  );
}

// ─── Главный экспорт ──────────────────────────────────────────────────────────
/**
 * @param {object}   props
 * @param {string}   props.programId         — Firestore ID открытой программы
 * @param {Function} props.onBack            — callback «← Назад к программам»
 * @param {Function} [props.renderStructure] — render-prop для левой колонки (Шаг 3)
 * @param {Function} [props.renderInspector] — render-prop для правой колонки (Шаг 4)
 * @param {Function} [props.renderExcelFlow] — render-prop для Excel-флоу (Шаг 5)
 */
export default function ProgramEditorPage({
  programId,
  onBack,
  renderStructure,
  renderInspector,
  renderExcelFlow,
}) {
  // ── Данные ─────────────────────────────────────────────────────────────
  const [program, setProgram] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  // ── Выбранный элемент (Zero-Click Inspector) ────────────────────────
  // { type: 'theme' | 'section' | null, id: string | null }
  const [selectedItem, setSelectedItem] = useState({ type: null, id: null });

  // ── Guard ───────────────────────────────────────────────────────────
  const [isDirty, setIsDirty] = useState(false);
  const [showGuard, setShowGuard] = useState(false);
  const pendingActionRef = useRef(null);

  // ── Excel Import флоу ───────────────────────────────────────────────
  const [showExcelFlow, setShowExcelFlow] = useState(false);

  const { showToast } = useToast();

  // ── Загрузка и тихая миграция ────────────────────────────────────────
  useEffect(() => {
    if (!programId) return;
    let cancelled = false;

    async function load() {
      setIsLoading(true);
      setLoadError(null);
      try {
        const raw = await getProgram(programId);
        if (cancelled) return;

        const migrated = migrateToSections(raw);

        // Тихая миграция: если были плоские данные — сразу сохраняем структуру
        if (migrated._migrated) {
          await updateProgramStructure(programId, {
            sections: migrated.sections,
            topics:   migrated.topics,
          });
        }

        setProgram(migrated);
      } catch (err) {
        if (!cancelled) setLoadError(err);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    load();
    return () => { cancelled = true; };
  }, [programId]);

  // ── Обновление из дочерних компонентов ──────────────────────────────
  const handleProgramChange = useCallback((updater) => {
    setProgram((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
    setIsDirty(true);
  }, []);

  // ── Сохранение ───────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!program || !isDirty) return;
    
    // Валидация обязательных полей
    if (!program.name?.trim() || !program.subject?.trim()) {
      showToast({
        message: "Заполните обязательные поля: Название и Предмет",
        type: "error",
      });
      // Если инспектор не открыт на главной странице, сбрасываем его, чтобы пользователь увидел поля
      setSelectedItem({ type: null, id: null });
      return;
    }

    // Защита от программного обхода maxLength (Excel-импорт, API, автозаполнение)
    const safeName    = program.name.trim().slice(0, 150);
    const safeSubject = program.subject.trim().slice(0, 100);

    try {
      await updateProgramStructure(programId, {
        name:     safeName,
        subject:  safeSubject,
        sections: program.sections,
        topics:   program.topics,
      });
      // Синхронизируем обрезанные значения обратно в state, если они были укорочены
      if (safeName !== program.name.trim() || safeSubject !== program.subject.trim()) {
        setProgram((prev) => ({ ...prev, name: safeName, subject: safeSubject }));
      }
      setIsDirty(false);
      showToast({ message: "Программа сохранена", type: "success" });
    } catch {
      showToast({
        message: "Не удалось сохранить. Попробуйте ещё раз.",
        type: "error",
      });
    }
  }, [program, isDirty, programId, showToast]);

  // ── Guard «← Назад» ──────────────────────────────────────────────────
  const requestBack = useCallback(() => {
    if (isDirty) {
      pendingActionRef.current = onBack;
      setShowGuard(true);
    } else {
      onBack?.();
    }
  }, [isDirty, onBack]);

  const handleGuardConfirm = useCallback(() => {
    setShowGuard(false);
    setIsDirty(false);
    pendingActionRef.current?.();
    pendingActionRef.current = null;
  }, []);

  const handleGuardCancel = useCallback(() => {
    setShowGuard(false);
    pendingActionRef.current = null;
  }, []);

  // ── Статистика для пустого состояния инспектора ─────────────────────
  const stats = program
    ? {
        sections:  program.sections?.length ?? 0,
        total:     program.topics?.length ?? 0,
        completed: program.topics?.filter((t) => t.isCompleted).length ?? 0,
      }
    : null;

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <>
      <div className="pe-shell">
        {/* ── Шапка ─────────────────────────────────────────────── */}
        <header className="pe-header">
          {/* Кнопка «Назад» */}
          <button
            type="button"
            onClick={requestBack}
            aria-label="Назад к программам"
            className={cn(
              "p-1.5 rounded-xl text-stone-500",
              "hover:bg-stone-100 hover:text-stone-800",
              "active:scale-[0.98] transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
            )}
          >
            <ArrowLeft size={18} strokeWidth={2} />
          </button>

          {/* Иконка + название (кликабельно, открывает настройки программы) */}
          <Tooltip text="Открыть настройки программы" wrapperClassName="flex-1 min-w-0 flex">
            <button
              type="button"
              onClick={() => setSelectedItem(null)}
              className={cn(
                "flex items-center gap-2 min-w-0 w-full text-left",
                "hover:bg-stone-50 px-2 py-1 -ml-2 rounded-lg transition-colors cursor-pointer",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]"
              )}
            >
              <BookOpen
                size={16}
                strokeWidth={2}
                className="text-[#1B4F72] flex-shrink-0"
              />
              {isLoading ? (
                <div className="h-4 w-48 rounded bg-stone-200 animate-pulse" />
              ) : (
                <h1 className="text-sm font-semibold text-stone-900 truncate">
                  {program?.name ?? "Программа"}
                </h1>
              )}
              {/* Индикатор несохранённых изменений */}
              {isDirty && (
                <Tooltip text="Есть несохранённые изменения">
                  <span
                    aria-label="Несохранённые изменения"
                    className="block w-1.5 h-1.5 rounded-full bg-amber-400 flex-shrink-0"
                  />
                </Tooltip>
              )}
            </button>
          </Tooltip>

          {/* Правые действия */}
          <div className="flex items-center gap-2 ml-auto">
            <HeaderButton
              icon={FileSpreadsheet}
              label="Excel"
              variant="outline"
              onClick={() => setShowExcelFlow(true)}
              disabled={isLoading}
            />
            {isDirty && (
              <HeaderButton
                icon={BookOpen}
                label="Сохранить"
                variant="primary"
                onClick={handleSave}
              />
            )}
          </div>
        </header>

        {/* ── Тело: две скроллящихся колонки в виде центрированного листа ──── */}
        <div className="pe-body p-6 lg:p-8">
          {isLoading ? (
            <EditorSkeleton />
          ) : loadError ? (
            /* Состояние ошибки загрузки */
            <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8 text-center bg-white rounded-2xl border border-stone-200/80 shadow-sm max-w-[1400px] mx-auto w-full">
              <BookOpen size={40} strokeWidth={1} className="text-stone-300" />
              <p className="text-stone-800 font-medium">Что-то пошло не так</p>
              <p className="text-sm text-stone-500 max-w-xs">
                Не удалось загрузить программу. Проверьте соединение и
                попробуйте снова.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-2 text-sm font-medium text-[#1B4F72] hover:underline"
              >
                Обновить страницу
              </button>
            </div>
          ) : (
            <div className="flex gap-4 lg:gap-6 w-full h-full max-w-[1400px] mx-auto overflow-hidden">
              {/* Левая: структура программы (строго 55%) */}
              <div className="w-[55%] bg-white rounded-3xl shadow-sm border border-stone-200/80 overflow-y-auto overflow-x-hidden flex flex-col">
                {renderStructure ? (
                  renderStructure({
                    program,
                    selectedItem,
                    onSelect:        setSelectedItem,
                    onProgramChange: handleProgramChange,
                  })
                ) : (
                  <p className="text-sm text-stone-400 text-center py-12">
                    ProgramStructure — Шаг 3
                  </p>
                )}
              </div>

              {/* Правая: инспектор (строго 45% flex-shrink-0) */}
              <div className="w-[45%] flex-shrink-0 bg-white rounded-3xl shadow-sm border border-stone-200/80 overflow-y-auto overflow-x-hidden flex flex-col relative">
                {renderInspector ? (
                  renderInspector({
                    program,
                    selectedItem,
                    stats,
                    onProgramChange: handleProgramChange,
                  })
                ) : (
                  <p className="p-4 text-sm text-stone-400 text-center py-12">
                    InspectorPanel — Шаг 4
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Excel Import (Шаг 5) */}
      {showExcelFlow &&
        renderExcelFlow &&
        renderExcelFlow({
          program,
          onClose: () => setShowExcelFlow(false),
          onImportComplete: (result) => {
            setShowExcelFlow(false);
            handleProgramChange(result.program);
            showToast({
              message: `Добавлено: ${result.added}, обновлено: ${result.updated}`,
              type: "success",
            });
          },
        })}

      {/* Guard Modal */}
      <UnsavedGuardModal
        isOpen={showGuard}
        onConfirm={handleGuardConfirm}
        onCancel={handleGuardCancel}
      />
    </>
  );
}
