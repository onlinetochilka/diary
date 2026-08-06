/**
 * TaskComposer.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Компонент создания / редактирования задания в библиотеке ДЗ.
 * Содержит:
 *   - TaskComposer — форма с textarea, выбором типа (облако тегов) и кастомным вводом
 *   - TaskCard     — карточка задания: чекбокс сессии, текст, бейдж, кнопки редактировать/удалить
 *
 * Оба компонента используются исключительно в ThemeInspector (InspectorPanel.jsx).
 */

import { useState, useEffect, useRef } from "react";
import { CheckCircle2, Circle, Pencil, Trash2 } from "lucide-react";
import { cn } from "../../utils/cn.js";
import { TypeBadge } from "./InspectorPanelAtoms.jsx";
import Button from '../ui/Button.jsx';

// ─── Токены типов заданий ──────────────────────────────────────────────────
export const POP_TYPES = [
  "тест", "рабочий лист", "работа над ошибками", "конспект", "пробник",
  "сочинение", "перевод", "учить слова", "наизусть", "решение задач",
  "выучить формулы", "теорема", "Свой вариант",
];

const legacyMap = { task: "Задача", question: "Вопрос", exercise: "Упражнение" };

// ─── Форма создания / редактирования задания ───────────────────────────────

export function TaskComposer({ initialText = "", initialType = "", onSave, onCancel, autoFocus = false }) {
  const [text, setText] = useState(initialText);
  const [type, setType] = useState(initialType);
  const [isCustom, setIsCustom] = useState(
    initialType && !POP_TYPES.includes(initialType) && !legacyMap[initialType]
  );
  const [customType, setCustomType] = useState(isCustom ? initialType : "");
  const textareaRef = useRef(null);
  const customInputRef = useRef(null);

  useEffect(() => {
    if (autoFocus && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [autoFocus]);

  const handleSave = () => {
    if (!text.trim()) return;
    const finalType = isCustom && customType.trim() ? customType.trim() : type;
    onSave(text, finalType);
  };

  const toggleType = (t) => {
    if (t === "Свой вариант") {
      if (isCustom) {
        setIsCustom(false);
        setType("");
      } else {
        setIsCustom(true);
        setType("Свой вариант");
        if (!customType) setCustomType("");
        setTimeout(() => customInputRef.current?.focus(), 0);
      }
    } else {
      if (type === t && !isCustom) {
        setType("");
      } else {
        setIsCustom(false);
        setType(t);
      }
    }
  };

  return (
    <div className="border border-[#1B4F72]/20 rounded-xl bg-white overflow-hidden shadow-sm">
      <textarea
        ref={textareaRef}
        autoFocus={autoFocus}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) handleSave();
          if (e.key === "Escape") onCancel();
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

      {/* Cloud options container */}
      <div className="border-t border-stone-100 bg-stone-50/40 px-3 py-3">
        <div className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider mb-2.5">
          Выберите тип задания:
        </div>
        <div className="flex flex-wrap gap-1.5">
          {POP_TYPES.map((t) => {
            const isActive = (t === "Свой вариант" && isCustom) || (t === type && !isCustom);
            return (
              <Button
                variant="ghost"
                key={t}
                type="button"
                onClick={() => toggleType(t)}
                className={cn(
                  "w-auto h-auto px-2 py-1 rounded-full text-[11px] font-medium transition-all duration-150 border",
                  isActive
                    ? "bg-[#1B4F72]/10 text-[#1B4F72] border-[#1B4F72]/30 shadow-sm"
                    : "bg-white text-stone-600 border-stone-200 hover:border-stone-300 hover:bg-stone-50 shadow-sm"
                )}
              >
                {t}
              </Button>
            );
          })}
          {isCustom && (
            <input
              ref={customInputRef}
              type="text"
              value={customType}
              onChange={(e) => setCustomType(e.target.value)}
              placeholder="Введите свой тип..."
              className="w-32 px-2 py-1 text-[11px] border border-[#1B4F72]/40 rounded-full outline-none focus:ring-2 focus:ring-[#1B4F72]/20 transition-all bg-white shadow-sm"
            />
          )}
        </div>
      </div>

      <div className="flex items-center justify-end px-3 py-2 bg-stone-50/60 border-t border-stone-100">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-stone-400 mr-1 hidden sm:inline">
            Ctrl+Enter
          </span>
          <Button
            variant="ghost"
            type="button"
            onClick={onCancel}
            className={cn(
              "w-auto h-auto border-none px-2.5 py-1.5 rounded-lg text-xs font-medium",
              "text-stone-500 hover:bg-stone-100 hover:text-stone-700",
              "transition-colors duration-150 active:scale-[0.97]",
            )}
          >
            Отмена
          </Button>
          <Button
            variant="filled"
            type="button"
            onClick={handleSave}
            disabled={!text.trim() || (isCustom && !customType.trim())}
            className={cn(
              "w-auto h-auto border-none px-2.5 py-1.5 rounded-lg text-xs font-medium",
              "bg-[#1B4F72] text-white hover:bg-[#154060]",
              "transition-all duration-150 active:scale-[0.97]",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            Сохранить
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Карточка задания ──────────────────────────────────────────────────────

export function TaskCard({ item, isDone, onToggleDone, onDelete, onEdit, isDeleting }) {
  const [isEditing, setIsEditing] = useState(false);

  if (isEditing) {
    return (
      <TaskComposer
        initialText={item.text}
        initialType={item.type}
        autoFocus
        onSave={(text, type) => {
          onEdit(item.id, text, type);
          setIsEditing(false);
        }}
        onCancel={() => setIsEditing(false)}
      />
    );
  }

  return (
    <div
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
      <Button
        variant="ghost"
        size="icon"
        type="button"
        aria-label={isDone ? "Убрать отметку" : "Отметить как использованное"}
        onClick={() => onToggleDone(item.id)}
        className={cn(
          "w-auto h-auto border-none mt-0.5 flex-shrink-0 transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1B4F72]",
          "active:scale-[0.85]",
        )}
      >
        {isDone
          ? <CheckCircle2 size={14} strokeWidth={2} className="text-emerald-500" />
          : <Circle size={14} strokeWidth={2} className="text-stone-300 hover:text-stone-500" />
        }
      </Button>

      {/* Текст задания */}
      <div className="flex-1 min-w-0 space-y-1">
        <p className={cn(
          "text-xs leading-relaxed text-stone-700 whitespace-pre-wrap",
          isDone && "line-through text-stone-400",
        )}>
          {item.text}
        </p>
        <TypeBadge typeId={item.type} />
      </div>

      {/* Actions */}
      <div className="flex flex-col gap-0.5 opacity-0 group-hover/hw:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Редактировать задание"
          onClick={() => setIsEditing(true)}
          disabled={isDeleting}
          className={cn(
            "w-auto h-auto border-none p-1 rounded text-stone-300 hover:text-[#1B4F72] hover:bg-[#1B4F72]/10",
            "transition-all duration-150 active:scale-[0.85]",
          )}
        >
          <Pencil size={13} strokeWidth={2} />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          type="button"
          aria-label="Удалить задание"
          onClick={() => onDelete(item.id)}
          disabled={isDeleting}
          className={cn(
            "w-auto h-auto border-none p-1 rounded text-stone-300 hover:text-red-400 hover:bg-red-50",
            "transition-all duration-150 active:scale-[0.85]",
          )}
        >
          {isDeleting
            ? <div className="w-3 h-3 rounded-full border-2 border-stone-300 border-t-transparent animate-spin" />
            : <Trash2 size={13} strokeWidth={2} />
          }
        </Button>
      </div>
    </div>
  );
}
