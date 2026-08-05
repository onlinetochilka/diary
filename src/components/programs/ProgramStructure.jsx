/**
 * ProgramStructure.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Левая колонка редактора программ (65%).
 *
 * Отвечает за:
 *   • Аккордеон разделов (Section) с поддержкой DnD между разделами
 *   • DnD тем ВНУТРИ раздела и МЕЖДУ разделами
 *   • Оптимистичный UI: порядок меняется мгновенно, Firestore обновляется фоном
 *   • Откат при ошибке сети + Toast
 *   • KeyboardSensor для доступности
 *   • Добавление раздела / добавление темы в раздел
 *
 * Архитектура DnD:
 *   DndContext (уровень страницы)
 *     SortableContext [section-ids] → DnD разделов
 *       SectionAccordion
 *         SortableContext [topic-ids раздела] → DnD тем
 *           ThemeRow
 *     DragOverlay → ThemeRowOverlay | SectionHeaderOverlay
 */
import { useState, useCallback, useRef } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  arrayMove,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import {
  ChevronDown,
  GripVertical,
  Plus,
  Trash2,
  FolderOpen,
} from "lucide-react";
import { cn } from "../../utils/cn.js";
import {
  updateProgramStructure,
  addThemeToSection,
  addSection,
  deleteSection,
} from "../../services/database.js";
import { useToast } from "../ui/Toast.jsx";
import ThemeRow, { ThemeRowOverlay } from "./ThemeRow.jsx";

// ─── Хелперы ─────────────────────────────────────────────────────────────────

/** Перемещает тему между двумя разделами в плоском массиве topics */
function moveThemeBetweenSections(topics, sections, activeId, overId, overSectionId) {
  const activeIdx = topics.findIndex((t) => t.id === activeId);
  if (activeIdx === -1) return { topics, sections };

  const updatedTopics = topics.map((t) =>
    t.id === activeId ? { ...t, sectionId: overSectionId } : t
  );

  // Пересчитываем topicIds в обоих разделах
  const updatedSections = sections.map((s) => {
    if (s.id === overSectionId) {
      // Вставляем после overItem или в конец
      const overIdx = s.topicIds.indexOf(overId);
      const newIds = s.topicIds.filter((id) => id !== activeId);
      if (overIdx !== -1) {
        newIds.splice(overIdx, 0, activeId);
      } else {
        newIds.push(activeId);
      }
      return { ...s, topicIds: newIds };
    }
    return { ...s, topicIds: s.topicIds.filter((id) => id !== activeId) };
  });

  return { topics: updatedTopics, sections: updatedSections };
}

/** Пересчитывает order у тем на основе порядка topicIds в разделах.
 *  Темы-сироты (не найденные ни в одном topicIds) автоматически
 *  добавляются в первый раздел, чтобы не пропасть из интерфейса. */
function reorderTopics(topics, sections) {
  const orderMap = {};
  const allKnownIds = new Set();
  sections.forEach((s) => {
    s.topicIds.forEach((id, i) => {
      orderMap[id] = i;
      allKnownIds.add(id);
    });
  });

  // Собираем сирот — темы, не привязанные ни к одному разделу
  const orphanIds = topics
    .filter((t) => !allKnownIds.has(t.id))
    .map((t) => t.id);

  // Если есть сироты и хотя бы один раздел — «усыновляем» в первый раздел
  if (orphanIds.length > 0 && sections.length > 0) {
    const firstSection = sections[0];
    orphanIds.forEach((id) => {
      const nextOrder = firstSection.topicIds.length;
      firstSection.topicIds.push(id);
      orderMap[id] = nextOrder;
    });
  }

  return topics.map((t) =>
    orderMap[t.id] !== undefined ? { ...t, order: orderMap[t.id] } : t
  );
}

