/**
 * InspectorPanelAtoms.jsx
 * ────────────────────────────────────────────────────────────────────────────
 * Атомарные UI-компоненты и утилиты, используемые в InspectorPanel.jsx
 * и TaskComposer.jsx:
 *
 *   SectionLabel  — заголовок-метка секции («ОСНОВНОЕ», «БИБЛИОТЕКА ДЗ»)
 *   Divider       — горизонтальный разделитель
 *   TypeBadge     — бейдж типа задания
 *   CountPill     — счётчик-пилюля со значением и подписью
 *   getPlural     — склонение существительных
 */

import { BookOpen } from "lucide-react";
import { cn } from "../../utils/cn.js";
export { getPlural } from "../../utils/plural.js";

const legacyMap = { task: "Задача", question: "Вопрос", exercise: "Упражнение" };

/** Метка секции (ОСНОВНОЕ / БИБЛИОТЕКА ДЗ) */
export function SectionLabel({ children }) {
  return (
    <p className="text-[10px] font-bold tracking-widest text-stone-400 uppercase px-4 pt-4 pb-1 select-none">
      {children}
    </p>
  );
}

/** Горизонтальный разделитель */
export function Divider() {
  return <hr className="border-stone-100 mx-4" />;
}

/** Бейдж типа задания */
export function TypeBadge({ typeId }) {
  if (!typeId) return null;
  const label = legacyMap[typeId] || typeId;
  return (
    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold border bg-stone-50 text-stone-700 border-stone-200">
      <BookOpen size={10} strokeWidth={2} />
      {label}
    </span>
  );
}

/** Счётчик-пилюля */
export function CountPill({ count, label, accent }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={cn("text-xl font-bold tabular-nums", accent ?? "text-stone-800")}>
        {count}
      </span>
      <span className="text-[11px] text-stone-400">{label}</span>
    </div>
  );
}