// ─── Inline-форма добавления темы ────────────────────────────────────────────
function AddThemeInline({ sectionId, onAdd, onCancel }) {
  const [value, setValue] = useState("");
  const inputRef = useRef(null);

  const handleSubmit = (e) => {
    e?.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onAdd(sectionId, trimmed);
    else onCancel();
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-center gap-2 mt-1 pl-10 pr-2"
    >
      <input
        ref={inputRef}
        autoFocus
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Escape") onCancel(); }}
        onBlur={handleSubmit}
        placeholder="Название темы..."
        maxLength={200}
        className={cn(
          "flex-1 min-w-0 text-sm px-3 py-1.5 rounded-lg",
          "border border-[#1B4F72]/30 bg-white",
          "placeholder:text-stone-400 text-stone-800",
          "focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40",
          "transition-shadow duration-150",
        )}
      />
      <button
        type="submit"
        className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-[#1B4F72] text-white hover:bg-[#154060] active:scale-[0.97] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#1B4F72]"
      >
        Добавить
      </button>
    </form>
  );
}

// ─── Заголовок раздела (sortable) ────────────────────────────────────────────
function SortableSectionHeader({ section, isOpen, onToggle, onDelete, isDragOverlay }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `section::${section.id}`,
    data: { type: "section", section },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(isDragging && "opacity-30", isDragOverlay && "pe-drag-overlay")}
    >
      <div
        {...attributes}
        className="pe-section-header"
        onClick={onToggle}
        onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onToggle(); } }}
        role="button"
        tabIndex={0}
        aria-expanded={isOpen}
      >
        {/* Grip — только раздела */}
        <button
          ref={setActivatorNodeRef}
          {...listeners}
          type="button"
          tabIndex={-1}
          aria-label="Перетащить раздел"
          className="pe-grip touch-none"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical size={14} strokeWidth={2} />
        </button>

        {/* Иконка + название */}
        <FolderOpen size={14} strokeWidth={2} className="text-[#1B4F72] flex-shrink-0" />
        <span className="flex-1 min-w-0 text-sm font-semibold text-stone-700 truncate">
          {section.title}
        </span>

        {/* Счётчик тем */}
        <span className="text-xs text-stone-400 tabular-nums flex-shrink-0">
          {section.topicIds.length}
        </span>

        {/* Кнопка удаления раздела */}
        <button
          type="button"
          aria-label="Удалить раздел"
          onClick={(e) => { e.stopPropagation(); onDelete(section.id); }}
          className={cn(
            "p-0.5 rounded text-stone-300 opacity-0 group-hover/section:opacity-100",
            "hover:text-red-400 hover:bg-red-50 active:scale-[0.90]",
            "transition-all duration-150",
            "focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400",
          )}
        >
          <Trash2 size={13} strokeWidth={2} />
        </button>

        {/* Стрелка аккордеона */}
        <ChevronDown
          size={14}
          strokeWidth={2}
          className={cn(
            "text-stone-400 flex-shrink-0 transition-transform duration-200",
            !isOpen && "-rotate-90",
          )}
        />
      </div>
    </div>
  );
}

// ─── Один раздел-аккордеон ────────────────────────────────────────────────────
function SectionAccordion({
  section,
  topics,
  selectedItemId,
  onSelectTheme,
  onSelectSection,
  onToggleComplete,
  onDeleteSection,
  onAddTheme,
}) {
  const [isOpen, setIsOpen] = useState(true);
  const [isAddingTheme, setIsAddingTheme] = useState(false);

  // Темы этого раздела в правильном порядке (по topicIds)
  const sectionTopics = section.topicIds
    .map((id) => topics.find((t) => t.id === id))
    .filter(Boolean);

  const handleToggle = useCallback(() => {
    setIsOpen((v) => !v);
    onSelectSection?.(section.id);
  }, [section.id, onSelectSection]);

  return (
    <div className="group/section mb-2">
      <SortableSectionHeader
        section={section}
        isOpen={isOpen}
        onToggle={handleToggle}
        onDelete={onDeleteSection}
      />

      {/* ── Список тем (аккордеон) ─────────────────────────────── */}
      <div
        className={cn(
          "pe-accordion-content ml-3 border-l border-stone-200/60 pl-2",
          !isOpen && "is-closed",
        )}
        style={{ maxHeight: isOpen ? `${sectionTopics.length * 120 + 120}px` : "0px" }}
        aria-hidden={!isOpen}
      >
        <SortableContext
          items={sectionTopics.map((t) => t.id)}
          strategy={verticalListSortingStrategy}
        >
          {sectionTopics.length === 0 ? (
            <p className="text-xs text-stone-400 py-3 pl-2 italic">
              В этом разделе пока нет тем.
            </p>
          ) : (
            sectionTopics.map((theme, i) => (
              <ThemeRow
                key={theme.id}
                theme={theme}
                index={i + 1}
                isSelected={selectedItemId === theme.id}
                onSelect={onSelectTheme}
                onToggleComplete={onToggleComplete}
              />
            ))
          )}
        </SortableContext>

        {/* ── Inline-добавление темы ─────────────────────────── */}
        {isAddingTheme ? (
          <AddThemeInline
            sectionId={section.id}
            onAdd={(sid, title) => { onAddTheme(sid, title); setIsAddingTheme(false); }}
            onCancel={() => setIsAddingTheme(false)}
          />
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingTheme(true)}
            className={cn(
              "flex items-center gap-1.5 mt-1 ml-2 px-2 py-1.5 rounded-lg",
              "text-xs text-stone-400 hover:text-[#1B4F72] hover:bg-[#1B4F72]/5",
              "transition-all duration-150 w-full",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
              "active:scale-[0.98]",
            )}
          >
            <Plus size={12} strokeWidth={2} />
            Добавить тему
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Главный экспорт ──────────────────────────────────────────────────────────
/**
 * @param {object}   props.program           — нормализованная программа (после migrateToSections)
 * @param {object}   props.selectedItem      — { type, id } из ProgramEditorPage
 * @param {Function} props.onSelect          — ({ type, id }) => void
 * @param {Function} props.onProgramChange   — (updater) => void — сообщает Shell об изменениях
 */
export default function ProgramStructure({
  program,
  selectedItem,
  onSelect,
  onProgramChange,
}) {
  const { showToast } = useToast();

  // Локальный стейт (оптимистичный) — копирует данные программы
  const [localSections, setLocalSections] = useState(() => program?.sections ?? []);
  const [localTopics,   setLocalTopics]   = useState(() => program?.topics ?? []);

  // Сохраняем «снимок» до начала перетаскивания для отката
  const snapshotRef = useRef(null);

  // Активный DnD-элемент для Overlay
  const [activeItem, setActiveItem] = useState(null);

  // ── Добавление нового раздела ─────────────────────────────────────
  const [isAddingSection, setIsAddingSection] = useState(false);
  const [newSectionTitle, setNewSectionTitle] = useState("");

  // Обновляем локальный стейт при смене программы снаружи
  // (например, после Excel-импорта)
  const prevProgramId = useRef(program?.id);
  if (program?.id !== prevProgramId.current) {
    prevProgramId.current = program?.id;
    setLocalSections(program?.sections ?? []);
    setLocalTopics(program?.topics ?? []);
  }

  // ── Sensors: мышь + клавиатура ────────────────────────────────────
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        // Требуем 5px смещения — защита от случайного DnD при клике
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // ── Helpers: синхронизация с Firestore ───────────────────────────
  const persistStructure = useCallback(
    async (sections, topics, snapshot) => {
      try {
        await updateProgramStructure(program.id, { sections, topics });
        // Уведомляем Shell о новых данных
        onProgramChange((prev) => ({ ...prev, sections, topics }));
      } catch {
        // Откат к снимку
        setLocalSections(snapshot.sections);
        setLocalTopics(snapshot.topics);
        showToast({
          message: "Не удалось сохранить порядок. Изменения отменены.",
          type: "error",
        });
      }
    },
    [program?.id, onProgramChange, showToast],
  );

  // ── DnD: начало перетаскивания ────────────────────────────────────
  const handleDragStart = useCallback(({ active }) => {
    snapshotRef.current = { sections: localSections, topics: localTopics };
    setActiveItem(active.data.current);
  }, [localSections, localTopics]);

  // ── DnD: элемент над другим ───────────────────────────────────────
  const handleDragOver = useCallback(({ active, over }) => {
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData   = over.data.current;

    // Перемещение темы между разделами
    if (activeData?.type === "theme" && overData?.type === "theme") {
      const activeSectionId = activeData.theme.sectionId;
      const overSectionId   = overData.theme.sectionId;

      if (activeSectionId !== overSectionId) {
        setLocalTopics((topics) => {
          const { topics: newTopics, sections: newSections } = moveThemeBetweenSections(
            topics, localSections, active.id, over.id, overSectionId
          );
          setLocalSections(newSections);
          return newTopics;
        });
      }
    }

    // Тема над пустым разделом
    if (activeData?.type === "theme" && overData?.type === "section") {
      const overSectionId = overData.section.id;
      if (activeData.theme.sectionId !== overSectionId) {
        setLocalTopics((topics) => {
          const { topics: newTopics, sections: newSections } = moveThemeBetweenSections(
            topics, localSections, active.id, null, overSectionId
          );
          setLocalSections(newSections);
          return newTopics;
        });
      }
    }
  }, [localSections]);

  // ── DnD: завершение перетаскивания ───────────────────────────────
  const handleDragEnd = useCallback(({ active, over }) => {
    setActiveItem(null);
    if (!over || active.id === over.id) return;

    const snapshot = snapshotRef.current;
    snapshotRef.current = null;

    const activeData = active.data.current;
    const overData   = over.data.current;

    // ── Темы внутри одного раздела ─────────────────────────────
    if (
      activeData?.type === "theme" &&
      overData?.type === "theme" &&
      activeData.theme.sectionId === overData.theme.sectionId
    ) {
      const sectionId = activeData.theme.sectionId;

      setLocalSections((sections) => {
        const updatedSections = sections.map((s) => {
          if (s.id !== sectionId) return s;
          const oldIdx = s.topicIds.indexOf(active.id);
          const newIdx = s.topicIds.indexOf(over.id);
          if (oldIdx === -1 || newIdx === -1) return s;
          return { ...s, topicIds: arrayMove(s.topicIds, oldIdx, newIdx) };
        });

        const updatedTopics = reorderTopics(localTopics, updatedSections);
        setLocalTopics(updatedTopics);
        persistStructure(updatedSections, updatedTopics, snapshot);
        return updatedSections;
      });
      return;
    }

    // ── Разделы между собой ────────────────────────────────────
    if (
      activeData?.type === "section" &&
      overData?.type === "section"
    ) {
      // active.id и over.id имеют префикс "section::"
      const activeRealId = active.id.replace("section::", "");
      const overRealId   = over.id.replace("section::", "");

      setLocalSections((sections) => {
        const oldIdx = sections.findIndex((s) => s.id === activeRealId);
        const newIdx = sections.findIndex((s) => s.id === overRealId);
        if (oldIdx === -1 || newIdx === -1) return sections;
        const updated = arrayMove(sections, oldIdx, newIdx).map((s, i) => ({
          ...s, order: i,
        }));
        persistStructure(updated, localTopics, snapshot);
        return updated;
      });
      return;
    }

    // Переход между разделами уже обработан в onDragOver — просто сохраняем
    persistStructure(localSections, localTopics, snapshot);
  }, [localSections, localTopics, persistStructure]);

  // ── Отмена (Escape) ───────────────────────────────────────────────
  const handleDragCancel = useCallback(() => {
    if (snapshotRef.current) {
      setLocalSections(snapshotRef.current.sections);
      setLocalTopics(snapshotRef.current.topics);
      snapshotRef.current = null;
    }
    setActiveItem(null);
  }, []);

  // ── Toggles: завершение темы ──────────────────────────────────────
  const handleToggleComplete = useCallback(
    async (themeId, current) => {
      const snapshot = { sections: localSections, topics: localTopics };
      const updated = localTopics.map((t) =>
        t.id === themeId ? { ...t, isCompleted: !current } : t
      );
      setLocalTopics(updated);
      try {
        await updateProgramStructure(program.id, {
          sections: localSections,
          topics: updated,
        });
        onProgramChange((prev) => ({ ...prev, topics: updated }));
      } catch {
        setLocalTopics(snapshot.topics);
        showToast({ message: "Не удалось сохранить изменение.", type: "error" });
      }
    },
    [localSections, localTopics, program?.id, onProgramChange, showToast],
  );

  // ── Добавление темы в раздел ──────────────────────────────────────
  const handleAddTheme = useCallback(
    async (sectionId, title) => {
      // Оптимистично добавляем локально
      const tempId = `temp_${Date.now()}`;
      const tempTheme = {
        id: tempId,
        title,
        sectionId,
        order: localTopics.length,
        isCompleted: false,
        homeworkBank: [],
      };
      const optimisticTopics = [...localTopics, tempTheme];
      const optimisticSections = localSections.map((s) =>
        s.id === sectionId ? { ...s, topicIds: [...s.topicIds, tempId] } : s
      );
      setLocalTopics(optimisticTopics);
      setLocalSections(optimisticSections);

      try {
        const result = await addThemeToSection(program.id, sectionId, title);
        // Заменяем temp-данные реальными из Firestore
        setLocalTopics(result.topics);
        setLocalSections(result.sections);
        onProgramChange((prev) => ({
          ...prev,
          sections: result.sections,
          topics: result.topics,
        }));
      } catch {
        // Откат
        setLocalTopics(localTopics);
        setLocalSections(localSections);
        showToast({ message: "Не удалось добавить тему. Попробуйте снова.", type: "error" });
      }
    },
    [localTopics, localSections, program?.id, onProgramChange, showToast],
  );

  // ── Добавление раздела ────────────────────────────────────────────
  const handleAddSection = useCallback(
    async (title) => {
      if (!title.trim()) return;
      setNewSectionTitle("");
      setIsAddingSection(false);

      const tempId = `temp_sec_${Date.now()}`;
      const tempSection = { id: tempId, title, order: localSections.length, topicIds: [] };
      const optimisticSections = [...localSections, tempSection];
      setLocalSections(optimisticSections);

      try {
        const result = await addSection(program.id, title);
        setLocalSections(result.sections);
        onProgramChange((prev) => ({ ...prev, sections: result.sections }));
      } catch {
        setLocalSections(localSections);
        showToast({ message: "Не удалось создать раздел.", type: "error" });
      }
    },
    [localSections, program?.id, onProgramChange, showToast],
  );

  // ── Удаление раздела ──────────────────────────────────────────────
  const handleDeleteSection = useCallback(
    async (sectionId) => {
      const section = localSections.find((s) => s.id === sectionId);
      const snapshot = { sections: localSections, topics: localTopics };

      const updatedSections = localSections.filter((s) => s.id !== sectionId);
      const updatedTopics   = localTopics.filter((t) => t.sectionId !== sectionId);
      setLocalSections(updatedSections);
      setLocalTopics(updatedTopics);

      showToast({
        message: `Раздел «${section?.title}» и все его темы удалены`,
        type: "info",
        undoLabel: "Отменить",
        onUndo: () => {
          setLocalSections(snapshot.sections);
          setLocalTopics(snapshot.topics);
        },
        onExpire: async () => {
          try {
            await deleteSection(program.id, sectionId);
            onProgramChange((prev) => ({
              ...prev,
              sections: updatedSections,
              topics: updatedTopics,
            }));
          } catch {
            setLocalSections(snapshot.sections);
            setLocalTopics(snapshot.topics);
            showToast({ message: "Не удалось удалить раздел.", type: "error" });
          }
        },
      });
    },
    [localSections, localTopics, program?.id, onProgramChange, showToast],
  );

  // ── Пустое состояние ──────────────────────────────────────────────
  if (!program) return null;

  // ── Render ────────────────────────────────────────────────────────
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      {/* Список разделов */}
      <SortableContext
        items={localSections.map((s) => `section::${s.id}`)}
        strategy={verticalListSortingStrategy}
      >
        <div role="listbox" aria-label="Структура программы" aria-multiselectable="false">
          {localSections.map((section) => (
            <SectionAccordion
              key={section.id}
              section={section}
              topics={localTopics}
              selectedItemId={selectedItem?.id}
              onSelectTheme={(id) => onSelect({ type: "theme", id })}
              onSelectSection={(id) => onSelect({ type: "section", id })}
              onToggleComplete={handleToggleComplete}
              onDeleteSection={handleDeleteSection}
              onAddTheme={handleAddTheme}
            />
          ))}
        </div>
      </SortableContext>

      {/* Кнопка / форма добавления раздела */}
      <div className="mt-3">
        {isAddingSection ? (
          <form
            onSubmit={(e) => { e.preventDefault(); handleAddSection(newSectionTitle); }}
            className="flex gap-2"
          >
            <input
              autoFocus
              value={newSectionTitle}
              onChange={(e) => setNewSectionTitle(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Escape") setIsAddingSection(false); }}
              onBlur={() => { if (!newSectionTitle.trim()) setIsAddingSection(false); }}
              placeholder="Название раздела..."
              maxLength={100}
              className={cn(
                "flex-1 min-w-0 text-sm px-3 py-2 rounded-xl",
                "border border-[#1B4F72]/30 bg-white",
                "placeholder:text-stone-400 text-stone-800",
                "focus:outline-none focus:ring-2 focus:ring-[#1B4F72]/40",
              )}
            />
            <button
              type="submit"
              className="text-sm font-medium px-3 py-2 rounded-xl bg-[#1B4F72] text-white hover:bg-[#154060] active:scale-[0.97] transition-all duration-150 focus-visible:ring-2 focus-visible:ring-[#1B4F72]"
            >
              Создать
            </button>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setIsAddingSection(true)}
            className={cn(
              "flex items-center gap-2 w-full px-3 py-2 rounded-xl",
              "text-sm text-stone-400 hover:text-[#1B4F72] hover:bg-[#1B4F72]/5",
              "border border-dashed border-stone-200 hover:border-[#1B4F72]/30",
              "transition-all duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
              "active:scale-[0.99]",
            )}
          >
            <Plus size={14} strokeWidth={2} />
            Добавить раздел
          </button>
        )}
      </div>

      {/* ── DragOverlay ────────────────────────────────────────────── */}
      <DragOverlay dropAnimation={{
        duration: 200,
        easing: "cubic-bezier(0.25, 1, 0.5, 1)",
      }}>
        {activeItem?.type === "theme" && (
          <ThemeRowOverlay
            theme={activeItem.theme}
            index={
              localSections
                .find((s) => s.id === activeItem.theme.sectionId)
                ?.topicIds.indexOf(activeItem.theme.id) + 1 || 1
            }
          />
        )}
        {activeItem?.type === "section" && (
          <div className="pe-drag-overlay px-3 py-2 rounded-xl bg-white">
            <span className="text-sm font-semibold text-stone-700">
              {activeItem.section.title}
            </span>
          </div>
        )}
      </DragOverlay>
    </DndContext>
  );
}
